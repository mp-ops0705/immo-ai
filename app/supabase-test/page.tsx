import { supabase } from '@/lib/supabase/client';

export default function SupabaseTestPage() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const isClientInitialized = Boolean(supabase);

  return (
    <main style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 12px', fontSize: '24px' }}>
        {isClientInitialized ? 'Supabase connected' : 'Supabase not connected'}
      </h1>
      <p style={{ margin: 0, fontSize: '16px' }}>
        Supabase URL detected: {hasSupabaseUrl ? 'YES' : 'NO'}
      </p>
    </main>
  );
}
