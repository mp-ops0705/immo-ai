'use client';

import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

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

const pdfStyles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    color: '#1a1a2e',
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
    backgroundColor: '#ffffff',
  },
  // HEADER
  headerBg: {
    backgroundColor: '#0f172a',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 36,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerDocType: {
    fontSize: 7.5,
    color: '#64748b',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  headerRightLine: {
    fontSize: 8,
    color: '#94a3b8',
  },
  headerRightBold: {
    fontFamily: 'Helvetica-Bold',
    color: '#e2e8f0',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginBottom: 8,
  },
  headerFaitA: {
    fontSize: 8,
    color: '#64748b',
  },
  headerFaitAVal: {
    fontFamily: 'Helvetica-Bold',
    color: '#cbd5e1',
  },
  // BODY
  body: {
    paddingHorizontal: 36,
    paddingTop: 12,
    paddingBottom: 20,
  },
  // OFFER HERO
  offerHeroBar: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerHeroBarLabel: {
    fontSize: 7,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    lineHeight: 1,
  },
  offerHeroBarAmount: {
    fontSize: 19,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    lineHeight: 1,
  },
  offerHeroDeclarationBlock: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 0,
    marginBottom: 9,
  },
  offerHeroDeclarationText: {
    fontSize: 8.5,
    color: '#475569',
    lineHeight: 1.45,
  },
  // SUMMARY CHIPS
  summaryRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 9,
  },
  summaryChip: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 3,
    borderLeftColor: '#0f172a',
  },
  summaryChipLabel: {
    fontSize: 6.5,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  summaryChipValue: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  summaryChipSub: {
    fontSize: 7,
    color: '#94a3b8',
    marginTop: 1,
  },
  // LAYOUT
  grid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 7,
  },
  col: {
    flex: 1,
  },
  // SECTIONS
  section: {
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionBody: {
    paddingHorizontal: 9,
    paddingTop: 1,
    paddingBottom: 2,
  },
  // ROWS
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 3,
  },
  rowLabel: {
    fontSize: 8.5,
    color: '#64748b',
    flex: 1,
  },
  rowValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
    flex: 1,
  },
  // BULLETS
  bulletRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    alignItems: 'flex-start',
  },
  bulletMark: {
    fontSize: 9,
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    fontSize: 8.5,
    color: '#334155',
    flex: 1,
    lineHeight: 1.4,
  },
  // SIGNATURES
  signaturesSection: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 12,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 9,
    minHeight: 62,
  },
  signatureRole: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  signatureName: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 2,
  },
  signatureDate: {
    fontSize: 7.5,
    color: '#94a3b8',
    marginBottom: 14,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 3,
  },
  signatureLineLabel: {
    fontSize: 7,
    color: '#94a3b8',
  },
  // DISCLAIMER & FOOTER
  disclaimer: {
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    fontSize: 7,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
});


const parseAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrency = (value: string) => {
  const parsed = parseAmount(value);
  if (!Number.isFinite(parsed)) return '--';
  return (parsed ?? 0).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
};

const formatCurrencyNumber = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '--';
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
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

