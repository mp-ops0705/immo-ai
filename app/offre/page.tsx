'use client';

import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useEffect, useMemo, useState } from 'react';

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
  loanApproval: boolean;
  satisfactoryDiagnostics: boolean;
  satisfactoryCoownershipDocuments: boolean;
  noMajorUndisclosedWorks: boolean;
  noLegalOrAdministrativeIssue: boolean;
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
  loanApproval: true,
  satisfactoryDiagnostics: true,
  satisfactoryCoownershipDocuments: true,
  noMajorUndisclosedWorks: true,
  noLegalOrAdministrativeIssue: true,
};

const pdfStyles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10.5,
    color: '#111827',
    fontFamily: 'Helvetica',
    lineHeight: 1.35,
    backgroundColor: '#ffffff',
  },
  topBar: {
    height: 4,
    backgroundColor: '#0f172a',
    marginBottom: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
  },
  headerMeta: {
    width: 170,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  metaLine: {
    fontSize: 9.5,
    marginBottom: 4,
    color: '#334155',
  },
  offerHero: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    marginBottom: 18,
  },
  offerHeroLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  offerHeroAmount: {
    fontSize: 25,
    fontWeight: 700,
    color: '#0f172a',
  },
  offerHeroText: {
    marginTop: 6,
    color: '#475569',
    fontSize: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  summaryItem: {
    flex: 1,
    padding: 11,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0f172a',
  },
  summaryMuted: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  half: {
    flex: 1,
  },
  section: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 8,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLabel: {
    color: '#64748b',
    width: 125,
  },
  rowValue: {
    color: '#0f172a',
    fontWeight: 700,
    flex: 1,
    textAlign: 'right',
  },
  line: {
    marginBottom: 4,
  },
  paragraph: {
    marginBottom: 10,
    color: '#334155',
  },
  bullet: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 5,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0f172a',
    marginTop: 5,
  },
  bulletText: {
    flex: 1,
    color: '#334155',
  },
  signature: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 20,
  },
  signatureBox: {
    flex: 1,
    height: 82,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 10,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  disclaimer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    fontSize: 9,
    color: '#6b7280',
  },
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 22,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 8,
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

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.topBar} />
        <View style={pdfStyles.header}>
          <View style={pdfStyles.titleBlock}>
            <Text style={pdfStyles.eyebrow}>Proposition d'acquisition</Text>
            <Text style={pdfStyles.title}>Offre d'achat immobilier</Text>
          </View>
          <View style={pdfStyles.headerMeta}>
            <Text style={pdfStyles.metaLine}>Référence : {documentRef}</Text>
            <Text style={pdfStyles.metaLine}>Fait à : {form.cityOfSignature || '--'}</Text>
            <Text style={pdfStyles.metaLine}>Date : {signatureDate}</Text>
            <Text style={pdfStyles.metaLine}>Validité : jusqu'au {validityDate}</Text>
          </View>
        </View>

        <View style={pdfStyles.offerHero}>
          <Text style={pdfStyles.offerHeroLabel}>Montant de l'offre</Text>
          <Text style={pdfStyles.offerHeroAmount}>{formatCurrency(form.offerPrice)}</Text>
          <Text style={pdfStyles.offerHeroText}>
            Offre formulée pour le bien situé : {form.propertyAddress || '--'}
          </Text>
        </View>

        <View style={pdfStyles.summaryGrid}>
          <View style={pdfStyles.summaryItem}>
            <Text style={pdfStyles.summaryLabel}>Prix affiché</Text>
            <Text style={pdfStyles.summaryValue}>{formatCurrency(form.listedPrice)}</Text>
          </View>
          <View style={pdfStyles.summaryItem}>
            <Text style={pdfStyles.summaryLabel}>Écart proposé</Text>
            <Text style={pdfStyles.summaryValue}>{formatCurrencyNumber(negotiationGap)}</Text>
            <Text style={pdfStyles.summaryMuted}>
              {negotiationRate !== null ? `${negotiationRate.toFixed(1)}% du prix affiché` : '--'}
            </Text>
          </View>
          <View style={pdfStyles.summaryItem}>
            <Text style={pdfStyles.summaryLabel}>Financement</Text>
            <Text style={pdfStyles.summaryValue}>{form.financingType === 'cash' ? 'Comptant' : 'Crédit'}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Déclaration d'intention</Text>
          <Text style={pdfStyles.paragraph}>
            Je soussigné(e) {form.buyerFullName || '--'} propose d'acquérir le bien désigné ci-dessous au prix de{' '}
            {formatCurrency(form.offerPrice)}, selon les modalités et conditions indiquées dans le présent document.
          </Text>
        </View>

        <View style={pdfStyles.grid}>
          <View style={[pdfStyles.section, pdfStyles.half]}>
            <Text style={pdfStyles.sectionTitle}>Acheteur</Text>
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.rowLabel}>Nom</Text>
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
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.rowLabel}>Téléphone</Text>
              <Text style={pdfStyles.rowValue}>{form.buyerPhone || '--'}</Text>
            </View>
          </View>

          <View style={[pdfStyles.section, pdfStyles.half]}>
            <Text style={pdfStyles.sectionTitle}>Bien concerné</Text>
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.rowLabel}>Type</Text>
              <Text style={pdfStyles.rowValue}>{form.propertyType || '--'}</Text>
            </View>
            <View style={pdfStyles.row}>
              <Text style={pdfStyles.rowLabel}>Adresse</Text>
              <Text style={pdfStyles.rowValue}>{form.propertyAddress || '--'}</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Modalités financières</Text>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Prix proposé</Text>
            <Text style={pdfStyles.rowValue}>{formatCurrency(form.offerPrice)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Mode de financement</Text>
            <Text style={pdfStyles.rowValue}>{form.financingType === 'cash' ? 'Comptant' : 'Crédit immobilier'}</Text>
          </View>
          {form.financingType === 'loan' ? (
            <>
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.rowLabel}>Apport personnel</Text>
                <Text style={pdfStyles.rowValue}>{formatCurrency(form.contribution)}</Text>
              </View>
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.rowLabel}>Montant emprunté</Text>
                <Text style={pdfStyles.rowValue}>{formatCurrency(form.loanAmount)}</Text>
              </View>
            </>
          ) : null}
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.rowLabel}>Validité de l'offre</Text>
            <Text style={pdfStyles.rowValue}>Jusqu'au {validityDate}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Conditions suspensives</Text>
          {conditions.length > 0 ? (
            conditions.map((condition) => (
              <View key={condition} style={pdfStyles.bullet}>
                <View style={pdfStyles.bulletDot} />
                <Text style={pdfStyles.bulletText}>{condition}</Text>
              </View>
            ))
          ) : (
            <Text style={pdfStyles.line}>Aucune condition suspensive sélectionnée.</Text>
          )}
        </View>

        <View style={pdfStyles.signature}>
          <View style={pdfStyles.signatureBox}>
            <Text style={pdfStyles.signatureLabel}>Acheteur</Text>
            <Text style={{ marginTop: 42 }}>Signature</Text>
          </View>
          <View style={pdfStyles.signatureBox}>
            <Text style={pdfStyles.signatureLabel}>Acceptation vendeur</Text>
            <Text style={{ marginTop: 42 }}>Signature</Text>
          </View>
        </View>

        <Text style={pdfStyles.disclaimer}>
          Document généré à titre d'aide à la rédaction. À faire valider par un professionnel si nécessaire.
        </Text>
        <View style={pdfStyles.footer}>
          <Text>{documentRef}</Text>
          <Text>Offre d'achat immobilier</Text>
        </View>
      </Page>
    </Document>
  );
};

