-- Prevent two tenants from ever sharing the same Telnyx SMS/voice number
-- again. This is the structural fix behind the 2026-08-03 incident where
-- Florida Maid's telnyx_phone got set to nycmaid's live production number:
-- inbound SMS silently misrouted to whichever tenant's id sorted first, and
-- inbound voice calls to that number started getting rejected outright
-- (telnyx-voice/route.ts's ambiguous-tenant 409).
--
-- telnyx_phone has ONE known live duplicate right now (nycmaid + Florida
-- Maid both on +18883164019, intentional/temporary so Florida Maid can text
-- its cleaner applicants before its own ported number, +19547103636, lands
-- ~2026-08-05). That pair is explicitly excluded below so the migration can
-- run without breaking anything live. Once Florida Maid moves onto its own
-- number, drop this index and recreate it with a plain
-- `WHERE telnyx_phone IS NOT NULL` predicate (no id exclusion) to close the
-- gap for good.
create unique index if not exists tenants_telnyx_phone_unique
  on tenants (telnyx_phone)
  where telnyx_phone is not null
    and id not in ('00000000-0000-0000-0000-000000000001', '56490a6b-820c-49e6-8c14-cb4e54ffcb06');

-- voice_did has no current duplicates, so no exclusion needed.
create unique index if not exists tenants_voice_did_unique
  on tenants (voice_did)
  where voice_did is not null;
