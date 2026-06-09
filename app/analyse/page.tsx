'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type Result = {
  annualRent: number;
  totalInvestment: number;
  grossYield: number;
  netYield: number;
  monthlyPayment: number;
  monthlyCashflow: number;
  notaryFees: number;
  realCashflow: number;
  monthlyCharges: number;
  loanAmount: number;
  apportAmount: number;
  effectiveRent: number;
  displayedRent: number | null;
  tenantChargesIncluded: number | null;
  rentType: 'hc' | 'cc_with_breakdown' | 'cc_without_breakdown' | 'unknown' | 'manual' | 'default';
  rentReliability: 'deterministic' | 'cc_estimated' | 'ai_fallback' | 'default' | 'manual';
  rentWarning: string | null;
  score: number;
  status: string;
  statusColor: string;
  insight: string;
  priceToTarget: number;
  targetPriceGross8: number;
  targetPriceBreakEven: number;
  negotiationGapGross8: number;
  negotiationGapBreakEven: number;
  rentSource: 'listing' | 'dataset' | 'ai' | null;
  marketRentAvg: number | null;
  marketRentLow: number | null;
  marketRentHigh: number | null;
};

type AiEstimate = {
  estimatedRent: number;
  rentLow: number;
  rentHigh: number;
  verdict: string;
  confidence: string;
  reasoning: string;
  marketComment: string;
};

type AiApiResponse = {
  price: number | null;
  surface: number | null;
  rooms: number | null;
  city: string | null;
  estimatedRent: number | null;
  effectiveRent: number | null;
  displayedRent: number | null;
  tenantChargesIncluded: number | null;
  rentType: string | null;
  rentLow: number | null;
  rentHigh: number | null;
  verdict: string | null;
  confidence: string | null;
  reasoning: string | null;
  coproCharges: number | null;
  propertyTax: number | null;
  marketComment: string | null;
  rentSource: string | null;
  marketRentAvg: number | null;
  marketRentLow: number | null;
  marketRentHigh: number | null;
};

type PropertyType = 'apartment' | 'house' | 'building';

type MarketRent = {
  marketRentAvg: number | null;
  marketRentLow: number | null;
  marketRentHigh: number | null;
};

type CitySuggestion = {
  value: string;
  label: string;
};

const rentTypeLabels: Record<string, string> = {
  hc: 'hors charges',
  cc_with_breakdown: 'charges comprises (détail détecté)',
  cc_without_breakdown: 'charges comprises (sans détail)',
  unknown: 'type non précisé',
  manual: 'saisie manuelle',
  default: 'valeur par défaut',
};

const rentReliabilityLabels: Record<string, string> = {
  deterministic: "Donnée issue de l'annonce",
  cc_estimated: 'Estimation (CC sans détail)',
  ai_fallback: 'Estimation automatique',
  default: 'Valeur par défaut',
  manual: 'Renseignée manuellement',
};

type RentDisplayInfo = {
  title: string;
  subtitle: string | null;
  subtitleStyle?: { fontSize?: string; color?: string; fontWeight?: number };
};

const getRentDisplayInfo = (source: Result['rentSource']): RentDisplayInfo => {
  if (source === 'dataset') {
    return {
      title: 'Estimation marché',
      subtitle: 'Source : données officielles nationales',
      subtitleStyle: { color: '#1d4ed8', fontWeight: 600 },
    };
  }
  if (source === 'ai') {
    return {
      title: 'Loyer estimé',
      subtitle: 'Source : estimation automatique',
      subtitleStyle: { color: '#b45309' },
    };
  }
  return {
    title: 'Loyer saisi',
    subtitle: null,
  };
};

const normalizeRentSource = (source: string | null | undefined): Result['rentSource'] => {
  if (source === 'listing' || source === 'dataset' || source === 'ai') {
    return source;
  }
  return null;
};

const getRentPosition = (
  effectiveRent: number | null | undefined,
  rentLow: number | null | undefined,
  rentHigh: number | null | undefined
): number | null => {
  if (
    effectiveRent === null ||
    effectiveRent === undefined ||
    rentLow === null ||
    rentLow === undefined ||
    rentHigh === null ||
    rentHigh === undefined
  ) {
    return null;
  }
  if (rentHigh <= rentLow) {
    return null;
  }
  const ratio = ((effectiveRent - rentLow) / (rentHigh - rentLow)) * 100;
  if (!Number.isFinite(ratio)) {
    return null;
  }
  return Math.min(100, Math.max(0, ratio));
};

const getCashflowScore = (cashflow: number) => {
  if (cashflow >= 200) return 10;
  if (cashflow >= 100) return 9;
  if (cashflow >= 0) return 8;
  if (cashflow >= -50) return 7;
  if (cashflow >= -100) return 6;
  if (cashflow >= -200) return 4.5;
  if (cashflow >= -300) return 3.5;
  if (cashflow >= -500) return 2;
  return 1;
};

const getYieldScore = (grossYield: number) => {
  if (grossYield >= 10) return 10;
  if (grossYield >= 8) return 9;
  if (grossYield >= 7) return 8;
  if (grossYield >= 6) return 7;
  if (grossYield >= 5) return 5.5;
  if (grossYield >= 4) return 4;
  if (grossYield >= 3) return 2.5;
  return 1;
};

const getMarketScore = ({
  effectiveRent,
  marketRentLow,
  marketRentHigh,
}: {
  effectiveRent: number;
  marketRentLow?: number | null;
  marketRentHigh?: number | null;
}) => {
  if (!marketRentLow || !marketRentHigh) return 5;
  if (effectiveRent < marketRentLow) return 8.5;
  if (effectiveRent > marketRentHigh) return 3.5;
  return 6.5;
};

const getChargesScore = (monthlyCharges: number, monthlyRent: number) => {
  if (monthlyRent <= 0) return 5;
  const ratio = monthlyCharges / monthlyRent;
  if (ratio <= 0.15) return 8.5;
  if (ratio <= 0.25) return 7;
  if (ratio <= 0.35) return 5.5;
  if (ratio <= 0.45) return 4;
  return 2;
};

