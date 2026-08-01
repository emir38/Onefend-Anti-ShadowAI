'use client';

import { LogOut, BookOpen, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Inline UI strings for the 3 locales — self-contained, no server needed
const UI = {
  es: { allManuals: 'Todos los manuales', portal: 'Portal de Documentación', logout: 'Salir' },
  en: { allManuals: 'All manuals', portal: 'Documentation Portal', logout: 'Sign out' },
  pt: { allManuals: 'Todos os manuais', portal: 'Portal de Documentação', logout: 'Sair' },
} as const;

type Locale = keyof typeof UI;

function getLocale(pathname: string): Locale {
  const seg = pathname.split('/')[2];
  if (seg === 'en' || seg === 'pt') return seg;
  return 'es';
}

interface DocsTopBarProps {
  manualTitle?: string;
  chapterTitle?: string;
}

export default function DocsTopBar({ manualTitle, chapterTitle }: DocsTopBarProps) {
  const pathname = usePathname();
  const t = UI[getLocale(pathname)];

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignorar */ }
    window.location.href = '/login';
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: '56px',
      background: 'linear-gradient(90deg, #18191A 60%, #2D1F6E 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Left: logo + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/docs" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img
            src="/logo-dark.svg"
            alt="Onefend"
            style={{ height: '22px', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </Link>

        {manualTitle && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', marginLeft: '4px' }}>/</span>
            <Link
              href={`/docs/${getLocale(pathname)}`}
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Home size={12} />
              <span>Docs</span>
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>/</span>
            {chapterTitle ? (
              <>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>{manualTitle}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>/</span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>{chapterTitle}</span>
              </>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>{manualTitle}</span>
            )}
          </>
        )}
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link
          href={`/docs/${getLocale(pathname)}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'rgba(255,255,255,0.55)', fontSize: '13px', textDecoration: 'none',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)'; }}
        >
          <BookOpen size={14} />
          <span>{t.allManuals}</span>
        </Link>

        <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)' }} />

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'color 150ms ease', padding: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ff6b6b'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)'; }}
        >
          <LogOut size={14} />
          <span>{t.logout}</span>
        </button>
      </div>
    </header>
  );
}
