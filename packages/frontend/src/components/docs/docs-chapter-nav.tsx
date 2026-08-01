'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FlatChapter } from '@/lib/docs/types';

interface ChapterNavProps {
  manualSlug: string;
  prev: FlatChapter | null;
  next: FlatChapter | null;
}

export default function ChapterNav({ manualSlug, prev, next }: ChapterNavProps) {
  if (!prev && !next) return null;

  const linkBase: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '16px 20px',
    textDecoration: 'none',
    border: '1px solid rgba(212,200,255,0.5)',
    borderRadius: '6px',
    background: '#fff',
    transition: 'border-color 180ms ease, box-shadow 180ms ease',
  };

  return (
    <nav style={{
      display: 'flex',
      gap: '12px',
      justifyContent: 'space-between',
      marginTop: '56px',
      paddingTop: '28px',
      borderTop: '1px solid rgba(212,200,255,0.4)',
    }}>
      {prev ? (
        <Link
          href={`/docs/${manualSlug}/${prev.slug}`}
          style={linkBase}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = '#6466FF';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 0 3px rgba(100,102,255,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(212,200,255,0.5)';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#A5AEB7', fontWeight: 600 }}>
            <ChevronLeft size={12} /> Anterior
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E1B39' }}>{prev.title}</span>
        </Link>
      ) : <div style={{ flex: 1 }} />}

      {next ? (
        <Link
          href={`/docs/${manualSlug}/${next.slug}`}
          style={{ ...linkBase, alignItems: 'flex-end' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = '#6466FF';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 0 3px rgba(100,102,255,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(212,200,255,0.5)';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#A5AEB7', fontWeight: 600 }}>
            Siguiente <ChevronRight size={12} />
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E1B39' }}>{next.title}</span>
        </Link>
      ) : <div style={{ flex: 1 }} />}
    </nav>
  );
}
