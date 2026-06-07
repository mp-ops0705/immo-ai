import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import rentsDataT1T2 from '../../../data/rents.json';
import rentsDataT3 from '../../../data/rents_t3.json';
import rentsDataHouse from '../../../data/rents_house.json';

type DatasetEntry = {
  avg: number;
  low: number | null;
  high: number | null;
};

const normalizeCity = (name: string | null | undefined) =>
  (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const getRentFromDataset = (
  city: string | null | undefined,
  surface: number | null | undefined,
  rooms: number | null | undefined,
  propertyType: string | null | undefined
): { avg: number | null; low: number | null; high: number | null } | null => {
  if (!city || !surface || surface <= 0) {
    return null;
  }
  const normalized = normalizeCity(city);
  if (!normalized) {
    return null;
  }
  let dataset: Record<string, DatasetEntry>;
  if (propertyType === 'house') {
    dataset = rentsDataHouse as Record<string, DatasetEntry>;
  } else if (rooms !== null && rooms !== undefined && rooms > 2) {
    dataset = rentsDataT3 as Record<string, DatasetEntry>;
  } else {
    dataset = rentsDataT1T2 as Record<string, DatasetEntry>;
  }
  const entry = dataset[normalized];
  if (!entry || !Number.isFinite(entry.avg)) {
    return null;
  }
  const computeHc = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return null;
    const monthlyCc = value * surface;
    const monthlyHc = Math.round(monthlyCc * 0.9);
    return monthlyHc > 0 ? monthlyHc : null;
  };
  return {
    avg: computeHc(entry.avg),
    low: computeHc(entry.low),
    high: computeHc(entry.high),
  };
};

