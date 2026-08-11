// Plain data, no 'use client' — shared between StreetwearNav (client, mobile
// drawer) and StreetwearHome/StreetwearAbout (server components). Data
// exports from a 'use client' file can cause bundling issues when pulled
// into a server component, so this lives in its own boundary-free module.
//
// Menu structure (Jeff, 2026-08-08): top-level is Home/Fellas/Ladies/
// Accessories/What's Hot; everything else nests under "More".
export const STREETWEAR_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Fellas', href: '/shop/c/fellas' },
  { name: 'Ladies', href: '/shop/c/ladies' },
  { name: 'Accessories', href: '/shop/c/accessories' },
  { name: "What's Hot", href: '/shop' },
  { name: 'Contact', href: '/contact' },
]

export const STREETWEAR_MORE_LINKS = [
  { name: 'About', href: '/about' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Blog', href: '/blog' },
]
