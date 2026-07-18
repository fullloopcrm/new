# Gap/fluidity: document duplicate silently shipped a broken PDF reference on storage copy failure

**Date:** 2026-07-18 11:33
**Worker:** W1
**Status:** Fixed, committed (996ad19d)

## The gap

`POST /api/documents/[id]/duplicate` (src/app/api/documents/[id]/duplicate/route.ts)
clones a document into a new draft: it copies the row, then copies the
stored original PDF by `download()`-ing the source object and
`upload()`-ing it to the new document's path, then finally points the new
row's `original_path` at that new path.

Neither storage call's result was checked:

```ts
const { data: blob } = await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).download(src.original_path)
if (blob) {
  const arrayBuf = await blob.arrayBuffer()
  await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).upload(newPath, ...)
}
await supabaseAdmin.from('documents').update({ original_path: newPath }).eq('id', newDoc.id)
```

If `download()` failed (`blob` null/undefined — missing source object,
storage hiccup), the `if (blob)` guard skipped the copy entirely, but the
final `update()` ran unconditionally anyway, pointing `original_path` at a
path with nothing stored there. If `download()` succeeded but `upload()`
failed, the same thing happened — the `upload()` call's own error was
never captured. Either way the route returned `200` with a full document
object, exactly as if the duplicate had fully succeeded.

## Why it's the same class as this session's other fixes

The corruption is invisible at the point of failure. The admin sees a
normal "duplicate created" response and has no reason to suspect anything
is wrong. The break only surfaces later, when someone tries to send the
duplicate: `POST /api/documents/[id]/send` does check its own download
(`if (dlErr || !pdfBlob) return 500`), so the eventual failure is a clear
"Unable to read original PDF" — but by then the user has no reason to
connect a Send-time 500 back to a duplicate action that looked clean,
possibly days earlier. Same shape as this session's Yinez SMS
write-error-swallowed fix and the referrer-ledger drift fix: a write step
fails, the code doesn't notice, and the caller is told success.

## Fix

Check both `download()` and `upload()` results. On either failure, roll
back the just-created draft row and return 500 with a clear error. Rollback
is safe as a single delete because the failure point sits *before* signers
and fields are copied — nothing else references the partial row yet.

## Sibling sweep (continuation)

Grepped every other `.storage.from(...).download(...)` site under
`src/app/api/documents` and `src/lib`:

- `POST /api/documents/[id]/send` — already checks (`dlErr || !pdfBlob`),
  fine.
- `POST /api/documents/public/[token]/sign` — has two download sites.
  The hash-integrity one (`if (!blob) throw new Error('Original PDF
  missing')`) already fails loud. The completion-copy one
  (`sendCompletionCopies`) has an unchecked `if (!blob) return`, but it's
  explicitly documented as best-effort ("never throws into the signing
  response") — the signing itself already completed and is durable; a
  failed completion-email attachment doesn't corrupt any record the way
  the duplicate bug did. Not the same class, left as-is.

No other `.download()`/`.upload()` pair without a result check found in
the documents module or elsewhere in `src/lib`.

## Verification

- RED-confirmed via `git apply -R` on the route diff alone: both new
  failure tests failed exactly as predicted (200 instead of 500), the
  regression test still passed.
- GREEN after re-applying.
- New file: `route.storage-failure.test.ts` (3 tests: download failure,
  upload failure, success no-regression).
- tsc clean on touched files (1 pre-existing unrelated unused-import
  warning on `getTenantForRequest`, not introduced by this change).
- Full suite: 691/691 files, 3547 tests + 1 pre-existing expected-fail
  (was 690/690, 3544+1 before this pass) — +1 file, +3 tests, 0
  regressions.
- eslint: 0 new warnings/errors.

File-only. No push/deploy/DB.
