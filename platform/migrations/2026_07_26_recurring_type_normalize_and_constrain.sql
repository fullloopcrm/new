-- Recurring rebuild, step 1: recurring_schedules.recurring_type has never
-- been constrained to lib/recurring.ts's actual RecurringType enum
-- ('daily'|'weekly'|'biweekly'|'triweekly'|'monthly_date'|'monthly_weekday'|
-- 'custom'). Production data audit (2026-07-26) found FOUR different formats
-- actually stored:
--   'Weekly' / 'weekly'                    -> case variants
--   'Bi-weekly' / 'biweekly'                -> case+hyphen variants
--   'Tri-weekly'                            -> case+hyphen variant
--   'Weekly (Friday)'                       -> composite display string
--   '1st Sat' / '2nd Tue' / '3rd Fri' / '3rd Tue' / '4th Wed'
--                                           -> raw ordinal-weekday display
--                                              strings, written directly by
--                                              dashboard/bookings/_recurring.ts's
--                                              own parallel parser instead of
--                                              the canonical enum
--
-- generateRecurringDates()'s switch has no case for any of these raw labels
-- -- it silently matches nothing and returns an empty date array. That means
-- every schedule stuck with one of these values (4 are currently `active` on
-- nycmaid alone: 1st Sat, 2nd Tue, 3rd Tue, 4th Wed) stops generating new
-- occurrences forever once its existing batch runs out, with no error
-- anywhere -- the same failure class as the already-fixed bare-'monthly' bug
-- (src/app/api/client/recurring/route.ts comment, 2026-07-22).
--
-- day_of_week is already correctly populated for every ordinal-weekday row
-- (verified against each label's weekday before writing this), and
-- monthly_weekday's week-of-month is derived from the schedule's own start
-- date at generation time (lib/recurring.ts), not stored separately -- so
-- relabeling these to 'monthly_weekday' is a pure fix, not a behavior change
-- for any row whose original start date actually matched its label.
--
-- Scoped to recurring_schedules only. bookings.recurring_type is a separate,
-- looser denormalized copy (also carries 'one_time' for non-recurring
-- bookings, a legitimate value that doesn't belong in this table's enum) --
-- not touched here.

UPDATE recurring_schedules
SET recurring_type = CASE
  WHEN recurring_type ILIKE 'weekly' THEN 'weekly'
  WHEN recurring_type ILIKE 'weekly (%' THEN 'weekly'
  WHEN recurring_type ILIKE 'bi-weekly' OR recurring_type ILIKE 'biweekly' THEN 'biweekly'
  WHEN recurring_type ILIKE 'tri-weekly' OR recurring_type ILIKE 'triweekly' THEN 'triweekly'
  WHEN recurring_type ILIKE 'monthly' THEN 'monthly_date'
  WHEN recurring_type ~ '^[0-9](st|nd|rd|th)\s' THEN 'monthly_weekday'
  ELSE recurring_type
END
WHERE recurring_type NOT IN ('daily', 'weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday', 'custom');

-- Guard: fail the migration loudly instead of silently adding a constraint
-- that would then reject the very rows it was meant to fix, if some
-- as-yet-unseen format slipped through the CASE above.
DO $$
DECLARE
  bad_count integer;
BEGIN
  SELECT count(*) INTO bad_count FROM recurring_schedules
  WHERE recurring_type NOT IN ('daily', 'weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday', 'custom');
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'recurring_type normalization left % row(s) with an unrecognized value -- inspect before adding the CHECK constraint', bad_count;
  END IF;
END $$;

ALTER TABLE recurring_schedules
  ADD CONSTRAINT recurring_schedules_recurring_type_check
  CHECK (recurring_type IN ('daily', 'weekly', 'biweekly', 'triweekly', 'monthly_date', 'monthly_weekday', 'custom'));
