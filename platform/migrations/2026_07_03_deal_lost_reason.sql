-- Lost-reason tag on deals (2026-07-03)
-- When a lead is marked "Not Qualified" (or otherwise lost), the operator tags a
-- reason so the pipeline shows WHY it died. Free-ish text, but the UI offers a
-- small canned set ('not_qualified', 'no_budget', 'went_elsewhere', 'no_response',
-- 'other'). Nullable; only set when stage = 'lost'. Idempotent.
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lost_reason text;
