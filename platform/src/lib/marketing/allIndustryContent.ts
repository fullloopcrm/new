import type { IndustryPageContent } from './industryPageContent';
import { industryPageContent } from './industryPageContent';
import { industryPageContent2 } from './industryPageContent2';
import { industryPageContent3 } from './industryPageContent3';
import { industryPageContent4 } from './industryPageContent4';

export type { IndustryPageContent };

// Merge all four batches into a single lookup
export const allIndustryContent: Record<string, IndustryPageContent> = {
  ...industryPageContent,
  ...industryPageContent2,
  ...industryPageContent3,
  ...industryPageContent4,
};

export function getIndustryContent(slug: string): IndustryPageContent | null {
  return allIndustryContent[slug] ?? null;
}
