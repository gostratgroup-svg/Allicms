import { SectionHubPage, type SectionHubItem } from '../components/SectionHubPage'

const financeSections: SectionHubItem[] = [
  {
    title: 'Billing Queue',
    description: 'Draft invoice confirmation and billing tasks created from bookings will appear here.',
    status: 'Billing task',
  },
  {
    title: 'Invoices',
    description: 'Confirmed invoices, invoice PDFs and invoice payment status will be managed here.',
    status: 'Invoice records',
  },
  {
    title: 'Payments',
    description: 'Payment capture, proof of payment and payment allocation workflows will live here.',
    status: 'Payment workflow',
  },
  {
    title: 'Statements',
    description: 'Generate and track statements that group multiple invoices for a responsible party.',
    status: 'Statements',
  },
  {
    title: 'Price Lists',
    description: 'Procedure lists, procedure codes, descriptions, prices and duration defaults will be configured here.',
    status: 'Pricing setup',
  },
  {
    title: 'Reports',
    description: 'Finance summaries, outstanding balances and billing exports will be added in a later phase.',
    status: 'Reporting',
  },
]

export function FinancePage() {
  return (
    <SectionHubPage
      eyebrow="Billing and payments"
      title="Finance"
      description="This area prepares the invoice, payment, statement and price-list workflows for production data."
      sections={financeSections}
      ariaLabel="Finance placeholder sections"
    />
  )
}
