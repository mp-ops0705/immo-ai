'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { supabase } from '@/lib/supabase/client';

// ─── COPRO TYPES ──────────────────────────────────────────────────────────────

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

// ─── OFFRE TYPES ──────────────────────────────────────────────────────────────

type FinancingType = 'cash' | 'loan';

type OfferForm = {
  buyerFullName: string;
  buyerAddress: string;
  buyerEmail: string;
  buyerPhone: string;
  propertyAddress: string;
  propertyType: string;
  listedPrice: string;
  offerPrice: string;
  financingType: FinancingType;
  contribution: string;
  loanAmount: string;
  offerValidityDays: string;
  cityOfSignature: string;
  loanPreApprovalBank: string;
  buyerCompany: string;
  loanApproval: boolean;
  satisfactoryDiagnostics: boolean;
  satisfactoryCoownershipDocuments: boolean;
  noMajorUndisclosedWorks: boolean;
  noLegalOrAdministrativeIssue: boolean;
  customConditions: string[];
};

const initialForm: OfferForm = {
  buyerFullName: '',
  buyerAddress: '',
  buyerEmail: '',
  buyerPhone: '',
  propertyAddress: '',
  propertyType: 'Appartement',
  listedPrice: '',
  offerPrice: '',
  financingType: 'loan',
  contribution: '',
  loanAmount: '',
  offerValidityDays: '7',
  cityOfSignature: '',
  loanPreApprovalBank: '',
  buyerCompany: '',
  loanApproval: true,
  satisfactoryDiagnostics: true,
  satisfactoryCoownershipDocuments: true,
  noMajorUndisclosedWorks: true,
  noLegalOrAdministrativeIssue: true,
  customConditions: [],
};

// ─── PDF STYLES ───────────────────────────────────────────────────────────────

