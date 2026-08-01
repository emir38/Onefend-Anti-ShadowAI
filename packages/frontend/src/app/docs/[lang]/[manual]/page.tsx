import { notFound, redirect } from 'next/navigation';
import { getManual } from '@/lib/docs/registry';
import { flattenChapters } from '@/lib/docs/types';

interface Props {
  params: Promise<{ manual: string }>;
}

/**
 * /docs/[manual] → redirect al primer capítulo del manual
 */
export default async function ManualIndexPage({ params }: Props) {
  const { manual: slug } = await params;
  const manual = getManual(slug);
  if (!manual) notFound();

  const flat = flattenChapters(manual);
  if (flat.length === 0) notFound();

  redirect(`/docs/${slug}/${flat[0].slug}`);
}
