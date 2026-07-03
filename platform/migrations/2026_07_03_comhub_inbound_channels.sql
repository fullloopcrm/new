-- ComHub per-tenant inbound channels: IMAP email + Telegram.
-- Secrets (imap_pass, telegram_bot_token) are encrypted at rest via secret-crypto
-- before storage, same as telnyx_api_key / resend_api_key. Once a tenant saves
-- these in Settings, ComHub pulls that tenant's mailbox / Telegram bot — no code
-- change, no per-tenant hardcoding.

alter table tenants add column if not exists imap_host text;
alter table tenants add column if not exists imap_user text;
alter table tenants add column if not exists imap_pass text;
alter table tenants add column if not exists imap_port integer;
alter table tenants add column if not exists telegram_bot_token text;