const pdfStyles = StyleSheet.create({
  page: { padding: 0, fontSize: 10, color: '#1a1a2e', fontFamily: 'Helvetica', lineHeight: 1.4, backgroundColor: '#ffffff' },
  headerBg: { backgroundColor: '#0f172a', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 36 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerDocType: { fontSize: 7.5, color: '#64748b', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  headerTitle: { fontSize: 18, fontWeight: 700, color: '#ffffff' },
  headerRight: { alignItems: 'flex-end', gap: 3 },
  headerRightLine: { fontSize: 8, color: '#94a3b8' },
  headerRightBold: { fontFamily: 'Helvetica-Bold', color: '#e2e8f0' },
  headerDivider: { height: 1, backgroundColor: '#1e293b', marginBottom: 8 },
  headerFaitA: { fontSize: 8, color: '#64748b' },
  headerFaitAVal: { fontFamily: 'Helvetica-Bold', color: '#cbd5e1' },
  body: { paddingHorizontal: 36, paddingTop: 12, paddingBottom: 20 },
  offerHeroBar: { backgroundColor: '#0f172a', paddingHorizontal: 13, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerHeroBarLabel: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, lineHeight: 1 },
  offerHeroBarAmount: { fontSize: 19, fontFamily: 'Helvetica-Bold', color: '#ffffff', lineHeight: 1 },
  offerHeroDeclarationBlock: { paddingHorizontal: 13, paddingVertical: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderTopWidth: 0, marginBottom: 9 },
  offerHeroDeclarationText: { fontSize: 8.5, color: '#475569', lineHeight: 1.45 },
  summaryRow: { flexDirection: 'row', gap: 7, marginBottom: 9 },
  summaryChip: { flex: 1, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 3, borderLeftColor: '#0f172a' },
  summaryChipLabel: { fontSize: 6.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  summaryChipValue: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  summaryChipSub: { fontSize: 7, color: '#94a3b8', marginTop: 1 },
  grid: { flexDirection: 'row', gap: 8, marginBottom: 7 },
  col: { flex: 1 },
  section: { marginBottom: 7, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionHeader: { backgroundColor: '#f1f5f9', paddingVertical: 4, paddingHorizontal: 9, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  sectionTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionBody: { paddingHorizontal: 9, paddingTop: 1, paddingBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowLast: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 3 },
  rowLabel: { fontSize: 8.5, color: '#64748b', flex: 1 },
  rowValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right', flex: 1 },
  bulletRow: { flexDirection: 'row', gap: 6, paddingVertical: 2, alignItems: 'flex-start' },
  bulletMark: { fontSize: 9, color: '#0f172a', fontFamily: 'Helvetica-Bold' },
  bulletText: { fontSize: 8.5, color: '#334155', flex: 1, lineHeight: 1.4 },
  signaturesSection: { marginTop: 8, flexDirection: 'row', gap: 12 },
  signatureBox: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', padding: 9, minHeight: 62 },
  signatureRole: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  signatureName: { fontSize: 8, color: '#475569', marginBottom: 2 },
  signatureDate: { fontSize: 7.5, color: '#94a3b8', marginBottom: 14 },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#94a3b8', paddingTop: 3 },
  signatureLineLabel: { fontSize: 7, color: '#94a3b8' },
  disclaimer: { marginTop: 8, paddingTop: 7, borderTopWidth: 1, borderTopColor: '#e2e8f0', fontSize: 7, color: '#94a3b8', lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 12, left: 36, right: 36, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 4 },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

// ─── PDF HELPERS ──────────────────────────────────────────────────────────────

const parseAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPDFAmount = (value: string) => {
  const parsed = parseAmount(value);
  if (parsed === null || !Number.isFinite(parsed)) return '--';
  const rounded = Math.round(parsed);
  const abs = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (rounded < 0 ? '- ' : '') + abs + ' EUR';
};

const formatPDFAmountNumber = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '--';
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (rounded < 0 ? '- ' : '') + abs + ' EUR';
};

const getValidityDate = (days: string) => {
  const parsedDays = Number(days);
  const safeDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 7;
  const date = new Date();
  date.setDate(date.getDate() + safeDays);
  return date.toLocaleDateString('fr-FR');
};

const getConditions = (form: OfferForm) =>
  [
    form.loanApproval ? "Obtention d'un financement bancaire" : null,
    form.satisfactoryDiagnostics ? 'Diagnostics techniques satisfaisants' : null,
    form.satisfactoryCoownershipDocuments ? 'Documents de copropriété satisfaisants' : null,
    form.noMajorUndisclosedWorks ? 'Absence de travaux majeurs non communiqués' : null,
    form.noLegalOrAdministrativeIssue ? 'Absence de problème juridique ou administratif' : null,
    ...form.customConditions,
  ].filter(Boolean) as string[];

// ─── PDF DOCUMENT ─────────────────────────────────────────────────────────────

const PurchaseOfferDocument = ({ form, documentRef }: { form: OfferForm; documentRef: string }) => {
  const conditions = getConditions(form);
  const validityDate = getValidityDate(form.offerValidityDays);
  const signatureDate = new Date().toLocaleDateString('fr-FR');
  const listedAmount = parseAmount(form.listedPrice);
  const offerAmount = parseAmount(form.offerPrice);
  const negotiationGap = listedAmount !== null && offerAmount !== null ? offerAmount - listedAmount : null;
  const negotiationRate = negotiationGap !== null && listedAmount && listedAmount > 0 ? (negotiationGap / listedAmount) * 100 : null;
  void documentRef;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerBg}>
          <View style={pdfStyles.headerTop}>
            <View>
              <Text style={pdfStyles.headerDocType}>Proposition d&apos;acquisition non contraignante</Text>
              <Text style={pdfStyles.headerTitle}>Offre d&apos;achat immobilier</Text>
            </View>
            <View style={pdfStyles.headerRight}>
              <Text style={pdfStyles.headerRightLine}>Date : <Text style={pdfStyles.headerRightBold}>{signatureDate}</Text></Text>
              <Text style={pdfStyles.headerRightLine}>Valide jusqu&apos;au : <Text style={pdfStyles.headerRightBold}>{validityDate}</Text></Text>
            </View>
          </View>
          <View style={pdfStyles.headerDivider} />
          <Text style={pdfStyles.headerFaitA}>Fait a : <Text style={pdfStyles.headerFaitAVal}>{form.cityOfSignature || '--'}</Text></Text>
        </View>

        <View style={pdfStyles.body}>
          <View style={pdfStyles.offerHeroBar}>
            <Text style={pdfStyles.offerHeroBarLabel}>Montant de l&apos;offre</Text>
            <Text style={pdfStyles.offerHeroBarAmount}>{formatPDFAmount(form.offerPrice)}</Text>
          </View>
          <View style={pdfStyles.offerHeroDeclarationBlock}>
            <Text style={pdfStyles.offerHeroDeclarationText}>
              Je soussigné(e) {form.buyerFullName || '__________'} propose d&apos;acquérir le bien situé à{' '}
              {form.propertyAddress || '--'} ({form.propertyType || '--'}) au prix de{' '}
              {formatPDFAmount(form.offerPrice)}, selon les modalités et conditions ci-dessous.
            </Text>
          </View>

          <View style={pdfStyles.summaryRow}>
            <View style={pdfStyles.summaryChip}>
              <Text style={pdfStyles.summaryChipLabel}>Prix affiché</Text>
              <Text style={pdfStyles.summaryChipValue}>{formatPDFAmount(form.listedPrice)}</Text>
            </View>
            <View style={pdfStyles.summaryChip}>
              <Text style={pdfStyles.summaryChipLabel}>Écart négocié</Text>
              <Text style={pdfStyles.summaryChipValue}>{formatPDFAmountNumber(negotiationGap)}</Text>
              {negotiationRate !== null ? <Text style={pdfStyles.summaryChipSub}>{negotiationRate.toFixed(1)} % du prix affiché</Text> : null}
            </View>
            <View style={pdfStyles.summaryChip}>
              <Text style={pdfStyles.summaryChipLabel}>Financement</Text>
              <Text style={pdfStyles.summaryChipValue}>{form.financingType === 'cash' ? 'Comptant' : 'Crédit'}</Text>
            </View>
          </View>

          <View style={pdfStyles.grid}>
            <View style={[pdfStyles.section, pdfStyles.col]}>
              <View style={pdfStyles.sectionHeader}><Text style={pdfStyles.sectionTitle}>Acheteur</Text></View>
              <View style={pdfStyles.sectionBody}>
                <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Nom complet</Text><Text style={pdfStyles.rowValue}>{form.buyerFullName || '--'}</Text></View>
                <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Adresse</Text><Text style={pdfStyles.rowValue}>{form.buyerAddress || '--'}</Text></View>
                <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Email</Text><Text style={pdfStyles.rowValue}>{form.buyerEmail || '--'}</Text></View>
                <View style={pdfStyles.rowLast}><Text style={pdfStyles.rowLabel}>Téléphone</Text><Text style={pdfStyles.rowValue}>{form.buyerPhone || '--'}</Text></View>
                {form.buyerCompany ? <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Société</Text><Text style={pdfStyles.rowValue}>{form.buyerCompany}</Text></View> : null}
              </View>
            </View>
            <View style={[pdfStyles.section, pdfStyles.col]}>
              <View style={pdfStyles.sectionHeader}><Text style={pdfStyles.sectionTitle}>Bien concerné</Text></View>
              <View style={pdfStyles.sectionBody}>
                <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Type</Text><Text style={pdfStyles.rowValue}>{form.propertyType || '--'}</Text></View>
                <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Adresse</Text><Text style={pdfStyles.rowValue}>{form.propertyAddress || '--'}</Text></View>
                <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Prix affiché</Text><Text style={pdfStyles.rowValue}>{formatPDFAmount(form.listedPrice)}</Text></View>
                <View style={pdfStyles.rowLast}><Text style={pdfStyles.rowLabel}>Prix proposé</Text><Text style={pdfStyles.rowValue}>{formatPDFAmount(form.offerPrice)}</Text></View>
              </View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <View style={pdfStyles.sectionHeader}><Text style={pdfStyles.sectionTitle}>Modalités financières</Text></View>
            <View style={pdfStyles.sectionBody}>
              <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Mode de financement</Text><Text style={pdfStyles.rowValue}>{form.financingType === 'cash' ? 'Comptant' : 'Crédit immobilier'}</Text></View>
              {form.financingType === 'loan' ? (
                <>
                  <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Apport personnel</Text><Text style={pdfStyles.rowValue}>{formatPDFAmount(form.contribution)}</Text></View>
                  <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Montant emprunté</Text><Text style={pdfStyles.rowValue}>{formatPDFAmount(form.loanAmount)}</Text></View>
                  {form.loanPreApprovalBank ? <View style={pdfStyles.row}><Text style={pdfStyles.rowLabel}>Accord de principe</Text><Text style={pdfStyles.rowValue}>{form.loanPreApprovalBank}</Text></View> : null}
                </>
              ) : null}
              <View style={pdfStyles.rowLast}><Text style={pdfStyles.rowLabel}>Validité de l&apos;offre</Text><Text style={pdfStyles.rowValue}>Jusqu&apos;au {validityDate}</Text></View>
            </View>
          </View>

          <View style={pdfStyles.section}>
            <View style={pdfStyles.sectionHeader}><Text style={pdfStyles.sectionTitle}>Conditions suspensives</Text></View>
            <View style={pdfStyles.sectionBody}>
              {conditions.length > 0 ? conditions.map((condition) => (
                <View key={condition} style={pdfStyles.bulletRow}>
                  <Text style={pdfStyles.bulletMark}>-</Text>
                  <Text style={pdfStyles.bulletText}>{condition}</Text>
                </View>
              )) : (
                <Text style={{ fontSize: 8.5, color: '#94a3b8', paddingVertical: 4 }}>Offre sans condition suspensive.</Text>
              )}
            </View>
          </View>

          <View style={pdfStyles.signaturesSection}>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureRole}>Acheteur</Text>
              <Text style={pdfStyles.signatureName}>{form.buyerFullName || "Nom de l'acheteur"}</Text>
              <Text style={pdfStyles.signatureDate}>Date : _____ / _____ / _________</Text>
              <View style={pdfStyles.signatureLine}><Text style={pdfStyles.signatureLineLabel}>Signature</Text></View>
            </View>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureRole}>Vendeur / Représentant</Text>
              <Text style={pdfStyles.signatureName}>Acceptation de l&apos;offre</Text>
              <Text style={pdfStyles.signatureDate}>Date : _____ / _____ / _________</Text>
              <View style={pdfStyles.signatureLine}><Text style={pdfStyles.signatureLineLabel}>Signature</Text></View>
            </View>
          </View>

          <Text style={pdfStyles.disclaimer}>
            Ce document constitue une offre d&apos;achat non contraignante (lettre d&apos;intention). Il ne remplace pas un
            avant-contrat signé devant notaire ou agent immobilier habilité. L&apos;acheteur reste libre de retirer son
            offre avant acceptation expresse du vendeur. À faire valider par un professionnel avant tout engagement.
          </Text>
        </View>

        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>Offre d&apos;achat immobilier</Text>
          <Text style={pdfStyles.footerText}>Document non contraignant — ne remplace pas un avant-contrat</Text>
        </View>
      </Page>
    </Document>
  );
};

// ─── NAV & UTILS ──────────────────────────────────────────────────────────────

const navItems = [
  { href: '/dashboard', label: 'Accueil', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></> },
  { href: '/analyse', label: 'Analyse', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
  { href: '/mes-analyses', label: 'Analyses', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></> },
  { href: '/outils', label: 'Outils', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></> },
  { href: '/compte', label: 'Compte', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></> },
];

function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    if (target === 0) { setValue(0); return; }
    const animate = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function OutilsPage() {

  // ── Capacite state ──
  const [openCapacite, setOpenCapacite] = useState(false);
  const [typeAchat, setTypeAchat] = useState<'principale' | 'locatif'>('principale');
  const [revenus, setRevenus] = useState('');
  const [charges, setCharges] = useState('');
  const [loyerFutur, setLoyerFutur] = useState('');
  const [apport, setApport] = useState('');
  const [taux, setTaux] = useState('3.5');
  const [duree, setDuree] = useState(20);

  // ── Copro state ──
  const [openCopro, setOpenCopro] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [coproResult, setCoproResult] = useState<CoproAnalysis | null>(null);
  const [coproError, setCoproError] = useState('');
  const [coproLoading, setCoproLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Offre state ──
  const [openOffre, setOpenOffre] = useState(false);
  const [form, setForm] = useState<OfferForm>(initialForm);
  const [newConditionText, setNewConditionText] = useState('');
  const [isClientReady, setIsClientReady] = useState(false);
  const [documentRef, setDocumentRef] = useState('OFFRE-ACHAT');

  // ── Capacite computed ──
  type CalcResult = { capacite: number; budget: number; mensualiteMax: number; endettementActuel: number; revAjuste: number; loyer: number };
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  // ── Auto-open depuis URL (?open=offre|capacite) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('open') === 'offre') setOpenOffre(true);
    if (params.get('open') === 'capacite') setOpenCapacite(true);
  }, []);

  // ── Offre effects ──
  useEffect(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    setDocumentRef(`OFFRE-${datePart}-${randomPart}`);
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('lastAnalysis');
      if (!saved) return;
      localStorage.removeItem('lastAnalysis');
      const data = JSON.parse(saved) as { purchasePrice?: string; city?: string; propertyType?: string };
      const typeMap: Record<string, string> = { apartment: 'Appartement', house: 'Maison', building: 'Immeuble' };
      setForm((prev) => ({
        ...prev,
        listedPrice: data.purchasePrice || prev.listedPrice,
        offerPrice: data.purchasePrice || prev.offerPrice,
        propertyType: (data.propertyType && typeMap[data.propertyType]) ? typeMap[data.propertyType] : prev.propertyType,
        propertyAddress: data.city ? data.city : prev.propertyAddress,
      }));
    } catch {}
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const meta = data.user.user_metadata ?? {};
      const fullName = [meta.prenom, meta.nom].filter(Boolean).join(' ');
      setForm((prev) => ({
        ...prev,
        buyerFullName: prev.buyerFullName || fullName,
        buyerAddress: prev.buyerAddress || (meta.adresse ?? ''),
        buyerPhone: prev.buyerPhone || (meta.telephone ?? ''),
        buyerEmail: prev.buyerEmail || (data.user?.email ?? ''),
        buyerCompany: prev.buyerCompany || (meta.societe ?? ''),
      }));
    };
    loadProfile();
  }, []);

  // ── Offre computed & handlers ──
  const fileName = useMemo(() => {
    const buyer = form.buyerFullName.trim().toLowerCase().replace(/\s+/g, '-');
    return `offre-achat${buyer ? `-${buyer}` : ''}.pdf`;
  }, [form.buyerFullName]);

  const updateField = <K extends keyof OfferForm>(key: K, value: OfferForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const formatAmountInput = (value: number) => {
    const safeValue = Math.max(0, value);
    return Number.isInteger(safeValue) ? String(safeValue) : safeValue.toFixed(2);
  };

  const handleOfferPriceChange = (value: string) => {
    setForm((current) => {
      if (current.financingType !== 'loan') return { ...current, offerPrice: value };
      const offerAmount = parseAmount(value);
      const contributionAmount = parseAmount(current.contribution);
      if (offerAmount === null || contributionAmount === null) return { ...current, offerPrice: value };
      return { ...current, offerPrice: value, loanAmount: formatAmountInput(offerAmount - contributionAmount) };
    });
  };

  const handleContributionChange = (value: string) => {
    setForm((current) => {
      const offerAmount = parseAmount(current.offerPrice);
      const contributionAmount = parseAmount(value);
      return {
        ...current, contribution: value,
        loanAmount: current.financingType === 'loan' && offerAmount !== null && contributionAmount !== null
          ? formatAmountInput(offerAmount - contributionAmount) : current.loanAmount,
      };
    });
  };

  const handleLoanAmountChange = (value: string) => {
    setForm((current) => {
      const offerAmount = parseAmount(current.offerPrice);
      const loanAmount = parseAmount(value);
      return {
        ...current, loanAmount: value,
        contribution: current.financingType === 'loan' && offerAmount !== null && loanAmount !== null
          ? formatAmountInput(offerAmount - loanAmount) : current.contribution,
      };
    });
  };

  // ── Capacite handlers ──
  const parse = (v: string) => parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0;

  const handleCalculer = () => {
    const rev = parse(revenus), chg = parse(charges), app = parse(apport), loyer = parse(loyerFutur);
    const revAjuste = rev + loyer * 0.7;
    const t = parse(taux) / 100 / 12, n = duree * 12;
    const mensualiteMax = revAjuste * 0.35 - chg;
    const capacite = t > 0 && mensualiteMax > 0 ? mensualiteMax * (1 - Math.pow(1 + t, -n)) / t : 0;
    const budget = capacite + app;
    const endettementActuel = revAjuste > 0 ? (chg / revAjuste) * 100 : 0;
    if (rev > 0 && mensualiteMax > 0) setCalcResult({ capacite, budget, mensualiteMax, endettementActuel, revAjuste, loyer });
  };

  const cr = calcResult;
  const debtColor = cr ? (cr.endettementActuel >= 30 ? '#ef4444' : cr.endettementActuel >= 22 ? '#f59e0b' : '#22c55e') : '#22c55e';
  const fmt = (v: number) => Math.round(v).toLocaleString('fr-FR') + ' €';
  const animatedCapacite = useCountUp(cr?.capacite ?? 0, 800);
  const animatedBudget = useCountUp(cr?.budget ?? 0, 900);
  const animatedMensualite = useCountUp(cr?.mensualiteMax ?? 0, 650);

  // ── Copro handlers ──
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

  // ── Styles ──
  const inputStyle = { padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '16px', color: '#111827', backgroundColor: '#ffffff', width: '100%', boxSizing: 'border-box' as const, outline: 'none' };
  const labelStyle = { display: 'flex' as const, flexDirection: 'column' as const, gap: '6px', fontSize: '13px', fontWeight: 600 as const, color: '#374151' };
  const cardStyle = { padding: '16px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' } as const;
  const sectionTitleStyle = { margin: '0 0 12px', fontSize: '11px', fontWeight: 850, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' } as const;
  const riskStyle = coproResult ? getRiskColor(coproResult.riskLevel) : null;

  const offreInputStyle = { marginTop: '6px', padding: '13px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fbfcfd', color: '#111827', fontSize: '16px', width: '100%', boxSizing: 'border-box' } as const;
  const offreLabelStyle = { display: 'flex', flexDirection: 'column', fontSize: '13px', color: '#374151', fontWeight: 650 } as const;
  const offreCardStyle = { padding: '16px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' } as const;
  const offreSectionTitleStyle = { margin: '0 0 12px', fontSize: '12px', fontWeight: 800, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' } as const;

  return (
    <main style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: '100vh', backgroundColor: '#f8fafc', overflowX: 'hidden' }}>
      <style>{`@keyframes cfSlideUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <PageHeader
        eyebrow="Outils"
        title="Outils & calculateurs"
        subtitle="Capacité d'emprunt, copropriété et offre d'achat."
      />
      <section style={{ maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)', overflowWrap: 'break-word' }}>

        {/* ── CARD 1 — CAPACITE D'EMPRUNT — accent ambre ── */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.14)' }}>
          <button
            type="button"
            onClick={() => setOpenCapacite(o => !o)}
            style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #0f172a 0%, #1c2d4a 100%)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) auto', columnGap: '16px', rowGap: '4px', alignItems: 'start', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '96px', height: '96px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-16px', right: '64px', width: '48px', height: '48px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ gridColumn: '1', gridRow: '1 / span 2', alignSelf: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(251,191,36,0.22) 0%, rgba(251,191,36,0.08) 100%)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div style={{ gridColumn: '2', gridRow: '1', zIndex: 1, fontSize: '16px', fontWeight: 850, color: '#ffffff', letterSpacing: '-0.01em', minWidth: 0, overflowWrap: 'break-word' }}>Capacite d&apos;emprunt</div>
            <div style={{ gridColumn: '3', gridRow: '1', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
              <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>CALCUL</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: openCapacite ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}>
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div style={{ gridColumn: '2 / -1', gridRow: '2', zIndex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500, minWidth: 0, overflowWrap: 'break-word' }}>Combien puis-je emprunter ?</div>
          </button>

          {openCapacite && (
            <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid rgba(251,191,36,0.15)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', padding: '3px', borderRadius: '10px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
                {([['principale', 'Residence principale'], ['locatif', 'Investissement locatif']] as const).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => { setTypeAchat(val); if (val === 'principale') setLoyerFutur(''); }} style={{ flex: 1, padding: '9px 6px', borderRadius: '8px', border: 'none', backgroundColor: typeAchat === val ? '#0f172a' : 'transparent', color: typeAchat === val ? '#ffffff' : '#6b7280', fontSize: '12px', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.3 }}>{label}</button>
                ))}
              </div>
              <label style={labelStyle}>
                Revenus nets mensuels du foyer
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" value={revenus} onChange={e => setRevenus(e.target.value)} placeholder="3 500" style={inputStyle} />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>€</span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>Montant net sur fiche de paie (avant impot sur le revenu). Additionnez tous les revenus du foyer.</span>
              </label>
              <label style={labelStyle}>
                Charges mensuelles existantes
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" value={charges} onChange={e => setCharges(e.target.value)} placeholder="0" style={inputStyle} />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>€</span>
                </div>
                {typeAchat === 'principale'
                  ? <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>Credits en cours (auto, conso...), pensions versees. <strong style={{ color: '#f59e0b' }}>Ne pas inclure votre loyer actuel</strong> — il sera remplace par le credit immobilier.</span>
                  : <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>Credits en cours (auto, conso...), pensions versees, et votre loyer actuel si vous continuez a louer votre residence principale.</span>
                }
              </label>
              {typeAchat === 'locatif' && (
                <label style={labelStyle}>
                  Loyer futur estime
                  <div style={{ position: 'relative' }}>
                    <input type="number" min="0" value={loyerFutur} onChange={e => setLoyerFutur(e.target.value)} placeholder="800" style={inputStyle} />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>€</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, lineHeight: 1.5 }}>Les banques integrent 70 % du loyer prevu dans vos revenus pour le calcul de la capacite.</span>
                </label>
              )}
              <label style={labelStyle}>
                Apport personnel
                <div style={{ position: 'relative' }}>
                  <input type="number" min="0" value={apport} onChange={e => setApport(e.target.value)} placeholder="20 000" style={inputStyle} />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#94a3b8', fontWeight: 700 }}>€</span>
                </div>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={labelStyle}>
                  Taux d&apos;interet
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
              <button type="button" onClick={handleCalculer} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', fontSize: '15px', fontWeight: 800, cursor: 'pointer', letterSpacing: '-0.01em', boxShadow: '0 4px 16px rgba(15,23,42,0.2)' }}>
                Calculer ma capacite
              </button>
              {cr && (
                <div key={cr.capacite + '-' + cr.mensualiteMax} style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(251,191,36,0.18)', boxShadow: '0 4px 20px rgba(15,23,42,0.12)', animation: 'cfSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>
                  <div style={{ padding: '20px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Capacite d&apos;emprunt</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{Math.round(animatedCapacite).toLocaleString('fr-FR')} €</div>
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Budget total avec apport</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{Math.round(animatedBudget).toLocaleString('fr-FR')} €</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                    {cr.loyer > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span>Revenus pris en compte</span>
                        <strong style={{ color: '#0f172a', fontWeight: 800 }}>{fmt(cr.revAjuste)} / mois</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span>Mensualite disponible</span>
                      <strong style={{ color: '#0f172a', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Math.round(animatedMensualite).toLocaleString('fr-FR')} € / mois</strong>
                    </div>
                    <div style={{ padding: '10px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Endettement actuel</span>
                        <strong style={{ fontSize: '13px', color: debtColor, fontWeight: 800 }}>{cr.endettementActuel.toFixed(1)} %</strong>
                      </div>
                      <div style={{ position: 'relative', height: '6px', borderRadius: '999px', backgroundColor: '#f1f5f9' }}>
                        <div style={{ height: '100%', borderRadius: '999px', width: `${Math.min(cr.endettementActuel / 35, 1) * 100}%`, backgroundColor: debtColor, transition: 'width 0.7s cubic-bezier(0.22,1,0.36,1)' }} />
                        <div style={{ position: 'absolute', right: 0, top: '-3px', width: '2px', height: '12px', backgroundColor: '#cbd5e1', borderRadius: '1px' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>limite banque 35 %</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {cr && cr.mensualiteMax < 200 && (
                <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', fontSize: '12px', color: '#9a3412', fontWeight: 600, lineHeight: 1.5 }}>
                  Vos charges actuelles ({cr.endettementActuel.toFixed(0)} % de vos revenus) occupent presque toute la capacite autorisee par les banques (35 %). Si vous achetez votre residence principale, n&apos;incluez pas votre loyer actuel dans les charges — il sera remplace par le credit.
                </div>
              )}
              <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', lineHeight: 1.5 }}>Estimation indicative a 35 % d&apos;endettement max. La banque appliquera ses propres criteres.</p>
            </div>
          )}
        </div>

        {/* ── CARD 2 — ANALYSE COPRO — accent indigo ── */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.14)' }}>
          <button
            type="button"
            onClick={() => setOpenCopro(o => !o)}
            style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #0f172a 0%, #1a1f35 100%)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) auto', columnGap: '16px', rowGap: '4px', alignItems: 'start', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '96px', height: '96px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-16px', right: '64px', width: '48px', height: '48px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ gridColumn: '1', gridRow: '1 / span 2', alignSelf: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(129,140,248,0.22) 0%, rgba(129,140,248,0.08) 100%)', border: '1px solid rgba(129,140,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div style={{ gridColumn: '2', gridRow: '1', zIndex: 1, fontSize: '16px', fontWeight: 850, color: '#ffffff', letterSpacing: '-0.01em', minWidth: 0, overflowWrap: 'break-word' }}>Analyse copropriete</div>
            <div style={{ gridColumn: '3', gridRow: '1', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
              <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.25)', color: '#a5b4fc', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>ANALYSE</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: openCopro ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}>
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div style={{ gridColumn: '2 / -1', gridRow: '2', zIndex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500, minWidth: 0, overflowWrap: 'break-word' }}>Travaux, litiges et risques financiers</div>
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
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>PV d&apos;AG, budget, travaux, diagnostics</span>
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
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, textAlign: 'center' }}>Cette analyse est une aide a la lecture et ne remplace pas l&apos;avis d&apos;un notaire ou professionnel.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── CARD 3 — OFFRE D'ACHAT — accent émeraude ── */}
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.14)' }}>
          <button
            type="button"
            onClick={() => setOpenOffre(o => !o)}
            style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #0f172a 0%, #0d2818 100%)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) auto', columnGap: '16px', rowGap: '4px', alignItems: 'start', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '96px', height: '96px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-16px', right: '64px', width: '48px', height: '48px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ gridColumn: '1', gridRow: '1 / span 2', alignSelf: 'center', width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(52,211,153,0.22) 0%, rgba(52,211,153,0.08) 100%)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div style={{ gridColumn: '2', gridRow: '1', zIndex: 1, fontSize: '16px', fontWeight: 850, color: '#ffffff', letterSpacing: '-0.01em', minWidth: 0, overflowWrap: 'break-word' }}>Offre d&apos;achat</div>
            <div style={{ gridColumn: '3', gridRow: '1', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
              <span style={{ padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>PDF</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: openOffre ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}>
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <div style={{ gridColumn: '2 / -1', gridRow: '2', zIndex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500, minWidth: 0, overflowWrap: 'break-word' }}>Genere une offre officielle a envoyer au vendeur</div>
          </button>

          {openOffre && (
            <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid rgba(52,211,153,0.15)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Acheteur */}
              <div style={offreCardStyle}>
                <div style={offreSectionTitleStyle}>Acheteur</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <label style={offreLabelStyle}>
                    Nom complet
                    <input value={form.buyerFullName} onChange={(e) => updateField('buyerFullName', e.target.value)} style={offreInputStyle} />
                  </label>
                  <label style={offreLabelStyle}>
                    Adresse
                    <input value={form.buyerAddress} onChange={(e) => updateField('buyerAddress', e.target.value)} style={offreInputStyle} />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label style={offreLabelStyle}>Email<input type="email" value={form.buyerEmail} onChange={(e) => updateField('buyerEmail', e.target.value)} style={offreInputStyle} /></label>
                    <label style={offreLabelStyle}>Téléphone<input value={form.buyerPhone} onChange={(e) => updateField('buyerPhone', e.target.value)} style={offreInputStyle} /></label>
                  </div>
                  <label style={offreLabelStyle}>
                    Société
                    <input value={form.buyerCompany} onChange={(e) => updateField('buyerCompany', e.target.value)} placeholder="Optionnel" style={offreInputStyle} />
                  </label>
                </div>
              </div>

              {/* Bien */}
              <div style={offreCardStyle}>
                <div style={offreSectionTitleStyle}>Bien</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <label style={offreLabelStyle}>
                    Adresse du bien
                    <input value={form.propertyAddress} onChange={(e) => updateField('propertyAddress', e.target.value)} style={offreInputStyle} />
                  </label>
                  <div style={offreLabelStyle}>
                    Type
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '6px', padding: '4px', borderRadius: '8px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                      {['Appartement', 'Maison', 'Immeuble'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField('propertyType', option)}
                          style={{ minHeight: '40px', padding: '8px 4px', borderRadius: '8px', border: 'none', backgroundColor: form.propertyType === option ? '#ffffff' : 'transparent', color: form.propertyType === option ? '#111827' : '#6b7280', fontSize: '12px', fontWeight: 800, boxShadow: form.propertyType === option ? '0 1px 4px rgba(15,23,42,0.10)' : 'none', cursor: 'pointer' }}
                        >{option}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <label style={offreLabelStyle}>Prix affiché<input type="number" min="0" value={form.listedPrice} onChange={(e) => updateField('listedPrice', e.target.value)} style={offreInputStyle} /></label>
                    <label style={offreLabelStyle}>Prix offert<input type="number" min="0" value={form.offerPrice} onChange={(e) => handleOfferPriceChange(e.target.value)} style={offreInputStyle} /></label>
                  </div>
                </div>
              </div>

              {/* Financement */}
              <div style={offreCardStyle}>
                <div style={offreSectionTitleStyle}>Financement</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '4px', borderRadius: '8px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                    {[{ value: 'loan', label: 'Crédit' }, { value: 'cash', label: 'Comptant' }].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('financingType', option.value as FinancingType)}
                        style={{ minHeight: '40px', padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: form.financingType === option.value ? '#ffffff' : 'transparent', color: form.financingType === option.value ? '#111827' : '#6b7280', fontSize: '13px', fontWeight: 800, boxShadow: form.financingType === option.value ? '0 1px 4px rgba(15,23,42,0.10)' : 'none', cursor: 'pointer' }}
                      >{option.label}</button>
                    ))}
                  </div>
                  {form.financingType === 'loan' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label style={offreLabelStyle}>Apport<input type="number" min="0" value={form.contribution} onChange={(e) => handleContributionChange(e.target.value)} style={offreInputStyle} /></label>
                        <label style={offreLabelStyle}>Emprunt<input type="number" min="0" value={form.loanAmount} onChange={(e) => handleLoanAmountChange(e.target.value)} style={offreInputStyle} /></label>
                      </div>
                      <label style={offreLabelStyle}>
                        Accord de principe bancaire (facultatif)
                        <input value={form.loanPreApprovalBank} onChange={(e) => updateField('loanPreApprovalBank', e.target.value)} placeholder="Ex : Crédit Agricole, BNP..." style={offreInputStyle} />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Offre */}
              <div style={offreCardStyle}>
                <div style={offreSectionTitleStyle}>Offre</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <label style={offreLabelStyle}>
                        Validité
                        <input type="number" min="1" value={form.offerValidityDays} onChange={(e) => updateField('offerValidityDays', e.target.value)} style={offreInputStyle} />
                      </label>
                      <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>7 à 14 jours est la durée habituelle</span>
                    </div>
                    <label style={offreLabelStyle}>Ville signature<input value={form.cityOfSignature} onChange={(e) => updateField('cityOfSignature', e.target.value)} style={offreInputStyle} /></label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Conditions suspensives</div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                        Ce sont les conditions qui doivent être remplies pour que la vente se concrétise.
                        Si une condition n&apos;est pas remplie, vous pouvez annuler l&apos;offre sans pénalité.
                        Cochez celles qui s&apos;appliquent à votre situation.
                      </div>
                    </div>
                    {[
                      ['loanApproval', "Obtention du financement", "Votre banque doit accepter votre prêt immobilier"],
                      ['satisfactoryDiagnostics', 'Diagnostics satisfaisants', "Les diagnostics (amiante, plomb, DPE…) ne révèlent rien de grave"],
                      ['satisfactoryCoownershipDocuments', 'Documents de copropriété satisfaisants', "Pour un appartement : les PV d'AG et bilans de charges sont corrects"],
                      ['noMajorUndisclosedWorks', 'Aucun gros travaux non communiqué', "Le vendeur n'a pas caché de travaux importants à prévoir"],
                      ['noLegalOrAdministrativeIssue', 'Aucun problème juridique ou administratif', "Pas de litige, servitude cachée ou problème d'urbanisme"],
                    ].map(([key, label, hint]) => (
                      <label key={key} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(form[key as keyof OfferForm])}
                          onChange={(e) => updateField(key as keyof OfferForm, e.target.checked as never)}
                          style={{ width: '17px', height: '17px', marginTop: '2px', flexShrink: 0, accentColor: '#16a34a' }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{label}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{hint}</div>
                        </div>
                      </label>
                    ))}
                    {form.customConditions.map((cond, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '17px', height: '17px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#16a34a"/><path d="M4 7l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{cond}</div>
                        <button
                          type="button"
                          onClick={() => updateField('customConditions', form.customConditions.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8', fontSize: '16px', lineHeight: 1 }}
                        >×</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Ajouter une condition personnalisée…"
                        value={newConditionText}
                        onChange={(e) => setNewConditionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newConditionText.trim()) {
                            updateField('customConditions', [...form.customConditions, newConditionText.trim()]);
                            setNewConditionText('');
                          }
                        }}
                        style={{ ...offreInputStyle, flex: 1, marginTop: 0 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newConditionText.trim()) {
                            updateField('customConditions', [...form.customConditions, newConditionText.trim()]);
                            setNewConditionText('');
                          }
                        }}
                        style={{ padding: '0 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >+ Ajouter</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF button */}
              {isClientReady ? (
                <PDFDownloadLink document={<PurchaseOfferDocument form={form} documentRef={documentRef} />} fileName={fileName}>
                  {({ loading }) => (
                    <button
                      type="button"
                      style={{ position: 'sticky', bottom: '84px', zIndex: 20, width: '100%', padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#111827', color: '#ffffff', fontSize: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(17,24,39,0.12)' }}
                    >
                      {loading ? 'Préparation du PDF...' : "Générer l'offre en PDF"}
                    </button>
                  )}
                </PDFDownloadLink>
              ) : (
                <button type="button" disabled style={{ position: 'sticky', bottom: '84px', zIndex: 20, width: '100%', padding: '15px', borderRadius: '12px', border: 'none', backgroundColor: '#111827', color: '#ffffff', fontSize: '16px', fontWeight: 800, opacity: 0.7 }}>
                  Préparation du PDF...
                </button>
              )}
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, textAlign: 'center' }}>Document généré à titre d&apos;aide à la rédaction. À faire valider par un professionnel si nécessaire.</p>
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