const calculateGlobalScore = ({
  realCashflow,
  grossYield,
  effectiveRent,
  marketRentLow,
  marketRentHigh,
  monthlyCharges,
}: {
  realCashflow: number;
  grossYield: number;
  effectiveRent: number;
  marketRentLow?: number | null;
  marketRentHigh?: number | null;
  monthlyCharges: number;
}) => {
  const cashflowScore = getCashflowScore(realCashflow);
  const yieldScore = getYieldScore(grossYield);
  const marketScore = getMarketScore({
    effectiveRent,
    marketRentLow,
    marketRentHigh,
  });
  const chargesScore = getChargesScore(monthlyCharges, effectiveRent);

  const weighted =
    cashflowScore * 0.45 +
    yieldScore * 0.25 +
    marketScore * 0.2 +
    chargesScore * 0.1;

  return Math.max(1, Math.min(10, Number(weighted.toFixed(1))));
};

const evaluateDeal = ({
  grossYield,
  realCashflow,
  effectiveRent,
  marketRentLow,
  marketRentHigh,
  monthlyCharges,
}: {
  grossYield: number;
  realCashflow: number;
  effectiveRent: number;
  marketRentLow?: number | null;
  marketRentHigh?: number | null;
  monthlyCharges: number;
}) => {
  const score = calculateGlobalScore({
    realCashflow,
    grossYield,
    effectiveRent,
    marketRentLow,
    marketRentHigh,
    monthlyCharges,
  });

  if (score >= 7.5) return { score, status: 'Bon deal', statusColor: '#15803d' };
  if (score >= 5) return { score, status: 'Correct', statusColor: '#d97706' };
  return { score, status: 'Peu rentable', statusColor: '#dc2626' };
};

const generateInsight = (grossYield: number, realCashflow: number) => {
  if (realCashflow >= 0 && grossYield >= 7) {
    return 'Cashflow positif et rendement solide : la rentabilité est déjà équilibrée à ce prix.';
  }
  if (realCashflow > -200 && grossYield >= 5) {
    return 'Cashflow légèrement négatif avec un rendement correct : le projet reste viable sous condition de négociation.';
  }
  if (realCashflow > -500) {
    return 'Cashflow négatif marqué : la rentabilité est insuffisante sans baisse de prix.';
  }
  return "Cashflow très dégradé ou rendement trop faible : le prix actuel n'est pas cohérent avec l'objectif locatif.";
};

const calculatePriceForTargetGrossYield = (
  annualRent: number,
  works: number,
  notaryRatePercent: number,
  targetYield = 0.08
) => {
  if (annualRent <= 0 || targetYield <= 0) {
    return 0;
  }
  const notaryRate = (Number.isFinite(notaryRatePercent) ? notaryRatePercent : 0) / 100;
  const denominator = 1 + notaryRate;
  if (denominator <= 0) {
    return 0;
  }
  const price = (annualRent / targetYield - works) / denominator;
  return Math.max(0, Number.isFinite(price) ? price : 0);
};

const calculateMaxLoanFromMonthlyPayment = (
  monthlyPayment: number,
  interestRatePercent: number,
  loanDurationYears: number
) => {
  if (monthlyPayment <= 0 || loanDurationYears <= 0) {
    return 0;
  }
  const r = (Number.isFinite(interestRatePercent) ? interestRatePercent : 0) / 12 / 100;
  const n = loanDurationYears * 12;
  if (n <= 0) {
    return 0;
  }
  if (r === 0) {
    return Math.max(0, monthlyPayment * n);
  }
  const factor = (1 - Math.pow(1 + r, -n)) / r;
  const capital = monthlyPayment * factor;
  return Math.max(0, Number.isFinite(capital) ? capital : 0);
};

const calculatePriceForBreakEvenCashflow = ({
  monthlyRent,
  coproCharges,
  propertyTax,
  interestRatePercent,
  loanDurationYears,
  works,
  notaryRatePercent,
  apport,
}: {
  monthlyRent: number;
  coproCharges: number;
  propertyTax: number;
  interestRatePercent: number;
  loanDurationYears: number;
  works: number;
  notaryRatePercent: number;
  apport: number;
}) => {
  const monthlyCharges = (Number.isFinite(coproCharges) ? coproCharges : 0) +
    (Number.isFinite(propertyTax) ? propertyTax : 0) / 12;
  const targetMonthlyPayment = monthlyRent - monthlyCharges;
  if (targetMonthlyPayment <= 0) {
    return 0;
  }
  const maxLoan = calculateMaxLoanFromMonthlyPayment(
    targetMonthlyPayment,
    interestRatePercent,
    loanDurationYears
  );
  const notaryRate = (Number.isFinite(notaryRatePercent) ? notaryRatePercent : 0) / 100;
  const denominator = 1 + notaryRate;
  if (denominator <= 0) {
    return 0;
  }
  const price = (maxLoan + (Number.isFinite(apport) ? apport : 0) - (Number.isFinite(works) ? works : 0)) / denominator;
  return Math.max(0, Number.isFinite(price) ? price : 0);
};

const getScoreBackground = (score: number) => {
  if (score >= 7.5) {
    return '#dcfce7';
  }
  if (score >= 5) {
    return '#fef3c7';
  }
  return '#fee2e2';
};

const generateMockAI = (purchaseValue: number, rentValue?: number, grossYield?: number) => {
  if (purchaseValue <= 0) {
    return null;
  }

  const baseRent = rentValue && rentValue > 0 ? rentValue : purchaseValue * 0.004;
  const rentLow = baseRent * 0.9;
  const rentHigh = baseRent * 1.1;
  const yieldValue =
    typeof grossYield === 'number' ? grossYield : ((baseRent * 12) / purchaseValue) * 100;

  let verdict = 'loyer prudent';
  if (yieldValue > 8) {
    verdict = 'loyer plutôt optimiste';
  } else if (yieldValue >= 5) {
    verdict = 'loyer cohérent';
  }

  return {
    estimatedRent: baseRent,
    rentLow,
    rentHigh,
    verdict,
    confidence: 'faible',
    reasoning: 'Estimation automatique basée sur un ratio prix/loyer.',
    marketComment: 'Analyse de marché indisponible.',
  };
};

