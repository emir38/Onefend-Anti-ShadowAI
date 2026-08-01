// ─── Doc Content Types ────────────────────────────────────────────────────────

export type CalloutVariant = 'info' | 'tip' | 'warning' | 'danger';

export type DocBlock =
  | { type: 'h2'; id: string; text: string }
  | { type: 'h3'; id: string; text: string }
  | { type: 'p'; text: string }
  | { type: 'callout'; variant: CalloutVariant; title?: string; text: string }
  | { type: 'code'; language: string; code: string; filename?: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'steps'; steps: Array<{ title: string; description: string }> }
  | { type: 'divider' };

export interface DocChapter {
  slug: string;
  title: string;
  description?: string;
  blocks: DocBlock[];
}

export interface DocSection {
  title: string;
  chapters: DocChapter[];
}

export interface DocManual {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  version: string;
  lastUpdated: string;
  icon: string;           // lucide icon name
  sections: DocSection[];
}

// ─── Navigation helpers ────────────────────────────────────────────────────────

export interface FlatChapter {
  slug: string;
  title: string;
  sectionTitle: string;
  manualSlug: string;
}

export function flattenChapters(manual: DocManual): FlatChapter[] {
  return manual.sections.flatMap((section) =>
    section.chapters.map((ch) => ({
      slug: ch.slug,
      title: ch.title,
      sectionTitle: section.title,
      manualSlug: manual.slug,
    }))
  );
}

export function getPrevNext(manual: DocManual, chapterSlug: string) {
  const flat = flattenChapters(manual);
  const idx = flat.findIndex((c) => c.slug === chapterSlug);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

export function getChapter(manual: DocManual, chapterSlug: string): DocChapter | null {
  for (const section of manual.sections) {
    const ch = section.chapters.find((c) => c.slug === chapterSlug);
    if (ch) return ch;
  }
  return null;
}

export function getTocHeadings(blocks: DocBlock[]): Array<{ id: string; text: string; level: 2 | 3 }> {
  return blocks
    .filter((b): b is Extract<DocBlock, { type: 'h2' | 'h3' }> => b.type === 'h2' || b.type === 'h3')
    .map((b) => ({ id: b.id, text: b.text, level: b.type === 'h2' ? 2 : 3 }));
}
