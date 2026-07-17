-- Item (158): bank_transactions.status's declared 'duplicate' value
-- (032_ledger.sql CHECK constraint) was permanently unreachable — the
-- bank-import route silently dropped fingerprint-matched rows instead of
-- writing them, and even if it had, idx_bank_txns_account_fp's *plain*
-- unique index on (bank_account_id, fingerprint) would have rejected the
-- insert outright, since the whole point of a flagged duplicate is sharing
-- a fingerprint with the row it duplicates.
--
-- Narrow the index to a partial one that only enforces uniqueness among
-- non-duplicate rows. The real guarantee this index exists for — never two
-- *accepted* rows with the same fingerprint on the same account — is
-- unchanged; flagged 'duplicate' rows are now allowed to coexist with the
-- original so they're recoverable instead of silently, permanently dropped.

DROP INDEX IF EXISTS idx_bank_txns_account_fp;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_txns_account_fp
  ON bank_transactions(bank_account_id, fingerprint)
  WHERE status <> 'duplicate';
