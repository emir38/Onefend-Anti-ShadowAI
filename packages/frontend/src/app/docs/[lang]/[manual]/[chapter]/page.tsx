import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getManual } from '@/lib/docs/registry';
import { getChapter } from '@/lib/docs/types';
import ContentRenderer from '@/components/docs/docs-content-renderer';
import OnPageToc from '@/components/docs/docs-on-page-toc';

interface Props {
  params: Promise<{ lang: string; manual: string; chapter: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { manual: manualSlug, chapter: chapterSlug, lang } = await params;
  const manual = getManual(manualSlug, lang);
  if (!manual) return {};
  const chapter = getChapter(manual, chapterSlug);
  if (!chapter) return {};
  return {
    title: `${chapter.title} — ${manual.shortTitle} — Onefend Docs`,
    description: chapter.description,
  };
}

export default async function ChapterPage({ params }: Props) {
  const { manual: manualSlug, chapter: chapterSlug, lang } = await params;
  const manual = getManual(manualSlug, lang);
  if (!manual) notFound();

  const chapter = getChapter(manual, chapterSlug);
  if (!chapter) notFound();



  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 260px',
      minHeight: 'calc(100vh - 56px)',
      background: '#F9F8FF',
    }}>

      {/* ── Main content ── */}
      <article style={{
        minWidth: 0,
        padding: '52px 56px 100px 64px',
      }}>

        {/* Chapter header */}
        <header style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontSize: '32px', fontWeight: 800, color: '#1E1B39',
            lineHeight: '40px', margin: '0 0 12px',
            letterSpacing: '-0.5px',
          }}>
            {chapter.title}
          </h1>
          {chapter.description && (
            <p style={{
              fontSize: '17px', color: '#6A6E89', lineHeight: '1.7',
              margin: 0,
            }}>
              {chapter.description}
            </p>
          )}
          <div style={{
            height: '1px', background: 'rgba(212,200,255,0.5)',
            margin: '28px 0 0',
          }} />
        </header>

        {/* Content */}
        <ContentRenderer blocks={chapter.blocks} />



      </article>

      {/* ── On-page TOC (right) ── */}
      <div style={{
        borderLeft: '1px solid rgba(212,200,255,0.35)',
        padding: '52px 24px 40px 28px',
        position: 'sticky',
        top: '56px',
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        alignSelf: 'start',
      }}>
        <OnPageToc blocks={chapter.blocks} />
      </div>

    </div>
  );

}
