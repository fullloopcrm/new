/**
 * Schedule import — guided, staged, reversible. Appointments are matched to
 * already-imported clients; unmatched rows are held for review, never guessed
 * onto a live calendar. Staging schedules is blocked until clients exist.
 */
import ImportWizard from '@/components/import/ImportWizard'

export default function ScheduleImportPage() {
  return <ImportWizard kind="schedules" />
}
