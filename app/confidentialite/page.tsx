'use client';

import Link from 'next/link';

export default function ConfidentialitePage() {
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
          paddingBottom: '32px',
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
          <div style={{ fontSize: '11px', fontWeight: 850, color: '#dbeafe', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Légal
          </div>
          <h1 style={{ margin: '12px 0 0', fontSize: '24px', fontWeight: 850 }}>
            Politique de confidentialité
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.45 }}>
            Dernière mise à jour : juin 2025
          </p>
        </header>

        <Link
          href="/signup"
          style={{ alignSelf: 'flex-start', color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: 800, padding: '4px 2px' }}
        >
          ← Retour
        </Link>

        {[
          {
            title: '1. Responsable du traitement',
            body: "Le responsable du traitement des données personnelles collectées via immo.ai est l'éditeur de l'application. Contact : contact@immo-ai.fr",
          },
          {
            title: '2. Données collectées',
            body: "Nous collectons uniquement les données nécessaires au fonctionnement du service : adresse email (authentification), données saisies dans les formulaires d'analyse (prix, surface, loyers), et analyses enregistrées volontairement.",
          },
          {
            title: '3. Finalités',
            body: "Les données sont utilisées exclusivement pour : permettre l'authentification, afficher l'historique des analyses de l'utilisateur, et améliorer le service. Elles ne sont pas vendues ni partagées avec des tiers.",
          },
          {
            title: '4. Hébergement',
            body: "Les données sont hébergées sur les serveurs de Supabase (infrastructure AWS, régions européennes). Supabase est un sous-traitant conforme au RGPD.",
          },
          {
            title: '5. Durée de conservation',
            body: "Les données sont conservées tant que le compte est actif. En cas de suppression du compte, les données sont effacées dans un délai de 30 jours.",
          },
          {
            title: '6. Vos droits',
            body: "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Pour exercer ces droits, contactez : contact@immo-ai.fr",
          },
          {
            title: '7. Cookies',
            body: "immo.ai utilise uniquement des cookies strictement nécessaires au fonctionnement du service (session d'authentification). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.",
          },
          {
            title: '8. Modifications',
            body: "Cette politique peut être mise à jour. Toute modification substantielle sera communiquée par email ou notification dans l'application.",
          },
        ].map((section) => (
          <div
            key={section.title}
            style={{
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 850, color: '#0f172a', marginBottom: '8px' }}>
              {section.title}
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
              {section.body}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
