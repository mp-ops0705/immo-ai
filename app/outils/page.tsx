'use client';

import { ChangeEvent, FormEvent, useRef, useState } from 'react';

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
  riskLevel: 'Faible' | 'Moyen' | 'Eleve';
  investorConclusion: string;
};

const coproSections = [
  { key: 'positives', title: 'Points positifs' },
  { key: 'alerts', title: "Points d'alerte" },
  { key: 'votedWorks', title: 'Travaux votes' },
  { key: 'futureWorks', title: 'Travaux envisages' },
  { key: 'legalIssues', title: 'Procedures ou litiges' },
  { key: 'unpaidCharges', title: 'Impayes / tensions financieres' },
  { key: 'budgetNotes', title: 'Charges / budget' },
  { key: 'managementNotes', title: 'Qualite de gestion' },
] as const;

const getRiskColor = (r: CoproAnalysis['riskLevel']) => {
  if (r === 'Faible') return { text: '#166534', bg: '#dcfce7' };
  if (r === 'Moyen') return { text: '#92400e', bg: '#fef3c7' };
  return { text: '#991b1b', bg: '#fee2e2' };
};

const getFileType = (f: File) => {
  const n = f.name.toLowerCase();
  if (f.type) return f.type;
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  return '';
};
const isAccepted = (f: File) =>
  ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(getFileType(f));

