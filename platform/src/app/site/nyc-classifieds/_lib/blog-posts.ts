// Stub: scaffold-only.
export type BlogPost = { slug: string; title: string; date: string; excerpt: string; body: string; category?: string }
export const blogPosts: BlogPost[] = []
export const BLOG_CATEGORIES: Array<{ slug: string; name: string }> = []
export function getBlogPost(_slug: string): BlogPost | null { return null }
export function getPostBySlug(_slug: string): BlogPost | null { return null }
export function getAllSlugs(): string[] { return [] }
