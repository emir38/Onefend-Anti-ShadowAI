import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getManual } from '@/lib/docs/registry';
import DocsTopBar from '@/components/docs/docs-topbar';
import DocsSidebar from '@/components/docs/docs-sidebar';

interface Props {
  params: Promise<{ lang: string, manual: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { manual: slug, lang } = await params;
  const manual = getManual(slug, lang);
  if (!manual) return {};
  return {
    title: `${manual.title} — Onefend Docs`,
    description: manual.description,
  };
}

export default async function ManualLayout({ params, children }: Props) {
  const { manual: slug, lang } = await params;
  const manual = getManual(slug, lang);
  if (!manual) notFound();

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', background: '#F9F8FF' }}>
      <DocsTopBar manualTitle={manual.shortTitle} />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <DocsSidebar manual={manual} />

        {/* Content slot */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