export default function PurchaseOfferPage() {
  const [form, setForm] = useState<OfferForm>(initialForm);
  const [isClientReady, setIsClientReady] = useState(false);
  const [documentRef, setDocumentRef] = useState('OFFRE-ACHAT');

  useEffect(() => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    setDocumentRef(`OFFRE-${datePart}-${randomPart}`);
    setIsClientReady(true);
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
    borderRadius: '10px',
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
    borderRadius: '14px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(226, 232, 240, 0.9)',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
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
          paddingBottom: '132px',
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
          <div
            style={{
              display: 'inline-flex',
              padding: '5px 9px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.10)',
              color: '#dbeafe',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Document acheteur
          </div>
          <h1 style={{ margin: '14px 0 0', fontSize: '27px', fontWeight: 850, color: '#ffffff' }}>
            Offre d'achat
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.45 }}>
            Génère une offre claire, sobre et prête à relire.
          </p>
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
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Bien</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            <label style={labelStyle}>
              Adresse du bien
              <input value={form.propertyAddress} onChange={(event) => updateField('propertyAddress', event.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Type
              <input value={form.propertyType} onChange={(event) => updateField('propertyType', event.target.value)} style={inputStyle} />
            </label>
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
                borderRadius: '10px',
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
            ) : null}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Offre</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={labelStyle}>
                Validité
                <input type="number" min="1" value={form.offerValidityDays} onChange={(event) => updateField('offerValidityDays', event.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Ville signature
                <input value={form.cityOfSignature} onChange={(event) => updateField('cityOfSignature', event.target.value)} style={inputStyle} />
              </label>
            </div>
            {[
              ['loanApproval', 'Obtention du financement'],
              ['satisfactoryDiagnostics', 'Diagnostics satisfaisants'],
              ['satisfactoryCoownershipDocuments', 'Documents de copropriété satisfaisants'],
              ['noMajorUndisclosedWorks', 'Aucun gros travaux non communiqué'],
              ['noLegalOrAdministrativeIssue', 'Aucun problème juridique ou administratif'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', gap: '9px', alignItems: 'center', fontSize: '14px', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={Boolean(form[key as keyof OfferForm])}
                  onChange={(event) => updateField(key as keyof OfferForm, event.target.checked as never)}
                  style={{ width: '17px', height: '17px' }}
                />
                {label}
              </label>
            ))}
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
                  boxShadow: '0 14px 28px rgba(17, 24, 39, 0.22)',
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
          left: '50%',
          bottom: '12px',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)',
          maxWidth: '430px',
          zIndex: 30,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px',
          padding: '7px',
          borderRadius: '22px',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          border: '1px solid rgba(203, 213, 225, 0.75)',
          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.18)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {[
          { href: '/analyse', label: 'Analyse', active: false },
          { href: '/offre', label: 'Offre', active: true },
          { href: '/copro', label: 'Copro', active: false },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              padding: '11px 8px',
              borderRadius: '16px',
              backgroundColor: item.active ? '#0f172a' : 'transparent',
              color: item.active ? '#ffffff' : '#64748b',
              textAlign: 'center',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 850,
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