const extractDeterministicData = (text: string) => {
  const clean = text.replace(/\s+/g, ' ').toLowerCase();
  const isHouse = clean.includes('maison');
  const isApartment = clean.includes('appartement');
  const propertyType = isHouse ? 'house' : isApartment ? 'apartment' : null;

  const priceMatch =
    clean.match(/prix de vente[^0-9]*([0-9\s]{4,})/) ??
    clean.match(/prix[^0-9]*([0-9\s]{4,})\s?(€|euros)/);

  const rentHcMatch =
    clean.match(/loyer[^0-9]*([0-9\s.,]+)[^a-z0-9]{0,12}(?:hors charges|hc)/) ??
    clean.match(/(?:hors charges|hc)[^0-9]*([0-9\s.,]+)/);

  const rentCcMatch =
    clean.match(
      /loyer[^0-9]*([0-9\s.,]+)(?:[^0-9]{0,24}(?:\/\s*mois|par mois|mensuelles?))?[^a-z0-9]{0,24}(?:charges comprises|charges incluses|cc)/
    ) ??
    clean.match(
      /([0-9\s.,]+)\s?(€|euros)(?:[^0-9]{0,24}(?:\/\s*mois|par mois|mensuelles?))?[^a-z0-9]{0,24}(?:charges comprises|charges incluses|cc)/
    );

  const rentedMatch =
    clean.match(/actuellement lou[eé][^0-9]{0,12}([0-9\s.,]{3,})\s?(€|euros)/) ??
    clean.match(/lou[eé]\s*(?:à)?[^0-9]{0,12}([0-9\s.,]{3,})\s?(€|euros)/);

  let genericRentMatch: RegExpMatchArray | null = null;
  const words = clean.split(' ');
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (word.includes('loyer') || word.includes('loué') || word.includes('louée')) {
      const contextWindow = words.slice(i, i + 6).join(' ');
      const match = contextWindow.match(/([0-9\s.,]{3,})\s?(€|euros)/);
      if (match) {
        genericRentMatch = match;
        break;
      }
    }
  }

  const includedChargesMatch =
    clean.match(
      /dont[^0-9]*([0-9\s.,]+)\s?(€|euros)?(?:[^a-z0-9]{0,24}(?:\/\s*mois|par mois|mensuelles?))?[^a-z0-9]{0,20}(?:de|des|sur)?[^a-z0-9]{0,20}(?:provisions?(?: sur)? charges?|charges?(?: locatives?)?(?: r[eé]cup[eé]rables?)?)/
    ) ??
    clean.match(
      /charges(?: locatives?)?(?:\s+r[eé]cup[eé]rables?)?[^0-9]{0,80}([0-9\s.,]+)\s?(€|euros)?(?:[^a-z0-9]{0,24}(?:\/\s*mois|par mois|mensuelles?))?/
    );

  const surfaceMatch = clean.match(/([0-9]{2,4})\s?(m²|m2)/);
  const taxMatch = clean.match(/taxe fonci[eè]re[^0-9]*([0-9\s]+)/);
  const coproMatchBefore =
    clean.match(
      /charges(?: de copropri[eé]t[eé])?\s*(trimestrielles?|mensuelles?|annuelles?|par mois|par trimestre|par an)[^0-9]*([0-9\s.,]+)/
    );
  const coproMatchAfter =
    clean.match(
      /charges(?: de copropri[eé]t[eé])?[^0-9]*([0-9\s.,]+)\s?(€|euros)?[^a-z0-9]{0,12}(par mois|mensuelles?|trimestrielles?|par trimestre|annuelles?|par an)/
    );

  const parseNumber = (val?: string | null) => {
    if (!val) return null;
    const normalized = val.replace(/\s/g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  };

  const isReasonableMonthlyRent = (val: number | null) => val !== null && val >= 300 && val <= 10000;

  const priceValue = parseNumber(priceMatch?.[1]);
  const surfaceValue = parseNumber(surfaceMatch?.[1]);
  const taxValue = parseNumber(taxMatch?.[1]);
  const rawCoproValue = parseNumber(
    coproMatchBefore?.[2] ?? coproMatchAfter?.[1]
  );
  const coproUnit = (
    coproMatchBefore?.[1] ?? coproMatchAfter?.[3] ?? ''
  ).toLowerCase();
  const coproValue =
    rawCoproValue === null
      ? null
      : coproUnit.includes('trimestr')
      ? rawCoproValue / 3
      : coproUnit.includes('annuel') || coproUnit.includes('par an')
      ? rawCoproValue / 12
      : rawCoproValue;

  const hcValue = parseNumber(rentHcMatch?.[1]);
  if (isReasonableMonthlyRent(hcValue)) {
    return {
      price: priceValue,
      rent: hcValue,
      displayedRent: hcValue,
      tenantChargesIncluded: null,
      rentType: 'hc',
      surface: surfaceValue,
      propertyTax: taxValue,
      coproCharges: coproValue,
      propertyType,
    };
  }

  let displayedRent: number | null = null;
  let effectiveRent: number | null = null;
  let tenantChargesIncluded: number | null = null;
  let rentType: 'hc' | 'cc_with_breakdown' | 'cc_without_breakdown' | 'unknown' = 'unknown';

  const ccValue = parseNumber(rentCcMatch?.[1]);
  if (isReasonableMonthlyRent(ccValue) && ccValue !== null) {
    const validCcValue = ccValue;
    displayedRent = validCcValue;
    const includedChargesValue = parseNumber(includedChargesMatch?.[1]);
    if (includedChargesValue && includedChargesValue > 0 && validCcValue - includedChargesValue > 0) {
      tenantChargesIncluded = includedChargesValue;
      effectiveRent = validCcValue - includedChargesValue;
      rentType = 'cc_with_breakdown';
    } else {
      rentType = 'cc_without_breakdown';
    }
  } else {
    const rentedValue = parseNumber(rentedMatch?.[1]);
    const genericRent = parseNumber(genericRentMatch?.[1]);
    if (isReasonableMonthlyRent(rentedValue)) {
      displayedRent = rentedValue;
      effectiveRent = rentedValue;
      rentType = 'unknown';
    } else if (isReasonableMonthlyRent(genericRent)) {
      displayedRent = genericRent;
      effectiveRent = genericRent;
      rentType = 'unknown';
    }
  }

  return {
    price: priceValue,
    rent: effectiveRent,
    displayedRent,
    tenantChargesIncluded,
    rentType,
    surface: surfaceValue,
    propertyTax: taxValue,
    coproCharges: coproValue,
    propertyType,
  };
};

