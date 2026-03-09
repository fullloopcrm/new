// Telnyx SMS via REST API (no SDK needed)

export async function sendSMS({
  to,
  body,
  telnyxApiKey,
  telnyxPhone,
}: {
  to: string
  body: string
  telnyxApiKey: string
  telnyxPhone: string
}) {
  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${telnyxApiKey}`,
    },
    body: JSON.stringify({
      from: telnyxPhone,
      to,
      text: body,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('SMS send error:', err)
    throw new Error(`SMS failed: ${res.status}`)
  }

  return res.json()
}
