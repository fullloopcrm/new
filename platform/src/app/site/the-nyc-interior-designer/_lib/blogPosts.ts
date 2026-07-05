export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  content: { heading: string; paragraphs: string[] }[];
}

import { blogBatch1 } from "./blogPosts-batch1";
import { blogBatch2 } from "./blogPosts-batch2";

export const blogPosts: BlogPost[] = [...blogBatch1, ...blogBatch2];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
