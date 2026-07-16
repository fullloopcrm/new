-- Dedup guard for POST /api/admin/requests/[id]/agreement, which had zero
-- duplicate-submission protection: a double-click, a page-refresh retry, or
-- two admins racing to send the service agreement could each build a PDF,
-- create a new documents row + signers, and email the client a fresh signing
-- link -- a real customer sees two "sign your agreement" emails with two
-- different valid sign links for the same lead.
--
-- Nullable, additive, file-only -- not applied. The leader/Jeff must run this
-- before the corresponding route fix is live, or the atomic claim in the
-- route will error on the missing column.
ALTER TABLE partner_requests
  ADD COLUMN IF NOT EXISTS agreement_document_id uuid REFERENCES documents(id);
