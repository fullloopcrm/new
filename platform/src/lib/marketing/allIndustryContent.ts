import type { IndustryPageContent } from './industryPageContent';
import { industryPageContent } from './industryPageContent';
import { industryPageContent2 } from './industryPageContent2';
import { industryPageContent3 } from './industryPageContent3';

export type { IndustryPageContent };

// Merge all three batches into a single lookup
export const allIndustryContent: Record<string, IndustryPageContent> = {
  ...industryPageContent,
  ...industryPageContent2,
  ...industryPageContent3,
};

export function getIndustryContent(slug: string): IndustryPageContent | null {
  return allIndustryContent[slug] ?? null;
}
