'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

// Inline UI strings for the hub
const UI = {
  es: {
    portal: 'Portal de Documentación',
    logout: 'Cerrar sesión',
    title: 'Manuales Operativos',
    subtitle: 'Seleccione la solución para la que desea consultar la documentación.',
    sol1Label: 'Disponible ahora',
    sol2Label: 'Próximamente',
    sol1Button: 'Abrir manual',
    sol2Button: 'En desarrollo',
    sol1Desc: 'Manual completo para la solución de detección, educación y sanitización de datos sensibles en interacciones con IA y SaaS externas.',
    sol2Desc: 'Manual de gobernanza para agentes autónomos de IA. Control de permisos, monitoreo de acciones y auditoría de decisiones automatizadas.',
    metaSect: 'secciones',
    metaChap: 'capítulos',
  },
  en: {
    portal: 'Documentation Portal',
    logout: 'Sign out',
    title: 'Operational Manuals',
    subtitle: 'Select the solution you want to view documentation for.',
    sol1Label: 'Available now',
    sol2Label: 'Coming soon',
    sol1Button: 'Open manual',
    sol2Button: 'In development',
    sol1Desc: 'Complete manual for the detection, education, and sanitization of sensitive data in interactions with external AI and SaaS.',
    sol2Desc: 'Governance manual for autonomous AI agents. Permission control, action monitoring, and audit of automated decisions.',
    metaSect: 'sections',
    metaChap: 'chapters',
  },
  pt: {
    portal: 'Portal de Documentação',
    logout: 'Sair',
    title: 'Manuais Operacionais',
    subtitle: 'Selecione a solução para a qual deseja consultar a documentação.',
    sol1Label: 'Disponível agora',
    sol2Label: 'Em breve',
    sol1Button: 'Abrir manual',
    sol2Button: 'Em desenvolvimento',
    sol1Desc: 'Manual completo para a solução de detecção, educação e sanitização de dados sensíveis em interações com IA e SaaS externas.',
    sol2Desc: 'Manual de governança para agentes autônomos de IA. Controle de permissões, monitoramento de ações e auditoria de decisões automatizadas.',
    metaSect: 'seções',
    metaChap: 'capítulos',
  },
} as const;

type Locale = keyof typeof UI;

function getLocaleFromCode(code: string): Locale {
  if (code === 'en' || code === 'pt') return code;
  return 'es';
}

const getSolutions = (t: typeof UI[Locale]) => [
  {
    title: 'Anti-Shadow AI',
    icon: '/icons/icon-risk-onefend.svg',
    label: t.sol1Label,
    labelColor: '#6466FF',
    labelBorder: '#6466FF',
    labelBg: 'transparent',
    description: t.sol1Desc,
    meta: `5 ${t.metaSect} · 20 ${t.metaChap}`,
    available: true,
    href: 'anti-shadow-ai', // relative to avoid breaking
    buttonLabel: t.sol1Button,
  },
  {
    title: 'AI Agents Governance',
    icon: '/icons/icon-risk-governance.svg',
    label: t.sol2Label,
    labelColor: '#6A6E72',
    labelBorder: 'rgba(106, 110, 114, 0.3)',
    labelBg: 'transparent',
    description: t.sol2Desc,
    meta: `0 ${t.metaSect} · 0 ${t.metaChap}`,
    available: false,
    href: '#',
    buttonLabel: t.sol2Button,
  },
];

const handleLogout = async () => {
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
  } catch { /* ignorar */ }
  window.location.href = '/login';
};

export default function DocsHubPage({ params }: { params: Promise<{ lang: string }> }) {
  const pathname = usePathname();
  // Safe fallback if React.use isn't working as expected since it's a client comp
  const langCode = pathname.split('/')[2] || 'es';
  const locale = getLocaleFromCode(langCode);
  const t = UI[locale];
  const solutionsPath = `/docs/${locale}/`;
  
  const solutions = getSolutions(t).map(s => ({
    ...s,
    href: s.href !== '#' ? `${solutionsPath}${s.href}` : '#'
  }));

  return (
    <div style={{ minHeight: '100vh', background: '#F9F8FF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Top bar ── */}
      <header style={{
        width: '100%',
        background: 'linear-gradient(90deg, #18191A 60%, #2D1F6E 100%)',
        padding: '0 64px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <img src="/logo-dark.svg" alt="Onefend" style={{ height: '28px', objectFit: 'contain' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
            {t.portal}
          </span>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#FFFFFF'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)'; }}
          >
            <LogOut size={15} />
            {t.logout}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{
        width: '100%',
        background: 'linear-gradient(90deg, #18191A 45%, #5038CF 100%)',
        padding: '56px 64px 48px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{ maxWidth: '1200px', width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px', lineHeight: '42px' }}>
            {t.title}
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: '24px', margin: 0 }}>
            {t.subtitle}
          </p>
        </div>
      </section>

      {/* ── Solutions Grid ── */}
      <main style={{ display: 'flex', justifyContent: 'center', padding: '60px 64px 80px' }}>
        <div style={{ maxWidth: '1200px', width: '100%' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '24px',
          }}>
            {solutions.map((sol) => (
              <SolutionCard key={sol.title} sol={sol} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function SolutionCard({ sol }: { sol: ReturnType<typeof getSolutions>[0] }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid',
        borderColor: 'rgba(212, 200, 255, 0.7)',
        padding: '44px 44px 48px 44px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        opacity: sol.available ? 1 : 0.6,
        transition: 'transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease',
        cursor: sol.available ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (sol.available) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(100, 102, 255, 0.15)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(100, 102, 255, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212, 200, 255, 0.7)';
      }}
    >
      {/* ── Card Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          flexShrink: 0, position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(213deg, rgba(213,201,238,0.15) 23%, rgba(166,155,208,0.15) 100%)',
          border: '1px solid #D4C8FF',
        }}>
          <img src={sol.icon} alt={sol.title} width="28" height="28" style={{ position: 'relative', zIndex: 3 }} />
        </div>

        <span style={{
          fontSize: '22px', fontWeight: 700, lineHeight: '30px',
          background: 'linear-gradient(90deg, #6466FF 0%, #06B6D4 64%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          flex: 1,
        }}>
          {sol.title}
        </span>

        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 10px', height: '28px', whiteSpace: 'nowrap',
          borderRadius: '15px', fontSize: '13px', fontWeight: 600,
          color: sol.labelColor,
          border: `1px solid ${sol.labelBorder}`,
          background: sol.labelBg,
        }}>
          {sol.label}
        </span>
      </div>

      {/* ── Description ── */}
      <p style={{ fontSize: '14px', lineHeight: '22px', color: '#6A6E89', margin: 0 }}>
        {sol.description}
      </p>

      {/* ── Metadata ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '13px', color: '#6466FF', fontWeight: 600,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        {sol.meta}
      </div>

      {/* ── CTA ── */}
      <div style={{ marginTop: '8px' }}>
        {sol.available ? (
          <Link
            href={sol.href}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontSize: '14px', fontWeight: 600,
              color: '#1E1B39', textDecoration: 'none',
              transition: 'gap 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.gap = '12px';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.gap = '8px';
            }}
          >
            {sol.buttonLabel}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#A5AEB7' }}>
            {sol.buttonLabel}
          </span>
        )}
      </div>
    </div>
  );
}
