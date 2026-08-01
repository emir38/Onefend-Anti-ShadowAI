import type { DocManual } from './types';
import { antiShadowAiManual as antiShadowAiManualEs } from './content/anti-shadow-ai/es';
import { antiShadowAiManual as antiShadowAiManualEn } from './content/anti-shadow-ai/en';
import { antiShadowAiManual as antiShadowAiManualPt } from './content/anti-shadow-ai/pt';

type Locale = 'es' | 'en' | 'pt';

const REGISTRY: Record<string, Record<Locale, DocManual>> = {
  'anti-shadow-ai': {
    es: antiShadowAiManualEs,
    en: antiShadowAiManualEn,
    pt: antiShadowAiManualPt,
  },
};

export function getManual(slug: string, locale: string = 'es'): DocManual | null {
  const l = (locale === 'en' || locale === 'pt') ? locale : 'es';
  return REGISTRY[slug]?.[l] ?? null;
}

export function getAllManuals(locale: string = 'es'): DocManual[] {
  const l = (locale === 'en' || locale === 'pt') ? locale : 'es';
  return Object.values(REGISTRY).map(m => m[l]);
}