const navItems = [
  { href: '/analyse', label: 'Analyse', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
  { href: '/offre', label: 'Offre', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></> },
  { href: '/outils', label: 'Outils', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></> },
  { href: '/mes-analyses', label: 'Historique', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></> },
  { href: '/compte', label: 'Compte', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></> },
];

export default function OutilsPage() {
  const [openCapacite, setOpenCapacite] = useState(false);
  const [revenus, setRevenus] = useState('');
  const [charges, setCharges] = useState('');
  const [apport, setApport] = useState('');
  const [taux, setTaux] = useState('3.5');
  const [duree, setDuree] = useState(20);

  const [openCopro, setOpenCopro] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [coproResult, setCoproResult] = useState<CoproAnalysis | null>(null);
  const [coproError, setCoproError] = useState('');
  const [coproLoading, setCoproLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parse = (v: string) => parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0;
  const rev = parse(revenus), chg = parse(charges), app = parse(apport);
  const t = parse(taux) / 100 / 12, n = duree * 12;
  const mensualiteMax = rev * 0.35 - chg;
  const capacite = t > 0 && mensualiteMax > 0 ? mensualiteMax * (1 - Math.pow(1 + t, -n)) / t : 0;
  const budget = capacite + app;
  const tauxEndettement = rev > 0 ? ((mensualiteMax + chg) / rev) * 100 : 0;
  const hasResult = rev > 0 && mensualiteMax > 0;
  const fmt = (v: number) => Math.round(v).toLocaleString('fr-FR') + ' €';

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []).filter(isAccepted));
    setCoproResult(null); setCoproError('');
  };

  const handleCoproSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCoproError(''); setCoproResult(null);
    if (files.length === 0) { setCoproError('Ajoute au moins un PDF ou une image.'); return; }
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    setCoproLoading(true);
    try {
      const res = await fetch('/api/analyse-copro', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setCoproError(typeof data?.error === 'string' ? data.error : 'Analyse impossible.'); return; }
      setCoproResult(data as CoproAnalysis);
    } catch { setCoproError("Erreur pendant l'analyse. Reessaie avec des fichiers plus nets."); }
    finally { setCoproLoading(false); }
  };

  const inputStyle = { padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', color: '#111827', backgroundColor: '#ffffff', width: '100%', boxSizing: 'border-box' as const, outline: 'none' };
  const labelStyle = { display: 'flex' as const, flexDirection: 'column' as const, gap: '6px', fontSize: '13px', fontWeight: 600 as const, color: '#374151' };
  const cardStyle = { padding: '16px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' } as const;
  const sectionTitleStyle = { margin: '0 0 12px', fontSize: '11px', fontWeight: 850, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' } as const;
  const riskStyle = coproResult ? getRiskColor(coproResult.riskLevel) : null;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e8edf5 0%, #f8fafc 260px, #f8fafc 100%)', padding: '12px' }}>
      <section style={{ width: '100%', maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}>

        {/* PAGE HEADER */}
        <header style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', boxShadow: '0 4px 24px rgba(15,23,42,0.18)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-20px', left: '20px', width: '90px', height: '90px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Outils</div>
          <h1 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em' }}>Outils & calculateurs</h1>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Capacite d'emprunt, analyse de copropriete — tout pour decider sereinement.</p>
        </header>

        {/* CARD 1 — CAPACITE D'EMPRUNT — accent: ambre/or */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.14)' }}>
          <button
            type="button"
            onClick={() => setOpenCapacite(o => !o)}
            style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #0f172a 0%, #1c2d4a 100%)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden' }}
          >
            {/* Decoration */}
            <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '96px', height: '96px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-16px', right: '64px', width: '48px', height: '48px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            {/* Icon */}
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(251,191,36,0.22) 0%, rgba(251,191,36,0.08) 100%)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div style={{ flex: 1, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 850, color: '#ffffff', letterSpacing: '-0.01em' }}>Capacite d'emprunt</span>
                <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em' }}>CALCUL</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Combien puis-je emprunter ?</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: openCapacite ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease', zIndex: 1 }}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openCapacite && (
            <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid rgba(251,191,36,0.15)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={labelStyle}>
                Revenus nets mensuels du foyer
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" value={revenus} onChange={e => setRevenus(e.target.value)} placeholder="3 500" style={inputStyle} />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>€</span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>Salaires nets, revenus locatifs, pensions... Additionnez tous les revenus du foyer.</span>
              </label>
              <label style={labelStyle}>
                Charges mensuelles existantes
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" value={charges} onChange={e => setCharges(e.target.value)} placeholder="0" style={inputStyle} />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>€</span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>Loyer, mensualites de credits en cours, pensions versees. Laissez a 0 si aucune.</span>
              </label>
              <label style={labelStyle}>
                Apport personnel
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" value={apport} onChange={e => setApport(e.target.value)} placeholder="20 000" style={inputStyle} />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>€</span>
                </div>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={labelStyle}>
                  Taux d'interet
                  <div style={{ position: 'relative' }}>
                    <input type="number" min="0" step="0.1" value={taux} onChange={e => setTaux(e.target.value)} style={inputStyle} />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>%</span>
                  </div>
                </label>
                <label style={labelStyle}>
                  Duree
                  <div style={{ display: 'flex', padding: '3px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
                    {[15, 20, 25].map(v => (
                      <button key={v} type="button" onClick={() => setDuree(v)} style={{ flex: 1, padding: '9px 2px', borderRadius: '8px', border: 'none', backgroundColor: duree === v ? '#0f172a' : 'transparent', color: duree === v ? '#ffffff' : '#6b7280', fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>{v} ans</button>
                    ))}
                  </div>
                </label>
              </div>

              {hasResult && (
                <div style={{ marginTop: '4px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(251,191,36,0.2)' }}>
                  {/* Hero result */}
                  <div style={{ padding: '16px', background: 'linear-gradient(135deg, #0f172a 0%, #1c2d4a 100%)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', backgroundColor: 'rgba(251,191,36,0.15)' }}>
                    <div style={{ padding: '14px', backgroundColor: '#0f172a' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Capacite d'emprunt</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.02em' }}>{fmt(capacite)}</div>
                    </div>
                    <div style={{ padding: '14px', backgroundColor: '#111827' }}>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Budget total</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>{fmt(budget)}</div>
                    </div>
                  </div>
                  {/* Details */}
                  <div style={{ padding: '12px 14px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {[['Mensualite max', fmt(mensualiteMax) + ' / mois'], ["Taux d'endettement", tauxEndettement.toFixed(1) + ' %']].map(([label, value], i) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', padding: '9px 0', borderBottom: i === 0 ? '1px solid #f1f5f9' : 'none' }}>
                        <span>{label}</span>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasResult && revenus === '' && (
                <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
                  Renseignez vos revenus pour obtenir votre estimation.
                </div>
              )}

              <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', lineHeight: 1.5 }}>Estimation indicative a 35 % d'endettement max. La banque appliquera ses propres criteres.</p>
            </div>
          )}
        </div>

        {/* CARD 2 — ANALYSE COPRO — accent: indigo/bleu */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.14)' }}>
          <button
            type="button"
            onClick={() => setOpenCopro(o => !o)}
            style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', overflow: 'hidden' }}
          >
            {/* Decoration */}
            <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '96px', height: '96px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-16px', right: '64px', width: '48px', height: '48px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            {/* Icon */}
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(129,140,248,0.22) 0%, rgba(129,140,248,0.08) 100%)', border: '1px solid rgba(129,140,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div style={{ flex: 1, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 850, color: '#ffffff', letterSpacing: '-0.01em' }}>Analyse copropriete</span>
                <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.25)', color: '#a5b4fc', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em' }}>ANALYSE</span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Travaux, litiges et risques financiers</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: openCopro ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease', zIndex: 1 }}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {openCopro && (
            <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid rgba(129,140,248,0.15)' }}>
              <form onSubmit={handleCoproSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
                <div style={cardStyle}>
                  <div style={sectionTitleStyle}>Documents</div>
                  <div
                    role="button" tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                    style={{ display: 'flex', minHeight: '116px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '12px', border: '1.5px dashed #cbd5e1', backgroundColor: '#f8fafc', color: '#334155', fontSize: '14px', fontWeight: 750, textAlign: 'center', cursor: 'pointer', padding: '16px', transition: 'background 0.15s' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 16v-8m-4 4l4-4 4 4M20 16.7A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
                      </svg>
                    </div>
                    <span style={{ fontWeight: 750, color: '#334155' }}>Ajouter PDF ou images</span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>PV d'AG, budget, travaux, diagnostics</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>PDF, JPEG, PNG, WebP — 10 Mo max</span>
                    <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple onChange={handleFilesChange} style={{ display: 'none' }} />
                  </div>
                  <button type="button" onClick={() => setShowGuide(p => !p)} style={{ marginTop: '10px', border: 'none', background: 'none', padding: '4px 0', cursor: 'pointer', fontSize: '12px', color: '#818cf8', fontWeight: 700, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                    </svg>
                    {showGuide ? 'Masquer le guide' : 'Quels documents uploader ?'}
                  </button>
                  {showGuide && (
                    <div style={{ marginTop: '6px', padding: '12px', borderRadius: '10px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', fontSize: '13px', color: '#4338ca', lineHeight: 1.55 }}>
                      <div style={{ fontWeight: 700, marginBottom: '8px' }}>Pour une analyse optimale :</div>
                      {["PV de la derniere Assemblee Generale", "Budget previsionnel de la copropriete", "Carnet d'entretien de l'immeuble", "Appel de fonds ou etat des charges", "Diagnostics techniques (facultatif)"].map(item => (
                        <div key={item} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ color: '#6366f1', fontWeight: 800, flexShrink: 0 }}>—</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {files.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {files.map(f => (
                        <div key={`${f.name}-${f.size}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 10px', borderRadius: '8px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', fontSize: '13px', fontWeight: 650 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                          <span style={{ color: '#6366f1', whiteSpace: 'nowrap', fontWeight: 700 }}>{Math.ceil(f.size / 1024)} Ko</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {coproError && (
                  <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', fontWeight: 700 }}>{coproError}</div>
                )}
                <button
                  type="submit"
                  disabled={coproLoading}
                  style={{ padding: '15px', borderRadius: '12px', border: 'none', background: coproLoading ? '#374151' : 'linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)', color: '#ffffff', fontSize: '15px', fontWeight: 850, cursor: coproLoading ? 'default' : 'pointer', opacity: coproLoading ? 0.8 : 1, boxShadow: coproLoading ? 'none' : '0 4px 16px rgba(15,23,42,0.2)', letterSpacing: '-0.01em' }}
                >
                  {coproLoading ? 'Analyse en cours... (~30 sec)' : 'Analyser les documents'}
                </button>
              </form>

              {coproResult && riskStyle && (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ position: 'relative', overflow: 'hidden', padding: '20px', borderRadius: '16px', background: 'linear-gradient(145deg, #0f172a 0%, #1a1f35 100%)', border: '1px solid rgba(129,140,248,0.2)', boxShadow: '0 4px 20px rgba(15,23,42,0.18)', color: '#ffffff' }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.2) 0%, transparent 70%)' }} />
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 850, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Niveau de risque copropriete</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-0.04em', color: '#a5b4fc' }}>{coproResult.riskLevel}</div>
                      <div style={{ padding: '6px 12px', borderRadius: '999px', backgroundColor: riskStyle.bg, color: riskStyle.text, fontSize: '13px', fontWeight: 850 }}>Risque {coproResult.riskLevel.toLowerCase()}</div>
                    </div>
                    <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#e2e8f0', lineHeight: 1.5, fontWeight: 600 }}>{coproResult.investorConclusion}</p>
                  </div>
                  <div style={cardStyle}>
                    <div style={sectionTitleStyle}>Resume general</div>
                    <p style={{ margin: 0, color: '#334155', fontSize: '14px', lineHeight: 1.5, fontWeight: 600 }}>{coproResult.summary}</p>
                  </div>
                  {coproSections.map(section => {
                    const items = coproResult[section.key];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={section.key} style={cardStyle}>
                        <div style={sectionTitleStyle}>{section.title}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {items.map((item, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '8px 1fr', gap: '10px', alignItems: 'start', color: '#334155', fontSize: '14px', lineHeight: 1.45, fontWeight: 600 }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#818cf8', marginTop: '8px', display: 'block' }} />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, textAlign: 'center' }}>Cette analyse est une aide a la lecture et ne remplace pas l'avis d'un notaire ou professionnel.</p>
                </div>
              )}
            </div>
          )}
        </div>

      </section>

      <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', backgroundColor: 'rgba(255,255,255,0.92)', borderTop: '1px solid rgba(203,213,225,0.6)', backdropFilter: 'blur(16px)', paddingTop: '5px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)', paddingLeft: '4px', paddingRight: '4px' }}>
        {navItems.map(item => (
          <a key={item.label} href={item.href} style={{ padding: '5px 4px 4px', borderRadius: '12px', backgroundColor: item.href === '/outils' ? '#0f172a' : 'transparent', color: item.href === '/outils' ? '#ffffff' : '#64748b', textAlign: 'center', textDecoration: 'none', fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">{item.icon}</svg>
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
