import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';

export const runtime = 'nodejs';

// pdf-parse is pinned to 1.1.1 and imported via internal path to avoid
// the test-file side-effect that triggers at module load in newer entry points.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buffer: Buffer) => Promise<{ text?: string }>;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_LENGTH = 40000;
const MIN_READABLE_TEXT_LENGTH = 80;

// Accept application/octet-stream for .pdf (common on iOS/Android file pickers)
const getFileType = (file: File): string => {
  const lower = file.name.toLowerCase();
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return file.type || '';
};

const ACCEPTED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// Only extract static loan parameters that are unambiguously stated in the document.
// remaining_loan is NOT extracted — it is calculated client-side from these values.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const responseSchema: Record<string, any> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    initial_loan_amount: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    monthly_payment:     { anyOf: [{ type: 'number' }, { type: 'null' }] },
    loan_rate:           { anyOf: [{ type: 'number' }, { type: 'null' }] },
    loan_duration_years: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    loan_start_date:     { anyOf: [{ type: 'string' }, { type: 'null' }] },
    loan_end_date:       { anyOf: [{ type: 'string' }, { type: 'null' }] },
    confidence_score:    { type: 'number' },
    warnings:            { type: 'array', items: { type: 'string' } },
  },
  required: [
    'initial_loan_amount', 'monthly_payment', 'loan_rate', 'loan_duration_years',
    'loan_start_date', 'loan_end_date', 'confidence_score', 'warnings',
  ],
};

type RawExtraction = {
  initial_loan_amount: unknown;
  monthly_payment: unknown;
  loan_rate: unknown;
  loan_duration_years: unknown;
  loan_start_date: unknown;
  loan_end_date: unknown;
  confidence_score: unknown;
  warnings: unknown;
};

export type LoanExtraction = {
  initial_loan_amount: number | null;
  monthly_payment: number | null;
  loan_rate: number | null;
  loan_duration_years: number | null;
  loan_start_date: string | null;
  loan_end_date: string | null;
  confidence_score: number;
  warnings: string[];
};

function normalizeLoanExtraction(parsed: RawExtraction): LoanExtraction {
  const warnings: string[] = Array.isArray(parsed.warnings)
    ? (parsed.warnings as unknown[]).filter((w): w is string => typeof w === 'string')
    : [];

  const safePositiveNum = (v: unknown, min: number, max: number, label: string): number | null => {
    if (v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (!isFinite(n) || n < 0) { warnings.push(`${label} : valeur invalide supprimée.`); return null; }
    if (n < min || n > max) { warnings.push(`${label} : valeur hors limites supprimée (${n}).`); return null; }
    return n;
  };

  const safeStr = (v: unknown): string | null => {
    if (!v || typeof v !== 'string') return null;
    return v.trim() || null;
  };

  return {
    initial_loan_amount: safePositiveNum(parsed.initial_loan_amount, 1000, 100_000_000, 'Montant emprunté'),
    monthly_payment:     safePositiveNum(parsed.monthly_payment, 1, 100_000, 'Mensualité'),
    loan_rate:           safePositiveNum(parsed.loan_rate, 0, 15, 'Taux'),
    loan_duration_years: safePositiveNum(parsed.loan_duration_years, 1, 35, 'Durée'),
    loan_start_date:     safeStr(parsed.loan_start_date),
    loan_end_date:       safeStr(parsed.loan_end_date),
    confidence_score:    Math.max(0, Math.min(1, typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0)),
    warnings,
  };
}

const normalizePdfText = (value: string) =>
  value.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const fileToDataUrl = async (file: File) => {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${getFileType(file)};base64,${bytes.toString('base64')}`;
};

const buildVisualInput = async (file: File) => {
  const fileType = getFileType(file);
  const dataUrl = await fileToDataUrl(file);
  if (fileType.startsWith('image/')) {
    return { type: 'input_image' as const, image_url: dataUrl, detail: 'high' as const };
  }
  return { type: 'input_file' as const, filename: file.name, file_data: dataUrl };
};

export async function POST(req: Request) {
  // Require authenticated Supabase user before calling OpenAI
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Session expirée. Reconnectez-vous.' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY non configuré.' }, { status: 500 });

  const model = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini';

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 }); }

  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });

  const detectedType = getFileType(file);
  if (!ACCEPTED_FILE_TYPES.has(detectedType)) {
    return NextResponse.json({ error: 'Format invalide. Envoie un PDF ou une image.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo).' }, { status: 413 });
  }

  try {
    let extractedText = '';
    if (detectedType === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await pdfParse(buffer).catch(() => ({ text: '' }));
      extractedText = normalizePdfText(result.text ?? '').slice(0, MAX_TEXT_LENGTH);
    }

    const visualInput = await buildVisualInput(file);

    const prompt = `Tu es un expert en crédit immobilier français. Analyse ce tableau d'amortissement ou plan de financement et extrais les 4 paramètres fixes du prêt.

CHAMPS À EXTRAIRE :
- initial_loan_amount : montant total emprunté à l'origine, en euros (valeur numérique, ex. 200000). Généralement libellé "Montant du prêt", "Capital emprunté" ou "Montant financé".
- monthly_payment : mensualité hors assurance, en euros (ex. 876.50). Prendre la mensualité constante du tableau, pas le total avec assurance.
- loan_rate : taux nominal annuel en pourcentage décimal (ex. 2.85, pas 0.0285, pas "2,85 %").
- loan_duration_years : durée totale initiale du prêt en années entières (ex. 20).
- loan_start_date : date du premier versement si explicitement indiquée dans le document (format YYYY-MM-DD), sinon null.
- loan_end_date : date de la dernière échéance si visible (format YYYY-MM-DD), sinon null.

RÈGLES STRICTES :
- Retourne uniquement des valeurs explicitement présentes dans le document. N'invente rien.
- Si une valeur est absente ou incertaine, retourne null.
- Les montants sont des nombres purs sans symbole ni espace.
- confidence_score : entre 0.0 et 1.0 selon ta certitude globale.
- warnings : liste uniquement les champs absents ou incertains.

NE PAS tenter de calculer le capital restant dû — ce n'est pas demandé.

TEXTE EXTRAIT DU DOCUMENT :
${extractedText.length >= MIN_READABLE_TEXT_LENGTH ? extractedText : 'Texte insuffisant — analyse le fichier joint visuellement.'}`;

    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }, visualInput] }],
      text: { format: { type: 'json_schema', name: 'loan_extraction', schema: responseSchema } },
    });

    const raw = response.output_text ?? '{}';
    const parsed = JSON.parse(raw) as RawExtraction;
    return NextResponse.json(normalizeLoanExtraction(parsed));
  } catch (error) {
    console.error('Loan extraction failed', error);
    return NextResponse.json(
      { error: 'Impossible d\'extraire les données. Vérifie que le document est lisible et réessaie.' },
      { status: 500 },
    );
  }
}
