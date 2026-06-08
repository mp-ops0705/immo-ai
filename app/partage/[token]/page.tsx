'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type RawResult = {
  grossYield?: number | null;
  netYield?: number | null;
  monthlyCashflow?: number | null;
  realCashflow?: number | null;
  monthlyPayment?: number | null;
  monthlyCharges?: number | null;
  totalInvestment?: number | null;
  loanAmount?: number | null;
  effectiveRent?: number | null;
  score?: number | null;
  status?: string | null;
  insight?: string | null;
};

type SharedAnalysis = {
  id: string;
  created_at: string;
  title: string | null;
  city: string | null;
  property_type: string | null;
  surface: number | null;
  rooms: number | null;
  purchase_price: number | null;
  gross_yield: number | null;
  real_cashflow: number | null;
  monthly_payment: number | null;
  score: number | null;
  analysis_text: string | null;
  raw_result: RawResult;
};

const fmt = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    : '--';

const fmtPct = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(2)}%` : '--';

export default function PartagePage() {
  const params = useParams();
  const token = params.token as string;
  const [analysis, setAnalysis] = useState<SharedAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('share_token', token)
        .eq('share_enabled', true)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setAnalysis(data as SharedAnalysis);
      }
      setIsLoading(false);
    };
    load();
  }, [token]);

  if (isLoading) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>Chargement...</div>
      </main>
    );
  }

  if (notFound || !analysis) {
    return (
      <main style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: 850, color: '#0f172a' }}>Analyse introuvable</div>
        <div style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>Ce lien de partage est invalide ou a ete desactive.</div>
        <Link href="/signup" style={{ padding: '12px 24px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '14px', fontWeight: 800, textDecoration: 'none' }}>
          Creer un compte
        </Link>
      </main>
    );
  }

  const r = analysis.raw_result ?? {};
  const score = r.score ?? analysis.score;
  const pct = Math.min(Math.max((score ?? 0) / 10, 0), 1);
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const dash = pct * circ;
  const scoreColor = (score ?? 0) >= 7.5 ? '#86efac' : (score ?? 0) >= 5 ? '#fcd34d' : '#fca5a5';
  const status = r.status ?? ((score ?? 0) >= 7.5 ? 'Bon deal' : (score ?? 0) >= 5 ? 'Correct' : 'Peu rentable');
  const insight = analysis.analysis_text || r.insight;

  const metrics = [
    { label: 'Prix', value: fmt(analysis.purchase_price) },
    { label: 'Rendement brut', value: fmtPct(r.grossYield ?? analysis.gross_yield) },
    { label: 'Rendement net', value: fmtPct(r.netYield) },
    { label: 'Cashflow reel', value: fmt(r.realCashflow ?? analysis.real_cashflow) },
    { label: 'Mensualite', value: fmt(r.monthlyPayment ?? analysis.monthly_payment) },
    { label: 'Investissement', value: fmt(r.totalInvestment) },
  ];

  const title = analysis.title || analysis.city || 'Analyse immobiliere';
  const propertyTypeLabels: Record<string, string> = { apartment: 'Appartement', house: 'Maison', building: 'Immeuble' };
  const propertyTypeLabel = analysis.property_type ? (propertyTypeLabels[analysis.property_type] ?? analysis.property_type) : null;
  const roomsLabel = analysis.rooms ? `${analysis.rooms} ${analysis.rooms === 1 ? 'pièce' : 'pièces'}` : null;
  const sub = [propertyTypeLabel, analysis.surface ? `${analysis.surface} m²` : null, roomsLabel].filter(Boolean).join(' · ');

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e8edf5 0%, #f8fafc 260px, #f8fafc 100%)', padding: '12px' }}>
      <section style={{ width: '100%', maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '32px' }}>

        {/* Header brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
            immo<span style={{ color: '#6366f1' }}>.ai</span>
          </div>
          <Link href="/signup" style={{ fontSize: '12px', fontWeight: 800, color: '#6366f1', textDecoration: 'none', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e0e7ff', backgroundColor: '#eef2ff' }}>
            Creer un compte
          </Link>
        </div>

        {/* Score card */}
        <div style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Analyse partagee
          </div>
          <div style={{ fontSize: '18px', fontWeight: 850, color: '#ffffff', marginBottom: '4px' }}>{title}</div>
          {sub && <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>{sub}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Score global</div>
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                <circle cx="36" cy="36" r={radius} fill="none" stroke={scoreColor} strokeWidth="6"
                  strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform="rotate(-90 36 36)" />
                <text x="36" y="40" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="800">{score ?? '--'}</text>
              </svg>
            </div>
            <div style={{ padding: '8px 16px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.08)', border: `1px solid ${scoreColor}40`, color: scoreColor, fontSize: '15px', fontWeight: 800 }}>
              {status}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Chiffres cles</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {metrics.map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{label}</div>
                <div style={{ fontSize: '16px', fontWeight: 850, color: '#0f172a', marginTop: '2px' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Insight */}
        {insight && (
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Analyse</div>
            <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, fontWeight: 500 }}>{insight}</div>
          </div>
        )}

        {/* CTA */}
        <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#eef2ff', border: '1px solid #e0e7ff', textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 850, color: '#0f172a', marginBottom: '4px' }}>Analysez vos propres biens</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Score, cashflow, rendement — en quelques secondes.</div>
          <Link href="/signup" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '14px', fontWeight: 800, textDecoration: 'none' }}>
            Essayer gratuitement
          </Link>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
          {new Date(analysis.created_at).toLocaleDateString('fr-FR')} · Analyse generee par immo.ai
        </div>

      </section>
    </main>
  );
}
