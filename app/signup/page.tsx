'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data) {
      setSuccessMessage('Compte créé. Vérifie tes emails si une confirmation est demandée.');
      router.push('/onboarding');
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#f8fafc',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px', marginBottom: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
          immo<span style={{ color: '#2563eb' }}>.ai</span>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#64748b', lineHeight: 1.45 }}>
          Analyse tes investissements immobiliers en quelques secondes.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 4px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        }}
      >
        <h1 style={{ margin: '0 0 20px', fontSize: '24px', color: '#111827' }}>
          Créer un compte
        </h1>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px' }}
          />
        </label>

        {error && <p style={{ margin: '0 0 12px', color: '#dc2626', fontSize: '14px' }}>{error}</p>}
        {successMessage && <p style={{ margin: '0 0 12px', color: '#166534', fontSize: '14px' }}>{successMessage}</p>}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#111827',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 700,
            cursor: isLoading ? 'default' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? 'Création...' : 'Créer mon compte'}
        </button>

        <p style={{ margin: '16px 0 0', fontSize: '12px', color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
          En créant un compte, tu acceptes nos{' '}
          <Link href="/cgu" style={{ color: '#6b7280', fontWeight: 600 }}>
            Conditions générales
          </Link>{' '}
          et notre{' '}
          <Link href="/confidentialite" style={{ color: '#6b7280', fontWeight: 600 }}>
            Politique de confidentialité
          </Link>
          .
        </p>

        <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
          Déjà un compte ?{' '}
          <Link href="/login" style={{ color: '#111827', fontWeight: 700 }}>
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}
