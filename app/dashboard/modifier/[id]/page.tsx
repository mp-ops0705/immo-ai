'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type PropertyType = 'apartment' | 'house' | 'building' | 'parking' | '';

type LoanExtraction = {
  initial_loan_amount: number | null;
  monthly_payment: number | null;
  loan_rate: number | null;
  loan_duration_years: number | null;
  loan_start_date: string | null;
  loan_end_date: string | null;
  confidence_score: number;
  warnings: string[];
};

function calcRemainingLoan(initial: number, monthlyPayment: number, annualRate: number, startDateStr: string): number {
  const start = new Date(startDateStr);
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (monthsElapsed <= 0) return Math.round(initial);
  const r = annualRate / 100 / 12;
  if (r === 0) return Math.max(0, Math.round(initial - monthlyPayment * monthsElapsed));
  let balance = initial;
  for (let i = 0; i < monthsElapsed; i++) {
    balance = balance - (monthlyPayment - balance * r);
    if (balance <= 0) { balance = 0; break; }
  }
  return Math.round(balance);
}

type FormState = {
  name: string;
  property_type: PropertyType;
  address: string;
  city: string;
  purchase_price: string;
  purchase_date: string;
  current_value: string;
  notary_fees: string;
  works_cost: string;
  has_loan: boolean;
  initial_loan_amount: string;
  remaining_loan: string;
  monthly_payment: string;
  loan_rate: string;
  loan_duration_years: string;
  loan_start_date: string;
  is_rented: boolean;
  rent: string;
  charges: string;
  taxe_fonciere: string;
  charges_copro: string;
  frais_gestion_pct: string;
  assurance_emprunteur: string;
  autres_charges: string;
};

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Appartement' },
  { value: 'house', label: 'Maison' },
  { value: 'building', label: 'Immeuble' },
  { value: 'parking', label: 'Parking' },
];

function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function numToStr(v: number | null): string {
  return v !== null ? String(v) : '';
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1.5px solid #e2e8f0', backgroundColor: '#ffffff',
  fontSize: '14px', fontWeight: 600, color: '#0f172a',
  outline: 'none', boxSizing: 'border-box', appearance: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px', fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
  display: 'block',
};

const sectionStyle: React.CSSProperties = {
  padding: '18px', borderRadius: '16px', backgroundColor: '#ffffff',
  border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
  display: 'flex', flexDirection: 'column', gap: '14px',
};

