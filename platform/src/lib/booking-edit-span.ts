// BookingsAdmin's edit modal only exposes start_date/start_time/hours — there is
// no end_date control. For an ordinary same-day booking, recomputing end_time as
// start_date + start_time + hours is correct. For a multi-day booking (a
// duration_class:'multiday'/'project' row, e.g. a long project's span booking),
// that same formula silently collapses the whole span onto the start day the
// instant ANY field is saved (price, notes, status — not just the dates),
// because the modal always recomputes end_time this way regardless of which
// fields actually changed.
//
// Fix: detect a multi-day original span (start/end dates differ) and preserve
// it by shifting the original end_time by whatever the start actually moved
// (0 if the start wasn't touched), instead of re-deriving it from `hours`.

function parseNaiveDate(s: string): string {
  return s.split('T')[0]
}

function buildNaiveDateTime(date: string, time: string, addHours = 0): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = h * 60 + m + addHours * 60
  const newH = Math.floor(totalMinutes / 60) % 24
  const newM = totalMinutes % 60
  return `${date}T${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`
}

function naiveMinuteDiff(a: string, b: string): number {
  const [ad, at] = a.split('T')
  const [bd, bt] = b.split('T')
  const [ay, am, aday] = ad.split('-').map(Number)
  const [by, bm, bday] = bd.split('-').map(Number)
  const [ah, amin] = (at || '00:00').split(':').map(Number)
  const [bh, bmin] = (bt || '00:00').split(':').map(Number)
  const aTotal = new Date(ay, am - 1, aday).getTime() / 60000 + ah * 60 + amin
  const bTotal = new Date(by, bm - 1, bday).getTime() / 60000 + bh * 60 + bmin
  return aTotal - bTotal
}

function shiftNaiveDateTime(s: string, minutes: number): string {
  const [datePart, timePart] = s.split('T')
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, m] = (timePart || '00:00').split(':').map(Number)
  const dt = new Date(y, mo - 1, d, h, m + minutes)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`
}

export interface EditedSpan {
  start_time: string
  end_time: string
}

export function computeEditedSpan(
  originalStartTime: string,
  originalEndTime: string,
  formStartDate: string,
  formStartTime: string,
  formHours: number
): EditedSpan {
  const newStartStr = buildNaiveDateTime(formStartDate, formStartTime)
  const isMultiDay = parseNaiveDate(originalStartTime) !== parseNaiveDate(originalEndTime)
  const newEndStr = isMultiDay
    ? shiftNaiveDateTime(originalEndTime, naiveMinuteDiff(newStartStr, originalStartTime))
    : buildNaiveDateTime(formStartDate, formStartTime, formHours)
  return { start_time: newStartStr, end_time: newEndStr }
}
