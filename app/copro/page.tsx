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
  riskLevel: 'Faible' | 'Moyen' | 'Élevé';
  investorConclusion: string;
};

const emptySections = [
  { key: 'positives', title: 'Points positifs' },
  { key: 'alerts', title: "Points d'alerte" },
  { key: 'votedWorks', title: 'Travaux votés' },
  { key: 'futureWorks', title: 'Travaux envisagés' },
  { key: 'legalIssues', title: 'Procédures ou litiges' },
  { key: 'unpaidCharges', title: 'Impayés / tensions financières' },
  { key: 'budgetNotes', title: 'Charges / budget' },
  { key: 'managementNotes', title: 'Qualité de gestion' },
] as const;

const getRiskColor = (riskLevel: CoproAnalysis['riskLevel']) => {
  if (riskLevel === 'Faible') return { text: '#166534', background: '#dcfce7' };
  if (riskLevel === 'Moyen') return { text: '#92400e', background: '#fef3c7' };
  return { text: '#991b1b', background: '#fee2e2' };
};

const getFileType = (file: File) => {
  const lowerName = file.name.toLowerCase();
  if (file.type) return file.type;
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  return '';
};

const isAcceptedFile = (file: File) =>
  ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(getFileType(file));

export default function CoproPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<CoproAnalysis | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []).filter(isAcceptedFile);
    setFiles(selectedFiles);
    setResult(null);
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (files.length === 0) {
      setError('Ajoute au moins un PDF ou une image à analyser.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    setIsLoading(true);

    try {
      const response = await fetch('/api/analyse-copro', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Analyse impossible pour ces documents.');
        return;
      }

      setResult(data as CoproAnalysis);
    } catch {
      setError("Erreur pendant l'analyse. Réessaie avec des fichiers plus nets ou moins volumineux.");
    } finally {
      setIsLoading(false);
    }
  };

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
    fontWeight: 850,
    color: '#64748b',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  } as const;

  const riskStyle = result ? getRiskColor(result.riskLevel) : null;

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
            borderRadius: '16px',
            background: 'linear-gradient(145deg, #0f172a 0%, #1f2937 100%)',
            color: '#ffffff',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
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
              fontWeight: 850,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Copropriété
          </div>
          <h1 style={{ margin: '14px 0 0', fontSize: '27px', fontWeight: 850, color: '#ffffff' }}>
            Analyse copropriété
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.45 }}>
            Repère les travaux, litiges et risques financiers avant d'acheter.
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Documents</div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              style={{
                display: 'flex',
                minHeight: '132px',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '16px',
                border: '1px dashed #94a3b8',
                backgroundColor: '#f8fafc',
                color: '#334155',
                fontSize: '14px',
                fontWeight: 750,
                textAlign: 'center',
                cursor: 'pointer',
                padding: '16px',
              }}
            >
              <span>Ajouter PDF ou images</span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                PV d\'AG, budget, travaux, diagnostics ou pages scannées
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                PDF, JPEG, PNG, WebP — 10 Mo max par fichier
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFilesChange}
                style={{ display: 'none' }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowUploadGuide((prev) => !prev)}
              style={{
                marginTop: '8px',
                border: 'none',
                background: 'none',
                padding: '6px 0',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#2563eb',
                fontWeight: 700,
                textAlign: 'left',
                display: 'block',
              }}
            >
              {showUploadGuide ? 'Masquer le guide' : 'Quels documents uploader ?'}
            </button>
            {showUploadGuide && (
              <div
                style={{
                  marginTop: '4px',
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  fontSize: '13px',
                  color: '#0369a1',
                  lineHeight: 1.55,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Pour une analyse optimale :</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    "Procès-verbal de la dernière Assemblée Générale",
                    "Budget prévisionnel de la copropriété",
                    "Carnet d'entretien de l'immeuble",
                    "Appel de fonds ou état des charges",
                    "Diagnostics techniques (facultatif)",
                  ].map((item) => (
                    <div key={item} style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ color: '#0284c7', fontWeight: 800 }}>-</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {files.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      color: '#334155',
                      fontSize: '13px',
                      fontWeight: 650,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{Math.ceil(file.size / 1024)} Ko</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div
              style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
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
              fontWeight: 850,
              cursor: isLoading ? 'default' : 'pointer',
              opacity: isLoading ? 0.75 : 1,
              boxShadow: '0 4px 16px rgba(17, 24, 39, 0.12)',
            }}
          >
            {isLoading ? 'Analyse en cours... (~30 secondes)' : 'Analyser les documents'}
          </button>
        </form>

        {result && riskStyle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '18px',
                borderRadius: '20px',
                background:
                  'radial-gradient(circle at top right, rgba(148, 163, 184, 0.32), transparent 34%), linear-gradient(145deg, #0f172a 0%, #111827 48%, #1e293b 100%)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
                color: '#ffffff',
              }}
            >
              <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 850, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Niveau de risque copropriété
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.04em' }}>{result.riskLevel}</div>
                <div
                  style={{
                    padding: '8px 11px',
                    borderRadius: '999px',
                    backgroundColor: riskStyle.background,
                    color: riskStyle.text,
                    fontSize: '13px',
                    fontWeight: 850,
                  }}
                >
                  Risque {result.riskLevel.toLowerCase()}
                </div>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#dbeafe', lineHeight: 1.45, fontWeight: 650 }}>
                {result.investorConclusion}
              </p>
            </div>

            <div style={cardStyle}>
              <div style={sectionTitleStyle}>Résumé général</div>
              <p style={{ margin: 0, color: '#334155', fontSize: '14px', lineHeight: 1.5, fontWeight: 650 }}>
                {result.summary}
              </p>
            </div>

            {emptySections.map((section) => {
              const items = result[section.key];
              if (!items || items.length === 0) return null;
              return (
                <div key={section.key} style={cardStyle}>
                  <div style={sectionTitleStyle}>{section.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {items.map((item, index) => (
                      <div
                        key={`${section.key}-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '8px 1fr',
                          gap: '9px',
                          alignItems: 'start',
                          color: '#334155',
                          fontSize: '14px',
                          lineHeight: 1.45,
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '999px', backgroundColor: '#0f172a', marginTop: '7px' }} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', lineHeight: 1.45, textAlign: 'center' }}>
              Cette analyse est une aide à la lecture des documents et ne remplace pas l'avis d'un notaire, avocat ou professionnel de la copropriété.
            </p>
          </div>
        )}
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
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '6px',
          padding: '7px',
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          border: '1px solid rgba(203, 213, 225, 0.75)',
          boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {[
          { href: '/analyse', label: 'Analyse', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
          { href: '/offre', label: 'Offre', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></> },
          { href: '/copro', label: 'Copro', active: true, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></> },
          { href: '/mes-analyses', label: 'Historique', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></> },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              padding: '8px 4px 6px',
              borderRadius: '16px',
              backgroundColor: item.active ? '#0f172a' : 'transparent',
              color: item.active ? '#ffffff' : '#64748b',
              textAlign: 'center',
              textDecoration: 'none',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {item.icon}
            </svg>
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