export default function ModifierBienPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importResult, setImportResult] = useState<LoanExtraction | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [manualStartDate, setManualStartDate] = useState('');
  const [showChargesDetail, setShowChargesDetail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace('/login'); return; }
      setUserId(sessionData.session.user.id);

      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .eq('user_id', sessionData.session.user.id)
        .single();

      if (fetchError || !data) { router.replace('/dashboard'); return; }

      setForm({
        name: data.name ?? '',
        property_type: (data.property_type as PropertyType) ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        purchase_price: numToStr(data.purchase_price),
        purchase_date: data.purchase_date ?? '',
        current_value: numToStr(data.current_value),
        notary_fees: numToStr(data.notary_fees),
        works_cost: numToStr(data.works_cost),
        has_loan: data.remaining_loan !== null || data.monthly_payment !== null,
        initial_loan_amount: numToStr(data.initial_loan_amount),
        remaining_loan: numToStr(data.remaining_loan),
        monthly_payment: numToStr(data.monthly_payment),
        loan_rate: numToStr(data.loan_rate),
        loan_duration_years: numToStr(data.loan_duration_years),
        loan_start_date: data.loan_start_date ?? '',
        is_rented: data.rent !== null || data.charges !== null,
        rent: numToStr(data.rent),
        charges: numToStr(data.charges),
        taxe_fonciere: numToStr(data.taxe_fonciere),
        charges_copro: numToStr(data.charges_copro),
        frais_gestion_pct: numToStr(data.frais_gestion_pct),
        assurance_emprunteur: numToStr(data.assurance_emprunteur),
        autres_charges: numToStr(data.autres_charges),
      });
      if (data.taxe_fonciere || data.charges_copro || data.frais_gestion_pct || data.assurance_emprunteur || data.autres_charges) {
        setShowChargesDetail(true);
      }
    };
    init();
  }, [id, router]);

  if (!form) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '14px', fontWeight: 700 }}>
        Chargement…
      </main>
    );
  }

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => prev ? { ...prev, [field]: e.target.value } : prev);
  };

  const handlePurchasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const price = parseFloat(val);
    setForm(prev => prev ? {
      ...prev,
      purchase_price: val,
      notary_fees: prev.notary_fees === '' && !isNaN(price) && price > 0
        ? String(Math.round(price * 0.075))
        : prev.notary_fees,
    } : prev);
  };

  const toggle = (field: 'has_loan' | 'is_rented') => () => {
    setForm(prev => prev ? { ...prev, [field]: !prev[field] } : prev);
  };

  const computedCharges = (): number | null => {
    const tf = parseNum(form.taxe_fonciere);
    const cc = parseNum(form.charges_copro);
    const gp = parseNum(form.frais_gestion_pct);
    const ae = parseNum(form.assurance_emprunteur);
    const ac = parseNum(form.autres_charges);
    if (tf === null && cc === null && gp === null && ae === null && ac === null) return null;
    const rent = parseNum(form.rent) ?? 0;
    return Math.round(
      (tf !== null ? tf / 12 : 0) + (cc ?? 0) +
      (gp !== null ? rent * gp / 100 : 0) + (ae ?? 0) + (ac ?? 0)
    );
  };

  const handleLoanImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportStatus('loading');
    setImportResult(null);
    setImportError(null);
    setManualStartDate('');

    // Fix 1: send session token so server can verify the user
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setImportError('Session expirée. Reconnectez-vous.'); setImportStatus('error'); return; }

    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/analyse-financement', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Extraction échouée');
      setImportResult(data as LoanExtraction);
      setImportStatus('success');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur inattendue');
      setImportStatus('error');
    }
  };

  const applyLoanImport = () => {
    if (!importResult) return;
    const r = importResult;
    const calculatedRemaining =
      r.initial_loan_amount !== null && r.monthly_payment !== null && r.loan_rate !== null && manualStartDate
        ? calcRemainingLoan(r.initial_loan_amount, r.monthly_payment, r.loan_rate, manualStartDate)
        : null;
    setForm(prev => prev ? {
      ...prev,
      has_loan: true,
      remaining_loan: calculatedRemaining !== null ? String(calculatedRemaining) : prev.remaining_loan,
      monthly_payment: r.monthly_payment !== null ? String(r.monthly_payment) : prev.monthly_payment,
      loan_rate: r.loan_rate !== null ? String(r.loan_rate) : prev.loan_rate,
      initial_loan_amount: r.initial_loan_amount !== null ? String(r.initial_loan_amount) : prev.initial_loan_amount,
      loan_duration_years: r.loan_duration_years !== null ? String(Math.round(r.loan_duration_years)) : prev.loan_duration_years,
      loan_start_date: manualStartDate || prev.loan_start_date,
    } : prev);
    setImportResult(null);
    setImportStatus('idle');
    setManualStartDate('');
  };

  const handleSave = async () => {
    if (!userId || !form) return;
    if (!form.purchase_price && !form.current_value) {
      setError('Indique au moins un prix d\'achat ou une valeur estimée.');
      return;
    }
    setIsSaving(true);
    setError(null);

    const payload = {
      name: form.name.trim() || null,
      property_type: form.property_type || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      purchase_price: parseNum(form.purchase_price),
      purchase_date: form.purchase_date || null,
      current_value: parseNum(form.current_value),
      notary_fees: parseNum(form.notary_fees),
      works_cost: parseNum(form.works_cost),
      initial_loan_amount: form.has_loan ? parseNum(form.initial_loan_amount) : null,
      remaining_loan: form.has_loan ? parseNum(form.remaining_loan) : null,
      monthly_payment: form.has_loan ? parseNum(form.monthly_payment) : null,
      loan_rate: form.has_loan ? parseNum(form.loan_rate) : null,
      loan_duration_years: form.has_loan && parseNum(form.loan_duration_years) !== null ? Math.round(parseNum(form.loan_duration_years)!) : null,
      loan_start_date: form.has_loan ? (form.loan_start_date || null) : null,
      rent: form.is_rented ? parseNum(form.rent) : null,
      charges: form.is_rented ? (showChargesDetail && computedCharges() !== null ? computedCharges() : parseNum(form.charges)) : null,
      taxe_fonciere: form.is_rented ? parseNum(form.taxe_fonciere) : null,
      charges_copro: form.is_rented ? parseNum(form.charges_copro) : null,
      frais_gestion_pct: form.is_rented ? parseNum(form.frais_gestion_pct) : null,
      assurance_emprunteur: form.is_rented ? parseNum(form.assurance_emprunteur) : null,
      autres_charges: form.is_rented ? parseNum(form.autres_charges) : null,
    };

    const { error: dbError } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId);

    setIsSaving(false);
    if (dbError) { setError('Erreur lors de la sauvegarde. Réessaie.'); return; }
    router.replace('/dashboard');
  };

  const handleDelete = async () => {
    if (!userId) return;
    setIsDeleting(true);
    await supabase.from('properties').delete().eq('id', id).eq('user_id', userId);
    router.replace('/dashboard');
  };

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e8edf5 0%, #f8fafc 260px, #f8fafc 100%)', padding: '12px' }}>
      <section style={{ width: '100%', maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 30px)' }}>

        {/* ── Header ── */}
        <header style={{ padding: '20px 24px 20px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', position: 'relative', overflow: 'hidden', marginLeft: '-12px', marginRight: '-12px', marginTop: '-12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Dashboard</div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em' }}>Modifier le bien</h1>
          </div>
        </header>

        {/* ── Identification ── */}
        <div style={sectionStyle}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: '-4px' }}>Identification</div>

          <div>
            <label style={labelStyle}>Nom du bien (facultatif)</label>
            <input style={inputStyle} placeholder='Ex : "Appart Paris 11e"' value={form.name} onChange={set('name')} />
          </div>

          <div>
            <label style={labelStyle}>Type de bien</label>
            <select style={inputStyle} value={form.property_type} onChange={set('property_type')}>
              <option value="">Sélectionner…</option>
              {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Adresse</label>
              <input style={inputStyle} placeholder="Rue, numéro" value={form.address} onChange={set('address')} />
            </div>
            <div>
              <label style={labelStyle}>Ville</label>
              <input style={inputStyle} placeholder="Paris" value={form.city} onChange={set('city')} />
            </div>
          </div>
        </div>

        {/* ── Acquisition ── */}
        <div style={sectionStyle}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: '-4px' }}>Acquisition</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Prix d'achat (€)</label>
              <input style={inputStyle} type="number" placeholder="200 000" value={form.purchase_price} onChange={handlePurchasePriceChange} inputMode="numeric" />
            </div>
            <div>
              <label style={labelStyle}>Date d'achat</label>
              <input style={inputStyle} type="date" value={form.purchase_date} onChange={set('purchase_date')} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Valeur estimée aujourd'hui (€)</label>
            <input style={inputStyle} type="number" placeholder="220 000" value={form.current_value} onChange={set('current_value')} inputMode="numeric" />
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '5px' }}>Si différente du prix d'achat, utilisée pour calculer la plus-value latente.</div>
          </div>

          {/* Investissement initial */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Investissement initial</div>
            <div>
              <label style={labelStyle}>Frais de notaire (€)</label>
              <input style={inputStyle} type="number" placeholder="15 000" value={form.notary_fees} onChange={set('notary_fees')} inputMode="numeric" />
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '5px' }}>Estimés automatiquement à 7,5 % du prix d'achat. En général 7 à 8 %.</div>
            </div>
            <div>
              <label style={labelStyle}>Travaux (€)</label>
              <input style={inputStyle} type="number" placeholder="0" value={form.works_cost} onChange={set('works_cost')} inputMode="numeric" />
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '5px' }}>Rénovations, ameublement… (facultatif)</div>
            </div>
          </div>
        </div>

        {/* ── Crédit ── */}
        <div style={sectionStyle}>
          <button type="button" onClick={toggle('has_loan')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', textAlign: 'left' }}>Crédit immobilier</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px', textAlign: 'left' }}>Mensualité, taux, capital restant dû</div>
            </div>
            <div style={{ width: '42px', height: '24px', borderRadius: '12px', backgroundColor: form.has_loan ? '#0f172a' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '3px', left: form.has_loan ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '9px', backgroundColor: '#ffffff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </button>

          {form.has_loan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>

              {/* ── Import block ── */}
              {importStatus !== 'success' && (
                <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1.5px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '3px' }}>Importer le tableau d'amortissement</div>
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                        Document PDF remis par ta banque lors de la signature du prêt. Il liste toutes tes échéances et permet de récupérer le capital restant dû, la mensualité et le taux.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importStatus === 'loading'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '10px', backgroundColor: importStatus === 'loading' ? '#e0e7ff' : '#6366f1', color: '#ffffff', fontSize: '13px', fontWeight: 800, border: 'none', cursor: importStatus === 'loading' ? 'not-allowed' : 'pointer' }}
                  >
                    {importStatus === 'loading' ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        Analyse en cours…
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Importer le tableau d'amortissement (PDF)
                      </>
                    )}
                  </button>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>ou remplis les champs manuellement ci-dessous</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.5, padding: '8px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                    Votre échéancier est utilisé uniquement pour extraire les informations de financement nécessaires au préremplissage. Vérifiez toujours les données avant validation.
                  </div>
                  {importStatus === 'error' && importError && (
                    <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', fontSize: '12px', fontWeight: 700, color: '#e11d48' }}>
                      {importError}
                    </div>
                  )}
                </div>
              )}

              <input ref={fileInputRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={handleLoanImport} />

              {/* ── Confirmation panel ── */}
              {importStatus === 'success' && importResult && (() => {
                const confidenceColor = importResult.confidence_score >= 0.8 ? '#16a34a' : importResult.confidence_score >= 0.6 ? '#d97706' : '#e11d48';
                const fmtEur = (v: number | null) => v !== null ? v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '—';
                const liveRemaining =
                  importResult.initial_loan_amount !== null && importResult.monthly_payment !== null && importResult.loan_rate !== null && manualStartDate
                    ? calcRemainingLoan(importResult.initial_loan_amount, importResult.monthly_payment, importResult.loan_rate, manualStartDate)
                    : null;
                return (
                  <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8faff', border: '1.5px solid #c7d2fe', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5' }}>Données extraites — vérifie avant d'appliquer</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: confidenceColor }}>Confiance : {Math.round(importResult.confidence_score * 100)} %</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {[
                        { label: 'Capital initial', value: fmtEur(importResult.initial_loan_amount) },
                        { label: 'Mensualité', value: importResult.monthly_payment !== null ? `${fmtEur(importResult.monthly_payment)} / mois` : '—' },
                        { label: 'Taux', value: importResult.loan_rate !== null ? `${importResult.loan_rate} %` : '—' },
                        { label: 'Durée initiale', value: importResult.loan_duration_years !== null ? `${Math.round(importResult.loan_duration_years)} ans` : '—' },
                        { label: 'Capital restant dû (calculé)', value: liveRemaining !== null ? fmtEur(liveRemaining) : '— saisir date ci-dessous' },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #e0e7ff' }}>
                          <span style={{ fontSize: '12px', color: row.label.includes('calculé') ? '#059669' : '#6366f1', fontWeight: 600 }}>{row.label}</span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: row.value === '—' || row.value.includes('saisir') ? '#94a3b8' : '#0f172a' }}>{row.value}</span>
                        </div>
                      ))}
                      <div style={{ paddingTop: '10px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', display: 'block', marginBottom: '6px' }}>
                          Date du 1er versement <span style={{ color: '#e11d48' }}>*</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginLeft: '4px' }}>— à saisir manuellement</span>
                        </label>
                        <input
                          type="date"
                          value={manualStartDate}
                          onChange={e => setManualStartDate(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1.5px solid ${manualStartDate ? '#c7d2fe' : '#fca5a5'}`, backgroundColor: '#ffffff', fontSize: '13px', fontWeight: 600, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    {importResult.warnings.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {importResult.warnings.map((w, i) => (
                          <div key={i} style={{ fontSize: '11px', color: '#b45309', fontWeight: 600, display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                            <span style={{ flexShrink: 0 }}>⚠</span><span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={applyLoanImport} disabled={!manualStartDate} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: manualStartDate ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : '#e2e8f0', color: manualStartDate ? '#ffffff' : '#94a3b8', fontSize: '13px', fontWeight: 800, border: 'none', cursor: manualStartDate ? 'pointer' : 'not-allowed' }}>
                        Appliquer ces valeurs
                      </button>
                      <button type="button" onClick={() => { setImportResult(null); setImportStatus('idle'); setManualStartDate(''); }} style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* ── Manual fields ── */}
              <div>
                <label style={labelStyle}>Montant emprunté à l'origine (€)</label>
                <input style={inputStyle} type="number" placeholder="200 000" value={form.initial_loan_amount} onChange={set('initial_loan_amount')} inputMode="numeric" />
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '5px' }}>Montant initial du prêt à la signature — permet le recalcul automatique du capital restant dû.</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Capital restant dû (€)</label>
                  <input style={inputStyle} type="number" placeholder="150 000" value={form.remaining_loan} onChange={set('remaining_loan')} inputMode="numeric" />
                </div>
                <div>
                  <label style={labelStyle}>Mensualité (€/mois)</label>
                  <input style={inputStyle} type="number" placeholder="750" value={form.monthly_payment} onChange={set('monthly_payment')} inputMode="numeric" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Taux (%)</label>
                  <input style={inputStyle} type="number" placeholder="3.50" step="0.01" value={form.loan_rate} onChange={set('loan_rate')} inputMode="decimal" />
                </div>
                <div>
                  <label style={labelStyle}>Durée initiale (ans)</label>
                  <input style={inputStyle} type="number" placeholder="20" value={form.loan_duration_years} onChange={set('loan_duration_years')} inputMode="numeric" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Date du 1er versement</label>
                <input style={inputStyle} type="date" value={form.loan_start_date} onChange={set('loan_start_date')} />
              </div>
            </div>
          )}
        </div>

        {/* ── Revenus locatifs ── */}
        <div style={sectionStyle}>
          <button
            type="button"
            onClick={toggle('is_rented')}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%' }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', textAlign: 'left' }}>Revenus locatifs</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '2px', textAlign: 'left' }}>Loyer, charges — pour calculer le cashflow</div>
            </div>
            <div style={{ width: '42px', height: '24px', borderRadius: '12px', backgroundColor: form.is_rented ? '#0f172a' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '3px', left: form.is_rented ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '9px', backgroundColor: '#ffffff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </button>

          {form.is_rented && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Loyer mensuel HC (€)</label>
                  <input style={inputStyle} type="number" placeholder="800" value={form.rent} onChange={set('rent')} inputMode="numeric" />
                </div>
                {(() => {
                  const c = computedCharges();
                  const isAuto = showChargesDetail && c !== null;
                  return (
                    <div>
                      <label style={labelStyle}>Charges mensuelles (€)</label>
                      <input
                        style={{ ...inputStyle, backgroundColor: isAuto ? '#f1f5f9' : '#ffffff', color: isAuto ? '#64748b' : '#0f172a' }}
                        type="number" placeholder="100"
                        value={isAuto ? String(c) : form.charges}
                        onChange={isAuto ? (() => {}) : set('charges')}
                        readOnly={isAuto} inputMode="numeric"
                      />
                      {isAuto && <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, marginTop: '5px' }}>Calculé depuis le détail</div>}
                      <button
                        type="button"
                        onClick={() => setShowChargesDetail(v => !v)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#6366f1', marginTop: '6px', display: 'block' }}
                      >
                        {showChargesDetail ? 'Masquer le détail' : 'Détailler les charges'}
                      </button>
                    </div>
                  );
                })()}
              </div>

              {showChargesDetail && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={labelStyle}>Taxe foncière (€/an)</label>
                    <input style={inputStyle} type="number" placeholder="1200" value={form.taxe_fonciere} onChange={set('taxe_fonciere')} inputMode="numeric" />
                    {parseNum(form.taxe_fonciere) !== null && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '5px' }}>→ {Math.round(parseNum(form.taxe_fonciere)! / 12)} €/mois</div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Charges de copropriété (€/mois)</label>
                    <input style={inputStyle} type="number" placeholder="80" value={form.charges_copro} onChange={set('charges_copro')} inputMode="numeric" />
                  </div>
                  <div>
                    <label style={labelStyle}>Frais de gestion d&apos;agence (%)</label>
                    <input style={inputStyle} type="number" placeholder="7" step="0.5" value={form.frais_gestion_pct} onChange={set('frais_gestion_pct')} inputMode="decimal" />
                    {parseNum(form.frais_gestion_pct) !== null && parseNum(form.rent) !== null && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginTop: '5px' }}>→ {Math.round(parseNum(form.rent)! * parseNum(form.frais_gestion_pct)! / 100)} €/mois</div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Assurance emprunteur (€/mois)</label>
                    <input style={inputStyle} type="number" placeholder="45" value={form.assurance_emprunteur} onChange={set('assurance_emprunteur')} inputMode="numeric" />
                  </div>
                  <div>
                    <label style={labelStyle}>Autres charges (€/mois)</label>
                    <input style={inputStyle} type="number" placeholder="0" value={form.autres_charges} onChange={set('autres_charges')} inputMode="numeric" />
                  </div>
                  {computedCharges() !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#e2e8f0' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Total charges/mois</span>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{computedCharges()} €</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', fontSize: '13px', fontWeight: 700, color: '#e11d48' }}>
            {error}
          </div>
        )}

        {/* ── Save ── */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{ padding: '16px', borderRadius: '14px', background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', fontSize: '15px', fontWeight: 800, border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(15,23,42,0.2)', letterSpacing: '-0.01em' }}
        >
          {isSaving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>

        {/* ── Supprimer ── */}
        <div style={{ padding: '16px', borderRadius: '14px', border: '1.5px solid #fecdd3', backgroundColor: '#fff8f8', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#9f1239' }}>Supprimer ce bien</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>Cette action est irréversible. Le bien sera définitivement supprimé de ton patrimoine.</div>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'transparent', border: '1.5px solid #fecdd3', color: '#e11d48', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
            >
              Supprimer ce bien
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', backgroundColor: '#e11d48', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: 800, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                {isDeleting ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: '#f1f5f9', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Annuler
              </button>
            </div>
          )}
        </div>

      </section>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
