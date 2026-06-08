'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.session) {
      setError('Connexion impossible. Vérifie tes identifiants.');
      return;
    }

    router.push('/analyse');
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
          Connexion
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

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px' }}
          />
        </label>

        <div style={{ textAlign: 'right', marginBottom: '16px' }}>
          <Link href="/reset-password" style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
            Mot de passe oublié ?
          </Link>
        </div>

        {error && <p style={{ margin: '0 0 12px', color: '#dc2626', fontSize: '14px' }}>{error}</p>}

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
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p style={{ margin: '16px 0 0', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
          Pas encore de compte ?{' '}
          <Link href="/signup" style={{ color: '#111827', fontWeight: 700 }}>
            Créer un compte
          </Link>
        </p>
      </form>
    </main>
  );
}