const PurchaseOfferDocument = ({ form, documentRef }: { form: OfferForm; documentRef: string }) => {
  const conditions = getConditions(form);
  const validityDate = getValidityDate(form.offerValidityDays);
  const signatureDate = new Date().toLocaleDateString('fr-FR');
  const listedAmount = parseAmount(form.listedPrice);
  const offerAmount = parseAmount(form.offerPrice);
  const negotiationGap =
    listedAmount !== null && offerAmount !== null ? offerAmount - listedAmount : null;
  const negotiationRate =
    negotiationGap !== null && listedAmount && listedAmount > 0
      ? (negotiationGap / listedAmount) * 100
      : null;
  void documentRef;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>

        {/* HEADER */}
        <View style={pdfStyles.headerBg}>
          <View style={pdfStyles.headerTop}>
            <View>
              <Text style={pdfStyles.headerDocType}>Proposition d'acquisition non contraignante</Text>
              <Text style={pdfStyles.headerTitle}>Offre d'achat immobilier</Text>
            </View>
            <View style={pdfStyles.headerRight}>
              <Text style={pdfStyles.headerRightLine}>
                Date : <Text style={pdfStyles.headerRightBold}>{signatureDate}</Text>
              </Text>
              <Text style={pdfStyles.headerRightLine}>
                Valide jusqu'au : <Text style={pdfStyles.headerRightBold}>{validityDate}</Text>
              </Text>
            </View>
          </View>
          <View style={pdfStyles.headerDivider} />
          <Text style={pdfStyles.headerFaitA}>
            Fait a : <Text style={pdfStyles.headerFaitAVal}>{form.cityOfSignature || '--'}</Text>
          </Text>
        </View>

        {/* BODY */}
        <View style={pdfStyles.body}>

          {/* OFFER HERO */}
          <View style={pdfStyles.offerHeroBar}>
            <Text style={pdfStyles.offerHeroBarLabel}>Montant de l'offre</Text>
            <Text style={pdfStyles.offerHeroBarAmount}>{formatPDFAmount(form.offerPrice)}</Text>
          </View>
          <View style={pdfStyles.offerHeroDeclarationBlock}>
            <Text style={pdfStyles.offerHeroDeclarationText}>
              Je soussigné(e) {form.buyerFullName || '__________'} propose d'acquérir le bien situé à{' '}
              {form.propertyAddress || '--'} ({form.propertyType || '--'}) au prix de{' '}
              {formatPDFAmount(form.offerPrice)}, selon les modalités et conditions ci-dessous.
            </Text>
          </View>

          {/* SUMMARY CHIPS */}
          <View style={pdfStyles.summaryRow}>
            <View style={pdfStyles.summaryChip}>
              <Text style={pdfStyles.summaryChipLabel}>Prix affiché</Text>
              <Text style={pdfStyles.summaryChipValue}>{formatPDFAmount(form.listedPrice)}</Text>
            </View>
            <View style={pdfStyles.summaryChip}>
              <Text style={pdfStyles.summaryChipLabel}>Écart négocié</Text>
              <Text style={pdfStyles.summaryChipValue}>{formatPDFAmountNumber(negotiationGap)}</Text>
              {negotiationRate !== null ? (
                <Text style={pdfStyles.summaryChipSub}>{negotiationRate.toFixed(1)} % du prix affiché</Text>
              ) : null}
            </View>
            <View style={pdfStyles.summaryChip}>
              <Text style={pdfStyles.summaryChipLabel}>Financement</Text>
              <Text style={pdfStyles.summaryChipValue}>{form.financingType === 'cash' ? 'Comptant' : 'Crédit'}</Text>
            </View>
          </View>

          {/* ACHETEUR + BIEN */}
          <View style={pdfStyles.grid}>
            <View style={[pdfStyles.section, pdfStyles.col]}>
              <View style={pdfStyles.sectionHeader}>
                <Text style={pdfStyles.sectionTitle}>Acheteur</Text>
              </View>
              <View style={pdfStyles.sectionBody}>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.rowLabel}>Nom complet</Text>
                  <Text style={pdfStyles.rowValue}>{form.buyerFullName || '--'}</Text>
                </View>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.rowLabel}>Adresse</Text>
                  <Text style={pdfStyles.rowValue}>{form.buyerAddress || '--'}</Text>
                </View>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.rowLabel}>Email</Text>
                  <Text style={pdfStyles.rowValue}>{form.buyerEmail || '--'}</Text>
                </View>
                <View style={pdfStyles.rowLast}>
                  <Text style={pdfStyles.rowLabel}>Téléphone</Text>
                  <Text style={pdfStyles.rowValue}>{form.buyerPhone || '--'}</Text>
                </View>
                {form.buyerCompany ? (
                  <View style={pdfStyles.row}>
                    <Text style={pdfStyles.rowLabel}>Société</Text>
                    <Text style={pdfStyles.rowValue}>{form.buyerCompany}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={[pdfStyles.section, pdfStyles.col]}>
              <View style={pdfStyles.sectionHeader}>
                <Text style={pdfStyles.sectionTitle}>Bien concerné</Text>
              </View>
              <View style={pdfStyles.sectionBody}>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.rowLabel}>Type</Text>
                  <Text style={pdfStyles.rowValue}>{form.propertyType || '--'}</Text>
                </View>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.rowLabel}>Adresse</Text>
                  <Text style={pdfStyles.rowValue}>{form.propertyAddress || '--'}</Text>
                </View>
                <View style={pdfStyles.row}>
                  <Text style={pdfStyles.rowLabel}>Prix affiché</Text>
                  <Text style={pdfStyles.rowValue}>{formatPDFAmount(form.listedPrice)}</Text>
                </View>
                <View style={pdfStyles.rowLast}>
                  <Text style={pdfStyles.rowLabel}>Prix propose</Text>
                  <Text style={pdfStyles.rowValue}>{formatPDFAmount(form.offerPrice)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* MODALITES FINANCIERES */}
          <View style={pdfStyles.section}>
            <View style={pdfStyles.sectionHeader}>
              <Text style={pdfStyles.sectionTitle}>Modalités financières</Text>
            </View>
            <View style={pdfStyles.sectionBody}>
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.rowLabel}>Mode de financement</Text>
                <Text style={pdfStyles.rowValue}>{form.financingType === 'cash' ? 'Comptant' : 'Crédit immobilier'}</Text>
              </View>
              {form.financingType === 'loan' ? (
                <>
                  <View style={pdfStyles.row}>
                    <Text style={pdfStyles.rowLabel}>Apport personnel</Text>
                    <Text style={pdfStyles.rowValue}>{formatPDFAmount(form.contribution)}</Text>
                  </View>
                  <View style={pdfStyles.row}>
                    <Text style={pdfStyles.rowLabel}>Montant emprunté</Text>
                    <Text style={pdfStyles.rowValue}>{formatPDFAmount(form.loanAmount)}</Text>
                  </View>
                  {form.loanPreApprovalBank ? (
                    <View style={pdfStyles.row}>
                      <Text style={pdfStyles.rowLabel}>Accord de principe</Text>
                      <Text style={pdfStyles.rowValue}>{form.loanPreApprovalBank}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}
              <View style={pdfStyles.rowLast}>
                <Text style={pdfStyles.rowLabel}>Validité de l'offre</Text>
                <Text style={pdfStyles.rowValue}>Jusqu'au {validityDate}</Text>
              </View>
            </View>
          </View>

          {/* CONDITIONS SUSPENSIVES */}
          <View style={pdfStyles.section}>
            <View style={pdfStyles.sectionHeader}>
              <Text style={pdfStyles.sectionTitle}>Conditions suspensives</Text>
            </View>
            <View style={pdfStyles.sectionBody}>
              {conditions.length > 0 ? (
                conditions.map((condition) => (
                  <View key={condition} style={pdfStyles.bulletRow}>
                    <Text style={pdfStyles.bulletMark}>-</Text>
                    <Text style={pdfStyles.bulletText}>{condition}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 8.5, color: '#94a3b8', paddingVertical: 4 }}>
                  Offre sans condition suspensive.
                </Text>
              )}
            </View>
          </View>

          {/* SIGNATURES */}
          <View style={pdfStyles.signaturesSection}>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureRole}>Acheteur</Text>
              <Text style={pdfStyles.signatureName}>{form.buyerFullName || "Nom de l'acheteur"}</Text>
              <Text style={pdfStyles.signatureDate}>Date : _____ / _____ / _________</Text>
              <View style={pdfStyles.signatureLine}>
                <Text style={pdfStyles.signatureLineLabel}>Signature</Text>
              </View>
            </View>
            <View style={pdfStyles.signatureBox}>
              <Text style={pdfStyles.signatureRole}>Vendeur / Représentant</Text>
              <Text style={pdfStyles.signatureName}>Acceptation de l'offre</Text>
              <Text style={pdfStyles.signatureDate}>Date : _____ / _____ / _________</Text>
              <View style={pdfStyles.signatureLine}>
                <Text style={pdfStyles.signatureLineLabel}>Signature</Text>
              </View>
            </View>
          </View>

          {/* DISCLAIMER */}
          <Text style={pdfStyles.disclaimer}>
            Ce document constitue une offre d'achat non contraignante (lettre d'intention). Il ne remplace pas un
            avant-contrat signé devant notaire ou agent immobilier habilité. L'acheteur reste libre de retirer son
            offre avant acceptation expresse du vendeur. À faire valider par un professionnel avant tout engagement.
          </Text>
        </View>

        {/* FOOTER */}
        <View style={pdfStyles.footer}>
          <Text style={pdfStyles.footerText}>Offre d'achat immobilier</Text>
          <Text style={pdfStyles.footerText}>Document non contraignant — ne remplace pas un avant-contrat</Text>
        </View>

      </Page>
    </Document>
  );
};


