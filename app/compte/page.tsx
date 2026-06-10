'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function ComptePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Informations personnelles
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [telephone, setTelephone] = useState('');
  const [societe, setSociete] = useState('');
  const [infoStatus, setInfoStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [infoMessage, setInfoMessage] = useState('');

  // Mot de passe
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pwMessage, setPwMessage] = useState('');

  // Suppression
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.replace('/login'); return; }
      setEmail(data.user.email ?? '');
      const meta = data.user.user_metadata ?? {};
      setPrenom(meta.prenom ?? '');
      setNom(meta.nom ?? '');
      setAdresse(meta.adresse ?? '');
      setTelephone(meta.telephone ?? '');
      setSociete(meta.societe ?? '');
      setIsLoading(false);
    };
    load();
  }, [router]);

  const handleInfoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoStatus('saving');
    const { error } = await supabase.auth.updateUser({ data: { prenom, nom, adresse, telephone, societe } });
    if (error) {
      setInfoStatus('error');
      setInfoMessage(error.message);
    } else {
      setInfoStatus('success');
      setInfoMessage('Informations sauvegardees.');
      setTimeout(() => { setInfoStatus('idle'); setInfoMessage(''); }, 3000);
    }
  };

  const handleInfoClear = async () => {
    setInfoStatus('saving');
    const { error } = await supabase.auth.updateUser({ data: { prenom: null, nom: null, adresse: null, telephone: null, societe: null } });
    if (error) {
      setInfoStatus('error'); setInfoMessage(error.message);
    } else {
      setPrenom(''); setNom(''); setAdresse(''); setTelephone(''); setSociete('');
      setInfoStatus('success'); setInfoMessage('Informations supprimees.');
      setTimeout(() => { setInfoStatus('idle'); setInfoMessage(''); }, 3000);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwStatus('error'); setPwMessage('Les mots de passe ne correspondent pas.'); return; }
    if (newPassword.length < 6) { setPwStatus('error'); setPwMessage('Le mot de passe doit faire au moins 6 caracteres.'); return; }
    setPwStatus('saving');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
    if (signInError) { setPwStatus('error'); setPwMessage('Mot de passe actuel incorrect.'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwStatus('error'); setPwMessage(error.message);
    } else {
      setPwStatus('success'); setPwMessage('Mot de passe mis a jour.');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPwStatus('idle'), 3000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    await supabase.from('analyses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.auth.signOut();
    router.replace('/signup');
  };

  const inputStyle = {
    marginTop: '6px', padding: '14px 12px', borderRadius: '8px',
    border: '1px solid #e5e7eb', fontSize: '16px', color: '#111827',
    backgroundColor: '#fbfcfd', width: '100%', boxSizing: 'border-box' as const,
  };
  const labelStyle = { display: 'flex' as const, flexDirection: 'column' as const, fontSize: '13px', color: '#374151', fontWeight: 600 };
  const cardStyle = { padding: '16px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 1px 4px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)' };
  const dividerStyle = { height: '1px', backgroundColor: '#f1f5f9', margin: '12px 0' };

  const navItems = [
    { href: '/analyse', label: 'Analyse', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></> },
    { href: '/offre', label: 'Offre', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></> },
    { href: '/outils', label: 'Outils', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></> },
    { href: '/mes-analyses', label: 'Historique', active: false, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></> },
    { href: '/compte', label: 'Compte', active: true, icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></> },
  ];

  if (isLoading) return <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e8edf5 0%, #f8fafc 260px, #f8fafc 100%)' }} />;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e8edf5 0%, #f8fafc 260px, #f8fafc 100%)', padding: '12px' }}>
      <section style={{ width: '100%', maxWidth: '430px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)' }}>

        <header style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff', boxShadow: '0 4px 24px rgba(15,23,42,0.18)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '40px', width: '80px', height: '80px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Compte</div>
          <h1 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em' }}>Mon compte</h1>
          <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{email}</p>
        </header>

        {/* Actions compte */}
        <div style={cardStyle}>
          <button
            type="button"
            onClick={() => { setShowInfoForm((v) => !v); setInfoStatus('idle'); setInfoMessage(''); }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#0f172a', width: '100%' }}
          >
            <span>Mes informations</span>
            <span style={{ color: '#94a3b8', fontSize: '18px', lineHeight: 1 }}>{showInfoForm ? '−' : '+'}</span>
          </button>

          {showInfoForm && (
            <form onSubmit={handleInfoSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                Ces informations servent uniquement a preremplir vos offres d'achat.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={labelStyle}>
                  Prenom
                  <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Jean" style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Nom
                  <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" style={inputStyle} />
                </label>
              </div>
              <label style={labelStyle}>
                Adresse
                <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="12 rue de la Paix, 75001 Paris" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Telephone
                <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="06 00 00 00 00" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Societe
                <input value={societe} onChange={(e) => setSociete(e.target.value)} placeholder="SCI Dupont, SARL... (optionnel)" style={inputStyle} />
              </label>
              {infoMessage && (
                <div style={{ fontSize: '13px', fontWeight: 700, color: infoStatus === 'error' ? '#dc2626' : '#16a34a' }}>{infoMessage}</div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={infoStatus === 'saving'}
                  style={{ flex: 1, padding: '13px', borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', opacity: infoStatus === 'saving' ? 0.7 : 1 }}
                >
                  {infoStatus === 'saving' ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
                <button
                  type="button"
                  onClick={handleInfoClear}
                  disabled={infoStatus === 'saving'}
                  style={{ padding: '13px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#64748b', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Effacer
                </button>
              </div>
            </form>
          )}

          <div style={dividerStyle} />
          <button
            type="button"
            onClick={() => { setShowPasswordForm((v) => !v); setPwStatus('idle'); setPwMessage(''); }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#0f172a', width: '100%' }}
          >
            <span>Changer de mot de passe</span>
            <span style={{ color: '#94a3b8', fontSize: '18px', lineHeight: 1 }}>{showPasswordForm ? '−' : '+'}</span>
          </button>

          {showPasswordForm && (
            <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <label style={labelStyle}>
                Mot de passe actuel
                <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Nouveau mot de passe
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Confirmer le nouveau
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </label>
              {pwMessage && <div style={{ fontSize: '13px', fontWeight: 700, color: pwStatus === 'error' ? '#dc2626' : '#16a34a' }}>{pwMessage}</div>}
              <button
                type="submit"
                disabled={pwStatus === 'saving' || !oldPassword || !newPassword || !confirmPassword}
                style={{ padding: '13px', borderRadius: '8px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', opacity: pwStatus === 'saving' ? 0.7 : 1 }}
              >
                {pwStatus === 'saving' ? 'Mise a jour...' : 'Mettre a jour'}
              </button>
            </form>
          )}

          <div style={dividerStyle} />

          <button
            type="button"
            onClick={handleSignOut}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#0f172a', width: '100%' }}
          >
            <span>Se deconnecter</span>
            <span style={{ color: '#94a3b8', fontSize: '16px' }}>→</span>
          </button>

          <div style={dividerStyle} />

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#dc2626', width: '100%' }}
            >
              <span>Supprimer mon compte</span>
              <span style={{ fontSize: '16px' }}>→</span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>Toutes vos analyses seront supprimees. Cette action est irreversible.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#ffffff', color: '#374151', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>Annuler</button>
                <button type="button" onClick={handleDeleteAccount} disabled={isDeleting} style={{ flex: 1, padding: '11px', borderRadius: '8px', border: 'none', backgroundColor: '#dc2626', color: '#ffffff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
                  {isDeleting ? 'Suppression...' : 'Confirmer'}
                </button>
              </div>
            </div>
          )}
        </div>

      </section>

      <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 30, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(203,213,225,0.6)', paddingTop: '5px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)', paddingLeft: '4px', paddingRight: '4px' }}>
          {navItems.map(({ href, label, active, icon }) => (
            <a key={href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 4px 6px', borderRadius: '12px', textDecoration: 'none', backgroundColor: active ? '#0f172a' : 'transparent' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#ffffff' : '#64748b'}>{icon}</svg>
              <span style={{ fontSize: '9px', fontWeight: active ? 800 : 600, color: active ? '#ffffff' : '#64748b' }}>{label}</span>
            </a>
          ))}
      </nav>
    </main>
  );
}
