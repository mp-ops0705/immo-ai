'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const redirectUser = async () => {
      const { data } = await supabase.auth.getSession();
      router.replace(data.session ? '/analyse' : '/login');
    };

    redirectUser();
  }, [router]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        fontSize: '14px',
        fontWeight: 700,
      }}
    >
      Chargement...
    </main>
  );
}
