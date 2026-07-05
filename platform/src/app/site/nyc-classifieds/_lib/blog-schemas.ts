export const blogPostSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'BlogPosting' })
export const blogListingSchema = (..._args: unknown[]) => ({ '@context': 'https://schema.org', '@type': 'Blog' })
export function getSecondarySchemas(..._args: unknown[]): unknown[] { return [] }
