import React from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, subtitle, right, children }: PageHeaderProps) {
  return (
    <header style={{
      background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
      paddingBottom: '28px',
      paddingLeft: '20px',
      paddingRight: '20px',
      position: 'relative',
      overflow: 'hidden',
      color: '#ffffff',
    }}>
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20px', left: '10px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '430px', margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && (
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {eyebrow}
              </div>
            )}
            <h1 style={{ margin: '0 0 6px', fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#ffffff' }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, fontWeight: 500, overflowWrap: 'break-word', wordBreak: 'normal', maxWidth: '100%', minWidth: 0 }}>
                {subtitle}
              </p>
            )}
          </div>
          {right && <div style={{ flexShrink: 0 }}>{right}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}
