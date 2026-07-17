import { describe, it, expect } from 'vitest'
import { pickLifestylePhoto, pickTeamPhoto, pickPhotoByCategory } from './photos'
import type { BrandContext } from './brand'

/**
 * photos.ts placeholder-branding probe.
 *
 * BUG (fixed here): the AUTO-GENERATED photo pool's alt/caption text has
 * "Your Business" baked into ~20 entries' source strings. Every picker
 * (pickLifestylePhoto/pickTeamPhoto/pickPhotoByCategory) returned that
 * literal text untouched — rendered as image alt text and sitemap.xml
 * image titles/captions on every template tenant's site. Fixed by
 * rebranding at read time (same pattern as content.ts's
 * neighborhoodContent()) rather than hand-editing the generated data.
 */

const brand: BrandContext = {
  name: 'Sparkle Cleaning Co', siteName: 'Sparkle Cleaning Co', url: 'https://sparkle.example.com',
  phone: '(646) 555-0199', phoneDigits: '6465550199', city: 'New York City', region: 'US-NY', industry: 'cleaning',
}

describe('pickLifestylePhoto()', () => {
  it('never returns "Your Business" in alt/caption when a brand is passed', () => {
    // Sample many seeds to hit photos whose source alt/caption contains the placeholder.
    for (let i = 0; i < 50; i++) {
      const photo = pickLifestylePhoto(`seed-${i}`, brand)
      expect(photo.alt).not.toContain('Your Business')
      expect(photo.caption).not.toContain('Your Business')
    }
  })

  it('interpolates the real brand name where the placeholder used to be', () => {
    // 'nyc-maid-mopping-tiled-apartment-floor' source alt is seeded by a specific slug;
    // sweep seeds until we hit a photo whose default alt contained the placeholder.
    let found = false
    for (let i = 0; i < 50; i++) {
      const branded = pickLifestylePhoto(`seed-${i}`, brand)
      const unbranded = pickLifestylePhoto(`seed-${i}`)
      if (unbranded.alt.includes('Your Business')) {
        found = true
        expect(branded.alt).toContain('Sparkle Cleaning Co')
      }
    }
    expect(found).toBe(true)
  })
})

describe('pickTeamPhoto() / pickPhotoByCategory()', () => {
  it('never return "Your Business" in alt/caption when a brand is passed', () => {
    for (let i = 0; i < 30; i++) {
      const team = pickTeamPhoto(`seed-${i}`, brand)
      expect(team.alt).not.toContain('Your Business')
      const cat = pickPhotoByCategory('mop', `seed-${i}`, brand)
      expect(cat.alt).not.toContain('Your Business')
    }
  })
})
