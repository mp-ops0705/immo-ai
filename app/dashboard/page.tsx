'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/PageHeader';
import { supabase } from '@/lib/supabase/client';

type Property = {
  id: string;
  created_at: string;
  name: string | null;
  address: string | null;
  city: string | null;
  property_type: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  current_value: number | null;
  notary_fees: number | null;
  works_cost: number | null;
  rent: number | null;
  charges: number | null;
  taxe_fonciere: number | null;
  charges_copro: number | null;
  frais_gestion_pct: number | null;
  assurance_emprunteur: number | null;
  autres_charges: number | null;
  monthly_payment: number | null;
  initial_loan_amount: number | null;
  remaining_loan: number | null;
  loan_rate: number | null;
  loan_duration_years: number | null;
  loan_start_date: string | null;
};

const navItems = [
  { href: '/dashboard', label: 'Accueil', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></> },
  { href: '/analyse', label: 'Analyse', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
  { href: '/mes-analyses', label: 'Analyses', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></> },
  { href: '/outils', label: 'Outils', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></> },
  { href: '/compte', label: 'Compte', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></> },
];

const fmt = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtSign = (v: number) => (v >= 0 ? '+' : '') + fmt(v);

const typeLabel: Record<string, string> = {
  apartment: 'Appartement',
  house: 'Maison',
  building: 'Immeuble',
  parking: 'Parking',
};

function getPropertyLabel(p: Property) {
  return p.name || p.address || p.city || 'Bien immobilier';
}

function calcCashflow(p: Property) {
  return (p.rent ?? 0) - (p.charges ?? 0) - (p.monthly_payment ?? 0);
}

// Iterative amortization: returns the remaining principal balance after
// monthsElapsed months from startDateStr, using the given monthly payment.
function calcRemainingLoanAt(initial: number, monthlyPayment: number, annualRate: number, startDateStr: string): number {
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

// Returns the accurate remaining loan today: dynamic calculation if all 4 loan
// parameters are present, stored snapshot otherwise.
function getEffectiveRemainingLoan(p: Property): number {
  if (p.initial_loan_amount && p.monthly_payment && p.loan_rate && p.loan_start_date) {
    return calcRemainingLoanAt(p.initial_loan_amount, p.monthly_payment, p.loan_rate, p.loan_start_date);
  }
  return p.remaining_loan ?? 0;
}

function calcEquity(p: Property) {
  const val = p.current_value ?? p.purchase_price ?? 0;
  return val - getEffectiveRemainingLoan(p);
}

function calcYield(p: Property) {
  const base = p.current_value ?? p.purchase_price;
  if (!base || !p.rent) return null;
  return ((p.rent * 12) / base) * 100;
}

// ── Projection helpers ─────────────────────────────────────────────────────────
// Projects the loan balance N years from today, starting from the effective
// remaining loan (dynamic if possible, stored otherwise).
function projectLoanBalance(p: Property, yearsFromNow: number): number {
  if (!p.monthly_payment || !p.loan_rate) return 0;
  const startBalance = getEffectiveRemainingLoan(p);
  if (startBalance === 0) return 0;
  const monthlyRate = p.loan_rate / 100 / 12;
  let balance = startBalance;
  const months = yearsFromNow * 12;
  for (let i = 0; i < months; i++) {
    const interest = balance * monthlyRate;
    const principal = p.monthly_payment - interest;
    balance = Math.max(0, balance - principal);
    if (balance === 0) break;
  }
  return balance;
}

function projectValue(p: Property, yearsFromNow: number, annualRate = 0.02): number {
  const base = p.current_value ?? p.purchase_price ?? 0;
  return base * Math.pow(1 + annualRate, yearsFromNow);
}

function calcTotalInvested(p: Property): number | null {
  const hasLoanIndicator = (p.monthly_payment !== null && p.monthly_payment > 0) ||
                           (p.remaining_loan !== null && p.remaining_loan > 0);
  if (hasLoanIndicator && p.initial_loan_amount === null) return null;
  const purchaseTotal = (p.purchase_price ?? 0) + (p.notary_fees ?? 0) + (p.works_cost ?? 0);
  return Math.max(0, purchaseTotal - (p.initial_loan_amount ?? 0));
}

function findBreakEvenMonths(p: Property, totalInvested: number): number | null {
  if (totalInvested <= 0) return null;
  for (let m = 1; m <= 360; m++) {
    const yrs = m / 12;
    const futureVal = Math.round(projectValue(p, yrs));
    const futureLoan = Math.round(projectLoanBalance(p, yrs));
    const sellingCosts = Math.round(futureVal * 0.06);
    const cf = Math.round(calcCashflow(p) * m);
    if (futureVal - futureLoan - sellingCosts + cf >= totalInvested) return m;
  }
  return null;
}

function formatBreakEven(months: number): string {
  if (months <= 12) return 'dans moins d\'un an';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `dans ${years} an${years > 1 ? 's' : ''}`;
  return `dans ${years} an${years > 1 ? 's' : ''} et ${rem} mois`;
}

// ── Property detail modal ──────────────────────────────────────────────────────
function PropertyModal({ property: p, onClose }: { property: Property; onClose: () => void }) {
  const cashflow = calcCashflow(p);
  const equity = calcEquity(p);
  const yld = calcYield(p);
  const currentVal = p.current_value ?? p.purchase_price ?? 0;
  const capitalGain = p.purchase_price ? currentVal - p.purchase_price : null;

  const effectiveRemainingLoan = getEffectiveRemainingLoan(p);

  const proj = (years: number) => {
    const futureVal = projectValue(p, years);
    const futureLoan = projectLoanBalance(p, years);
    return { val: futureVal, loan: futureLoan, equity: futureVal - futureLoan };
  };
  const p1 = proj(1);
  const p3 = proj(3);
  const p5 = proj(5);
  const p10 = proj(10);

  const totalInvested = calcTotalInvested(p);
  const breakEvenMonths = (totalInvested !== null && totalInvested > 0) ? findBreakEvenMonths(p, totalInvested) : null;
  const sim = (years: number) => {
    const futureVal = Math.round(projectValue(p, years));
    const futureLoan = Math.round(projectLoanBalance(p, years));
    const sellingCosts = Math.round(futureVal * 0.06);
    const cumulativeCashflow = Math.round(cashflow * 12 * years);
    const recovered = futureVal - futureLoan - sellingCosts + cumulativeCashflow;
    const profitNet = totalInvested !== null ? recovered - totalInvested : null;
    return { recovered, profitNet };
  };
  const s1 = sim(1);
  const s3 = sim(3);
  const s5 = sim(5);
  const s10 = sim(10);

  const row = (label: string, value: string, highlight = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 800, color: highlight ? '#0f172a' : '#1e293b' }}>{value}</span>
    </div>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        style={{ position: 'relative', backgroundColor: '#ffffff', borderRadius: '24px 24px 0 0', maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', width: '100%', maxWidth: '430px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#e2e8f0' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 20px 20px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>
            {p.property_type ? (typeLabel[p.property_type] ?? p.property_type) : 'Bien immobilier'}{p.city ? ` · ${p.city}` : ''}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '16px' }}>{getPropertyLabel(p)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Valeur estimée</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>{fmt(currentVal)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Patrimoine net</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: equity >= 0 ? '#34d399' : '#f87171' }}>{fmt(equity)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Acquisition */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Acquisition</div>
            {p.purchase_price !== null && row("Prix d'achat", fmt(p.purchase_price))}
            {p.purchase_date && row('Date d\'achat', new Date(p.purchase_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))}
            {row('Valeur actuelle estimée', fmt(currentVal), true)}
            {capitalGain !== null && row('Plus-value latente', fmtSign(capitalGain), true)}
          </div>

          {/* Crédit */}
          {(p.initial_loan_amount || p.remaining_loan || p.monthly_payment || p.loan_rate) && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Crédit</div>
              {row('Capital restant dû', fmt(effectiveRemainingLoan))}
              {p.monthly_payment !== null && row('Mensualité', fmt(p.monthly_payment) + ' / mois')}
              {p.loan_rate !== null && row('Taux', p.loan_rate.toFixed(2) + ' %')}
            </div>
          )}

          {/* Revenus */}
          {(p.rent || p.charges) && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Revenus locatifs</div>
              {p.rent !== null && row('Loyer mensuel (HC)', fmt(p.rent) + ' / mois')}
              {p.charges !== null && row('Charges mensuelles', fmt(p.charges) + ' / mois')}
              {yld !== null && row('Rendement brut', yld.toFixed(2) + ' %')}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '10px', backgroundColor: cashflow >= 0 ? '#f0fdf4' : '#fff1f2', border: `1px solid ${cashflow >= 0 ? '#bbf7d0' : '#fecdd3'}`, marginTop: '8px' }}>
                <span style={{ fontSize: '13px', color: cashflow >= 0 ? '#166534' : '#9f1239', fontWeight: 700 }}>Cashflow mensuel</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: cashflow >= 0 ? '#16a34a' : '#e11d48' }}>{fmtSign(cashflow)}</span>
              </div>
            </div>
          )}

          {/* Projections */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Projections estimées</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.5 }}>Hypothèse : +2 % / an de valorisation, mensualités constantes.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Dans 1 an', s: p1 },
                { label: 'Dans 3 ans', s: p3 },
                { label: 'Dans 5 ans', s: p5 },
                { label: 'Dans 10 ans', s: p10 },
              ].map(({ label, s }) => (
                <div key={label} style={{ padding: '12px 10px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Valeur estimée</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{fmt(s.val)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Crédit restant</div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>{fmt(s.loan)}</div>
                  </div>
                  <div style={{ paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Patrimoine net</div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: s.equity >= 0 ? '#16a34a' : '#e11d48' }}>{fmt(s.equity)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Simulation de revente */}
          {currentVal > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Simulation de revente</div>

              {/* Ce que tu as sorti de ta poche */}
              {totalInvested !== null && (
                <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>Ce que tu as sorti de ta poche</div>
                  {[
                    { label: 'Prix d\'achat', value: p.purchase_price, minus: false },
                    { label: 'Frais de notaire', value: p.notary_fees, minus: false },
                    { label: 'Travaux', value: p.works_cost, minus: false },
                    { label: 'Montant emprunté', value: p.initial_loan_amount, minus: true },
                  ].filter(r => (r.value ?? 0) > 0).map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{r.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: r.minus ? '#e11d48' : '#374151' }}>
                        {r.minus ? '−' : ''}{fmt(r.value!)}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Tu as sorti de ta poche</span>
                    <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{fmt(totalInvested)}</span>
                  </div>
                </div>
              )}

              {/* Nudge: montant emprunté manquant */}
              {totalInvested === null && (
                <div style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1d4ed8', marginBottom: '3px' }}>💡 Break-even non calculé</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#3b82f6', lineHeight: 1.5 }}>Renseigne le montant emprunté initial dans les infos du bien pour calculer combien tu as sorti de ta poche.</div>
                </div>
              )}

              {/* Break-even banner */}
              {totalInvested !== null && totalInvested > 0 && (
                <div style={{ padding: '14px', borderRadius: '12px', marginBottom: '10px', backgroundColor: breakEvenMonths !== null ? '#f0fdf4' : '#fffbeb', border: `1px solid ${breakEvenMonths !== null ? '#bbf7d0' : '#fde68a'}` }}>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: breakEvenMonths !== null ? '#166534' : '#92400e', marginBottom: '3px' }}>
                    {breakEvenMonths !== null ? `✓ Break-even ${formatBreakEven(breakEvenMonths)}` : '⚠ Non rentable sur 30 ans'}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: breakEvenMonths !== null ? '#166534' : '#92400e' }}>
                    {breakEvenMonths !== null ? `Tu récupères tes ${fmt(totalInvested)} de ta poche` : 'Revois tes hypothèses ou le prix de revente'}
                  </div>
                </div>
              )}

              {/* 4 cartes horizons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                {[
                  { label: '1 an', s: s1 },
                  { label: '3 ans', s: s3 },
                  { label: '5 ans', s: s5 },
                  { label: '10 ans', s: s10 },
                ].map(({ label, s }) => {
                  const isPositive = s.profitNet !== null ? s.profitNet >= 0 : s.recovered >= 0;
                  const color = isPositive ? '#16a34a' : '#e11d48';
                  const bg = isPositive ? '#f0fdf4' : '#fff1f2';
                  const border = isPositive ? '#bbf7d0' : '#fecdd3';
                  return (
                    <div key={label} style={{ padding: '12px 10px', borderRadius: '12px', backgroundColor: bg, border: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dans {label}</div>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>Tu récupères</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{fmt(s.recovered)}</div>
                      </div>
                      {s.profitNet !== null && (
                        <div style={{ paddingTop: '6px', borderTop: `1px solid ${border}` }}>
                          <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>
                            {s.profitNet >= 0 ? 'Bénéfice net' : 'Manque encore'}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 900, color }}>{fmtSign(s.profitNet)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Disclaimer */}
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fde68a', fontSize: '11px', color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
                ⚠ Impôt sur la plus-value non inclus. Valorisation +2 %/an et cashflow constants supposés.
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', padding: '0 0 4px' }}>
            <Link
              href={`/dashboard/modifier/${p.id}`}
              style={{ flex: 1, padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', fontSize: '14px', fontWeight: 800, textAlign: 'center', textDecoration: 'none', letterSpacing: '-0.01em' }}
            >
              Modifier
            </Link>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '13px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const quickActions = [
  { href: '/analyse', label: 'Analyser un bien', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: '#6366f1' },
  { href: '/dashboard/ajouter', label: 'Ajouter un bien', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10', color: '#3b82f6' },
  { href: '/mes-analyses', label: 'Mes analyses', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: '#8b5cf6' },
  { href: '/outils?open=capacite', label: "Capacité d'emprunt", icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: '#06b6d4' },
];

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const carouselOuterRef = useRef<HTMLDivElement>(null);
  const carouselInnerRef = useRef<HTMLDivElement>(null);
  const carouselPos = useRef(0);
  const carouselInteracting = useRef(false);
  const carouselDragged = useRef(false);
  const carouselStartX = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (!sessionData.session) { router.replace('/login'); return; }

      const user = sessionData.session.user;
      const meta = user.user_metadata ?? {};
      if (meta.prenom) setFirstName(meta.prenom);

      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;
      setProperties((props ?? []) as Property[]);
      setIsLoading(false);
    };
    init();
    return () => { isMounted = false; };
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    const inner = carouselInnerRef.current;
    const outer = carouselOuterRef.current;
    if (!inner || !outer) return;

    let animId: number;
    const tick = () => {
      if (!carouselInteracting.current) {
        carouselPos.current -= 0.67;
        const half = inner.scrollWidth / 2;
        if (-carouselPos.current >= half) carouselPos.current += half;
      }
      inner.style.transform = `translateX(${carouselPos.current}px)`;
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    const onTouchStart = (e: TouchEvent) => {
      carouselInteracting.current = true;
      carouselDragged.current = false;
      carouselStartX.current = e.touches[0].clientX;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!carouselInteracting.current) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - carouselStartX.current;
      if (Math.abs(dx) > 5) carouselDragged.current = true;
      carouselPos.current += dx;
      const half = inner.scrollWidth / 2;
      if (-carouselPos.current >= half) carouselPos.current += half;
      if (carouselPos.current > 0) carouselPos.current -= half;
      carouselStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = () => { carouselInteracting.current = false; };

    outer.addEventListener('touchstart', onTouchStart, { passive: true });
    outer.addEventListener('touchmove', onTouchMove, { passive: false });
    outer.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      outer.removeEventListener('touchstart', onTouchStart);
      outer.removeEventListener('touchmove', onTouchMove);
      outer.removeEventListener('touchend', onTouchEnd);
    };
  }, [isLoading]);

  // KPIs
  const totalValue = properties.reduce((s, p) => s + (p.current_value ?? p.purchase_price ?? 0), 0);
  const totalLoan = properties.reduce((s, p) => s + getEffectiveRemainingLoan(p), 0);
  const netWealth = totalValue - totalLoan;
  const totalCashflow = properties.reduce((s, p) => s + calcCashflow(p), 0);

  if (isLoading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '14px', fontWeight: 700 }}>
        Chargement...
      </main>
    );
  }

  const hasProperties = properties.length > 0;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f8fafc', overflowX: 'hidden' }}>
      <PageHeader
        eyebrow="Tableau de bord"
        title={`Bonjour${firstName ? ` ${firstName}` : ''} 👋`}
        subtitle="Voici une vue d'ensemble de ton patrimoine immobilier."
      />
      <section style={{ maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '20px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)', overflowWrap: 'break-word' }}>

        {/* ── KPI cards ── */}
        {hasProperties && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'Patrimoine brut', value: fmt(totalValue), color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
              { label: 'Crédit restant', value: fmt(totalLoan), color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
              { label: 'Patrimoine net', value: fmt(netWealth), color: netWealth >= 0 ? '#34d399' : '#f87171', bg: netWealth >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: netWealth >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)' },
              { label: 'Cashflow / mois', value: fmtSign(totalCashflow), color: totalCashflow >= 0 ? '#34d399' : '#f87171', bg: totalCashflow >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: totalCashflow >= 0 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)' },
            ].map(kpi => (
              <div key={kpi.label} style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#ffffff', border: `1px solid rgba(226,232,240,0.9)`, boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.02em' }}>{kpi.label}</div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!hasProperties && (
          <div style={{ padding: '32px 24px', borderRadius: '20px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: '8px' }}>Ajoute ton premier bien immobilier</div>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>Suis la valeur de ton patrimoine, ton crédit restant et ton cashflow au même endroit.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <Link
                href="/dashboard/ajouter"
                style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', fontSize: '14px', fontWeight: 800, textAlign: 'center', textDecoration: 'none', letterSpacing: '-0.01em', boxShadow: '0 4px 16px rgba(15,23,42,0.2)' }}
              >
                Ajouter un bien
              </Link>
              <Link
                href="/analyse"
                style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#374151', fontSize: '14px', fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
              >
                Analyser une opportunité
              </Link>
            </div>
          </div>
        )}

        {/* ── Mes biens ── */}
        {hasProperties && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>Mes biens</h2>
              <Link href="/dashboard/ajouter" style={{ fontSize: '13px', fontWeight: 800, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                Ajouter
              </Link>
            </div>

            {properties.map(p => {
              const cashflow = calcCashflow(p);
              const equity = calcEquity(p);
              const yld = calcYield(p);
              const val = p.current_value ?? p.purchase_price ?? 0;
              const effectiveLoan = getEffectiveRemainingLoan(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProperty(p)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em', overflow: 'hidden' }}>{getPropertyLabel(p)}</div>
                        {(p.city || p.property_type) && (
                          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                            {[p.property_type ? (typeLabel[p.property_type] ?? p.property_type) : null, p.city].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{fmt(val)}</div>
                        {yld !== null && <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>{yld.toFixed(1)} % brut</div>}
                      </div>
                    </div>
                    {/* Bottom metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Crédit restant</div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#374151' }}>{effectiveLoan > 0 ? fmt(effectiveLoan) : '—'}</div>
                      </div>
                      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Equity</div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: equity >= 0 ? '#16a34a' : '#e11d48' }}>{fmt(equity)}</div>
                      </div>
                      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: cashflow >= 0 ? '#f0fdf4' : '#fff1f2' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>Cashflow</div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: cashflow >= 0 ? '#16a34a' : '#e11d48' }}>{fmtSign(cashflow)}</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Actions rapides ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>Actions rapides</h2>
          <div
            ref={carouselOuterRef}
            style={{ overflow: 'hidden', margin: '0 -12px', cursor: 'grab', userSelect: 'none' }}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') return;
              carouselInteracting.current = true;
              carouselDragged.current = false;
              carouselStartX.current = e.clientX;
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
              e.currentTarget.style.cursor = 'grabbing';
            }}
            onPointerMove={(e) => {
              if (e.pointerType === 'touch' || !carouselInteracting.current) return;
              const dx = e.clientX - carouselStartX.current;
              if (Math.abs(dx) > 5) carouselDragged.current = true;
              carouselPos.current += dx;
              const half = carouselInnerRef.current ? carouselInnerRef.current.scrollWidth / 2 : 0;
              if (half > 0) {
                if (-carouselPos.current >= half) carouselPos.current += half;
                if (carouselPos.current > 0) carouselPos.current -= half;
              }
              carouselStartX.current = e.clientX;
              if (carouselInnerRef.current) carouselInnerRef.current.style.transform = `translateX(${carouselPos.current}px)`;
            }}
            onPointerUp={(e) => {
              if (e.pointerType === 'touch') return;
              carouselInteracting.current = false;
              e.currentTarget.style.cursor = 'grab';
            }}
            onPointerLeave={(e) => { if (e.pointerType !== 'touch') carouselInteracting.current = false; }}
            onClickCapture={(e) => { if (carouselDragged.current) { e.preventDefault(); e.stopPropagation(); carouselDragged.current = false; } }}
          >
            <div ref={carouselInnerRef} style={{ display: 'flex', gap: '10px', paddingLeft: '12px', width: 'max-content', willChange: 'transform' }}>
              {[...quickActions, ...quickActions].map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  draggable={false}
                  style={{ flexShrink: 0, width: '130px', padding: '16px 14px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', borderTop: `3px solid ${action.color}`, display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none', boxShadow: '0 2px 8px rgba(15,23,42,0.07)' }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: `${action.color}16`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={action.color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d={action.icon} />
                    </svg>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* ── Nav ── */}
      <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', backgroundColor: 'rgba(255,255,255,0.92)', borderTop: '1px solid rgba(203,213,225,0.6)', backdropFilter: 'blur(16px)', paddingTop: '5px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)', paddingLeft: '4px', paddingRight: '4px' }}>
        {navItems.map(item => (
          <a key={item.label} href={item.href} style={{ padding: '5px 4px 4px', borderRadius: '12px', backgroundColor: item.href === '/dashboard' ? '#0f172a' : 'transparent', color: item.href === '/dashboard' ? '#ffffff' : '#64748b', textAlign: 'center', textDecoration: 'none', fontSize: '10px', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">{item.icon}</svg>
            {item.label}
          </a>
        ))}
      </nav>

      {/* ── Property detail modal ── */}
      {selectedProperty && (
        <PropertyModal property={selectedProperty} onClose={() => setSelectedProperty(null)} />
      )}

    </main>
  );
}
