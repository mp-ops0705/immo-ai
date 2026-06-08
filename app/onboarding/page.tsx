'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
  {
    emoji: '🔍',
    title: 'Analyse ton investissement',
    description: "Renseigne le prix, la surface et le loyer estimé. L'IA calcule le rendement, le cashflow et te donne un score /10.",
  },
  {
    emoji: '📄',
    title: "Génère une offre d'achat",
    description: "En un clic, crée une lettre d'intention professionnelle prête à soumettre au vendeur.",
  },
  {
    emoji: '🏢',
    title: 'Analyse la copropriété',
    description: "Upload les PV d'AG et le budget. L'IA détecte les travaux, litiges et risques financiers pour toi.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('onboardingDone') === '1') {
      router.replace('/analyse');
    }
  }, [router]);

  const finish = () => {
    if (typeof window !== 'undefined') localStorage.setItem('onboardingDone', '1');
    router.push('/analyse');
  };

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(180deg, #e8edf5 0%, #f8fafc 300px, #f8fafc 100%)',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
            immo<span style={{ color: '#2563eb' }}>.ai</span>
          </div>
        </div>

        <div
          style={{
            padding: '32px 24px 24px',
            borderRadius: '20px',
            backgroundColor: '#ffffff',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            minHeight: '280px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  height: '4px',
                  width: i === step ? '28px' : '8px',
                  borderRadius: '99px',
                  backgroundColor: i === step ? '#0f172a' : '#e2e8f0',
                  transition: 'width 0.25s ease',
                }}
              />
            ))}
          </div>

          <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '52px', lineHeight: 1 }}>{current.emoji}</div>
            <div style={{ fontSize: '19px', fontWeight: 850, color: '#0f172a', lineHeight: 1.3 }}>
              {current.title}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.55, maxWidth: '300px' }}>
              {current.description}
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 650 }}>
            {step + 1} / {STEPS.length}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isLast) {
              finish();
            } else {
              setStep((s) => s + 1);
            }
          }}
          style={{
            padding: '15px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#111827',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 850,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(17, 24, 39, 0.12)',
          }}
        >
          {isLast ? 'Commencer →' : 'Suivant →'}
        </button>

        <button
          type="button"
          onClick={finish}
          style={{
            border: 'none',
            background: 'none',
            padding: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#94a3b8',
            fontWeight: 650,
            textAlign: 'center',
          }}
        >
          Passer
        </button>
      </section>
    </main>
  );
}
