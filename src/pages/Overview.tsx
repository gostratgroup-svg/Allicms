import { SectionHubPage, type SectionHubItem } from '../components/SectionHubPage'

const overviewSections: SectionHubItem[] = [
  {
    title: 'Today’s Bookings',
    description: 'A permission-driven view of today’s booking activity, attendance context and session readiness.',
    status: 'Command centre',
  },
  {
    title: 'Draft Invoices Awaiting Confirmation',
    description: 'Sessions that have draft invoice records waiting for confirmation before payment follow-up starts.',
    status: 'Billing task',
  },
  {
    title: 'Outstanding Payments',
    description: 'A quick view of invoices or statements that require payment follow-up.',
    status: 'Finance task',
  },
  {
    title: 'Patient Intake Outstanding',
    description: 'New or incomplete patient intake records that still need patient or guardian information.',
    status: 'Patient setup',
  },
  {
    title: 'Recent Patient History',
    description: 'Recent patient-facing and internal activity once the operational modules are connected.',
    status: 'Activity feed',
  },
  {
    title: 'Tasks / Follow-ups',
    description: 'A focused task list for booking changes, finance follow-ups, clinical admin and practice actions.',
    status: 'Work queue',
  },
]

export function OverviewPage() {
  return (
    <SectionHubPage
      eyebrow="Permission-driven workspace"
      title="Overview command centre"
      description="This page will become the daily operating view for each user, shaped by their permissions and practice role."
      sections={overviewSections}
      ariaLabel="Overview command centre placeholder sections"
    />
  )
}
