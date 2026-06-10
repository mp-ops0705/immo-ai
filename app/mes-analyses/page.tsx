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
  share_token: string | null;
  share_enabled: boolean;
  shared_at: string | null;
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
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tmi, setTmi] = useState(30);

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
      .eq('user_id', sessionData.session.user.id)
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
    const confirmed = window.confirm('Supprimer cette analyse ? Cette action est irréversible.');
    if (!confirmed) return;

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
      setError("Le nom de l'analyse ne peut pas être vide.");
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

  const shareAnalysis = async (analysis: SavedAnalysis) => {
    setSharingId(analysis.id);
    try {
      let token = analysis.share_token;
      if (!token || !analysis.share_enabled) {
        token = crypto.randomUUID();
        const { error } = await supabase
          .from('analyses')
          .update({ share_token: token, share_enabled: true, shared_at: new Date().toISOString() })
          .eq('id', analysis.id);
        if (error) throw error;
        setAnalyses((prev) =>
          prev.map((a) => (a.id === analysis.id ? { ...a, share_token: token, share_enabled: true } : a))
        );
      }
      const url = `${window.location.origin}/partage/${token}`;
      const title = analysis.title || analysis.city || 'Analyse immobilière';
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (nav.share) {
        await nav.share({ title, text: `Mon analyse immo.ai : ${title}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopiedId(analysis.id);
        setTimeout(() => setCopiedId((current) => (current === analysis.id ? null : current)), 2500);
      }
    } catch {
      // user cancelled or clipboard unavailable
    } finally {
      setSharingId(null);
    }
  };

  const cardStyle = {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
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
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)',
        }}
      >
        <header style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', boxShadow: '0 4px 24px rgba(15,23,42,0.18)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '40px', width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Historique</div>
          <h1 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em' }}>Mes analyses</h1>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Retrouve toutes tes analyses enregistrees.</p>
        </header>

        {isLoading && <div style={{ ...cardStyle, color: '#64748b', fontSize: '14px', fontWeight: 700 }}>Chargement...</div>}

        {error && <div style={{ ...cardStyle, color: '#dc2626', fontSize: '14px', fontWeight: 700 }}>{error}</div>}

        {!isLoading && analyses.length === 0 && (
          <div
            style={{
              ...cardStyle,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '32px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '36px' }}>🏠</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827' }}>
              Aucune analyse enregistrée
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5 }}>
              Analyse ta première propriété et sauvegarde le résultat pour le retrouver ici.
            </div>
            <Link
              href="/analyse"
              style={{
                marginTop: '4px',
                padding: '12px 20px',
                borderRadius: '8px',
                backgroundColor: '#111827',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 800,
                textDecoration: 'none',
              }}
            >
              Analyser une propriété
            </Link>
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
                      borderRadius: '8px',
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
                  borderRadius: '8px',
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
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('lastAnalysis', JSON.stringify({
                    purchasePrice: String(analysis.purchase_price),
                    city: analysis.city,
                    propertyType: analysis.property_type,
                  }));
                  router.push('/offre');
                }}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Faire une offre
              </button>
              <button
                type="button"
                onClick={() => shareAnalysis(analysis)}
                disabled={sharingId === analysis.id}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: copiedId === analysis.id ? '#f0fdf4' : '#ffffff',
                  color: copiedId === analysis.id ? '#16a34a' : '#111827',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {copiedId === analysis.id ? 'Lien copie !' : sharingId === analysis.id ? '...' : 'Partager'}
              </button>
              <button
                type="button"
                onClick={() => deleteAnalysis(analysis.id)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
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

            {selectedAnalysis?.id === analysis.id && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eef2f7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 850, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Détail enregistré
                </div>
                <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.45, fontWeight: 650 }}>
                  {analysis.analysis_text || analysis.raw_result?.insight || 'Analyse enregistrée.'}
                </div>
                {[
                  ['Score', `${analysis.raw_result?.score ?? analysis.score ?? '--'}/10`],
                  ['Loyer retenu', formatCurrency(analysis.raw_result?.effectiveRent ?? analysis.effective_rent)],
                  ['Rendement brut', formatPercent(analysis.raw_result?.grossYield ?? analysis.gross_yield)],
                  ['Rendement net', formatPercent(analysis.raw_result?.netYield)],
                  ['Cashflow', formatCurrency(analysis.raw_result?.monthlyCashflow ?? analysis.monthly_cashflow)],
                  ['Cashflow réel', formatCurrency(analysis.raw_result?.realCashflow ?? analysis.real_cashflow)],
                  ['Mensualité', formatCurrency(analysis.raw_result?.monthlyPayment ?? analysis.monthly_payment)],
                  ['Charges/mois', formatCurrency(analysis.raw_result?.monthlyCharges ?? analysis.monthly_charges)],
                  ['Investissement', formatCurrency(analysis.raw_result?.totalInvestment)],
                  ['Financé', formatCurrency(analysis.raw_result?.loanAmount)],
                  ['Prix max 8% brut', formatCurrency(analysis.raw_result?.targetPriceGross8)],
                  ['Prix max cashflow neutre', formatCurrency(analysis.raw_result?.targetPriceBreakEven)],
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
                {(() => {
                  const effectiveRent = analysis.raw_result?.effectiveRent ?? analysis.effective_rent ?? 0;
                  const realCashflow = analysis.raw_result?.realCashflow ?? analysis.real_cashflow ?? 0;
                  const annualRent = effectiveRent * 12;
                  const taxRate = tmi / 100 + 0.172;
                  const foncierTax = annualRent * 0.70 * taxRate;
                  const bicTax = annualRent * 0.50 * taxRate;
                  const foncierNet = realCashflow - foncierTax / 12;
                  const bicNet = realCashflow - bicTax / 12;
                  const bicIsBetter = bicNet > foncierNet;
                  const fmt = (v: number) => (v < 0 ? '- ' : '') + Math.abs(Math.round(v)).toLocaleString('fr-FR') + ' EUR';
                  return (
                    <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid #eef2f7' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Fiscal TMI</div>
                        <div style={{ flex: 1, display: 'flex', padding: '3px', borderRadius: '8px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                          {[0, 11, 30, 41, 45].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setTmi(v)}
                              style={{
                                flex: 1,
                                padding: '5px 2px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: tmi === v ? '#ffffff' : 'transparent',
                                color: tmi === v ? '#111827' : '#6b7280',
                                fontSize: '10px',
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
                          <div key={label} style={{ padding: '10px', borderRadius: '8px', backgroundColor: best ? '#f0fdf4' : '#f8fafc', border: `1px solid ${best ? '#86efac' : '#e2e8f0'}` }}>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginBottom: '6px' }}>{label}</div>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: net >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(net)}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginTop: '1px', marginBottom: '6px' }}>net/mois apres impots</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Impot estime</div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>{fmt(tax)}<span style={{ fontSize: '10px', fontWeight: 600 }}>/an</span></div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                        Calcul en regime micro — montant reel souvent inferieur grace aux deductions (interets, taxe fonciere, charges). Le LMNP au reel peut etre encore plus avantageux — consultez un comptable specialise.
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}

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
          { href: '/analyse', label: 'Analyse', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
          { href: '/offre', label: 'Offre', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></> },
          { href: '/outils', label: 'Outils', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></> },
          { href: '/mes-analyses', label: 'Historique', active: true, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></> },
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