export default function PurchaseOfferPage() {
  const [form, setForm] = useState<OfferForm>(initialForm);
  const [newConditionText, setNewConditionText] = useState('');
  const [isClientReady, setIsClientReady] = useState(false);
  const [documentRef, setDocumentRef] = useState('OFFRE-ACHAT');

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
      const typeMap: Record<string, string> = {
        apartment: 'Appartement',
        house: 'Maison',
        building: 'Immeuble',
      };
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
      if (current.financingType !== 'loan') {
        return { ...current, offerPrice: value };
      }

      const offerAmount = parseAmount(value);
      const contributionAmount = parseAmount(current.contribution);

      if (offerAmount === null || contributionAmount === null) {
        return { ...current, offerPrice: value };
      }

      return {
        ...current,
        offerPrice: value,
        loanAmount: formatAmountInput(offerAmount - contributionAmount),
      };
    });
  };

  const handleContributionChange = (value: string) => {
    setForm((current) => {
      const offerAmount = parseAmount(current.offerPrice);
      const contributionAmount = parseAmount(value);

      return {
        ...current,
        contribution: value,
        loanAmount:
          current.financingType === 'loan' && offerAmount !== null && contributionAmount !== null
            ? formatAmountInput(offerAmount - contributionAmount)
            : current.loanAmount,
      };
    });
  };

  const handleLoanAmountChange = (value: string) => {
    setForm((current) => {
      const offerAmount = parseAmount(current.offerPrice);
      const loanAmount = parseAmount(value);

      return {
        ...current,
        loanAmount: value,
        contribution:
          current.financingType === 'loan' && offerAmount !== null && loanAmount !== null
            ? formatAmountInput(offerAmount - loanAmount)
            : current.contribution,
      };
    });
  };

  const inputStyle = {
    marginTop: '6px',
    padding: '13px 12px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#fbfcfd',
    color: '#111827',
    fontSize: '16px',
    width: '100%',
    boxSizing: 'border-box',
  } as const;

  const labelStyle = {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px',
    color: '#374151',
    fontWeight: 650,
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
    color: '#64748b',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
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
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Offre</div>
          <h1 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em' }}>Offre d'achat</h1>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Genere une offre claire, sobre et prete a envoyer.</p>
        </header>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Acheteur</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            <label style={labelStyle}>
              Nom complet
              <input value={form.buyerFullName} onChange={(event) => updateField('buyerFullName', event.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Adresse
              <input value={form.buyerAddress} onChange={(event) => updateField('buyerAddress', event.target.value)} style={inputStyle} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>
                Email
                <input type="email" value={form.buyerEmail} onChange={(event) => updateField('buyerEmail', event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Téléphone
                <input value={form.buyerPhone} onChange={(event) => updateField('buyerPhone', event.target.value)} style={inputStyle} />
              </label>
            </div>
            <label style={labelStyle}>
              Société
              <input value={form.buyerCompany} onChange={(event) => updateField('buyerCompany', event.target.value)} placeholder="Optionnel" style={inputStyle} />
            </label>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Bien</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            <label style={labelStyle}>
              Adresse du bien
              <input value={form.propertyAddress} onChange={(event) => updateField('propertyAddress', event.target.value)} style={inputStyle} />
            </label>
            <div style={labelStyle}>
              Type
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '6px',
                  marginTop: '6px',
                  padding: '4px',
                  borderRadius: '8px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                }}
              >
                {['Appartement', 'Maison', 'Immeuble'].map((option) => {
                  const isSelected = form.propertyType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('propertyType', option)}
                      style={{
                        minHeight: '40px',
                        padding: '8px 4px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isSelected ? '#ffffff' : 'transparent',
                        color: isSelected ? '#111827' : '#6b7280',
                        fontSize: '12px',
                        fontWeight: 800,
                        boxShadow: isSelected ? '0 1px 4px rgba(15, 23, 42, 0.10)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>
                Prix affiché
                <input type="number" min="0" value={form.listedPrice} onChange={(event) => updateField('listedPrice', event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Prix offert
                <input type="number" min="0" value={form.offerPrice} onChange={(event) => handleOfferPriceChange(event.target.value)} style={inputStyle} />
              </label>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Financement</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                padding: '4px',
                borderRadius: '8px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
              }}
            >
              {[
                { value: 'loan', label: 'Crédit' },
                { value: 'cash', label: 'Comptant' },
              ].map((option) => {
                const isSelected = form.financingType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateField('financingType', option.value as FinancingType)}
                    style={{
                      minHeight: '40px',
                      padding: '8px',
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
            {form.financingType === 'loan' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={labelStyle}>
                    Apport
                    <input type="number" min="0" value={form.contribution} onChange={(event) => handleContributionChange(event.target.value)} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>
                    Emprunt
                    <input type="number" min="0" value={form.loanAmount} onChange={(event) => handleLoanAmountChange(event.target.value)} style={inputStyle} />
                  </label>
                </div>
                <label style={labelStyle}>
                  Accord de principe bancaire (facultatif)
                  <input
                    value={form.loanPreApprovalBank}
                    onChange={(event) => updateField('loanPreApprovalBank', event.target.value)}
                    placeholder="Ex : Crédit Agricole, BNP..."
                    style={inputStyle}
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Offre</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <label style={labelStyle}>
                  Validité
                  <input type="number" min="1" value={form.offerValidityDays} onChange={(event) => updateField('offerValidityDays', event.target.value)} style={inputStyle} />
                </label>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>7 à 14 jours est la durée habituelle</span>
              </div>
              <label style={labelStyle}>
                Ville signature
                <input value={form.cityOfSignature} onChange={(event) => updateField('cityOfSignature', event.target.value)} style={inputStyle} />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  Conditions suspensives
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                  Ce sont les conditions qui doivent être remplies pour que la vente se concrétise.
                  Si une condition n'est pas remplie, vous pouvez annuler l'offre sans pénalité.
                  Cochez celles qui s'appliquent à votre situation.
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
                    onChange={(event) => updateField(key as keyof OfferForm, event.target.checked as never)}
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
                  >
                    x
                  </button>
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
                  style={{ ...inputStyle, flex: 1, margin: 0 }}
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
                >
                  + Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>

        {isClientReady ? (
          <PDFDownloadLink document={<PurchaseOfferDocument form={form} documentRef={documentRef} />} fileName={fileName}>
            {({ loading }) => (
              <button
                type="button"
                style={{
                  position: 'sticky',
                  bottom: '84px',
                  zIndex: 20,
                  width: '100%',
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
                {loading ? 'Préparation du PDF...' : "Générer l'offre en PDF"}
              </button>
            )}
          </PDFDownloadLink>
        ) : (
          <button
            type="button"
            disabled
            style={{
              position: 'sticky',
              bottom: '84px',
              zIndex: 20,
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#111827',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 800,
              opacity: 0.7,
            }}
          >
            Préparation du PDF...
          </button>
        )}

        <p style={{ margin: '0 0 24px', fontSize: '12px', color: '#64748b', lineHeight: 1.45, textAlign: 'center' }}>
          Document généré à titre d'aide à la rédaction. À faire valider par un professionnel si nécessaire.
        </p>
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
          { href: '/offre', label: 'Offre', active: true, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></> },
          { href: '/outils', label: 'Outils', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></> },
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
