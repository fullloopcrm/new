-- 2026_07_17_bookings_review_followup_sent_at.backfill.sql
-- Populates review_followup_sent_at for existing bookings.notes rows that
-- still carry the legacy '[FOLLOWUP_SENT] <iso>' marker from the previous
-- notes-substring dedup mechanism, so the cutover to the new column does
-- not re-send review requests for bookings already followed up under the
-- old (buggy-but-functioning-when-unedited) scheme. MUST run AFTER
-- 2026_07_17_bookings_review_followup_sent_at.sql.
--
-- Extracts the ISO-8601 timestamp that followed the marker
-- (new Date().toISOString() format, exactly what the old code wrote) when
-- present and well-formed; falls back to check_out_time (a real,
-- always-populated timestamp for a completed booking) when the marker is
-- present but the timestamp suffix doesn't match that exact shape, so no
-- row is left un-backfilled just because of a malformed legacy annotation.
-- The extraction is regex-gated before casting so a malformed match can
-- never throw and abort the UPDATE.
--
-- A booking whose notes were edited AFTER the marker was written (bug #2 in
-- the companion .sql file) has already LOST the marker text and is
-- correctly left NULL here -- it was silently vulnerable to a duplicate
-- resend before this fix and will now correctly get exactly one more
-- (final, deduped-from-here-on) review request post-cutover, not zero.
--
-- Idempotent: guarded by review_followup_sent_at is null.

update bookings
set review_followup_sent_at = case
  when substring(notes from '\[FOLLOWUP_SENT\]\s+([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z)') is not null
    then (substring(notes from '\[FOLLOWUP_SENT\]\s+([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z)'))::timestamptz
  else check_out_time
end
where review_followup_sent_at is null
  and notes ~ '\[FOLLOWUP_SENT\]';

-- ── VERIFICATION (fail-loud) ────────────────────────────────────────────
-- Every notes row still carrying the legacy marker must now have a
-- non-null review_followup_sent_at (either parsed or the check_out_time
-- fallback covers 100% of matches -- there is no case that should still be
-- null after the UPDATE above).
do $$
declare
  n_gap bigint;
begin
  select count(*) into n_gap
    from bookings
    where notes ~ '\[FOLLOWUP_SENT\]'
      and review_followup_sent_at is null;

  if n_gap > 0 then
    raise exception
      '2026_07_17_bookings_review_followup_sent_at.backfill: % booking row(s) still carry the legacy [FOLLOWUP_SENT] marker with no review_followup_sent_at after backfill',
      n_gap;
  end if;

  raise notice '2026_07_17_bookings_review_followup_sent_at.backfill: OK';
end $$;
