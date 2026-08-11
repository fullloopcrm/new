import type { DropshipAdapter } from '../types'

// The default/fallback adapter — no real supplier API exists yet, so this
// just formalizes today's behavior (an operator enters supplier + tracking
// info by hand in the dashboard) as one implementation of the same
// interface a real adapter will use, rather than a special case elsewhere.
export const manualAdapter: DropshipAdapter = {
  key: 'manual',
  label: 'Manual (no API)',

  async createOrder() {
    return {
      externalOrderId: null,
      status: 'manual',
      message: 'No automated supplier connected — enter tracking details by hand.',
    }
  },

  async getTracking() {
    return null
  },

  parseTrackingWebhook() {
    return null
  },
}
