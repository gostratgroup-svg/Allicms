import { SectionHubPage, type SectionHubItem } from '../components/SectionHubPage'

const bookingSections: SectionHubItem[] = [
  {
    title: 'Calendar',
    description: 'Daily, weekly and future multi-location booking calendar views will live here.',
    status: 'Schedule view',
  },
  {
    title: 'New Booking',
    description: 'The booking form will identify the patient, schedule time and prepare draft billing.',
    status: 'Booking flow',
  },
  {
    title: 'Location Calendars',
    description: 'Separate location and room availability views for practices with more than one venue.',
    status: 'Location planning',
  },
  {
    title: 'Therapist Calendars',
    description: 'Therapist-specific calendars for availability, blocked time and session planning.',
    status: 'Therapist planning',
  },
  {
    title: 'Booking Queue',
    description: 'Bookings needing confirmation, rescheduling, intake completion or admin follow-up.',
    status: 'Workflow queue',
  },
]

export function BookingsPage() {
  return (
    <SectionHubPage
      eyebrow="Booking operations"
      title="Bookings workspace"
      description="This area prepares the calendar and booking workflows without connecting live appointment data yet."
      sections={bookingSections}
      ariaLabel="Bookings placeholder sections"
    />
  )
}
