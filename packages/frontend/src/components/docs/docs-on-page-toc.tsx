'use client';

import { useEffect, useState } from 'react';
import type { DocBlock } from '@/lib/docs/types';
import { getTocHeadings } from '@/lib/docs/types';

interface OnPageTocProps {
  blocks: DocBlock[];
}

export default function OnPageToc({ blocks }: OnPageTocProps) {
  const headings = getTocHeadings(blocks);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-56px 0px -70% 0px', threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div>
      <div style={{
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.09em', color: '#8B93A1', marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid rgba(212,200,255,0.3)',
      }}>
        En esta página
      </div>

      <nav>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {headings.map(({ id, text, level }) => {
            const isActive = activeId === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setActiveId(id);
                  }}
                  style={{
                    display: 'block',
                    padding: '5px 0',
                    fontSize: '13px',
                    lineHeight: '20px',
                    color: isActive ? '#6466FF' : '#7A8494',
                    textDecoration: 'none',
                    fontWeight: isActive ? 600 : 400,
                    transition: 'color 150ms ease',
                    borderLeft: isActive ? '2px solid #6466FF' : '2px solid transparent',
                    paddingLeft: (level === 3 ? 22 : 10) + 'px',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = '#6466FF';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = '#7A8494';
                  }}
                >
                  {text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