const USEFUL_CONTENT_KEYWORDS =
  /(loyer|charges|taxe fonci[eè]re|prix|surface|pi[eè]ce|m²|m2|appartement|maison|copropri[eé]t[eé])/i;

const NOISE_PATTERNS = [
  /cookies?/i,
  /mentions l[eé]gales?/i,
  /conditions?/i,
  /partager|share/i,
  /simuler mon pr[eê]t/i,
  /bouton de partage/i,
  /contactez[- ]?nous|contact us/i,
  /politique de confidentialit[eé]/i,
];

const normalizeExtractedFragment = (value: string) =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isPhoneOnlyLike = (value: string) =>
  /^(?:\+?\d[\d\s().-]{7,}|0\d(?:[\s.-]?\d{2}){4})$/.test(value);

const cleanExtractedText = (
  fragments: string[],
  options?: { minLength?: number; maxLength?: number }
): string | null => {
  const minLength = options?.minLength ?? 20;
  const maxLength = options?.maxLength ?? 5000;
  const unique = new Set<string>();
  const kept: string[] = [];
  let previous = '';

  for (const raw of fragments) {
    const text = normalizeExtractedFragment(raw);
    if (!text) continue;
    if (NOISE_PATTERNS.some((pattern) => pattern.test(text))) continue;
    if (isPhoneOnlyLike(text)) continue;
    if (text.length < minLength && !USEFUL_CONTENT_KEYWORDS.test(text)) continue;
    if (text === previous || unique.has(text)) continue;

    previous = text;
    unique.add(text);
    kept.push(text);
  }

  if (kept.length === 0) {
    return null;
  }

  const joined = normalizeExtractedFragment(kept.join(' '));
  if (!joined) {
    return null;
  }
  return joined.slice(0, maxLength);
};

const extractSimpleBodyText = ($: cheerio.CheerioAPI) =>
  normalizeExtractedFragment(
    $('body')
      .text()
      .replace(/(cookies|conditions|mentions légales)/gi, '')
  );

const extractLeboncoinData = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    let jsonText = '';

    $('script[type="application/ld+json"]').each((_, el) => {
      const content = $(el).html();
      if (content) {
        jsonText += `${content} `;
      }
    });

    // Prefer targeted visible content extraction, then fallback to simpler body text.
    const visibleChunks = $('body')
      .find('h1, h2, h3, p, span, li, div')
      .map((_, el) => $(el).text())
      .get();
    const cleanedVisibleText = cleanExtractedText(visibleChunks, { minLength: 18, maxLength: 5000 });
    const fallbackVisibleText = extractSimpleBodyText($).slice(0, 5000);
    const visibleText =
      cleanedVisibleText && cleanedVisibleText.length >= 220
        ? cleanedVisibleText
        : cleanedVisibleText ?? fallbackVisibleText;

    const finalText = `
STRUCTURED_DATA:
${normalizeExtractedFragment(jsonText)}

VISIBLE_TEXT:
${visibleText}
    `;

    return finalText.replace(/\s+/g, ' ').trim().slice(0, 5000);
  } catch (error) {
    console.error('Leboncoin extraction failed', error);
    return null;
  }
};

const fetchListingTextFromUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    const extractedChunks = $('body')
      .find('h1, h2, h3, p, span, li, div')
      .map((_, el) => $(el).text())
      .get();

    // Keep this safe: if cleaned extraction is too weak, fallback to simpler body text extraction.
    const cleanedText = cleanExtractedText(extractedChunks, { minLength: 18, maxLength: 5000 });
    if (cleanedText && cleanedText.length >= 220) {
      return cleanedText;
    }

    const fallbackText = extractSimpleBodyText($).slice(0, 5000);
    if (!fallbackText) {
      return cleanedText ?? null;
    }
    return cleanedText && cleanedText.length > 0
      ? normalizeExtractedFragment(`${cleanedText} ${fallbackText}`).slice(0, 5000)
      : fallbackText;
  } catch (error) {
    console.error('Scraping failed', error);
    return null;
  }
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    price: { type: ['number', 'null'] },
    surface: { type: ['number', 'null'] },
    rooms: { type: ['number', 'null'] },
    city: { type: ['string', 'null'] },
    estimatedRent: { type: ['number', 'null'] },
    effectiveRent: { type: ['number', 'null'] },
    displayedRent: { type: ['number', 'null'] },
    tenantChargesIncluded: { type: ['number', 'null'] },
    rentType: { type: 'string' },
    rentLow: { type: ['number', 'null'] },
    rentHigh: { type: ['number', 'null'] },
    verdict: { type: 'string' },
    confidence: { type: 'string' },
    reasoning: { type: 'string' },
    coproCharges: { type: ['number', 'null'] },
    propertyTax: { type: ['number', 'null'] },
    marketComment: { type: 'string' },
    rentSource: { type: ['string', 'null'] },
    propertyType: { type: ['string', 'null'] },
    marketRentAvg: { type: ['number', 'null'] },
    marketRentLow: { type: ['number', 'null'] },
    marketRentHigh: { type: ['number', 'null'] },
  },
  required: [
    'price',
    'surface',
    'rooms',
    'city',
    'estimatedRent',
    'effectiveRent',
    'displayedRent',
    'tenantChargesIncluded',
    'rentType',
    'rentLow',
    'rentHigh',
    'verdict',
    'confidence',
    'reasoning',
    'coproCharges',
    'propertyTax',
    'marketComment',
    'rentSource',
    'propertyType',
    'marketRentAvg',
    'marketRentLow',
    'marketRentHigh',
  ],
} as const;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured.' },
      { status: 500 }
    );
  }

  let payload: { listingUrl?: unknown; listingText?: unknown };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const listingUrl =
    typeof payload?.listingUrl === 'string' ? payload.listingUrl.trim() : '';
  const isLeboncoin = listingUrl.includes('leboncoin');
  let listingText =
    typeof payload?.listingText === 'string' ? payload.listingText.trim() : '';

  if (!listingText && listingUrl) {
    let scrapedText: string | null = null;

    if (isLeboncoin) {
      scrapedText = await extractLeboncoinData(listingUrl);
    }

    if (!scrapedText) {
      scrapedText = await fetchListingTextFromUrl(listingUrl);
    }

    if (scrapedText) {
      listingText = scrapedText;
    }
  }

  const openai = new OpenAI({ apiKey });
  const deterministicData = extractDeterministicData(listingText || '');

  console.log('TEXT SENT TO AI:', listingText?.slice(0, 300));

  const prompt = `
Tu es un analyste immobilier expert en investissement locatif.

OBJECTIF :
Extraire les données de l’annonce de manière STRICTE et FIABLE, sans jamais introduire d’erreur sur le loyer.

---

RÈGLES CRITIQUES (OBLIGATOIRES) :

1. LOYER
- Tu dois ABSOLUMENT distinguer :
  - loyer hors charges (HC)
  - loyer charges comprises (CC)

CAS 1 : Loyer HC détecté
→ effectiveRent = loyer HC

CAS 2 : Loyer CC + détail des charges ("dont X€ de charges")
→ effectiveRent = CC - charges locataire

CAS 3 : Loyer CC sans détail
→ effectiveRent = null
→ estimatedRent doit être calculé (obligatoire)
→ rentType = "cc_without_breakdown"

CAS 4 : Loyer ambigu
→ effectiveRent = null
→ estimatedRent obligatoire

INTERDICTION :
- Ne JAMAIS considérer un loyer CC comme un loyer HC
- Ne JAMAIS inventer une décomposition de charges

---

2. CHARGES
- coproCharges = charges NON récupérables (propriétaire uniquement)
- propertyTax = taxe foncière annuelle

IMPORTANT :
- Les charges locataire (dans CC) NE DOIVENT PAS être incluses dans coproCharges

---

3. PRIORITÉ DES DONNÉES
Tu dois utiliser en priorité :
- les données structurées (JSON, ld+json)
- puis le texte

Si une valeur est présente :
→ tu DOIS la garder EXACTEMENT

---

4. ESTIMATION DU LOYER (si nécessaire)
Si effectiveRent est null :
→ estime un loyer réaliste basé sur :
- ville
- surface
- type de bien
- standing

---

5. QUALITÉ DES DONNÉES
confidence :
- "élevée" → données claires
- "moyenne" → estimation partielle
- "faible" → peu d’infos

---

6. FORMAT STRICT
- JSON uniquement
- aucun texte
- aucune explication hors JSON

---

DONNÉES DÉJÀ EXTRAITES :
${JSON.stringify(deterministicData)}

---

URL :
${listingUrl || 'non fournie'}

---

TEXTE :
${listingText || 'non fourni'}
`;

  try {
    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'real_estate_analysis',
          schema: responseSchema,
        },
      },
    });

    const raw = response.output_text ?? '{}';
    const aiData = JSON.parse(raw);

    const surfaceForDataset =
      deterministicData.surface ?? (typeof aiData.surface === 'number' ? aiData.surface : null);
    const propertyTypeForDataset =
      deterministicData.propertyType ??
      (typeof aiData.propertyType === 'string' ? aiData.propertyType : null);
    const datasetRentRange = getRentFromDataset(
      typeof aiData.city === 'string' ? aiData.city : null,
      surfaceForDataset,
      typeof aiData.rooms === 'number' ? aiData.rooms : null,
      propertyTypeForDataset
    );

    const datasetEstimatedRent = !deterministicData.rent ? datasetRentRange?.avg ?? null : null;
    const estimatedRentValue =
      deterministicData.rent ??
      datasetEstimatedRent ??
      (typeof aiData.estimatedRent === 'number' ? aiData.estimatedRent : null) ??
      null;

    const effectiveRentValue = deterministicData.rent ?? datasetEstimatedRent ?? null;

    const displayedRentValue =
      deterministicData.displayedRent ??
      (typeof aiData.displayedRent === 'number' ? aiData.displayedRent : null) ??
      null;

    const rentSource =
      deterministicData.rent
        ? 'listing'
        : datasetEstimatedRent
        ? 'dataset'
        : typeof aiData.estimatedRent === 'number'
        ? 'ai'
        : null;

    const marketRentAvg = datasetRentRange?.avg ?? null;
    const marketRentLow = datasetRentRange?.low ?? null;
    const marketRentHigh = datasetRentRange?.high ?? null;

    const finalData = {
      ...aiData,
      price: deterministicData.price ?? aiData.price ?? null,
      surface: deterministicData.surface ?? aiData.surface ?? null,
      propertyTax: deterministicData.propertyTax ?? aiData.propertyTax ?? null,
      coproCharges: deterministicData.coproCharges ?? aiData.coproCharges ?? null,
      estimatedRent: estimatedRentValue,
      effectiveRent: effectiveRentValue,
      displayedRent: displayedRentValue,
      tenantChargesIncluded:
        deterministicData.tenantChargesIncluded ?? aiData.tenantChargesIncluded ?? null,
      rentType: deterministicData.rentType ?? aiData.rentType ?? 'unknown',
      rentLow: datasetRentRange?.low ?? aiData.rentLow ?? null,
      rentHigh: datasetRentRange?.high ?? aiData.rentHigh ?? null,
      rentSource,
      propertyType:
        deterministicData.propertyType ??
        (typeof aiData.propertyType === 'string' ? aiData.propertyType : null),
      marketRentAvg,
      marketRentLow,
      marketRentHigh,
    };

    return NextResponse.json(finalData);
  } catch (error) {
    console.error('AI analysis failed', error);
    return NextResponse.json({ error: 'AI analysis failed.' }, { status: 500 });
  }
}