export default function AnalysePage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [surface, setSurface] = useState('');
  const [rooms, setRooms] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [unknownRent, setUnknownRent] = useState(false);
  const [works, setWorks] = useState('0');
  const [interestRate, setInterestRate] = useState('4');
  const [loanDuration, setLoanDuration] = useState('25');
  const [notaryRate, setNotaryRate] = useState('8');
  const [coproCharges, setCoproCharges] = useState('');
  const [propertyTax, setPropertyTax] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [listingText, setListingText] = useState('');
  const [analysisMode, setAnalysisMode] = useState<'auto' | 'manual'>('manual');
  const [hasApport, setHasApport] = useState(false);
  const [apport, setApport] = useState('0');
  const [showAutoFinancing, setShowAutoFinancing] = useState(false);
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const [aiResult, setAiResult] = useState<AiEstimate | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [scrapingError, setScrapingError] = useState(false);
  const [insufficientDataError, setInsufficientDataError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [tmi, setTmi] = useState(30);
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [marketRent, setMarketRent] = useState<MarketRent>({
    marketRentAvg: null,
    marketRentLow: null,
    marketRentHigh: null,
  });
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);

  const formatCurrency = (value: number | null | undefined) =>
    (typeof value === 'number' && Number.isFinite(value) ? value : 0).toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    });

  const purchasePreviewValue = parseFloat(purchasePrice);
  const notaryRatePreviewValue = parseFloat(notaryRate);
  const estimatedNotaryFees =
    !Number.isNaN(purchasePreviewValue) && !Number.isNaN(notaryRatePreviewValue)
      ? purchasePreviewValue * (notaryRatePreviewValue / 100)
      : 0;

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!data.session) {
        router.replace('/login');
        return;
      }

      setIsAuthChecking(false);
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (result && scoreCardRef.current) {
      scoreCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [result]);

  useEffect(() => {
    const surfaceValue = parseFloat(surface);
    const roomsValue = parseFloat(rooms);

    if (!city.trim() || Number.isNaN(surfaceValue) || surfaceValue <= 0) {
      setMarketRent({
        marketRentAvg: null,
        marketRentLow: null,
        marketRentHigh: null,
      });
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      city: city.trim(),
      surface: String(surfaceValue),
      propertyType,
    });

    if (!Number.isNaN(roomsValue) && roomsValue > 0) {
      params.set('rooms', String(roomsValue));
    }
    fetch(`/api/rents?${params.toString()}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: MarketRent | null) => {
        if (!data) return;
        setMarketRent({
          marketRentAvg: data.marketRentAvg,
          marketRentLow: data.marketRentLow,
          marketRentHigh: data.marketRentHigh,
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setMarketRent({
          marketRentAvg: null,
          marketRentLow: null,
          marketRentHigh: null,
        });
      });

    return () => controller.abort();
  }, [city, propertyType, rooms, surface]);

  useEffect(() => {
    const query = city.trim();
    if (query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/rents/cities?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { cities?: CitySuggestion[] } | null) => {
        setCitySuggestions(data?.cities ?? []);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setCitySuggestions([]);
      });

    return () => controller.abort();
  }, [city]);

  const handleAutoAnalyse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnalysisMode('auto');
    setSaveStatus('idle');
    setSaveMessage('');

    const resetAutoResult = () => {
      setResult(null);
      setAiResult(null);
    };

    const triggerScrapingError = () => {
      setScrapingError(true);
      setInsufficientDataError(false);
      resetAutoResult();
    };

    const triggerInsufficientDataError = () => {
      setScrapingError(false);
      setInsufficientDataError(true);
      resetAutoResult();
    };

    setScrapingError(false);
    setInsufficientDataError(false);

    let apiAnalysis: AiApiResponse | null = null;
    const trimmedUrl = listingUrl.trim();
    const trimmedText = listingText.trim();

    if (trimmedUrl || trimmedText) {
      try {
        const response = await fetch('/api/analyse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingUrl: trimmedUrl || undefined,
            listingText: trimmedText || undefined,
          }),
        });
        if (response.ok) {
          apiAnalysis = await response.json();
        } else {
          console.error('AI analyse error', await response.text());
        }
      } catch (error) {
        console.error('AI analyse request failed', error);
      }
    }

    const scrapingFailed =
      !listingText.trim() &&
      (!apiAnalysis || (!apiAnalysis.effectiveRent && !apiAnalysis.estimatedRent));

    if (scrapingFailed) {
      triggerScrapingError();
      return;
    }

    if (!apiAnalysis) {
      triggerScrapingError();
      return;
    }

    const hasLocationInfo =
      typeof apiAnalysis.city === 'string' && apiAnalysis.city.trim().length > 0;
    if (!hasLocationInfo) {
      triggerInsufficientDataError();
      return;
    }

    const normalizedUrl = listingUrl.toLowerCase();
    const fallbackPurchase = normalizedUrl.includes('paris') ? 350000 : 220000;
    const purchaseBase =
      apiAnalysis && typeof apiAnalysis.price === 'number' && apiAnalysis.price > 0
        ? apiAnalysis.price
        : fallbackPurchase;

    const displayedRent =
      apiAnalysis && typeof apiAnalysis.displayedRent === 'number' && apiAnalysis.displayedRent > 0
        ? apiAnalysis.displayedRent
        : null;
    let tenantChargesIncluded =
      apiAnalysis && typeof apiAnalysis.tenantChargesIncluded === 'number' && apiAnalysis.tenantChargesIncluded > 0
        ? apiAnalysis.tenantChargesIncluded
        : null;
    const rentType = (apiAnalysis?.rentType as Result['rentType'] | undefined) ?? 'unknown';
    const deterministicRent =
      apiAnalysis &&
      apiAnalysis.rentType !== 'cc_without_breakdown' &&
      typeof apiAnalysis.effectiveRent === 'number' &&
      apiAnalysis.effectiveRent > 0
        ? apiAnalysis.effectiveRent
        : null;
    const aiSuggestedRent =
      apiAnalysis && typeof apiAnalysis.estimatedRent === 'number' && apiAnalysis.estimatedRent > 0
        ? apiAnalysis.estimatedRent
        : null;

    if (displayedRent && tenantChargesIncluded && tenantChargesIncluded >= displayedRent) {
      tenantChargesIncluded = null;
    }

    let effectiveRentValue = deterministicRent ?? null;
    let rentReliability: Result['rentReliability'] = effectiveRentValue ? 'deterministic' : 'ai_fallback';
    let rentWarning: string | null = null;

    if (!effectiveRentValue && rentType === 'cc_without_breakdown') {
      rentWarning =
        "Le loyer annoncé est charges comprises sans détail des charges récupérables. Le cashflow peut être imprécis.";
      if (displayedRent && displayedRent > 0) {
        const estimatedCharges = displayedRent * 0.1;
        tenantChargesIncluded = estimatedCharges;
        effectiveRentValue = displayedRent - estimatedCharges;
        rentReliability = 'cc_estimated';
      } else if (aiSuggestedRent) {
        effectiveRentValue = aiSuggestedRent;
        rentReliability = 'cc_estimated';
      }
    } else if (!effectiveRentValue && aiSuggestedRent) {
      effectiveRentValue = aiSuggestedRent;
      rentReliability = 'ai_fallback';
    }

    if (!effectiveRentValue || effectiveRentValue <= 0) {
      triggerInsufficientDataError();
      return;
    }

    setScrapingError(false);
    setInsufficientDataError(false);

    const worksValue = parseFloat(works);
    const notaryRateValue = parseFloat(notaryRate);
    const interestValue = parseFloat(interestRate);
    const durationValue = parseFloat(loanDuration);
    const coproValue = parseFloat(coproCharges);
    const taxValue = parseFloat(propertyTax);
    const apportValue = parseFloat(apport);

    const safeWorks = Number.isNaN(worksValue) ? 0 : worksValue;
    const safeNotary = Number.isNaN(notaryRateValue) ? 8 : notaryRateValue;
    const safeRate = Number.isNaN(interestValue) ? 3 : interestValue;
    const safeDuration = Number.isNaN(durationValue) ? 20 : durationValue;
    const aiCoproCharges =
      apiAnalysis && typeof apiAnalysis.coproCharges === 'number' ? apiAnalysis.coproCharges : null;
    const aiPropertyTax =
      apiAnalysis && typeof apiAnalysis.propertyTax === 'number' ? apiAnalysis.propertyTax : null;

    const userCoproCharges = Number.isNaN(coproValue) ? null : coproValue;
    const userPropertyTax = Number.isNaN(taxValue) ? null : taxValue;

    const safeCopro = userCoproCharges ?? (aiCoproCharges ?? 0);
    const safeTax = userPropertyTax ?? (aiPropertyTax ?? 0);
    const safeApport = hasApport && !Number.isNaN(apportValue) ? apportValue : 0;

    const annualRent = effectiveRentValue * 12;
    const notaryFees = purchaseBase * (safeNotary / 100);
    const totalInvestment = purchaseBase + safeWorks + notaryFees;
    const loanAmount = totalInvestment - safeApport;
    const safeLoanAmount = loanAmount > 0 ? loanAmount : totalInvestment;

    if (totalInvestment <= 0 || safeDuration <= 0) {
      return;
    }

    const monthlyRate = safeRate / 12 / 100;
    const numberOfPayments = safeDuration * 12;

    if (numberOfPayments <= 0) {
      return;
    }

    const monthlyPayment =
      monthlyRate === 0
        ? safeLoanAmount / numberOfPayments
        : (safeLoanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));

    const grossYield = (annualRent / totalInvestment) * 100;
    const monthlyCharges = safeCopro + safeTax / 12;
    const netYield = ((annualRent - monthlyCharges * 12) / totalInvestment) * 100;
    const monthlyCashflow = effectiveRentValue - monthlyPayment;
    const realCashflow = effectiveRentValue - monthlyPayment - monthlyCharges;

    const evaluation = evaluateDeal({
      grossYield,
      realCashflow,
      effectiveRent: effectiveRentValue,
      marketRentLow: apiAnalysis?.marketRentLow ?? null,
      marketRentHigh: apiAnalysis?.marketRentHigh ?? null,
      monthlyCharges,
    });
    const targetPriceGross8 = calculatePriceForTargetGrossYield(annualRent, safeWorks, safeNotary);
    const targetPriceBreakEven = calculatePriceForBreakEvenCashflow({
      monthlyRent: effectiveRentValue,
      coproCharges: safeCopro,
      propertyTax: safeTax,
      interestRatePercent: safeRate,
      loanDurationYears: safeDuration,
      works: safeWorks,
      notaryRatePercent: safeNotary,
      apport: safeApport,
    });
    const insight = generateInsight(grossYield, realCashflow);
    const negotiationGapGross8 = targetPriceGross8 - purchaseBase;
    const negotiationGapBreakEven = targetPriceBreakEven - purchaseBase;

    const rentLow =
      apiAnalysis.rentLow && apiAnalysis.rentLow > 0
        ? apiAnalysis.rentLow
        : (apiAnalysis?.estimatedRent ?? effectiveRentValue) * 0.9;

    const rentHigh =
      apiAnalysis.rentHigh && apiAnalysis.rentHigh > 0
        ? apiAnalysis.rentHigh
        : (apiAnalysis?.estimatedRent ?? effectiveRentValue) * 1.1;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lastAnalysis', JSON.stringify({
          purchasePrice: String(purchaseBase),
          city: apiAnalysis?.city || '',
          propertyType,
        }));
      } catch {}
    }
    setAiResult({
      estimatedRent: apiAnalysis?.estimatedRent ?? effectiveRentValue,
      rentLow,
      rentHigh,
      verdict: apiAnalysis?.verdict ?? 'loyer cohérent',
      confidence: apiAnalysis?.confidence ?? 'moyenne',
      reasoning: apiAnalysis?.reasoning ?? "Estimation basée sur les informations de l'annonce.",
      marketComment: apiAnalysis?.marketComment ?? 'Commentaire marché indisponible pour cette annonce.',
    });

    const rentTypeForResult: Result['rentType'] = rentType;

    setResult({
      annualRent,
      totalInvestment,
      grossYield,
      netYield,
      monthlyPayment,
      monthlyCashflow,
      notaryFees,
      realCashflow,
      monthlyCharges,
      loanAmount: safeLoanAmount,
      apportAmount: safeApport,
      score: evaluation.score,
      status: evaluation.status,
      statusColor: evaluation.statusColor,
      insight,
      priceToTarget: targetPriceGross8,
      targetPriceGross8,
      targetPriceBreakEven,
      negotiationGapGross8,
      negotiationGapBreakEven,
      effectiveRent: effectiveRentValue,
      displayedRent: displayedRent ?? effectiveRentValue,
      tenantChargesIncluded,
      rentType: rentTypeForResult,
      rentReliability,
      rentWarning,
      rentSource: normalizeRentSource(apiAnalysis?.rentSource),
      marketRentAvg: apiAnalysis?.marketRentAvg ?? null,
      marketRentLow: apiAnalysis?.marketRentLow ?? null,
      marketRentHigh: apiAnalysis?.marketRentHigh ?? null,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnalysisMode('manual');
    setSaveStatus('idle');
    setSaveMessage('');

    const purchaseValue = parseFloat(purchasePrice);
    const rentValue = parseFloat(monthlyRent);
    const surfaceValue = parseFloat(surface);
    const roomsValue = parseFloat(rooms);
    const worksValue = parseFloat(works);
    const interestValue = parseFloat(interestRate);
    const notaryRateValue = parseFloat(notaryRate);
    const durationValue = parseFloat(loanDuration);
    const coproValue = parseFloat(coproCharges);
    const taxValue = parseFloat(propertyTax);
    const apportValue = parseFloat(apport);

    if (
      Number.isNaN(purchaseValue) ||
      Number.isNaN(surfaceValue) ||
      Number.isNaN(roomsValue) ||
      Number.isNaN(worksValue) ||
      Number.isNaN(interestValue) ||
      Number.isNaN(notaryRateValue) ||
      Number.isNaN(durationValue)
    ) {
      return;
    }

    const marketRentAvg = marketRent.marketRentAvg;
    const finalRent = unknownRent ? marketRentAvg ?? 0 : rentValue;

    if (finalRent <= 0) {
      return;
    }

    const safeApport = !Number.isNaN(apportValue) ? apportValue : 0;

    const annualRent = finalRent * 12;
    const notaryFees = purchaseValue * (notaryRateValue / 100);
    const totalInvestment = purchaseValue + worksValue + notaryFees;
    const loanAmount = totalInvestment - safeApport;
    const safeLoanAmount = loanAmount > 0 ? loanAmount : totalInvestment;

    if (totalInvestment <= 0 || durationValue <= 0) {
      return;
    }

    const monthlyRate = interestValue / 12 / 100;
    const numberOfPayments = durationValue * 12;

    if (numberOfPayments <= 0) {
      return;
    }

    const monthlyPayment =
      monthlyRate === 0
        ? safeLoanAmount / numberOfPayments
        : (safeLoanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));

    const grossYield = (annualRent / totalInvestment) * 100;
    const safeCopro = Number.isNaN(coproValue) ? 0 : coproValue;
    const safeTax = Number.isNaN(taxValue) ? 0 : taxValue;
    const monthlyCharges = safeCopro + safeTax / 12;
    const netYield = ((annualRent - monthlyCharges * 12) / totalInvestment) * 100;
    const monthlyCashflow = finalRent - monthlyPayment;
    const realCashflow = finalRent - monthlyPayment - monthlyCharges;

    const evaluation = evaluateDeal({
      grossYield,
      realCashflow,
      effectiveRent: finalRent,
      marketRentLow: marketRent.marketRentLow,
      marketRentHigh: marketRent.marketRentHigh,
      monthlyCharges,
    });
    const targetPriceGross8 = calculatePriceForTargetGrossYield(annualRent, worksValue, notaryRateValue);
    const targetPriceBreakEven = calculatePriceForBreakEvenCashflow({
      monthlyRent: finalRent,
      coproCharges: safeCopro,
      propertyTax: safeTax,
      interestRatePercent: interestValue,
      loanDurationYears: durationValue,
      works: worksValue,
      notaryRatePercent: notaryRateValue,
      apport: safeApport,
    });
    const insight = generateInsight(grossYield, realCashflow);
    const negotiationGapGross8 = targetPriceGross8 - purchaseValue;
    const negotiationGapBreakEven = targetPriceBreakEven - purchaseValue;

    setResult({
      annualRent,
      totalInvestment,
      grossYield,
      netYield,
      monthlyPayment,
      monthlyCashflow,
      notaryFees,
      realCashflow,
      monthlyCharges,
      loanAmount: safeLoanAmount,
      apportAmount: safeApport,
      score: evaluation.score,
      status: evaluation.status,
      statusColor: evaluation.statusColor,
      insight,
      priceToTarget: targetPriceGross8,
      targetPriceGross8,
      targetPriceBreakEven,
      negotiationGapGross8,
      negotiationGapBreakEven,
      effectiveRent: finalRent,
      displayedRent: finalRent,
      tenantChargesIncluded: null,
      rentType: 'manual',
      rentReliability: 'manual',
      rentWarning: null,
      rentSource: unknownRent ? 'dataset' : 'listing',
      marketRentAvg: marketRent.marketRentAvg,
      marketRentLow: marketRent.marketRentLow,
      marketRentHigh: marketRent.marketRentHigh,
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('lastAnalysis', JSON.stringify({
          purchasePrice: String(purchaseValue),
          city: city.trim(),
          propertyType,
        }));
      } catch {}
    }
    setAiResult(null);
  };

  const handleSaveAnalysis = async () => {
    if (!result) return;

    setSaveStatus('saving');
    setSaveMessage('');

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setSaveStatus('error');
      setSaveMessage('Connecte-toi pour enregistrer cette analyse.');
      return;
    }

    const purchaseValue = parseFloat(purchasePrice);
    const surfaceValue = parseFloat(surface);
    const roomsValue = parseFloat(rooms);
    const title = city.trim() ? `Analyse ${city.trim()}` : 'Analyse immobilière';

    const { error } = await supabase.from('analyses').insert({
      user_id: userData.user.id,
      title,
      city: city.trim() || null,
      postal_code: null,
      property_type: propertyType,
      surface: Number.isNaN(surfaceValue) ? null : surfaceValue,
      rooms: Number.isNaN(roomsValue) ? null : roomsValue,
      purchase_price: Number.isNaN(purchaseValue) ? null : purchaseValue,
      effective_rent: result.effectiveRent,
      market_rent_avg: result.marketRentAvg,
      market_rent_low: result.marketRentLow,
      market_rent_high: result.marketRentHigh,
      gross_yield: result.grossYield,
      monthly_cashflow: result.monthlyCashflow,
      real_cashflow: result.realCashflow,
      monthly_payment: result.monthlyPayment,
      monthly_charges: result.monthlyCharges,
      score: result.score,
      analysis_text: result.insight,
      raw_result: result,
    });

    if (error) {
      setSaveStatus('error');
      setSaveMessage(error.message);
      return;
    }

    setSaveStatus('success');
    setSaveMessage('Analyse enregistrée.');
  };

  const inputStyle = {
    marginTop: '6px',
    padding: '14px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '16px',
    color: '#111827',
    backgroundColor: '#fbfcfd',
    width: '100%',
    boxSizing: 'border-box',
  } as const;
  const labelStyle = {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
    color: '#374151',
    fontWeight: 600,
  } as const;
  const cardStyle = {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
  } as const;
  const sectionTitleStyle = {
    margin: '0 0 12px',
    fontSize: '12px',
    fontWeight: 800,
    color: '#6b7280',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  } as const;

  if (isAuthChecking) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#64748b',
          fontSize: '14px',
          fontWeight: 700,
        }}
      >
        Chargement...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #e8edf5 0%, #f8fafc 260px, #f8fafc 100%)',
        padding: '12px',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '430px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)',
        }}
      >
        <header
          style={{
            padding: '18px',
            borderRadius: '16px',
            background: 'linear-gradient(145deg, #0f172a 0%, #1f2937 100%)',
            color: '#ffffff',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            id="copro"
            style={{
              display: 'inline-flex',
              padding: '5px 9px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.10)',
              color: '#dbeafe',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Analyse investisseur
          </div>
          <h1 style={{ margin: '14px 0 0', fontSize: '27px', fontWeight: 850, color: '#ffffff' }}>
            Analyse locative
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.45 }}>
            Rendement, cashflow et marché locatif en une lecture.
          </p>
        </header>

        {result && (
          <div
            ref={scoreCardRef}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '18px',
              borderRadius: '20px',
              background:
                'radial-gradient(circle at top right, rgba(148, 163, 184, 0.32), transparent 34%), linear-gradient(145deg, #0f172a 0%, #111827 48%, #1e293b 100%)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              color: '#ffffff',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: '-34px',
                top: '-48px',
                width: '145px',
                height: '145px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.08)',
              }}
            />
            {(() => {
              const pct = Math.min(Math.max(result.score / 10, 0), 1);
              const r = 28;
              const circ = 2 * Math.PI * r;
              const dash = pct * circ;
              const scoreColor = result.score >= 7.5 ? '#86efac' : result.score >= 5 ? '#fcd34d' : '#fca5a5';
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                      Score global
                    </div>
                    <svg width="72" height="72" viewBox="0 0 72 72">
                      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                      <circle
                        cx="36" cy="36" r={r} fill="none"
                        stroke={scoreColor} strokeWidth="6"
                        strokeDasharray={`${dash} ${circ - dash}`}
                        strokeLinecap="round"
                        transform="rotate(-90 36 36)"
                      />
                      <text x="36" y="40" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="800" fontFamily="inherit">
                        {result.score}
                      </text>
                    </svg>
                  </div>
                  <div
                    style={{
                      padding: '8px 16px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: `1px solid ${scoreColor}40`,
                      color: scoreColor,
                      fontSize: '15px',
                      fontWeight: 800,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {result.status}
                  </div>
                </div>
              );
            })()}
            <div style={{ fontSize: '14px', color: '#dbeafe', lineHeight: 1.45, fontWeight: 650 }}>
              {result.insight}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.09)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
                <div style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700 }}>Cashflow réel</div>
                <div style={{ marginTop: '5px', fontSize: '20px', fontWeight: 900, color: result.realCashflow >= 0 ? '#86efac' : '#fca5a5' }}>
                  {formatCurrency(result.realCashflow)}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.09)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
                <div style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 700 }}>Rendement net</div>
                <div style={{ marginTop: '5px', fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
                  {result.netYield.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {result && (() => {
          const socialRate = 0.172;
          const taxRate = tmi / 100 + socialRate;
          const annual = result.annualRent;
          const foncierTax = annual * 0.70 * taxRate;
          const bicTax = annual * 0.50 * taxRate;
          const foncierNet = result.realCashflow - foncierTax / 12;
          const bicNet = result.realCashflow - bicTax / 12;
          const bicIsBetter = bicNet > foncierNet;
          const fmt = (v: number) => (v < 0 ? '- ' : '') + Math.abs(Math.round(v)).toLocaleString('fr-FR') + ' €';
          return (
            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(226, 232, 240, 0.9)', boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Fiscal · TMI</div>
                <div style={{ flex: 1, display: 'flex', padding: '3px', borderRadius: '8px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                  {[0, 11, 30, 41, 45].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTmi(v)}
                      style={{
                        flex: 1,
                        padding: '6px 2px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: tmi === v ? '#ffffff' : 'transparent',
                        color: tmi === v ? '#111827' : '#6b7280',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: tmi === v ? '0 1px 4px rgba(15, 23, 42, 0.10)' : 'none',
                      }}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Nu · micro-foncier', net: foncierNet, tax: foncierTax, best: !bicIsBetter },
                  { label: 'Meuble · micro-BIC', net: bicNet, tax: bicTax, best: bicIsBetter },
                ].map(({ label, net, tax, best }) => (
                  <div key={label} style={{ padding: '12px', borderRadius: '8px', backgroundColor: best ? '#f0fdf4' : '#f8fafc', border: `1px solid ${best ? '#86efac' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>{label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: net >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(net)}</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginTop: '1px', marginBottom: '8px' }}>net/mois apres impots</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Impot estime</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}>{fmt(tax)}<span style={{ fontSize: '10px', fontWeight: 600 }}>/an</span></div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                Calcul en regime micro — montant reel souvent inferieur grace aux deductions (interets, taxe fonciere, charges). Le LMNP au reel peut etre encore plus avantageux — consultez un comptable specialise.
              </div>
            </div>
          );
        })()}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Bien</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <label style={labelStyle}>
                Prix d'achat
                <input
                  type="number"
                  min="0"
                  value={purchasePrice}
                  onChange={(event) => setPurchasePrice(event.target.value)}
                  placeholder="250000"
                  style={inputStyle}
                />
              </label>
              <label style={labelStyle}>
                Ville
                <input
                  type="text"
                  list="anil-city-suggestions"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Nantes"
                  style={inputStyle}
                />
                <datalist id="anil-city-suggestions">
                  {citySuggestions.map((suggestion) => (
                    <option key={suggestion.value} value={suggestion.label}>
                      {suggestion.label}
                    </option>
                  ))}
                </datalist>
              </label>
              <div>
                <div style={{ marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                  Type
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '6px',
                    padding: '4px',
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {[
                    { value: 'apartment', label: 'Appartement' },
                    { value: 'house', label: 'Maison' },
                    { value: 'building', label: 'Immeuble' },
                  ].map((option) => {
                    const isSelected = propertyType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPropertyType(option.value as PropertyType)}
                        style={{
                          minHeight: '40px',
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isSelected ? '#ffffff' : 'transparent',
                          color: isSelected ? '#111827' : '#6b7280',
                          fontSize: '13px',
                          fontWeight: 800,
                          boxShadow: isSelected ? '0 1px 4px rgba(15, 23, 42, 0.10)' : 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={labelStyle}>
                  Surface
                  <input
                    type="number"
                    min="0"
                    value={surface}
                    onChange={(event) => setSurface(event.target.value)}
                    placeholder="45"
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Pièces
                  <input
                    type="number"
                    min="1"
                    value={rooms}
                    onChange={(event) => setRooms(event.target.value)}
                    placeholder="2"
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Loyer et charges</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '14px', color: '#374151', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={unknownRent}
                  onChange={(event) => setUnknownRent(event.target.checked)}
                  style={{ width: '17px', height: '17px' }}
                />
                Je ne connais pas le loyer
              </label>
              {!unknownRent && (
                <label style={labelStyle}>
                  Loyer mensuel
                  <input
                    type="number"
                    min="0"
                    value={monthlyRent}
                    onChange={(event) => setMonthlyRent(event.target.value)}
                    placeholder="950"
                    style={inputStyle}
                  />
                </label>
              )}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '13px', color: '#1e40af', fontWeight: 700 }}>
                    {unknownRent ? 'Loyer utilisé' : 'Loyer marché'}
                  </span>
                  <strong style={{ fontSize: '17px', color: '#1e3a8a' }}>
                    {marketRent.marketRentAvg ? formatCurrency(marketRent.marketRentAvg) : '--'}
                  </strong>
                </div>
                <div style={{ marginTop: '3px', fontSize: '12px', color: '#2563eb' }}>
                  Données officielles nationales
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={labelStyle}>
                  Charges/mois
                  <input
                    type="number"
                    min="0"
                    value={coproCharges}
                    onChange={(event) => setCoproCharges(event.target.value)}
                    placeholder="120"
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Taxe/an
                  <input
                    type="number"
                    min="0"
                    value={propertyTax}
                    onChange={(event) => setPropertyTax(event.target.value)}
                    placeholder="1200"
                    style={inputStyle}
                  />
                </label>
              </div>
              <label style={labelStyle}>
                Travaux estimés
                <input
                  type="number"
                  min="0"
                  value={works}
                  onChange={(event) => setWorks(event.target.value)}
                  placeholder="0"
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          <div style={cardStyle}>
            <button
              type="button"
              onClick={() => setShowAutoFinancing((prev) => !prev)}
              style={{
                width: '100%',
                border: 'none',
                backgroundColor: 'transparent',
                padding: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <span style={sectionTitleStyle}>Financement</span>
              <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 700 }}>
                {showAutoFinancing ? 'Masquer' : 'Modifier'}
              </span>
            </button>
            {!showAutoFinancing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '13px', color: '#6b7280' }}>
                  <span>Apport {formatCurrency(parseFloat(apport) || 0)}</span>
                  <span>•</span>
                  <span>{interestRate || '4'}%</span>
                  <span>•</span>
                  <span>{loanDuration || '25'} ans</span>
                  <span>•</span>
                  <span>Notaire {formatCurrency(estimatedNotaryFees)}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700 }}>
                  Valeurs par défaut appliquées — vérifie avant d'analyser
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '12px' }}>
                <div>
                  <div style={{ marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                    Frais de notaire
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setNotaryRate('8')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: notaryRate === '8' ? '1px solid #2563eb' : '1px solid #d1d5db',
                        backgroundColor: notaryRate === '8' ? '#eff6ff' : '#ffffff',
                        color: notaryRate === '8' ? '#1d4ed8' : '#374151',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Ancien 8%
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotaryRate('2.5')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: notaryRate === '2.5' ? '1px solid #2563eb' : '1px solid #d1d5db',
                        backgroundColor: notaryRate === '2.5' ? '#eff6ff' : '#ffffff',
                        color: notaryRate === '2.5' ? '#1d4ed8' : '#374151',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Neuf 2,5%
                    </button>
                  </div>
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      color: '#374151',
                      fontSize: '14px',
                    }}
                  >
                    <span>Estimation notaire</span>
                    <strong style={{ color: '#111827' }}>{formatCurrency(estimatedNotaryFees)}</strong>
                  </div>
                </div>
                <label style={labelStyle}>
                  Apport personnel
                  <input
                    type="number"
                    min="0"
                    value={apport}
                    onChange={(event) => setApport(event.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Taux notaire
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={notaryRate}
                    onChange={(event) => setNotaryRate(event.target.value)}
                    placeholder="8"
                    style={inputStyle}
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={labelStyle}>
                    Taux
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={interestRate}
                      onChange={(event) => setInterestRate(event.target.value)}
                      placeholder="4.00"
                      style={inputStyle}
                    />
                  </label>
                  <label style={labelStyle}>
                    Durée
                    <input
                      type="number"
                      min="1"
                      value={loanDuration}
                      onChange={(event) => setLoanDuration(event.target.value)}
                      placeholder="25"
                      style={inputStyle}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              position: 'sticky',
              bottom: '84px',
              zIndex: 20,
              padding: '15px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#111827',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(17, 24, 39, 0.12)',
            }}
          >
            Analyser
          </button>
        </form>

        {!result && (
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
            Le résultat apparaît ici après analyse.
          </p>
        )}

        {result && (
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ ...sectionTitleStyle, color: '#334155' }}>Détails</div>
            {(() => {
              const tooltips: Record<string, string> = {
                'Rendement brut': "Loyer annuel / prix total x 100. Ne tient pas compte des charges.",
                'Rendement net': "Loyer net de charges / prix total x 100. Plus représentatif de la rentabilité réelle.",
                'Cashflow reel': "Loyer mensuel − mensualité − charges. Trésorerie nette chaque mois.",
              };
              const primaryMetrics: [string, string][] = [
                ['Rendement brut', `${result.grossYield.toFixed(2)}%`],
                ['Rendement net', `${result.netYield.toFixed(2)}%`],
                ['Cashflow reel', formatCurrency(result.realCashflow)],
                ['Mensualite', formatCurrency(result.monthlyPayment)],
              ];
              const secondaryMetrics: [string, string][] = [
                ['Loyer annuel', formatCurrency(result.annualRent)],
                ['Charges/mois', formatCurrency(result.monthlyCharges)],
                ['Investissement', formatCurrency(result.totalInvestment)],
                ['Finance', formatCurrency(result.loanAmount)],
              ];
              const labelDisplay: Record<string, string> = {
                'Rendement brut': 'Rendement brut',
                'Rendement net': 'Rendement net',
                'Cashflow reel': 'Cashflow réel',
                'Mensualite': 'Mensualité',
                'Loyer annuel': 'Loyer annuel',
                'Charges/mois': 'Charges/mois',
                'Investissement': 'Investissement',
                'Finance': 'Financé',
              };
              const renderRow = (key: string, value: string) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #eef2f7',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ fontSize: '13px', color: '#475569', fontWeight: 650 }}>
                      {labelDisplay[key]}
                    </div>
                    {tooltips[key] && (
                      <button
                        type="button"
                        onClick={() => setOpenTooltip(openTooltip === key ? null : key)}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: '0 2px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#94a3b8',
                          lineHeight: 1,
                        }}
                      >
                        i
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800, textAlign: 'right' }}>
                    {value}
                  </div>
                </div>
              );
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {openTooltip && tooltips[openTooltip] && (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      fontSize: '12px',
                      color: '#0369a1',
                      lineHeight: 1.5,
                    }}>
                      {tooltips[openTooltip]}
                    </div>
                  )}
                  {primaryMetrics.map(([key, value]) => renderRow(key, value))}
                  {showAllDetails && secondaryMetrics.map(([key, value]) => renderRow(key, value))}
                  <button
                    type="button"
                    onClick={() => setShowAllDetails((prev) => !prev)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '4px 0',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#2563eb',
                      fontWeight: 700,
                      textAlign: 'left',
                    }}
                  >
                    {showAllDetails ? 'Masquer les détails' : 'Voir tous les détails'}
                  </button>
                </div>
              );
            })()}
            {(() => {
              const rentLowValue = result.marketRentLow ?? null;
              const rentHighValue = result.marketRentHigh ?? null;
              const rentPosition = getRentPosition(result.effectiveRent, rentLowValue, rentHighValue);
              if (rentPosition === null || rentLowValue === null || rentHighValue === null) {
                return null;
              }
              const isBelowMarket = result.effectiveRent < rentLowValue;
              const isAboveMarket = result.effectiveRent > rentHighValue;
              return (
                <div
                  style={{
                    padding: '10px 0 2px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#374151', fontWeight: 800 }}>
                      Fourchette marché
                    </span>
                    {result.rentSource === 'listing' && (
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700 }}>
                        {isBelowMarket ? 'Sous le marché' : isAboveMarket ? 'Au-dessus du marché' : 'Cohérent'}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155', fontWeight: 800 }}>
                    <span>{formatCurrency(rentLowValue)}</span>
                    <span>{formatCurrency(rentHighValue)}</span>
                  </div>
                  <div style={{ position: 'relative', height: '8px', borderRadius: '999px', backgroundColor: '#e5e7eb', marginTop: '9px', overflow: 'visible' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: `${rentPosition}%`,
                        borderRadius: '999px',
                        background: 'linear-gradient(90deg, #64748b 0%, #0f172a 100%)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: `${rentPosition}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#0f172a',
                        border: '2px solid #ffffff',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.10)',
                      }}
                    />
                  </div>
                </div>
              );
            })()}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#eef2ff',
                color: '#1d4ed8',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div>Prix max pour 8% brut : {formatCurrency(result.targetPriceGross8)}</div>
              <div>Prix max cashflow neutre : {formatCurrency(result.targetPriceBreakEven)}</div>
            </div>
            <Link
              href="/offre"
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#111827',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Faire une offre →
            </Link>
            <button
              type="button"
              onClick={handleSaveAnalysis}
              disabled={saveStatus === 'saving'}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontSize: '14px',
                fontWeight: 800,
                cursor: saveStatus === 'saving' ? 'default' : 'pointer',
                opacity: saveStatus === 'saving' ? 0.75 : 1,
              }}
            >
              {saveStatus === 'saving' ? 'Enregistrement...' : "Enregistrer l'analyse"}
            </button>
            {saveMessage && (
              <div
                style={{
                  fontSize: '13px',
                  color: saveStatus === 'error' ? '#dc2626' : '#15803d',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              >
                {saveMessage}
              </div>
            )}
          </div>
        )}

      </section>
      <nav
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderTop: '1px solid rgba(203, 213, 225, 0.6)',
          backdropFilter: 'blur(16px)',
          paddingTop: '5px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
          paddingLeft: '4px',
          paddingRight: '4px',
        }}
      >
        {[
          { href: '/analyse', label: 'Analyse', active: true, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
          { href: '/offre', label: 'Offre', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></> },
          { href: '/copro', label: 'Copro', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></> },
          { href: '/mes-analyses', label: 'Historique', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></> },
          { href: '/compte', label: 'Compte', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></> },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              padding: '5px 4px 4px',
              borderRadius: '12px',
              backgroundColor: item.active ? '#0f172a' : 'transparent',
              color: item.active ? '#ffffff' : '#64748b',
              textAlign: 'center',
              textDecoration: 'none',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {item.icon}
            </svg>
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
