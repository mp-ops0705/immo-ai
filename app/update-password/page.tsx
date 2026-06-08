'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/analyse');
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
      <form
        onSubmit={handleSubmit}
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
          Nouveau mot de passe
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
          Choisis un nouveau mot de passe pour ton compte.
        </p>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Nouveau mot de passe
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #d1d5db',
              fontSize: '16px',
            }}
          />
        </label>

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
          Confirmer le mot de passe
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
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
          {isLoading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
        </button>
      </form>
    </main>
  );
}
