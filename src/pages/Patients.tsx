import { SectionHubPage, type SectionHubItem } from '../components/SectionHubPage'

const patientSections: SectionHubItem[] = [
  {
    title: 'Patient List',
    description: 'A searchable patient database and internal profile launcher will be implemented here.',
    status: 'Patient database',
  },
  {
    title: 'New Patient',
    description: 'Create partial patient profiles and start the intake journey from the booking workflow.',
    status: 'Profile setup',
  },
  {
    title: 'Patient Onboarding',
    description: 'Track intake forms, POPIA acknowledgement, signatures and incomplete patient details.',
    status: 'Intake flow',
  },
  {
    title: 'Patient History',
    description: 'A timeline of patient actions, booking events, finance events and patient-facing updates.',
    status: 'History',
  },
  {
    title: 'Patient Link',
    description: 'Permanent patient-facing access for intake, feedback, sessions, finance and documents.',
    status: 'Patient access',
  },
  {
    title: 'Documents',
    description: 'Patient documents, reports and future storage-linked records will be managed here.',
    status: 'Documents',
  },
]

export function PatientsPage() {
  return (
    <SectionHubPage
      eyebrow="Patient workspace"
      title="Patients"
      description="This area prepares the patient database and patient-facing link structure for production data."
      sections={patientSections}
      ariaLabel="Patients placeholder sections"
    />
  )
}
