'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(true);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#f8fafc',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: '24px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', color: '#111827' }}>
          Mot de passe oublié
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
          Saisis ton email pour recevoir un lien de réinitialisation.
        </p>

        {success ? (
          <div>
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: '14px',
                fontWeight: 700,
                marginBottom: '16px',
                lineHeight: 1.5,
              }}
            >
              Email envoyé. Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe.
            </div>
            <Link
              href="/login"
              style={{ display: 'block', textAlign: 'center', color: '#111827', fontWeight: 700, fontSize: '14px' }}
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginBottom: '16px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                }}
              />
            </label>

            {error && (
              <p style={{ margin: '0 0 12px', color: '#dc2626', fontSize: '14px' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#111827',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: isLoading ? 'default' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? 'Envoi...' : 'Envoyer le lien'}
            </button>

            <p style={{ margin: '16px 0 0', fontSize: '14px', color: '#6b7280', textAlign: 'center' }}>
              <Link href="/login" style={{ color: '#111827', fontWeight: 700 }}>
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
