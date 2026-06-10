import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createRequire } from 'module';

export const runtime = 'nodejs';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buffer: Buffer) => Promise<{ text?: string }>;

const MAX_TOTAL_TEXT_LENGTH = 50000;
const MIN_READABLE_TEXT_LENGTH = 120;
const ACCEPTED_FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

type CoproAnalysis = {
  summary: string;
  positives: string[];
  alerts: string[];
  votedWorks: string[];
  futureWorks: string[];
  legalIssues: string[];
  unpaidCharges: string[];
  budgetNotes: string[];
  managementNotes: string[];
  riskLevel: 'Faible' | 'Moyen' | 'Élevé';
  investorConclusion: string;
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    positives: { type: 'array', items: { type: 'string' } },
    alerts: { type: 'array', items: { type: 'string' } },
    votedWorks: { type: 'array', items: { type: 'string' } },
    futureWorks: { type: 'array', items: { type: 'string' } },
    legalIssues: { type: 'array', items: { type: 'string' } },
    unpaidCharges: { type: 'array', items: { type: 'string' } },
    budgetNotes: { type: 'array', items: { type: 'string' } },
    managementNotes: { type: 'array', items: { type: 'string' } },
    riskLevel: { type: 'string', enum: ['Faible', 'Moyen', 'Élevé'] },
    investorConclusion: { type: 'string' },
  },
  required: [
    'summary',
    'positives',
    'alerts',
    'votedWorks',
    'futureWorks',
    'legalIssues',
    'unpaidCharges',
    'budgetNotes',
    'managementNotes',
    'riskLevel',
    'investorConclusion',
  ],
} as const;

const normalizePdfText = (value: string) =>
  value
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractTextFromPdf = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await pdfParse(buffer);
  return normalizePdfText(result.text ?? '');
};

const getFileType = (file: File) => {
  const lowerName = file.name.toLowerCase();
  if (file.type) return file.type;
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  return '';
};

const isAcceptedFile = (file: File) => ACCEPTED_FILE_TYPES.has(getFileType(file));

const fileToDataUrl = async (file: File) => {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${getFileType(file)};base64,${bytes.toString('base64')}`;
};

const buildVisualInput = async (file: File) => {
  const fileType = getFileType(file);
  const dataUrl = await fileToDataUrl(file);

  if (fileType.startsWith('image/')) {
    return {
      type: 'input_image' as const,
      image_url: dataUrl,
      detail: 'high' as const,
    };
  }

  return {
    type: 'input_file' as const,
    filename: file.name,
    file_data: dataUrl,
  };
};

const toStringArray = (value: unknown, maxItems: number) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, maxItems) : [];

const normalizeAnalysis = (value: Partial<CoproAnalysis>): CoproAnalysis => ({
  summary: typeof value.summary === 'string' ? value.summary : '',
  positives: toStringArray(value.positives, 5),
  alerts: toStringArray(value.alerts, 5),
  votedWorks: toStringArray(value.votedWorks, 8),
  futureWorks: toStringArray(value.futureWorks, 5),
  legalIssues: toStringArray(value.legalIssues, 3),
  unpaidCharges: toStringArray(value.unpaidCharges, 3),
  budgetNotes: toStringArray(value.budgetNotes, 4),
  managementNotes: toStringArray(value.managementNotes, 4),
  riskLevel: value.riskLevel === 'Faible' || value.riskLevel === 'Moyen' || value.riskLevel === 'Élevé' ? value.riskLevel : 'Moyen',
  investorConclusion: typeof value.investorConclusion === 'string' ? value.investorConclusion : '',
});

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });
  }

  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && isAcceptedFile(entry));

  if (files.length === 0) {
    return NextResponse.json({ error: 'Ajoutez au moins un PDF ou une image.' }, { status: 400 });
  }

  try {
    const extractedTexts = await Promise.all(
      files.map(async (file) => {
        if (getFileType(file) !== 'application/pdf') {
          return '';
        }

        const text = await extractTextFromPdf(file).catch(() => '');
        return text ? `DOCUMENT: ${file.name}\n${text}` : '';
      })
    );

    const mergedText = normalizePdfText(extractedTexts.filter(Boolean).join('\n\n')).slice(0, MAX_TOTAL_TEXT_LENGTH);
    const visualInputs = await Promise.all(files.map((file) => buildVisualInput(file)));

    const prompt = `
Tu es un analyste immobilier spécialisé dans l’investissement locatif.
Analyse ces documents de copropriété comme un investisseur prudent et réaliste.
L'objectif est d'identifier ce qui peut réellement impacter un achat locatif : coût futur, appels de fonds, qualité de gestion, risques financiers et risques juridiques.
Ne raisonne pas comme un avocat, un assureur ou un générateur de scénarios pessimistes.
Sois concret, synthétique, équilibré et actionnable.
Ne donne pas de conseil juridique.
Réduis la verbosité : phrases courtes, pas de répétition entre sections.
Retourne uniquement un JSON conforme au schéma demandé.
Si les documents sont scannés ou envoyés sous forme d'image, lis visuellement le contenu utile avant d'analyser.

LOGIQUE DE RISQUE À APPLIQUER :
- Faible : pas de gros travaux votés, pas de litige, pas d'impayés significatifs, finances saines, pas de problème structurel.
- Moyen : travaux significatifs discutés ou votés, charges en hausse, dépenses futures probables, impayés modérés ou petits sujets récurrents.
- Élevé uniquement si au moins un élément sérieux est identifié : travaux structurels coûteux (toiture, façade, fondations, étanchéité, ascenseur), difficultés financières importantes, gros impayés, litige/procédure, travaux d'urgence répétés, forts signes d'appels de fonds exceptionnels.

IMPORTANT :
- Ne classe pas en "Élevé" uniquement parce que des travaux existent.
- Travaux + comptes approuvés + syndic actif + finances maîtrisées = souvent "Moyen", pas "Élevé".
- Si les comptes sont approuvés, que le syndic est actif, qu'un fonds travaux existe ou que les impayés semblent maîtrisés, mentionne-le explicitement dans les points positifs.
- Remplace les formulations alarmistes par des formulations investisseur : "point de vigilance", "à intégrer dans l'analyse financière", "montants à confirmer".
- La conclusion investisseur doit tenir en une phrase courte et équilibrée.

LIMITES DE LONGUEUR :
- summary : maximum 4 points ou phrases courtes.
- positives : maximum 5 items.
- alerts : maximum 5 items.
- votedWorks : maximum 8 items.
- futureWorks : maximum 5 items.
- legalIssues : maximum 3 items.
- unpaidCharges : maximum 3 items.
- budgetNotes : maximum 4 items.
- managementNotes : maximum 4 items.

TEXTE EXTRAIT AUTOMATIQUEMENT :
${mergedText.length >= MIN_READABLE_TEXT_LENGTH ? mergedText : 'Texte extrait insuffisant. Utilise les fichiers joints pour lire le document visuellement.'}
`;

    const openai = new OpenAI({ apiKey });
    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            ...visualInputs,
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'copro_analysis',
          schema: responseSchema,
        },
      },
    });

    const raw = response.output_text ?? '{}';
    const parsed = JSON.parse(raw) as Partial<CoproAnalysis>;

    return NextResponse.json(normalizeAnalysis(parsed));
  } catch (error) {
    console.error('Copro analysis failed', error);
    return NextResponse.json(
      { error: 'Impossible de lire correctement les documents. Essayez avec des fichiers plus nets ou moins volumineux.' },
      { status: 500 }
    );
  }
}
