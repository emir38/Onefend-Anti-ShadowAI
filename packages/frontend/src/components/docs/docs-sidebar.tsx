'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DocManual } from '@/lib/docs/types';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const UI = {
  es: { lastUpdated: 'Última actualización' },
  en: { lastUpdated: 'Last updated' },
  pt: { lastUpdated: 'Última atualização' },
} as const;

type Locale = keyof typeof UI;

function getLocale(pathname: string): Locale {
  const seg = pathname.split('/')[2];
  if (seg === 'en' || seg === 'pt') return seg;
  return 'es';
}

function formatDateByLocale(dateString: string, locale: Locale) {
  const date = new Date(dateString);
  if (locale === 'en') return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  if (locale === 'pt') return date.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface DocsSidebarProps {
  manual: DocManual;
}

export default function DocsSidebar({ manual }: DocsSidebarProps) {
  const pathname = usePathname();
  const locale = getLocale(pathname);
  const t = UI[locale];

  // Cada sección comienza expandida
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(manual.sections.map((s) => [s.title, true]))
  );

  const toggleSection = (title: string) => {
    setExpanded((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside style={{
      width: '260px',
      flexShrink: 0,
      background: '#18191A',
      minHeight: 'calc(100vh - 56px)',
      position: 'sticky',
      top: '56px',
      height: 'calc(100vh - 56px)',
      overflowY: 'auto',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      padding: '24px 0 40px',
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255,255,255,0.1) transparent',
    }}>
      {/* Manual info */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, lineHeight: '20px' }}>
          {manual.shortTitle}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '16px 0' }}>
        {manual.sections.map((section) => (
          <div key={section.title} style={{ marginBottom: '2px' }}>
            <div style={{ margin: '0 20px 6px', height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <button
              onClick={() => toggleSection(section.title)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px 8px', background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', gap: '8px',
              }}
            >
              <span style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '11px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {section.title}
              </span>
              {expanded[section.title]
                ? <ChevronDown size={12} color="rgba(255,255,255,0.5)" />
                : <ChevronRight size={12} color="rgba(255,255,255,0.5)" />
              }
            </button>

            {expanded[section.title] && (
              <ul style={{ listStyle: 'none', margin: 0, padding: '2px 0 10px' }}>
                {section.chapters.map((chapter) => {
                  const href = `/docs/${locale}/${manual.slug}/${chapter.slug}`; // Fixed prefix with locale
                  const isActive = pathname === href || pathname.endsWith(href);
                  return (
                    <li key={chapter.slug}>
                      <Link
                        href={href}
                        style={{
                          display: 'block',
                          padding: '6px 20px 6px 28px',
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                          textDecoration: 'none',
                          lineHeight: '18px',
                          borderLeft: isActive ? '2px solid #6466FF' : '2px solid transparent',
                          background: isActive ? 'rgba(100,102,255,0.1)' : 'transparent',
                          transition: 'all 150ms ease',
                          marginLeft: '8px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.9)';
                            (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.55)';
                            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                          }
                        }}
                      >
                        {chapter.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 20px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        marginTop: '8px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', lineHeight: '18px' }}>
          {t.lastUpdated}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textTransform: 'capitalize' }}>
          {formatDateByLocale(manual.lastUpdated, locale)}
        </div>
      </div>
    </aside>
  );
}
