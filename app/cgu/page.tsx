'use client';

import Link from 'next/link';

export default function CguPage() {
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
            Conditions générales
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
            title: '1. Objet',
            body: "immo.ai est un outil d'aide à la décision pour l'investissement immobilier. Il fournit des estimations de rendement, de cashflow et des analyses de documents de copropriété à titre indicatif uniquement.",
          },
          {
            title: '2. Accès au service',
            body: "L'accès à immo.ai nécessite la création d'un compte avec une adresse email valide. L'utilisateur est responsable de la confidentialité de ses identifiants.",
          },
          {
            title: '3. Utilisation',
            body: "Le service est réservé à un usage personnel et non commercial. Les résultats fournis sont des estimations calculées à partir des données saisies par l'utilisateur. Ils ne constituent pas un conseil financier, fiscal ou juridique.",
          },
          {
            title: '4. Données et analyses',
            body: "Les analyses enregistrées sont stockées de manière sécurisée et associées au compte de l'utilisateur. L'utilisateur peut les supprimer à tout moment depuis son historique.",
          },
          {
            title: '5. Limitation de responsabilité',
            body: "immo.ai ne peut être tenu responsable des décisions d'investissement prises sur la base des analyses générées. Tout investissement immobilier comporte des risques. Consultez un professionnel avant tout engagement.",
          },
          {
            title: '6. Propriété intellectuelle',
            body: "Le service, son code source, ses algorithmes et son design sont la propriété exclusive de l'éditeur. Toute reproduction ou utilisation non autorisée est interdite.",
          },
          {
            title: '7. Modifications',
            body: "Les présentes conditions peuvent être modifiées à tout moment. Les utilisateurs seront informés des modifications substantielles par email ou notification dans l'application.",
          },
          {
            title: '8. Contact',
            body: "Pour toute question relative aux présentes conditions, contactez-nous à : contact@immo-ai.fr",
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
