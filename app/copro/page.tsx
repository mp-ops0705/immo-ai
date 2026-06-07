'use client';

import { ChangeEvent, FormEvent, useState } from 'react';

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
  { key: 'alerts', title: 'Points d’alerte' },
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
      setError('Erreur pendant l’analyse. Réessaie avec des fichiers plus nets ou moins volumineux.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Repère les travaux, litiges et risques financiers avant d’acheter.
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Documents</div>
            <label
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
                PV d’AG, budget, travaux, diagnostics ou pages scannées
              </span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFilesChange}
                style={{ display: 'none' }}
              />
            </label>
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
                      borderRadius: '10px',
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
              boxShadow: '0 14px 28px rgba(17, 24, 39, 0.22)',
            }}
          >
            {isLoading ? 'Analyse en cours...' : 'Analyser les documents'}
          </button>
        </form>

        {result && riskStyle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '18px',
                borderRadius: '22px',
                background:
                  'radial-gradient(circle at top right, rgba(148, 163, 184, 0.32), transparent 34%), linear-gradient(145deg, #0f172a 0%, #111827 48%, #1e293b 100%)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: '0 22px 50px rgba(15, 23, 42, 0.24)',
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
              Cette analyse est une aide à la lecture des documents et ne remplace pas l’avis d’un notaire, avocat ou professionnel de la copropriété.
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
          { href: '/offre', label: 'Offre', active: false },
          { href: '/copro', label: 'Copro', active: true },
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
