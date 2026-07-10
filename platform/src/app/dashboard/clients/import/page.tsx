/**
 * Client import — guided, staged, reversible. The wizard walks the operator from
 * "which CRM are you leaving?" through export, upload, mapping, and STAGES a
 * reviewable batch (nothing is written until they commit on the review screen).
 */
import ImportWizard from '@/components/import/ImportWizard'

export default function ClientImportPage() {
  return <ImportWizard kind="clients" />
}
