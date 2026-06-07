'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  statusColor?: string | null;
  insight?: string | null;
  targetPriceGross8?: number | null;
  targetPriceBreakEven?: number | null;
};

type SavedAnalysis = {
  id: string;
  created_at: string;
  title: string | null;
  city: string | null;
  property_type: string | null;
  surface: number | null;
  rooms: number | null;
  purchase_price: number | null;
  effective_rent: number | null;
  market_rent_avg: number | null;
  market_rent_low: number | null;
  market_rent_high: number | null;
  gross_yield: number | null;
  monthly_cashflow: number | null;
  real_cashflow: number | null;
  monthly_payment: number | null;
  monthly_charges: number | null;
  score: number | null;
  analysis_text: string | null;
  raw_result: RawResult;
};

const formatCurrency = (value: number | null | undefined) =>
  (typeof value === 'number' && Number.isFinite(value) ? value : 0).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

const formatPercent = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '--';

export default function MesAnalysesPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const loadAnalyses = async () => {
    setError('');
    setIsLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      router.replace('/login');
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    setAnalyses((data ?? []) as SavedAnalysis[]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAnalyses();
  }, []);

  const deleteAnalysis = async (id: string) => {
    const { error: deleteError } = await supabase.from('analyses').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setAnalyses((current) => current.filter((analysis) => analysis.id !== id));
    setSelectedAnalysis((current) => (current?.id === id ? null : current));
  };

  const startRename = (analysis: SavedAnalysis) => {
    setEditingId(analysis.id);
    setEditingTitle(analysis.title || analysis.city || 'Analyse immobilière');
    setError('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveRename = async (analysis: SavedAnalysis) => {
    const nextTitle = editingTitle.trim();
    const currentTitle = analysis.title || analysis.city || 'Analyse immobilière';

    if (nextTitle === currentTitle) {
      cancelRename();
      return;
    }

    if (!nextTitle) {
      setError('Le nom de l’analyse ne peut pas être vide.');
      return;
    }

    setError('');
    setRenamingId(analysis.id);

    const { error: updateError } = await supabase
      .from('analyses')
      .update({ title: nextTitle })
      .eq('id', analysis.id);

    setRenamingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setAnalyses((current) =>
      current.map((item) => (item.id === analysis.id ? { ...item, title: nextTitle } : item))
    );
    setSelectedAnalysis((current) =>
      current?.id === analysis.id ? { ...current, title: nextTitle } : current
    );
    cancelRename();
  };

  const cardStyle = {
    padding: '16px',
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
  } as const;

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
          paddingBottom: '32px',
        }}
      >
        <header
          style={{
            padding: '18px',
            borderRadius: '18px',
            background: 'linear-gradient(145deg, #0f172a 0%, #1f2937 100%)',
            color: '#ffffff',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.22)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 850, color: '#dbeafe', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Historique
          </div>
          <h1 style={{ margin: '12px 0 0', fontSize: '27px', fontWeight: 850 }}>
            Mes analyses
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.45 }}>
            Retrouve tes analyses enregistrées.
          </p>
        </header>

        <Link
          href="/analyse"
          style={{
            alignSelf: 'flex-start',
            color: '#475569',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 800,
            padding: '4px 2px',
          }}
        >
          ← Retour
        </Link>

        {isLoading && <div style={{ ...cardStyle, color: '#64748b', fontSize: '14px', fontWeight: 700 }}>Chargement...</div>}

        {error && <div style={{ ...cardStyle, color: '#dc2626', fontSize: '14px', fontWeight: 700 }}>{error}</div>}

        {!isLoading && analyses.length === 0 && (
          <div style={{ ...cardStyle, color: '#64748b', fontSize: '14px', lineHeight: 1.45 }}>
            Aucune analyse enregistrée pour le moment.
          </div>
        )}

        {analyses.map((analysis) => (
          <div key={analysis.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
              <div>
                {editingId === analysis.id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    onBlur={() => saveRename(analysis)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.currentTarget.blur();
                      }
                      if (event.key === 'Escape') {
                        cancelRename();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      color: '#111827',
                      fontSize: '15px',
                      fontWeight: 800,
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startRename(analysis)}
                    title="Cliquer pour renommer"
                    style={{
                      padding: 0,
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#111827',
                      fontSize: '16px',
                      fontWeight: 850,
                      textAlign: 'left',
                      cursor: 'text',
                    }}
                  >
                    {analysis.title || analysis.city || 'Analyse immobilière'}
                  </button>
                )}
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b', fontWeight: 650 }}>
                  {new Date(analysis.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <div style={{ fontSize: '20px', color: '#0f172a', fontWeight: 900 }}>
                {analysis.score ?? '--'}/10
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
              <div style={{ fontSize: '13px', color: '#475569' }}>Prix : <strong>{formatCurrency(analysis.purchase_price)}</strong></div>
              <div style={{ fontSize: '13px', color: '#475569' }}>Rendement : <strong>{formatPercent(analysis.gross_yield)}</strong></div>
              <div style={{ fontSize: '13px', color: '#475569' }}>Cashflow réel : <strong>{formatCurrency(analysis.real_cashflow)}</strong></div>
              <div style={{ fontSize: '13px', color: '#475569' }}>Mensualité : <strong>{formatCurrency(analysis.monthly_payment)}</strong></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedAnalysis((current) => (current?.id === analysis.id ? null : analysis))}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#111827',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {selectedAnalysis?.id === analysis.id ? 'Masquer' : 'Voir'}
                </button>
                <Link
                  href="/offre"
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#111827',
                    fontSize: '13px',
                    fontWeight: 800,
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Faire une offre
                </Link>
              </div>
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => deleteAnalysis(analysis.id)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Supprimer
                </button>
              </div>
            {renamingId === analysis.id && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                Enregistrement du nom...
              </div>
            )}
          </div>
        ))}

        {selectedAnalysis && (
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 850, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Détail enregistré
            </div>
            <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.45, fontWeight: 650 }}>
              {selectedAnalysis.analysis_text || selectedAnalysis.raw_result?.insight || 'Analyse enregistrée.'}
            </div>
            {[
              ['Score', `${selectedAnalysis.raw_result?.score ?? selectedAnalysis.score ?? '--'}/10`],
              ['Loyer retenu', formatCurrency(selectedAnalysis.raw_result?.effectiveRent ?? selectedAnalysis.effective_rent)],
              ['Rendement brut', formatPercent(selectedAnalysis.raw_result?.grossYield ?? selectedAnalysis.gross_yield)],
              ['Rendement net', formatPercent(selectedAnalysis.raw_result?.netYield)],
              ['Cashflow', formatCurrency(selectedAnalysis.raw_result?.monthlyCashflow ?? selectedAnalysis.monthly_cashflow)],
              ['Cashflow réel', formatCurrency(selectedAnalysis.raw_result?.realCashflow ?? selectedAnalysis.real_cashflow)],
              ['Mensualité', formatCurrency(selectedAnalysis.raw_result?.monthlyPayment ?? selectedAnalysis.monthly_payment)],
              ['Charges/mois', formatCurrency(selectedAnalysis.raw_result?.monthlyCharges ?? selectedAnalysis.monthly_charges)],
              ['Investissement', formatCurrency(selectedAnalysis.raw_result?.totalInvestment)],
              ['Financé', formatCurrency(selectedAnalysis.raw_result?.loanAmount)],
              ['Prix max 8% brut', formatCurrency(selectedAnalysis.raw_result?.targetPriceGross8)],
              ['Prix max cashflow neutre', formatCurrency(selectedAnalysis.raw_result?.targetPriceBreakEven)],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #eef2f7',
                  fontSize: '13px',
                  color: '#475569',
                }}
              >
                <span>{label}</span>
                <strong style={{ color: '#0f172a', textAlign: 'right' }}>{value}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
