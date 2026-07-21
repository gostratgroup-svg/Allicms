import { type Dispatch, type PointerEvent, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth, type ActiveRole, type Profile } from './auth/AuthContext'
import { useAuthorization } from './auth/permissions'
import { isSupabaseConfigured, testSupabaseConnection, type SupabaseConnectionTestResult } from './lib/supabase'
import { AppShell, MainContent, Sidebar, Topbar } from './layout/AppShell'
import { NotificationMenu } from './components/NotificationMenu'
import { UserAccountMenu } from './components/UserAccountMenu'
import { AppRoutes, appRoutes, getRouteForPath } from './routes/appRoutes'

type View = 'overview' | 'sessions' | 'patients' | 'finances' | 'settings'
type Role = 'Admin' | 'Reception' | 'Therapist' | 'Super Admin'
type SuperAdminModule = 'dashboard' | 'tenants' | 'subscriptions' | 'support' | 'health' | 'configuration'
type SessionSlot = { date: string; time: string; patientName?: string }
type CalendarSession = {
  id: string
  date: string
  startTime: string
  endTime: string
  patient: string
  type: string
  therapist: string
  room: string
  practiceEntityId?: string
  practiceLocationId?: string
  procedurePriceListId?: string
  billingCodeId?: string
  billingProcedureIds?: string[]
  icd10Code?: string
  durationMinutes?: number
  isAssessment?: boolean
  quotedAmount?: number
  invoiceAmount?: number
  selectedPracticeNumberSource?: 'practice' | 'therapist'
  selectedBankingDetailsSource?: 'practice' | 'therapist'
}
type PatientHistoryEvent = {
  title: string
  visibility: string
  detail: string
}
type PatientNote = {
  noteType: string
  date: string
  detail: string
}
type InvoiceStatus = 'confirm_invoice' | 'awaiting_payment' | 'payment_due' | 'payment_received'
type InvoiceLineItem = {
  invoiceId?: string
  sessionDate?: string
  procedureCode: string
  description: string
  icd10Code: string
  price: number
}
type Invoice = {
  id: string
  kind?: 'invoice' | 'statement'
  patientId: string
  sessionId?: string
  linkedInvoiceIds?: string[]
  patientName: string
  serviceType: string
  practitionerName: string
  amount: number
  invoiceDate: string
  status: InvoiceStatus
  confirmedAt?: string
  paymentDueDate?: string
  paymentReceivedAt?: string
  paymentAmount?: number
  pdfInvoiceUrl?: string
  proofOfPaymentUrl?: string
  proofOfPaymentName?: string
  practiceEntityId?: string
  practiceLocationId?: string
  therapistId?: string
  selectedPracticeNumber?: string
  selectedBankingDetails?: string
  billingCodeId?: string
  icd10Code?: string
  serviceDescription?: string
  lineItems?: InvoiceLineItem[]
  createdAt: string
  updatedAt: string
}
type BankingDetails = {
  accountName: string
  bank: string
  accountNumber: string
  branchCode: string
}
type TenantUserRole = 'admin' | 'receptionist' | 'therapist' | 'finance'
type TenantUser = {
  id: string
  tenantId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: TenantUserRole
  isActive: boolean
  practiceNumber: string
  usesOwnPracticeNumber: boolean
  hpcsaNumber: string
  qualification: string
  discipline: string
  bankingDetails: BankingDetails
  signatureUrl: string
  createdAt: string
  updatedAt: string
}

const tenant = {
  tenantId: 'tenant-kids-therapy-centre',
  name: 'Kids Therapy Centre',
  plan: 'Growth practice',
  status: 'Active',
  subscription: 'Paid until 31 Jul 2026',
}

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'sessions', label: 'Bookings', icon: 'blocks' },
  { id: 'patients', label: 'Patients', icon: 'person' },
  { id: 'finances', label: 'Finances', icon: 'coins' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
]

const superAdminNavItems: Array<{ id: SuperAdminModule; label: string; detail: string; icon: string }> = [
  { id: 'dashboard', label: 'Dashboard', detail: 'Platform overview', icon: 'platform-dashboard' },
  { id: 'tenants', label: 'Tenant Management', detail: 'Create, edit and lifecycle', icon: 'platform-tenants' },
  { id: 'subscriptions', label: 'Subscription Management', detail: 'Plans, renewals and tenant billing', icon: 'platform-subscriptions' },
  { id: 'support', label: 'Support Centre', detail: 'Technical tenant support', icon: 'platform-support' },
  { id: 'health', label: 'System Health', detail: 'Operational status', icon: 'platform-health' },
  { id: 'configuration', label: 'Platform Configuration', detail: 'Global AlliDesk settings', icon: 'platform-config' },
]

function NavIcon({ icon }: { icon: string }) {
  const commonProps = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (icon === 'home') {
    return (
      <svg {...commonProps}>
        <path d="M4.5 10.7 12 4.4l7.5 6.3" />
        <path d="M6.8 9.4v9.4h10.4V9.4" />
        <path d="M10 18.8v-5h4v5" />
      </svg>
    )
  }

  if (icon === 'blocks') {
    return (
      <svg {...commonProps}>
        <rect x="4.4" y="4.4" width="6.1" height="6.1" rx="1.4" />
        <rect x="13.5" y="4.4" width="6.1" height="6.1" rx="1.4" />
        <rect x="4.4" y="13.5" width="6.1" height="6.1" rx="1.4" />
        <rect x="13.5" y="13.5" width="6.1" height="6.1" rx="1.4" />
      </svg>
    )
  }

  if (icon === 'person') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="8" r="3.1" />
        <path d="M5.6 19.4c.6-3.4 3-5.3 6.4-5.3s5.8 1.9 6.4 5.3" />
      </svg>
    )
  }

  if (icon === 'coins') {
    return (
      <svg {...commonProps}>
        <ellipse cx="12" cy="6.4" rx="6.1" ry="2.5" />
        <path d="M5.9 6.4v4.3c0 1.4 2.7 2.5 6.1 2.5s6.1-1.1 6.1-2.5V6.4" />
        <path d="M5.9 10.8v4.3c0 1.4 2.7 2.5 6.1 2.5s6.1-1.1 6.1-2.5v-4.3" />
      </svg>
    )
  }

  if (icon === 'platform-dashboard') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="14" rx="2.2" />
        <path d="M8 15v-4" />
        <path d="M12 15V9" />
        <path d="M16 15v-2" />
      </svg>
    )
  }

  if (icon === 'platform-tenants') {
    return (
      <svg {...commonProps}>
        <path d="M5 19V8.4L12 4l7 4.4V19" />
        <path d="M8.2 19v-7.4h7.6V19" />
        <path d="M9.5 8.8h5" />
      </svg>
    )
  }

  if (icon === 'platform-subscriptions') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="6" width="16" height="12" rx="2.2" />
        <path d="M4 10h16" />
        <path d="M7.5 15h4.8" />
        <path d="M15.7 15h.8" />
      </svg>
    )
  }

  if (icon === 'platform-support') {
    return (
      <svg {...commonProps}>
        <path d="M6.2 14.5a6.2 6.2 0 1 1 11.6 0" />
        <path d="M5.2 14.2v-2.4h2.5v4.8H5.9a.7.7 0 0 1-.7-.7v-1.7Z" />
        <path d="M18.8 14.2v-2.4h-2.5v4.8h1.8a.7.7 0 0 0 .7-.7v-1.7Z" />
        <path d="M16.4 16.6c-.7 1.4-2 2.1-4.4 2.1" />
      </svg>
    )
  }

  if (icon === 'platform-health') {
    return (
      <svg {...commonProps}>
        <path d="M4 12h3.2l1.6-4.5 3 9 2.4-6.1 1.4 1.6H20" />
        <path d="M5 19h14" />
      </svg>
    )
  }

  if (icon === 'platform-config') {
    return (
      <svg {...commonProps}>
        <path d="M5 7h14" />
        <path d="M5 12h14" />
        <path d="M5 17h14" />
        <circle cx="9" cy="7" r="1.7" />
        <circle cx="15" cy="12" r="1.7" />
        <circle cx="11" cy="17" r="1.7" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="M9.7 4.3 10.4 2h3.2l.7 2.3 2.1.9 2.1-1.1 2.3 2.3-1.1 2.1.9 2.1 2.3.7v3.2l-2.3.7-.9 2.1 1.1 2.1-2.3 2.3-2.1-1.1-2.1.9-.7 2.3h-3.2l-.7-2.3-2.1-.9-2.1 1.1-2.3-2.3 1.1-2.1-.9-2.1-2.3-.7v-3.2l2.3-.7.9-2.1-1.1-2.1 2.3-2.3 2.1 1.1 2.1-.9Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  )
}

const roles: Array<{
  role: Role
  scope: string
  description: string
  permissions: string[]
}> = [
  {
    role: 'Admin',
    scope: 'Practice admin workspace',
    description: 'The tenant-level owner or practice manager. Admin may also be a therapist, or may manage a team of therapists.',
    permissions: [],
  },
  {
    role: 'Reception',
    scope: 'Front desk workspace',
    description: 'Operational view for patient registration, bookings, reminders, document uploads and payment status.',
    permissions: ['Register patients', 'Book appointments', 'Send reminders', 'Upload documents', 'View payment status'],
  },
  {
    role: 'Therapist',
    scope: 'Clinical workspace',
    description: 'Focused view for assigned patients, schedule, session notes, assessments, reports and progress.',
    permissions: ['View assigned patients', 'Complete notes', 'Upload assessments', 'Create reports', 'Track goals'],
  },
  {
    role: 'Super Admin',
    scope: 'Platform owner workspace',
    description: 'Platform-level control only. Super Admin creates tenants and tenant Admin users, then manages tenant status.',
    permissions: ['Create tenants', 'Activate or suspend tenants', 'Create tenant Admin users', 'View tenant list', 'Access tenant support'],
  },
]

const sessions = [
  {
    tenantId: tenant.tenantId,
    time: '08:30',
    patient: 'Liam Jacobs',
    guardian: 'Marissa Jacobs',
    therapist: 'Nadia Botha',
    type: 'Occupational Therapy',
    room: 'Room 2',
    status: 'Confirmed',
    invoice: 'INV-2048',
    amount: 780,
  },
  {
    tenantId: tenant.tenantId,
    time: '10:00',
    patient: 'Amahle Dlamini',
    guardian: 'Thandi Dlamini',
    therapist: 'Megan Pillay',
    type: 'Speech Therapy',
    room: 'Telehealth',
    status: 'Reminder sent',
    invoice: 'INV-2049',
    amount: 690,
  },
  {
    tenantId: tenant.tenantId,
    time: '12:15',
    patient: 'Ethan Naidoo',
    guardian: 'Priya Naidoo',
    therapist: 'Nadia Botha',
    type: 'Progress review',
    room: 'Room 1',
    status: 'Needs note',
    invoice: 'Draft',
    amount: 950,
  },
  {
    tenantId: tenant.tenantId,
    time: '15:00',
    patient: 'Mila van Wyk',
    guardian: 'Andre van Wyk',
    therapist: 'Johan Kruger',
    type: 'Physiotherapy',
    room: 'Gym',
    status: 'Confirmed',
    invoice: 'INV-2050',
    amount: 720,
  },
]

const patients = [
  {
    tenantId: tenant.tenantId,
    patientNumber: 'PT-1001',
    dependantCode: '01',
    name: 'Liam Jacobs',
    phone: '082 551 0174',
    guardian: 'Marissa Jacobs',
    title: 'Known',
    idNumber: 'On file',
    residentialAddress: '12 Oak Street, Cape Town',
    guardianEmail: 'marissa@example.com',
    guardianOccupation: 'Teacher',
    guardianEmployer: 'Oak Primary',
    guardianPostalAddress: 'PO Box 114, Cape Town',
    homeTel: '021 555 0198',
    workTel: '021 555 0130',
    practiceNo: tenant.tenantId,
    medicalAidPlan: 'Classic Saver',
    accountResponsibility: 'Signed undertaking required',
    accountResponsibleName: 'Marissa Jacobs',
    accountResponsibleId: 'On file',
    dateSigned: '24 Jun 2026',
    dateOfBirth: '14 Feb 2018',
    emergencyContact: 'Deon Jacobs · 083 221 9090',
    type: 'Child',
    medicalAid: 'Discovery 445109',
    referralSource: 'School OT referral',
    diagnosis: 'Sensory processing delay',
    consentStatus: 'Signed',
    alert: 'School report due',
    balance: 1560,
    therapist: 'Nadia Botha',
    lastSession: '24 Jun 2026',
    nextSession: 'Today · 08:30',
    reportStatus: 'School report due',
    notes: [] as PatientNote[],
    historyEvents: [] as PatientHistoryEvent[],
  },
  {
    tenantId: tenant.tenantId,
    patientNumber: 'PT-1002',
    dependantCode: '02',
    name: 'Amahle Dlamini',
    phone: '076 882 3149',
    guardian: 'Thandi Dlamini',
    title: 'Known',
    idNumber: 'On file',
    residentialAddress: '7 Aloe Road, Durban',
    guardianEmail: 'thandi@example.com',
    guardianOccupation: 'Nurse',
    guardianEmployer: 'City Clinic',
    guardianPostalAddress: 'PO Box 28, Durban',
    homeTel: '031 555 0149',
    workTel: '031 555 0192',
    practiceNo: tenant.tenantId,
    medicalAidPlan: 'Standard',
    accountResponsibility: 'Signed undertaking required',
    accountResponsibleName: 'Thandi Dlamini',
    accountResponsibleId: 'On file',
    dateSigned: '25 Jun 2026',
    dateOfBirth: '03 Sep 2019',
    emergencyContact: 'Sipho Dlamini · 078 445 1201',
    type: 'Child',
    medicalAid: 'Bonitas 803721',
    referralSource: 'Paediatrician',
    diagnosis: 'Speech sound disorder',
    consentStatus: 'Signed',
    alert: 'Consent signed',
    balance: 0,
    therapist: 'Megan Pillay',
    lastSession: '25 Jun 2026',
    nextSession: 'Today · 10:00',
    reportStatus: 'Progress note current',
    notes: [] as PatientNote[],
    historyEvents: [] as PatientHistoryEvent[],
  },
  {
    tenantId: tenant.tenantId,
    patientNumber: 'PT-1003',
    dependantCode: '01',
    name: 'Ethan Naidoo',
    phone: '083 219 7752',
    guardian: 'Priya Naidoo',
    title: 'Known',
    idNumber: 'On file',
    residentialAddress: '44 Protea Crescent, Johannesburg',
    guardianEmail: 'priya@example.com',
    guardianOccupation: 'Accountant',
    guardianEmployer: 'Naidoo & Co',
    guardianPostalAddress: 'PO Box 310, Johannesburg',
    homeTel: '011 555 7752',
    workTel: '011 555 7711',
    practiceNo: tenant.tenantId,
    medicalAidPlan: 'Private',
    accountResponsibility: 'Signed undertaking required',
    accountResponsibleName: 'Priya Naidoo',
    accountResponsibleId: 'On file',
    dateSigned: 'Pending capture',
    dateOfBirth: '22 Nov 2017',
    emergencyContact: 'Ravi Naidoo · 082 771 5519',
    type: 'Child',
    medicalAid: 'Private',
    referralSource: 'Parent referral',
    diagnosis: 'Fine motor delay',
    consentStatus: 'Needs renewal',
    alert: 'Payment overdue',
    balance: 2340,
    therapist: 'Nadia Botha',
    lastSession: '20 Jun 2026',
    nextSession: 'Today · 12:15',
    reportStatus: 'Progress review pending',
    notes: [] as PatientNote[],
    historyEvents: [] as PatientHistoryEvent[],
  },
  {
    tenantId: tenant.tenantId,
    patientNumber: 'PT-1004',
    dependantCode: '03',
    name: 'Mila van Wyk',
    phone: '071 442 9021',
    guardian: 'Andre van Wyk',
    title: 'Known',
    idNumber: 'On file',
    residentialAddress: '18 Garden Avenue, Pretoria',
    guardianEmail: 'andre@example.com',
    guardianOccupation: 'Engineer',
    guardianEmployer: 'Van Wyk Projects',
    guardianPostalAddress: 'PO Box 81, Pretoria',
    homeTel: '012 555 9021',
    workTel: '012 555 9088',
    practiceNo: tenant.tenantId,
    medicalAidPlan: 'Custom',
    accountResponsibility: 'Signed undertaking required',
    accountResponsibleName: 'Andre van Wyk',
    accountResponsibleId: 'On file',
    dateSigned: '21 Jun 2026',
    dateOfBirth: '09 May 2012',
    emergencyContact: 'Lea van Wyk · 072 118 4420',
    type: 'Teen',
    medicalAid: 'Momentum 662140',
    referralSource: 'Orthopaedic surgeon',
    diagnosis: 'Post-injury rehab',
    consentStatus: 'Signed',
    alert: 'Goal review',
    balance: 720,
    therapist: 'Johan Kruger',
    lastSession: '21 Jun 2026',
    nextSession: 'Today · 15:00',
    reportStatus: 'Goal review due',
    notes: [] as PatientNote[],
    historyEvents: [] as PatientHistoryEvent[],
  },
  {
    tenantId: tenant.tenantId,
    patientNumber: 'PT-1005',
    dependantCode: '',
    name: 'Jonny Depp',
    phone: '',
    guardian: 'Dad Depp',
    title: '',
    idNumber: '',
    residentialAddress: '',
    guardianEmail: '',
    guardianOccupation: '',
    guardianEmployer: '',
    guardianPostalAddress: '',
    homeTel: '',
    workTel: '',
    practiceNo: tenant.tenantId,
    medicalAidPlan: '',
    accountResponsibility: '',
    accountResponsibleName: 'Dad Depp',
    accountResponsibleId: '',
    dateSigned: 'Pending',
    dateOfBirth: '',
    emergencyContact: 'Dad Depp · Parent / guardian',
    type: 'Child',
    medicalAid: '',
    referralSource: 'New session intake',
    diagnosis: '',
    consentStatus: 'Pending',
    alert: 'Patient link incomplete',
    balance: 0,
    therapist: 'Nadia Botha',
    lastSession: 'No completed sessions',
    nextSession: 'No session scheduled',
    reportStatus: 'Intake pending',
    notes: [] as PatientNote[],
    historyEvents: [
      {
        title: 'Patient profile link created',
        visibility: 'Available on patient link',
        detail: 'First access requires intake details and POPIA consent before the profile opens.',
      },
    ] as PatientHistoryEvent[],
  },
]

const activity = [
  'Nadia completed SOAP note for Liam Jacobs',
  'Reception uploaded POPIA consent for Amahle Dlamini',
  'Invoice INV-2046 marked partially paid',
  'Parent portal link opened by Priya Naidoo',
]

const appTodayIso = '2026-07-01'

const billingItems = [
  {
    code: 'F82',
    description: 'Specific developmental disorder of motor function',
    sessionType: 'Occupational therapy session',
    price: 780,
  },
  {
    code: 'R47.9',
    description: 'Speech disturbance, unspecified',
    sessionType: 'Speech therapy session',
    price: 690,
  },
  {
    code: 'Z51.8',
    description: 'Other specified medical care',
    sessionType: 'Progress review',
    price: 950,
  },
  {
    code: 'M62.81',
    description: 'Muscle weakness',
    sessionType: 'Physiotherapy rehab',
    price: 720,
  },
]

const practiceEntities = [
  {
    id: 'practice-a',
    tenantId: tenant.tenantId,
    name: 'Kids Therapy Centre',
    practiceNumber: 'KTC-2026-019',
    bankingDetails: { accountName: 'Kids Therapy Centre', bank: 'FNB', accountNumber: '62000000000', branchCode: '250655' },
    invoicePrefix: 'INV',
    quotePrefix: 'QUO',
    paymentTerms: 'Payment due within 7 days',
    priceListId: 'price-list-a',
    allowTherapistBankingOverride: true,
    isActive: true,
    createdAt: '2026-06-20',
    updatedAt: appTodayIso,
  },
  {
    id: 'practice-b',
    tenantId: tenant.tenantId,
    name: 'School Outreach Practice',
    practiceNumber: 'SOP-77410',
    bankingDetails: { accountName: 'School Outreach Practice', bank: 'FNB', accountNumber: '62000111111', branchCode: '250655' },
    invoicePrefix: 'SOI',
    quotePrefix: 'SOQ',
    paymentTerms: 'Payment due within 14 days',
    priceListId: 'price-list-b',
    allowTherapistBankingOverride: false,
    isActive: true,
    createdAt: '2026-06-24',
    updatedAt: appTodayIso,
  },
]

const practiceLocations = [
  { id: 'loc-1', tenantId: tenant.tenantId, practiceEntityId: 'practice-a', name: 'Main rooms', address: '12 Oak Street, Cape Town', contactNumber: '021 555 0100', isActive: true, createdAt: '2026-06-20', updatedAt: appTodayIso },
  { id: 'loc-2', tenantId: tenant.tenantId, practiceEntityId: 'practice-a', name: 'Paediatric gym', address: '12 Oak Street, Cape Town', contactNumber: '021 555 0100', isActive: true, createdAt: '2026-06-20', updatedAt: appTodayIso },
  { id: 'loc-3', tenantId: tenant.tenantId, practiceEntityId: 'practice-b', name: 'Oak Primary outreach', address: 'Oak Primary School, Cape Town', contactNumber: '021 555 0130', isActive: true, createdAt: '2026-06-24', updatedAt: appTodayIso },
]

const billingPriceListDefaults = [
  { id: 'price-list-a', tenantId: tenant.tenantId, code: 'A', name: 'Procedure and prices A', isActive: true, createdAt: '2026-06-20', updatedAt: appTodayIso },
  { id: 'price-list-b', tenantId: tenant.tenantId, code: 'B', name: 'Procedure and prices B', isActive: true, createdAt: '2026-06-20', updatedAt: appTodayIso },
]

const icdCodeDefaults = billingItems.map((item, index) => ({
  id: `icd-${index + 1}`,
  tenantId: tenant.tenantId,
  code: item.code,
  createdAt: '2026-06-20',
  updatedAt: appTodayIso,
}))

const billingCodeDefaults = billingItems.map((item, index) => ({
  id: `billing-${index + 1}`,
  tenantId: tenant.tenantId,
  practiceEntityId: index < 2 ? 'practice-a' : '',
  priceListId: billingPriceListDefaults[0].id,
  code: item.code,
  description: item.description,
  serviceType: item.sessionType,
  defaultPrice: item.price,
  durationMinutes: [30, 45, 60, 30][index] ?? 30,
  discipline: item.sessionType.includes('Occupational') ? 'Occupational Therapist' : item.sessionType.includes('Speech') ? 'Speech Therapist' : '',
  isActive: true,
  createdAt: '2026-06-20',
  updatedAt: appTodayIso,
}))

const therapistFinanceProfiles = [
  { id: 'tfp-1', tenantId: tenant.tenantId, userId: 'therapist-nadia-botha', therapistName: 'Nadia Botha', practiceNumber: 'OT-88421', usesOwnPracticeNumber: true, bankingDetails: { accountName: 'Nadia Botha', bank: 'FNB', accountNumber: '62000999111', branchCode: '250655' }, signatureUrl: '', createdAt: '2026-06-20', updatedAt: appTodayIso },
  { id: 'tfp-2', tenantId: tenant.tenantId, userId: 'therapist-megan-pillay', therapistName: 'Megan Pillay', practiceNumber: 'ST-33104', usesOwnPracticeNumber: true, bankingDetails: { accountName: 'Megan Pillay', bank: 'FNB', accountNumber: '62000888111', branchCode: '250655' }, signatureUrl: '', createdAt: '2026-06-21', updatedAt: appTodayIso },
  { id: 'tfp-3', tenantId: tenant.tenantId, userId: 'therapist-johan-kruger', therapistName: 'Johan Kruger', practiceNumber: 'PT-55201', usesOwnPracticeNumber: false, bankingDetails: { accountName: '', bank: '', accountNumber: '', branchCode: '' }, signatureUrl: '', createdAt: '2026-06-22', updatedAt: appTodayIso },
]

const therapists = [
  { name: 'Nadia Botha', color: '#2f6fed', background: '#e2ecff' },
  { name: 'Megan Pillay', color: '#12805c', background: '#ddf7e8' },
  { name: 'Johan Kruger', color: '#b4541f', background: '#ffe7da' },
  { name: 'Team', color: '#111114', background: '#d9d9db' },
]

const therapistContactDetails = [
  { name: 'Nadia Botha', email: 'nadia@kidstherapy.example', phone: '082 551 0174' },
  { name: 'Megan Pillay', email: 'megan@kidstherapy.example', phone: '076 882 3149' },
  { name: 'Johan Kruger', email: 'johan@kidstherapy.example', phone: '083 441 2208' },
]

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)

const formatBankingDetails = (details?: BankingDetails) =>
  details
    ? [details.accountName, details.bank, details.accountNumber, details.branchCode].filter(Boolean).join(' | ')
    : ''

function therapistCalendarStyle(therapist: string) {
  const therapistConfig = therapists.find((item) => item.name === therapist) ?? therapists[0]
  return {
    background: therapistConfig.background,
    color: therapistConfig.color,
  }
}

function therapistDiscipline(therapist: string) {
  if (therapist === 'Megan Pillay') return 'Speech Therapist'
  if (therapist === 'Johan Kruger') return 'Physiotherapist'
  return 'Occupational Therapist'
}

const shouldShowGuardianInList = (patientType: string) => ['Child', 'Teen'].includes(patientType)
const patientWorkspaceTabs = ['Personal Details', 'Notes', 'Sessions', 'Finance', 'Documents & Reports', 'History'] as const
type PatientWorkspaceTab = (typeof patientWorkspaceTabs)[number]
type Patient = (typeof patients)[number]
type PatientLinkSession = {
  date: string
  time: string
  patient: string
  therapist: string
  type: string
  room: string
  status: string
}
type BlockedCalendarSlot = {
  id: string
  date: string
  startTime: string
  endTime: string
}
type SessionInvoiceDetail = CalendarSession & {
  invoice?: Invoice
  invoiceId?: string
  price: number
  isConfirmed: boolean
}
const localStateKeys = {
  patients: 'allidesk.patientRecords',
  bookings: 'allidesk.calendarSessionRecords',
  invoices: 'allidesk.invoiceRecords',
} as const
const legacyLocalStateKeys = {
  patients: `alli${'cms'}.patientRecords`,
  bookings: `alli${'cms'}.calendarSessionRecords`,
  invoices: `alli${'cms'}.invoiceRecords`,
} as const

function loadLocalState<T>(key: string, fallback: T, legacyKey?: string): T {
  if (typeof window === 'undefined') return fallback
  try {
    const storedValue = window.localStorage.getItem(key) ?? (legacyKey ? window.localStorage.getItem(legacyKey) : null)
    if (storedValue && legacyKey && !window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, storedValue)
    }
    return storedValue ? JSON.parse(storedValue) as T : fallback
  } catch {
    return fallback
  }
}

function saveLocalState<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in private or embedded preview contexts.
  }
}

const noteTypeOptions = [
  { label: 'Session Feedback', visibility: 'Available to patient link' },
  { label: 'Session Process Note', visibility: 'Internal only' },
  { label: 'Case Management', visibility: 'Internal only' },
] as const

const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  confirm_invoice: 'Confirm invoice',
  awaiting_payment: 'Awaiting payment',
  payment_due: 'Payment due',
  payment_received: 'Payment received',
}

function getInvoiceStatus(invoice: Invoice): InvoiceStatus {
  if (invoice.status === 'awaiting_payment' && invoice.paymentDueDate && parseIsoDate(appTodayIso) > parseIsoDate(invoice.paymentDueDate)) {
    return 'payment_due'
  }
  return invoice.status
}

function getOverdueDays(invoice: Invoice) {
  const status = getInvoiceStatus(invoice)
  if (status !== 'payment_due' || !invoice.confirmedAt) return 0
  return Math.max(0, Math.floor((parseIsoDate(appTodayIso).getTime() - parseIsoDate(invoice.confirmedAt).getTime()) / 86400000))
}

type InvoiceDocumentOptions = {
  documentKind?: 'invoice' | 'statement'
  practiceName?: string
  practiceAddress?: string
  practicePhone?: string
  practiceEmail?: string
  practiceWebsite?: string
  practiceNumber?: string
  logoUrl?: string
  paymentTerms?: string
  bankingDetails?: BankingDetails
}

function escapeHtml(value?: string | number) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatAddressForInvoice(address?: string) {
  return (address || '12 Oak Street, Cape Town')
    .split(',')
    .map((line) => line.trim())
    .filter(Boolean)
}

function getInvoicePatient(invoice: Invoice) {
  return patients.find((patient) => patient.patientNumber === invoice.patientId || patient.name === invoice.patientName) ?? patients[0]
}

function getInvoiceLineItems(invoice: Invoice) {
  if (invoice.lineItems?.length) return invoice.lineItems
  const matchingProcedure = billingCodeDefaults.find((item) => item.id === invoice.billingCodeId || item.code === invoice.icd10Code)
  return [
    {
      invoiceId: invoice.id,
      sessionDate: invoice.invoiceDate,
      procedureCode: matchingProcedure?.code ?? invoice.icd10Code ?? 'PROC',
      description: invoice.serviceDescription ?? matchingProcedure?.description ?? invoice.serviceType,
      icd10Code: invoice.icd10Code ?? matchingProcedure?.code ?? 'N/A',
      price: invoice.amount,
    },
  ]
}

function buildInvoiceDocumentHtml(invoice: Invoice, options: InvoiceDocumentOptions = {}) {
  const patient = getInvoicePatient(invoice)
  const practiceEntity = practiceEntities.find((practice) => practice.id === invoice.practiceEntityId) ?? practiceEntities[0]
  const practiceLocation = practiceLocations.find((location) => location.id === invoice.practiceLocationId)
  const therapistProfile = therapistFinanceProfiles.find((profile) => profile.therapistName === invoice.practitionerName)
  const lineItems = getInvoiceLineItems(invoice)
  const documentKind = options.documentKind ?? (invoice.kind === 'statement' ? 'statement' : 'invoice')
  const isStatementDocument = documentKind === 'statement'
  const title = documentKind === 'statement' ? 'Statement' : 'Invoice'
  const practiceName = options.practiceName ?? practiceEntity.name
  const practiceAddress = formatAddressForInvoice(options.practiceAddress ?? practiceLocation?.address)
  const practicePhone = options.practicePhone ?? practiceLocation?.contactNumber ?? '021 555 0100'
  const practiceEmail = options.practiceEmail ?? 'accounts@kidstherapycentre.co.za'
  const practiceWebsite = options.practiceWebsite ?? 'www.kidstherapycentre.co.za'
  const practiceNumber = options.practiceNumber ?? invoice.selectedPracticeNumber ?? practiceEntity.practiceNumber
  const bankingDetails = options.bankingDetails ?? practiceEntity.bankingDetails
  const logoUrl = options.logoUrl
  const subtotal = lineItems.reduce((total, item) => total + item.price, 0)
  const total = invoice.amount || subtotal
  const toRows = [
    ['', patient.accountResponsibleName || patient.guardian || patient.name],
    ['Address', patient.guardianPostalAddress || patient.residentialAddress || ''],
    ['ID nr', patient.accountResponsibleId || ''],
    ['Email', patient.guardianEmail || ''],
    ['Cell', patient.phone || ''],
    ['__section__Patient', patient.name],
    ['Patient nr', patient.patientNumber],
    ['Dependant code', patient.dependantCode || ''],
    ['DOB', patient.dateOfBirth || ''],
    ['__heading__Medical aid details', ''],
    ['Medical aid', patient.medicalAid || ''],
    ['Plan / option', patient.medicalAidPlan || ''],
  ]
  const detailBlock = (heading: string, rows: string[][]) => `
    <section class="detail-card">
      <h3>${escapeHtml(heading)}</h3>
      ${rows.map(([label, value]) => `
        <div class="${label ? label.startsWith('__heading__') ? 'subsection-heading-line' : label.startsWith('__section__') ? 'section-detail-line' : '' : 'primary-detail-line'}">
          ${label.startsWith('__heading__')
            ? `<strong>${escapeHtml(label.replace('__heading__', ''))}</strong>`
            : `${label ? `<span>${escapeHtml(label.replace('__section__', ''))}</span>` : ''}<b>${escapeHtml(value || '-')}</b>`}
        </div>
      `).join('')}
    </section>
  `
  const practiceDetailBlock = `
    <div class="detail-stack">
      <section class="detail-card practice-detail-card">
        <h3>From</h3>
        <p>${escapeHtml(practiceName)}</p>
        <p>${escapeHtml(practiceAddress.join(', '))}</p>
        <p>${escapeHtml(practiceEmail)}</p>
        <p>${escapeHtml(practicePhone)}</p>
      </section>
      <section class="detail-card practice-detail-card banking-detail-card">
        <h3>Banking details</h3>
        <p>${escapeHtml(bankingDetails.accountName || practiceName)}</p>
        <p><span>Bank:</span> ${escapeHtml(bankingDetails.bank)}</p>
        <p><span>Account Nr:</span> ${escapeHtml(bankingDetails.accountNumber)}</p>
        <p><span>Code:</span> ${escapeHtml(bankingDetails.branchCode)}</p>
      </section>
    </div>
  `

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} ${escapeHtml(invoice.id)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f4f3fb;
      color: #171431;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.35;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 12px;
      background: rgba(255, 255, 255, 0.9);
      border-bottom: 1px solid #dedff0;
      backdrop-filter: blur(16px);
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .toolbar button {
      min-height: 34px;
      padding: 0 14px;
      border: 0;
      border-radius: 999px;
      background: #fc844c;
      color: white;
      font-weight: 760;
      cursor: pointer;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 22px auto;
      padding: 18mm;
      background: #ffffff;
      border-radius: 18px;
      box-shadow: 0 28px 80px rgba(34, 22, 114, 0.22);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .sheet:before {
      content: none;
    }
    .sheet:after {
      content: none;
    }
    header, main, footer { position: relative; z-index: 1; }
    main {
      flex: 1;
    }
    header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      align-items: end;
      margin-bottom: 18px;
    }
    h1 {
      margin: 0;
      font-size: 58px;
      line-height: 0.9;
      letter-spacing: 0;
      color: #221672;
    }
    .document-title {
      padding-top: 0;
    }
    .invoice-meta {
      margin-top: 14px;
      display: grid;
      gap: 4px;
      color: #6c6983;
      font-size: 12px;
      font-weight: 680;
    }
    .invoice-meta span:first-child {
      color: #fc844c;
      font-weight: 780;
    }
    .therapist-header span,
    .detail-card span,
    .totals span {
      color: #221672;
      font-size: 8.8px;
      font-weight: 760;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .therapist-header {
      justify-self: end;
      max-width: 90mm;
      padding-top: 2px;
      text-align: right;
    }
    .therapist-header h2 {
      margin: 4px 0 4px;
      color: #221672;
      font-size: 22px;
      font-weight: 780;
      line-height: 1.05;
    }
    .therapist-header p {
      margin: 0;
      color: #6c6983;
      font-size: 11px;
      font-weight: 560;
      line-height: 1.4;
    }
    .therapist-header:after {
      content: none;
    }
    header:after {
      content: "";
      grid-column: 1 / -1;
      display: block;
      height: 1px;
      background: #dedff0;
    }
    .invoice-meta-below {
      margin: -10px 0 12px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px 16px;
      color: #6c6983;
      font-size: 11px;
      font-weight: 620;
    }
    .invoice-meta-below > span:first-child {
      color: #fc844c;
      font-weight: 760;
    }
    .invoice-meta-dates {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px 16px;
      text-align: right;
    }
    .invoice-meta-dates span {
      color: #6c6983;
      font-weight: 620;
    }
    .practice-strip p,
    .notes {
      margin: 0;
      color: #6c6983;
      font-size: 11.2px;
      font-weight: 560;
    }
    .practice-strip {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr;
      gap: 10px;
      margin: 16px 0;
      padding: 12px;
      border: 1px solid rgba(153, 153, 237, 0.3);
      border-radius: 16px;
      background: #f6f5ff;
    }
    .practice-strip strong {
      display: block;
      margin-bottom: 3px;
      font-size: 12.5px;
      font-weight: 760;
      color: #221672;
    }
    .practice-strip-logo {
      display: block;
      max-width: 34mm;
      max-height: 16mm;
      margin: 0 0 8px;
      object-fit: contain;
      object-position: left center;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
      gap: 8px;
      margin: 12px 0 16px;
    }
    .detail-card {
      padding: 10px 11px;
      border: 1px solid #dedff0;
      border-radius: 12px;
      background: #fbfbfe;
      display: grid;
      align-content: start;
      gap: 4px;
    }
    .detail-stack {
      display: grid;
      align-content: start;
      gap: 8px;
    }
    .detail-card h3 {
      margin: 0 0 5px;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(222, 223, 240, 0.86);
      font-size: 11.8px;
      font-weight: 780;
      color: #221672;
    }
    .detail-card div {
      display: grid;
      grid-template-columns: minmax(22mm, 0.72fr) minmax(0, 1.28fr);
      align-items: baseline;
      gap: 7px;
      padding: 2px 0;
      break-inside: avoid;
    }
    .detail-card .primary-detail-line {
      grid-template-columns: 1fr;
      padding-bottom: 4px;
    }
    .detail-card .primary-detail-line b {
      color: #221672;
      font-size: 11.6px;
      font-weight: 760;
    }
    .detail-card .section-detail-line {
      margin-top: 5px;
      padding-top: 7px;
      border-top: 1px solid rgba(222, 223, 240, 0.78);
    }
    .detail-card .subsection-heading-line {
      grid-template-columns: 1fr;
      margin-top: 5px;
      padding-top: 7px;
      border-top: 1px solid rgba(222, 223, 240, 0.78);
    }
    .detail-card .subsection-heading-line strong {
      color: #221672;
      font-size: 9.6px;
      font-weight: 760;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .detail-card b {
      color: #171431;
      font-size: 10.6px;
      font-weight: 560;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
    .practice-detail-card p {
      margin: 0;
      padding: 3px 0;
      color: #171431;
      font-size: 10.8px;
      font-weight: 560;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .practice-detail-card p:first-of-type {
      color: #221672;
      font-weight: 720;
    }
    .practice-detail-card p + p {
      border-top: 0;
    }
    .banking-detail-card {
      border-color: rgba(252, 132, 76, 0.34);
      background: #fff3eb;
    }
    .banking-detail-card h3 {
      border-bottom-color: rgba(252, 132, 76, 0.26);
    }
    .banking-detail-card p span {
      color: #221672;
      font-size: 9.4px;
      font-weight: 760;
      text-transform: none;
    }
    .detail-card div + div {
      border-top: 0;
      padding-top: 4px;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border: 1px solid rgba(34, 22, 114, 0.16);
      border-radius: 16px;
      background: white;
    }
    th, td {
      padding: 10px 8px;
      border-bottom: 1px solid rgba(222, 223, 240, 0.9);
      text-align: left;
      font-size: 11.2px;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th {
      color: #221672;
      font-size: 8.2px;
      font-weight: 780;
      letter-spacing: 0.01em;
      text-transform: uppercase;
      background: #e9e8ff;
      white-space: nowrap;
    }
    tbody tr:nth-child(even) td {
      background: #fbfbfe;
    }
    td strong {
      display: block;
      font-size: 11.4px;
      font-weight: 760;
      color: #221672;
    }
    tr:last-child td { border-bottom: 0; }
    th:last-child,
    td:last-child {
      text-align: right;
      white-space: nowrap;
    }
    .line-table th:nth-child(3),
    .line-table td:nth-child(3),
    .statement-line-table th:nth-child(4),
    .statement-line-table td:nth-child(4) {
      padding-left: 12px;
      padding-right: 12px;
    }
    .summary-row {
      display: grid;
      grid-template-columns: 1fr 76mm;
      gap: 14px;
      align-items: start;
      margin-top: 14px;
    }
    .notes {
      padding: 12px;
      border-left: 4px solid #fc844c;
      border-radius: 12px;
      background: #fff6f1;
      font-size: 11px;
      line-height: 1.45;
    }
    .totals {
      padding: 12px;
      border: 1px solid rgba(252, 132, 76, 0.34);
      border-radius: 16px;
      background: #fff3eb;
      display: grid;
      gap: 7px;
    }
    .totals div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .totals strong {
      font-size: 18px;
      font-weight: 780;
      color: #221672;
    }
    .totals b {
      color: #221672;
    }
    footer {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: end;
      gap: 18px;
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid #dedff0;
      color: #6c6983;
      font-size: 11px;
      font-weight: 620;
    }
    .practice-footer-logo-row {
      margin-top: auto;
      padding-bottom: 10px;
      display: flex;
      justify-content: flex-start;
      align-items: end;
    }
    .practice-footer-logo {
      display: block;
      max-width: 38mm;
      max-height: 18mm;
      object-fit: contain;
      object-position: left bottom;
    }
    .allidesk-footer-logo {
      display: block;
      width: 30mm;
      height: auto;
      object-fit: contain;
      object-position: right bottom;
    }
    @page { size: A4; margin: 0; }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
    @media screen and (max-width: 900px) {
      .sheet {
        width: min(100vw - 24px, 210mm);
        padding: 14mm;
      }
      .detail-grid {
        grid-template-columns: 1fr;
      }
      header,
      .practice-strip,
      .summary-row {
        grid-template-columns: 1fr;
      }
      .therapist-header {
        justify-self: stretch;
        text-align: left;
      }
      .invoice-meta-below {
        grid-template-columns: 1fr;
      }
      .invoice-meta-dates {
        justify-content: flex-start;
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Save as PDF / Print</button>
  </div>
  <article class="sheet">
    <header>
      <div class="document-title">
        <h1>${escapeHtml(title)}</h1>
      </div>
      <section class="therapist-header">
        <span>Therapist</span>
        <h2>${escapeHtml(invoice.practitionerName)}</h2>
        <p>${escapeHtml(therapistDiscipline(invoice.practitionerName))}</p>
        <p>Practice no: ${escapeHtml(therapistProfile?.usesOwnPracticeNumber ? therapistProfile.practiceNumber : practiceNumber)}</p>
      </section>
    </header>

    <main>
      <div class="invoice-meta-below">
        <span>No. ${escapeHtml(invoice.id)}</span>
        <div class="invoice-meta-dates">
          <span>Date: ${escapeHtml(invoice.invoiceDate)}</span>
          ${invoice.paymentDueDate ? `<span>Due: ${escapeHtml(invoice.paymentDueDate)}</span>` : ''}
        </div>
      </div>

      <div class="detail-grid">
        ${detailBlock('To', toRows)}
        ${practiceDetailBlock}
      </div>

      <table class="line-table ${isStatementDocument ? 'statement-line-table' : 'invoice-line-table'}">
        <colgroup>
          ${isStatementDocument ? '<col style="width: 13%"><col style="width: 13%"><col style="width: 12%"><col style="width: 39%"><col style="width: 10%"><col style="width: 13%">' : '<col style="width: 15%"><col style="width: 14%"><col style="width: 47%"><col style="width: 10%"><col style="width: 14%">'}
        </colgroup>
        <thead>
          <tr>
            ${isStatementDocument ? '<th>Invoice nr</th>' : ''}
            <th>Date of session</th>
            <th>Procedure code</th>
            <th>Description</th>
            <th>ICD-10</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map((item) => `
            <tr>
              ${isStatementDocument ? `<td>${escapeHtml(item.invoiceId ?? '')}</td>` : ''}
              <td>${escapeHtml(item.sessionDate ?? invoice.invoiceDate)}</td>
              <td><strong>${escapeHtml(item.procedureCode)}</strong></td>
              <td>${escapeHtml(item.description)}</td>
              <td>${escapeHtml(item.icd10Code)}</td>
              <td>${escapeHtml(formatMoney(item.price))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-row">
        <p class="notes">${escapeHtml(options.paymentTerms ?? practiceEntity.paymentTerms)}. Please use invoice number ${escapeHtml(invoice.id)} as payment reference.</p>
        <section class="totals">
          <div><span>Subtotal</span><b>${escapeHtml(formatMoney(subtotal))}</b></div>
          <div><span>Total</span><strong>${escapeHtml(formatMoney(total))}</strong></div>
        </section>
      </div>
    </main>

    ${logoUrl ? `<div class="practice-footer-logo-row"><img class="practice-footer-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(practiceName)} logo"></div>` : ''}

    <footer>
      <span>${escapeHtml(practiceName)} · ${escapeHtml(practiceEmail)} · ${escapeHtml(practicePhone)}</span>
      <img class="allidesk-footer-logo" src="/assets/AlliDesk_Blue_App_logo.png" alt="AlliDesk">
    </footer>
  </article>
</body>
</html>`
}

function createPrintableDocumentUrl(html: string) {
  return URL.createObjectURL(new Blob([html], { type: 'text/html' }))
}

function generateInvoicePdf(invoice: Invoice, options?: InvoiceDocumentOptions) {
  return createPrintableDocumentUrl(buildInvoiceDocumentHtml(invoice, { ...options, documentKind: 'invoice' }))
}

function generateStatementPdf(invoice: Invoice, options?: InvoiceDocumentOptions) {
  return createPrintableDocumentUrl(buildInvoiceDocumentHtml(invoice, { ...options, documentKind: 'statement' }))
}

function getInvoiceSortTime(invoice: Invoice) {
  return new Date(invoice.updatedAt || invoice.createdAt || invoice.invoiceDate).getTime()
}

function sortInvoicesNewestFirst(invoices: Invoice[]) {
  return [...invoices].sort((a, b) => {
    const dateSort = getInvoiceSortTime(b) - getInvoiceSortTime(a)
    if (dateSort !== 0) return dateSort
    return b.id.localeCompare(a.id)
  })
}

function getOutstandingInvoiceTotal(invoices: Invoice[]) {
  const unpaidStatements = invoices.filter((invoice) => invoice.kind === 'statement' && getInvoiceStatus(invoice) !== 'payment_received')
  const invoiceIdsCoveredByStatements = new Set(unpaidStatements.flatMap((invoice) => invoice.linkedInvoiceIds ?? []))

  return invoices
    .filter((invoice) => getInvoiceStatus(invoice) !== 'payment_received')
    .filter((invoice) => invoice.kind === 'statement' || !invoiceIdsCoveredByStatements.has(invoice.id))
    .reduce((total, invoice) => total + invoice.amount, 0)
}

function getPatientTodoLabels(patient: Patient, patientInvoices: Invoice[], patientSessions: CalendarSession[]) {
  return [
    patient.alert === 'Patient link incomplete' || patient.consentStatus.toLowerCase() !== 'signed' ? 'Details' : null,
    patientInvoices.some((invoice) => getInvoiceStatus(invoice) === 'payment_due') ? 'Payment due' : null,
    patientSessions.some((session) => !patient.notes.some((note) => note.date === session.date)) ? 'Feedback notes due' : null,
    patientInvoices.some((invoice) => getInvoiceStatus(invoice) === 'confirm_invoice') ? 'Confirm invoice' : null,
  ].filter(Boolean) as string[]
}

function getPatientTodoCount(patientRecords: Patient[], invoiceRecords: Invoice[], calendarSessions: CalendarSession[]) {
  return patientRecords.reduce((total, patient) => {
    const patientInvoices = invoiceRecords.filter((invoice) => invoice.patientId === patient.patientNumber || invoice.patientName === patient.name)
    const patientSessions = calendarSessions.filter((session) => session.patient === patient.name)
    return total + getPatientTodoLabels(patient, patientInvoices, patientSessions).length
  }, 0)
}

function buildSessionInvoiceDetails(calendarSessions: CalendarSession[], invoiceRecords: Invoice[]): SessionInvoiceDetail[] {
  return calendarSessions.map((session) => {
    const matchingDailySession = sessions.find((item) => item.patient === session.patient && item.time === session.startTime)
    const matchingInvoice = invoiceRecords.find((invoice) => invoice.sessionId === session.id)
    const billingItem = billingItems.find((item) =>
      session.type.toLowerCase().includes(item.sessionType.split(' ')[0].toLowerCase()) ||
      item.sessionType.toLowerCase().includes(session.type.toLowerCase()),
    )
    return {
      ...session,
      invoice: matchingInvoice,
      invoiceId: matchingInvoice?.id,
      price: matchingDailySession?.amount ?? billingItem?.price ?? 780,
      isConfirmed: Boolean(matchingInvoice && getInvoiceStatus(matchingInvoice) !== 'confirm_invoice'),
    }
  })
}

function calendarSessionToPatientLinkSession(session: CalendarSession): PatientLinkSession {
  return {
    date: session.date,
    time: `${session.startTime}-${session.endTime}`,
    patient: session.patient,
    therapist: session.therapist,
    type: session.type,
    room: session.room,
    status: 'Booked',
  }
}

function sampleSessionToPatientLinkSession(session: (typeof sessions)[number]): PatientLinkSession {
  return {
    date: '',
    time: session.time,
    patient: session.patient,
    therapist: session.therapist,
    type: session.type,
    room: session.room,
    status: session.status,
  }
}

function getPatientLinkRoute() {
  const hashMatch = window.location.hash.match(/^#\/patient-link\/([^/]+)\/([^/]+)$/)
  const pathMatch = window.location.pathname.match(/^\/patient-link\/([^/]+)\/([^/]+)\/?$/)
  return hashMatch ?? pathMatch
}

function getIdentityDisplayName(profile: Profile | null, email?: string) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  return fullName || profile?.email || email || 'Signed in user'
}

function getResolvedRoleLabel(activeRole: ActiveRole) {
  if (activeRole === 'super_admin') return 'Super Admin'
  if (activeRole === 'admin') return 'Admin'
  if (activeRole === 'receptionist') return 'Reception'
  if (activeRole === 'therapist') return 'Therapist'
  if (activeRole === 'finance') return 'Finance'
  return 'Authenticated'
}

function getRouteIcon(path: string) {
  if (path === '/overview') return 'home'
  if (path === '/bookings') return 'blocks'
  if (path === '/patients') return 'person'
  if (path === '/finance') return 'coins'
  if (path === '/settings') return 'gear'
  if (path === '/practice') return 'blocks'
  return 'blocks'
}

function App() {
  const { user, profile, tenantMemberships, activeTenant, activeRole, selectActiveTenant, signOut } = useAuth()
  const authorization = useAuthorization()
  const location = useLocation()
  const [view, setView] = useState<View>('overview')
  const [role, setRole] = useState<Role>('Admin')
  const [activeSuperAdminModule, setActiveSuperAdminModule] = useState<SuperAdminModule>('dashboard')
  const [query, setQuery] = useState('')
  const [patientRecords, setPatientRecords] = useState<Patient[]>(() => loadLocalState(localStateKeys.patients, patients, legacyLocalStateKeys.patients))
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [newSessionSlot, setNewSessionSlot] = useState<SessionSlot | null>(null)
  const [calendarSessionRecords, setCalendarSessionRecords] = useState<CalendarSession[]>(() => loadLocalState(localStateKeys.bookings, weekSessions, legacyLocalStateKeys.bookings))
  const [selectedCalendarSessionId, setSelectedCalendarSessionId] = useState(weekSessions[0]?.id ?? '')
  const [selectedPatientName, setSelectedPatientName] = useState(patients[0].name)
  const [invoiceRecords, setInvoiceRecords] = useState<Invoice[]>(() => loadLocalState(localStateKeys.invoices, buildInitialInvoices(), legacyLocalStateKeys.invoices))
  const [practiceEntityRecords, setPracticeEntityRecords] = useState(practiceEntities)
  const [practiceLocationRecords, setPracticeLocationRecords] = useState(practiceLocations)
  const [procedurePriceLists, setProcedurePriceLists] = useState(billingPriceListDefaults)
  const [procedurePriceRecords, setProcedurePriceRecords] = useState(billingCodeDefaults)
  const [topNotice, setTopNotice] = useState('')
  const patientLinkMatch = getPatientLinkRoute()
  const currentDayIso = useLocalTodayIso()
  const resolvedRoleLabel = getResolvedRoleLabel(activeRole)
  const isResolvedSuperAdmin = activeRole === 'super_admin'
  const tenantDisplayName = isResolvedSuperAdmin ? 'Platform workspace' : activeTenant?.practice_name ?? tenant.name
  const identityDisplayName = getIdentityDisplayName(profile, user?.email)
  const identityContextLabel = isResolvedSuperAdmin ? 'AlliDesk Platform' : tenantDisplayName
  const canSwitchTenant = !isResolvedSuperAdmin && tenantMemberships.length > 1
  const activeRoute = getRouteForPath(location.pathname)
  const visibleAppRoutes = appRoutes.filter((item) => item.showInNav !== false && authorization.canAccess(item.accessArea))

  const openNewSession = (slot?: SessionSlot) => {
    setNewSessionSlot(slot ?? null)
    setIsNewSessionOpen(true)
  }

  useEffect(() => {
    if (activeRole === 'super_admin') {
      setRole('Super Admin')
      return
    }

    if (activeRole === 'admin') {
      setRole('Admin')
      return
    }

    if (activeRole === 'receptionist') {
      setRole('Reception')
      return
    }

    if (activeRole === 'therapist') {
      setRole('Therapist')
    }
  }, [activeRole])

  useEffect(() => {
    if (!topNotice) return
    const timer = window.setTimeout(() => setTopNotice(''), 6500)
    return () => window.clearTimeout(timer)
  }, [topNotice])

  useEffect(() => {
    saveLocalState(localStateKeys.patients, patientRecords)
  }, [patientRecords])

  useEffect(() => {
    saveLocalState(localStateKeys.bookings, calendarSessionRecords)
  }, [calendarSessionRecords])

  useEffect(() => {
    saveLocalState(localStateKeys.invoices, invoiceRecords)
  }, [invoiceRecords])

  const addPatientHistoryEvent = (patientName: string, event: PatientHistoryEvent) => {
    setPatientRecords((records) =>
      records.map((patient) =>
        patient.name === patientName
          ? { ...patient, historyEvents: [event, ...patient.historyEvents] }
          : patient,
      ),
    )
  }

  const addPatientNote = (patientName: string, note: PatientNote) => {
    setPatientRecords((records) =>
      records.map((patient) =>
        patient.name === patientName
          ? { ...patient, notes: [note, ...patient.notes] }
          : patient,
      ),
    )
  }

  const removeSessionFromCalendar = (sessionId: string) => {
    setCalendarSessionRecords((records) => {
      const remainingSessions = records.filter((session) => session.id !== sessionId)
      setSelectedCalendarSessionId(remainingSessions[0]?.id ?? '')
      return remainingSessions
    })
  }

  const markSessionNoShow = (session: CalendarSession) => {
    removeSessionFromCalendar(session.id)
    addPatientHistoryEvent(session.patient, {
      title: `No show marked · ${session.date} ${session.startTime}`,
      visibility: 'Available on patient link',
      detail: `${session.type} session with ${session.therapist} was marked as no-show and removed from the calendar.`,
    })
  }

  const cancelSession = (session: CalendarSession, shouldReschedule: boolean) => {
    removeSessionFromCalendar(session.id)
    addPatientHistoryEvent(session.patient, {
      title: `Session cancelled · ${session.date} ${session.startTime}`,
      visibility: 'Available on patient link',
      detail: shouldReschedule
        ? `${session.type} session was cancelled and a reschedule was started.`
        : `${session.type} session with ${session.therapist} was cancelled.`,
    })
    if (shouldReschedule) {
      openNewSession({ date: session.date, time: session.startTime, patientName: session.patient })
    }
  }

  const filteredPatients = useMemo(() => {
    const needle = query.toLowerCase().trim()
    if (!needle) return patientRecords
    return patientRecords.filter((patient) =>
      [patient.name, patient.phone, patient.guardian, patient.medicalAid].some((item) => item.toLowerCase().includes(needle)),
    )
  }, [patientRecords, query])
  const todayIso = currentDayIso
  const todaySessions = calendarSessionRecords.filter((session) => session.date === todayIso)
  const todaySessionsNeedingNotes = todaySessions.filter((session) => {
    const patient = patientRecords.find((record) => record.name === session.patient)
    return !patient?.notes.some((note) => note.date === session.date)
  })
  const feedbackDue = todaySessionsNeedingNotes.length
  const outstandingInvoiceTotal = invoiceRecords
    .filter((invoice) => getInvoiceStatus(invoice) !== 'payment_received')
    .reduce((total, invoice) => total + invoice.amount, 0)
  const sessionInvoiceDetails = buildSessionInvoiceDetails(calendarSessionRecords, invoiceRecords)
  const sessionsNeedingInvoiceConfirmation = sessionInvoiceDetails.filter((session) => !session.isConfirmed)
  const confirmInvoice = (invoiceId: string) => {
    const invoiceToConfirm = invoiceRecords.find((invoice) => invoice.id === invoiceId)
    setInvoiceRecords((records) =>
      records.map((invoice) => {
        if (invoice.id !== invoiceId) return invoice
        const currentSession = calendarSessionRecords.find((session) => session.id === invoice.sessionId)
        const refreshedDraft = currentSession ? createInvoiceFromSession(currentSession, 0) : invoice
        const invoiceDraft = currentSession
          ? {
              ...invoice,
              patientName: refreshedDraft.patientName,
              serviceType: refreshedDraft.serviceType,
              practitionerName: refreshedDraft.practitionerName,
              amount: refreshedDraft.amount,
              invoiceDate: refreshedDraft.invoiceDate,
              practiceEntityId: refreshedDraft.practiceEntityId,
              practiceLocationId: refreshedDraft.practiceLocationId,
              therapistId: refreshedDraft.therapistId,
              selectedPracticeNumber: refreshedDraft.selectedPracticeNumber,
              selectedBankingDetails: refreshedDraft.selectedBankingDetails,
              billingCodeId: refreshedDraft.billingCodeId,
              icd10Code: refreshedDraft.icd10Code,
              serviceDescription: refreshedDraft.serviceDescription,
              lineItems: refreshedDraft.lineItems?.map((item) => ({ ...item, invoiceId: invoice.id })),
            }
          : invoice
        const confirmedInvoice = {
          ...invoiceDraft,
          status: 'awaiting_payment' as InvoiceStatus,
          confirmedAt: appTodayIso,
          paymentDueDate: toIsoDate(addDays(parseIsoDate(appTodayIso), 7)),
          updatedAt: appTodayIso,
        }
        return { ...confirmedInvoice, pdfInvoiceUrl: generateInvoicePdf(confirmedInvoice) }
      }),
    )
    if (invoiceToConfirm) {
      addPatientHistoryEvent(invoiceToConfirm.patientName, {
        title: `Invoice confirmed · ${appTodayIso}`,
        visibility: 'Available on patient link',
        detail: `${invoiceToConfirm.id} for ${invoiceToConfirm.serviceType} was confirmed and moved to awaiting payment.`,
      })
    }
  }
  const markPaymentReceived = (invoiceId: string, proofFile?: string, paymentAmount?: number, proofFileName?: string) => {
    const paidInvoice = invoiceRecords.find((invoice) => invoice.id === invoiceId)
    setInvoiceRecords((records) =>
      records.map((invoice) =>
        invoice.id === invoiceId || paidInvoice?.linkedInvoiceIds?.includes(invoice.id)
          ? {
              ...invoice,
              status: 'payment_received',
              paymentReceivedAt: appTodayIso,
              paymentAmount: invoice.id === invoiceId ? paymentAmount ?? invoice.amount : invoice.amount,
              proofOfPaymentUrl: proofFile || invoice.proofOfPaymentUrl,
              proofOfPaymentName: proofFileName || invoice.proofOfPaymentName,
              updatedAt: appTodayIso,
            }
          : invoice,
      ),
    )
    if (paidInvoice) {
      const receivedAmount = paymentAmount ?? paidInvoice.amount
      setPatientRecords((records) =>
        records.map((patient) =>
          patient.name === paidInvoice.patientName || patient.patientNumber === paidInvoice.patientId
            ? { ...patient, balance: Math.max(0, patient.balance - receivedAmount) }
            : patient,
        ),
      )
      addPatientHistoryEvent(paidInvoice.patientName, {
        title: `Payment received · ${appTodayIso}`,
        visibility: 'Available on patient link',
        detail: `${formatMoney(receivedAmount)} received for ${paidInvoice.id}${paidInvoice.kind === 'statement' ? ' and linked invoices' : ''}${proofFileName ? ` with proof ${proofFileName}.` : '.'}`,
      })
    }
  }
  const createPatientStatement = (patientName: string, invoiceIds: string[]) => {
    const statementInvoices = invoiceRecords.filter((invoice) => invoiceIds.includes(invoice.id))
    if (!statementInvoices.length) return
    const patient = patientRecords.find((record) => record.name === patientName || record.patientNumber === statementInvoices[0].patientId)
    const statementNumber = `ST-${String(invoiceRecords.filter((invoice) => invoice.kind === 'statement').length + 3001).padStart(4, '0')}`
    const amount = statementInvoices.reduce((total, invoice) => total + invoice.amount, 0)
    const isPaidStatement = statementInvoices.every((invoice) => getInvoiceStatus(invoice) === 'payment_received')
    const statement: Invoice = {
      id: statementNumber,
      kind: 'statement',
      patientId: patient?.patientNumber ?? statementInvoices[0].patientId,
      linkedInvoiceIds: invoiceIds,
      patientName,
      serviceType: `Customer statement · ${invoiceIds.length} invoices`,
      practitionerName: tenant.name,
      amount,
      invoiceDate: appTodayIso,
      status: isPaidStatement ? 'payment_received' : 'awaiting_payment',
      confirmedAt: appTodayIso,
      paymentDueDate: isPaidStatement ? undefined : toIsoDate(addDays(parseIsoDate(appTodayIso), 7)),
      paymentReceivedAt: isPaidStatement ? appTodayIso : undefined,
      lineItems: statementInvoices.flatMap((invoice) =>
        getInvoiceLineItems(invoice).map((item) => ({
          ...item,
          invoiceId: item.invoiceId ?? invoice.id,
          sessionDate: item.sessionDate ?? invoice.invoiceDate,
        })),
      ),
      createdAt: appTodayIso,
      updatedAt: appTodayIso,
    }
    setInvoiceRecords((records) => [...records, { ...statement, pdfInvoiceUrl: generateStatementPdf(statement) }])
    addPatientHistoryEvent(patientName, {
      title: `Statement generated · ${appTodayIso}`,
      visibility: 'Available on patient link',
      detail: `${statementNumber} created for ${formatMoney(amount)} and linked to ${invoiceIds.length} invoices${isPaidStatement ? ' already paid.' : '.'}`,
    })
  }
  const syncDraftInvoiceFromSession = (invoice: Invoice, session: CalendarSession): Invoice => {
    if (getInvoiceStatus(invoice) !== 'confirm_invoice') return invoice
    const refreshedDraft = createInvoiceFromSession(session, 0)
    return {
      ...invoice,
      patientName: refreshedDraft.patientName,
      serviceType: refreshedDraft.serviceType,
      practitionerName: refreshedDraft.practitionerName,
      amount: refreshedDraft.amount,
      invoiceDate: refreshedDraft.invoiceDate,
      practiceEntityId: refreshedDraft.practiceEntityId,
      practiceLocationId: refreshedDraft.practiceLocationId,
      therapistId: refreshedDraft.therapistId,
      selectedPracticeNumber: refreshedDraft.selectedPracticeNumber,
      selectedBankingDetails: refreshedDraft.selectedBankingDetails,
      billingCodeId: refreshedDraft.billingCodeId,
      icd10Code: refreshedDraft.icd10Code,
      serviceDescription: refreshedDraft.serviceDescription,
      lineItems: refreshedDraft.lineItems?.map((item) => ({ ...item, invoiceId: invoice.id })),
      updatedAt: appTodayIso,
    }
  }
  const updateBookedSession = (updatedSession: CalendarSession) => {
    setCalendarSessionRecords((records) =>
      records.map((session) => (session.id === updatedSession.id ? updatedSession : session)),
    )
    setInvoiceRecords((records) =>
      records.map((invoice) =>
        invoice.sessionId === updatedSession.id ? syncDraftInvoiceFromSession(invoice, updatedSession) : invoice,
      ),
    )
  }
  const patientTodoCount = getPatientTodoCount(patientRecords, invoiceRecords, calendarSessionRecords)

  if (patientLinkMatch) {
    const [, linkTenantId, linkPatientNumber] = patientLinkMatch
    const linkedPatient = patientRecords.find(
      (patient) =>
        patient.tenantId === linkTenantId &&
        patient.patientNumber.toLowerCase() === linkPatientNumber.toLowerCase(),
    )

    if (linkedPatient) {
      const linkedCalendarSessions = calendarSessionRecords
        .filter((session) => session.patient === linkedPatient.name)
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
        .map(calendarSessionToPatientLinkSession)
      const linkedSampleSessions = sessions
        .filter((session) => session.patient === linkedPatient.name)
        .map(sampleSessionToPatientLinkSession)
      return (
        <PatientLinkPage
          patient={linkedPatient}
          sessions={linkedCalendarSessions.length ? linkedCalendarSessions : linkedSampleSessions}
          invoiceRecords={invoiceRecords}
          onUpdatePatientField={(field, value) => {
            setPatientRecords((records) =>
              records.map((patient) =>
                patient.patientNumber === linkedPatient.patientNumber ? { ...patient, [field]: value } : patient,
              ),
            )
          }}
        />
      )
    }
  }

  const sidebar = (
    <Sidebar>
      <div className="brand">
        <img src="/assets/AlliDesk_Main_App_logo.png" alt="AlliDesk" className="brand-logo" />
      </div>

      <nav className={`main-nav ${role === 'Super Admin' ? 'platform-nav' : ''}`} aria-label={role === 'Super Admin' ? 'Platform navigation' : 'Main navigation'}>
        {role === 'Super Admin' ? (
          superAdminNavItems.map((item) => (
            <button className={activeSuperAdminModule === item.id ? 'active' : ''} key={item.id} onClick={() => setActiveSuperAdminModule(item.id)}>
              <span className="nav-icon" aria-hidden="true">
                <NavIcon icon={item.icon} />
              </span>
              <span className="nav-copy">
                <strong>{item.label}</strong>
              </span>
            </button>
          ))
        ) : (
          visibleAppRoutes.map((item) => (
            <NavLink className={({ isActive }) => (isActive ? 'active' : '')} to={item.path} key={item.path}>
              <span className="nav-icon" aria-hidden="true">
                <NavIcon icon={getRouteIcon(item.path)} />
              </span>
              {item.label}
            </NavLink>
          ))
        )}
      </nav>
      {role === 'Super Admin' && (
        <div className="sidebar-platform-note">
          <strong>POPIA foundation</strong>
          <span>Super Admin manages the platform, not tenant customer or patient data.</span>
        </div>
      )}
    </Sidebar>
  )

  const topbar = (
    <Topbar
      eyebrow={`${resolvedRoleLabel} · ${identityContextLabel}`}
      title={role === 'Super Admin' ? superAdminPageTitle(activeSuperAdminModule) : activeRoute.title}
      actions={(
        <div className="topbar-actions">
          <NotificationMenu />
          <UserAccountMenu
            displayName={identityDisplayName}
            email={user?.email}
            roleLabel={resolvedRoleLabel}
            workspaceName={identityContextLabel}
            onLogout={() => void signOut()}
          />
          {canSwitchTenant && (
            <label className="tenant-switcher" aria-label="Switch active tenant">
              <span>Workspace</span>
              <select value={activeTenant?.id ?? ''} onChange={(event) => selectActiveTenant(event.target.value)}>
                {tenantMemberships.map((membership) => (
                  <option value={membership.tenant_id} key={membership.id}>
                    {membership.tenant?.practice_name ?? 'Tenant unavailable'} · {getResolvedRoleLabel(membership.role)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="role-switcher" aria-label="Switch role view">
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {roles.map((roleOption) => (
                <option value={roleOption.role} key={roleOption.role}>{roleOption.role}</option>
              ))}
            </select>
          </label>
          {role !== 'Super Admin' && (
            <button type="button" onClick={() => openNewSession()}>
              New Booking
            </button>
          )}
        </div>
      )}
    />
  )

  const modals = isNewSessionOpen ? (
        <NewSessionModal
          patients={patientRecords}
          calendarSessions={calendarSessionRecords}
          practiceEntities={practiceEntityRecords}
          practiceLocations={practiceLocationRecords}
          procedurePriceLists={procedurePriceLists}
          procedurePriceRecords={procedurePriceRecords}
          initialDate={newSessionSlot?.date}
          initialTime={newSessionSlot?.time}
          initialPatientName={newSessionSlot?.patientName}
          onCreate={(session, newPatient) => {
            const sessionSummary = `${session.date} · ${session.startTime}-${session.endTime}`
            const sessionHistoryEvent = {
              title: `Booking created · ${session.date} ${session.startTime}`,
              visibility: 'Available on patient link',
              detail: `${session.type} booked with ${session.therapist}.`,
            }
            setPatientRecords((records) => {
              if (newPatient) {
                const syncedNewPatient = {
                  ...newPatient,
                  therapist: session.therapist,
                  nextSession: sessionSummary,
                  historyEvents: [sessionHistoryEvent, ...newPatient.historyEvents],
                }
                return records.some((patient) => patient.patientNumber === newPatient.patientNumber)
                  ? records.map((patient) => (patient.patientNumber === newPatient.patientNumber ? syncedNewPatient : patient))
                  : [...records, syncedNewPatient]
              }
              return records.map((patient) =>
                patient.name === session.patient
                  ? {
                      ...patient,
                      therapist: session.therapist,
                      nextSession: sessionSummary,
                      historyEvents: [sessionHistoryEvent, ...patient.historyEvents],
                    }
                  : patient,
              )
            })
            setSelectedPatientName(newPatient?.name ?? session.patient)
            setCalendarSessionRecords((records) => [...records, session])
            setInvoiceRecords((records) => [...records, createInvoiceFromSession(session, records.length + 80)])
            setSelectedCalendarSessionId(session.id)
            setView('sessions')
            setIsNewSessionOpen(false)
          }}
          onIntakeMessageCopied={(patientName) => setTopNotice(`New patient message copied for ${patientName}.`)}
          onClose={() => setIsNewSessionOpen(false)}
        />
  ) : null

  return (
    <AppShell topNotice={topNotice} sidebar={sidebar} topbar={topbar} modals={modals}>
      <MainContent>
        {role === 'Super Admin' && <SuperAdminWorkspace activeModule={activeSuperAdminModule} />}
        {role !== 'Super Admin' && <AppRoutes />}
      </MainContent>
    </AppShell>
  )
}

function NewSessionModal({
  patients,
  calendarSessions,
  practiceEntities: practiceEntityOptions,
  practiceLocations: practiceLocationOptions,
  procedurePriceLists,
  procedurePriceRecords,
  initialDate = getLocalTodayIso(),
  initialTime = '09:00',
  initialPatientName,
  onCreate,
  onIntakeMessageCopied,
  onClose,
}: {
  patients: Patient[]
  calendarSessions: CalendarSession[]
  practiceEntities: typeof practiceEntities
  practiceLocations: typeof practiceLocations
  procedurePriceLists: typeof billingPriceListDefaults
  procedurePriceRecords: typeof billingCodeDefaults
  initialDate?: string
  initialTime?: string
  initialPatientName?: string
  onCreate: (session: CalendarSession, patient?: Patient) => void
  onIntakeMessageCopied: (patientName: string) => void
  onClose: () => void
}) {
  const currentDayIso = useLocalTodayIso()
  const quickWeekDays = useMemo(() => buildWeekDays(currentDayIso), [currentDayIso])
  const initialPatient = patients.find((patient) => patient.name === initialPatientName) ?? patients[0]
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing')
  const [selectedPatientNumber, setSelectedPatientNumber] = useState(initialPatient?.patientNumber ?? '')
  const [patientSearch, setPatientSearch] = useState('')
  const [newPatientName, setNewPatientName] = useState('')
  const [newPatientType, setNewPatientType] = useState('Child')
  const [newPatientPhone, setNewPatientPhone] = useState('')
  const [newPatientEmail, setNewPatientEmail] = useState('')
  const [newPatientGuardian, setNewPatientGuardian] = useState('')
  const [selectedPracticeEntityId, setSelectedPracticeEntityId] = useState(practiceEntityOptions[0]?.id ?? '')
  const [selectedPracticeLocationId, setSelectedPracticeLocationId] = useState(practiceLocationOptions[0]?.id ?? '')
  const [selectedProcedurePriceListId, setSelectedProcedurePriceListId] = useState(practiceEntityOptions[0]?.priceListId ?? procedurePriceLists[0]?.id ?? '')
  const [selectedBillingCodeId, setSelectedBillingCodeId] = useState(procedurePriceRecords[0]?.id ?? '')
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<string[]>(procedurePriceRecords[0] ? [procedurePriceRecords[0].id] : [])
  const [selectedIcdCode, setSelectedIcdCode] = useState(icdCodeDefaults[0]?.code ?? '')
  const [isAssessmentSession, setIsAssessmentSession] = useState(false)
  const [assessmentDurationMinutes, setAssessmentDurationMinutes] = useState(60)
  const [practiceNumberSource, setPracticeNumberSource] = useState<'practice' | 'therapist'>('practice')
  const [bankingDetailsSource, setBankingDetailsSource] = useState<'practice' | 'therapist'>('practice')
  const [sessionDate, setSessionDate] = useState(initialDate)
  const [sessionTime, setSessionTime] = useState(initialTime)
  const [sessionTherapist, setSessionTherapist] = useState('Nadia Botha')
  const [sessionRoom, setSessionRoom] = useState('Room 1')
  const [isScheduleCalendarOpen, setIsScheduleCalendarOpen] = useState(false)
  const [pendingNewPatientSession, setPendingNewPatientSession] = useState<{ session: CalendarSession; patient: Patient } | null>(null)
  const [intakeMessageCopied, setIntakeMessageCopied] = useState(false)

  const selectedPatient = patients.find((patient) => patient.patientNumber === selectedPatientNumber)
  const patientSearchNeedle = patientSearch.toLowerCase().trim()
  const patientSearchResults = patients.filter((patient) =>
    [patient.name, patient.patientNumber, patient.guardian, patient.phone].some((item) =>
      item.toLowerCase().includes(patientSearchNeedle),
    ),
  )
  const selectedPracticeEntity = practiceEntityOptions.find((practice) => practice.id === selectedPracticeEntityId) ?? practiceEntityOptions[0]
  const selectedProcedurePriceList = procedurePriceLists.find((priceList) => priceList.id === selectedProcedurePriceListId) ?? procedurePriceLists[0]
  const availablePracticeLocations = practiceLocationOptions.filter((location) => location.practiceEntityId === selectedPracticeEntityId && location.isActive)
  const selectedPracticeLocation = availablePracticeLocations.find((location) => location.id === selectedPracticeLocationId) ?? availablePracticeLocations[0]
  const availableBillingCodes = procedurePriceRecords.filter((item) =>
    item.isActive && item.priceListId === selectedProcedurePriceList.id && (!item.practiceEntityId || item.practiceEntityId === selectedPracticeEntityId),
  )
  const selectedProcedureItems = availableBillingCodes.filter((item) => selectedProcedureIds.includes(item.id))
  const selectedBillingCode = selectedProcedureItems[0] ?? availableBillingCodes.find((item) => item.id === selectedBillingCodeId) ?? availableBillingCodes[0]
  const billingTotal = selectedProcedureItems.reduce((total, item) => total + item.defaultPrice, 0)
  const procedureDurationMinutes = selectedProcedureItems.reduce((total, item) => total + (item.durationMinutes ?? 0), 0)
  const sessionDurationMinutes = isAssessmentSession ? assessmentDurationMinutes : procedureDurationMinutes || selectedBillingCode?.durationMinutes || 60
  const selectedTherapistFinance = therapistFinanceProfiles.find((profile) => profile.therapistName === sessionTherapist)
  const canUseTherapistBanking = selectedPracticeEntity.allowTherapistBankingOverride && Boolean(selectedTherapistFinance?.bankingDetails.accountNumber)
  const canUseTherapistPracticeNumber = selectedTherapistFinance?.usesOwnPracticeNumber && Boolean(selectedTherapistFinance.practiceNumber)
  const requiresGuardian = ['Child', 'Teen'].includes(newPatientType)
  const scheduleTimes = calendarQuarterSlots
  const createdSessionType = selectedProcedureItems.map((item) => item.description || item.serviceType || item.code).filter(Boolean).join(', ') || selectedBillingCode?.serviceType || 'Therapy session'

  useEffect(() => {
    const firstLocation = practiceLocationOptions.find((location) => location.practiceEntityId === selectedPracticeEntityId && location.isActive)
    if (firstLocation && !availablePracticeLocations.some((location) => location.id === selectedPracticeLocationId)) {
      setSelectedPracticeLocationId(firstLocation.id)
    }
    if (selectedPracticeEntity?.priceListId && selectedProcedurePriceListId !== selectedPracticeEntity.priceListId) {
      setSelectedProcedurePriceListId(selectedPracticeEntity.priceListId)
    }
  }, [availablePracticeLocations, selectedPracticeEntityId, selectedPracticeLocationId])

  useEffect(() => {
    const availableIds = availableBillingCodes.map((item) => item.id)
    const retainedProcedureIds = selectedProcedureIds.filter((id) => availableIds.includes(id))
    if (retainedProcedureIds.length !== selectedProcedureIds.length) {
      setSelectedProcedureIds(retainedProcedureIds.length ? retainedProcedureIds : availableBillingCodes[0] ? [availableBillingCodes[0].id] : [])
    }
    if (!availableBillingCodes.some((item) => item.id === selectedBillingCodeId) && availableBillingCodes[0]) {
      setSelectedBillingCodeId(availableBillingCodes[0].id)
    }
  }, [availableBillingCodes, selectedBillingCodeId, selectedProcedureIds])

  useEffect(() => {
    if (!canUseTherapistBanking) setBankingDetailsSource('practice')
    setPracticeNumberSource(canUseTherapistPracticeNumber ? 'therapist' : 'practice')
  }, [canUseTherapistBanking, canUseTherapistPracticeNumber])

  const isBookedSlot = (date: string, time: string) =>
    calendarSessions.some((session) => session.date === date && session.startTime === time)

  const scheduleSlotRow = (time: string) => timeToCalendarRow(time)
  const nextPatientNumber = `PT-${String(
    Math.max(...patients.map((patient) => Number(patient.patientNumber.replace('PT-', '')) || 0)) + 1,
  ).padStart(4, '0')}`
  const createdPatientName = newPatientName.trim() || 'New patient'
  const createdPatient: Patient | undefined = patientMode === 'new'
    ? {
        tenantId: tenant.tenantId,
        patientNumber: nextPatientNumber,
        dependantCode: '',
        name: createdPatientName,
        phone: newPatientPhone,
        guardian: newPatientGuardian,
        title: '',
        idNumber: '',
        residentialAddress: '',
        guardianEmail: newPatientEmail,
        guardianOccupation: '',
        guardianEmployer: '',
        guardianPostalAddress: '',
        homeTel: '',
        workTel: '',
        practiceNo: tenant.tenantId,
        medicalAidPlan: '',
        accountResponsibility: '',
        accountResponsibleName: '',
        accountResponsibleId: '',
        dateSigned: 'Pending',
        dateOfBirth: '',
        emergencyContact: '',
        type: newPatientType,
        medicalAid: '',
        referralSource: '',
        diagnosis: '',
        consentStatus: 'Pending',
        alert: 'Patient link incomplete',
        balance: 0,
        therapist: sessionTherapist,
        lastSession: 'No completed sessions',
        nextSession: `${sessionDate} · ${sessionTime}`,
        reportStatus: 'No reports yet',
        notes: [] as PatientNote[],
        historyEvents: [
          {
            title: `Patient profile created · ${sessionDate}`,
            visibility: 'Available on patient link',
            detail: 'Partial patient profile created from new session intake.',
          },
        ],
      }
    : undefined
  const buildSessionPayload = (): CalendarSession => ({
    id: `session-${Date.now()}`,
    date: sessionDate,
    startTime: sessionTime,
    endTime: minutesToTime(timeToMinutes(sessionTime) + sessionDurationMinutes),
    patient: patientMode === 'existing' ? selectedPatient?.name ?? 'Selected patient' : createdPatientName,
    type: createdSessionType,
    therapist: sessionTherapist,
    room: selectedPracticeLocation?.name ?? sessionRoom,
    practiceEntityId: selectedPracticeEntity.id,
    practiceLocationId: selectedPracticeLocation?.id,
    procedurePriceListId: selectedProcedurePriceList.id,
    billingCodeId: selectedBillingCode?.id,
    billingProcedureIds: selectedProcedureItems.map((item) => item.id),
    icd10Code: selectedIcdCode,
    durationMinutes: sessionDurationMinutes,
    isAssessment: isAssessmentSession,
    quotedAmount: billingTotal,
    invoiceAmount: billingTotal,
    selectedPracticeNumberSource: canUseTherapistPracticeNumber ? practiceNumberSource : 'practice',
    selectedBankingDetailsSource: canUseTherapistBanking ? bankingDetailsSource : 'practice',
  })
  const patientProfileUrl = `${window.location.origin}/patient-link/${tenant.tenantId}/${nextPatientNumber.toLowerCase()}`
  const intakeShareMessage = pendingNewPatientSession
    ? `Hi ${pendingNewPatientSession.patient.guardian || pendingNewPatientSession.patient.name},

We are excited that you have booked with ${pendingNewPatientSession.session.therapist} at ${tenant.name}.

We have all your details available on this custom Patient Profile Link. Before you arrive, we would appreciate it if you can complete your patient intake form so your profile is completed and our session can be focused on you.

Open Patient Profile Link:
${patientProfileUrl}`
    : ''
  const finishNewPatientCreate = async (shouldShareNow: boolean) => {
    if (!pendingNewPatientSession) return
    if (shouldShareNow) {
      try {
        await navigator.clipboard.writeText(intakeShareMessage)
      } catch {
        // Clipboard can be unavailable in preview contexts; the message remains visible.
      }
      setIntakeMessageCopied(true)
      onIntakeMessageCopied(pendingNewPatientSession.patient.name)
    }
    onCreate(pendingNewPatientSession.session, pendingNewPatientSession.patient)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal-window new-session-modal"
        aria-label="New booking"
        onSubmit={(event) => {
          event.preventDefault()
          const sessionPayload = buildSessionPayload()
          if (createdPatient) {
            setPendingNewPatientSession({ session: sessionPayload, patient: createdPatient })
            setIntakeMessageCopied(false)
            return
          }
          onCreate(sessionPayload)
        }}
      >
        <div className="modal-header">
          <div>
            <p>Booking Form</p>
            <h2>New Booking</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close new booking">
            x
          </button>
        </div>

        <div className="modal-body">
          <section className="form-section">
            <div className="section-title">
              <span>1</span>
              <div>
                <strong>Identify patient</strong>
                <small>Choose an existing patient or start a new Patient Profile.</small>
              </div>
            </div>

            <div className="segmented-control" aria-label="Patient type">
              <button
                type="button"
                className={patientMode === 'existing' ? 'active' : ''}
                onClick={() => setPatientMode('existing')}
              >
                Existing patient
              </button>
              <button
                type="button"
                className={patientMode === 'new' ? 'active' : ''}
                onClick={() => setPatientMode('new')}
              >
                New patient
              </button>
            </div>

            {patientMode === 'existing' ? (
              <div className="form-grid two-col patient-identify-grid">
                <div className="field searchable-patient-field">
                  <span>Patient</span>
                  <div className="patient-search-input-wrap">
                    <input
                      value={patientSearch}
                      onChange={(event) => setPatientSearch(event.target.value)}
                      placeholder="Search name, patient number, guardian or cell"
                    />
                    {patientSearch && (
                      <button
                        type="button"
                        aria-label="Clear patient search"
                        title="Clear patient search"
                        onClick={() => setPatientSearch('')}
                      >
                        x
                      </button>
                    )}
                  </div>
                  <small>Search or select from the patient list.</small>
                  <div className="patient-search-results" role="listbox" aria-label="Existing patients">
                    {patientSearchResults.map((patient) => (
                      <button
                        type="button"
                        className={selectedPatientNumber === patient.patientNumber ? 'active' : ''}
                        key={patient.patientNumber}
                        onClick={() => {
                          setSelectedPatientNumber(patient.patientNumber)
                          setPatientSearch(patient.name)
                        }}
                      >
                        <strong>{patient.name}</strong>
                        <span>{patient.patientNumber} · {patient.guardian}</span>
                        <small>{patient.phone}</small>
                      </button>
                    ))}
                    {patientSearchResults.length === 0 && <small>No matching patients</small>}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="form-grid two-col new-patient-grid">
                  <label className="field">
                    <span>Patient Name</span>
                    <input
                      value={newPatientName}
                      onChange={(event) => setNewPatientName(event.target.value)}
                      placeholder="First name and surname"
                    />
                  </label>
                  <label className="field">
                    <span>Patient Type</span>
                    <select value={newPatientType} onChange={(event) => setNewPatientType(event.target.value)}>
                      <option>Child</option>
                      <option>Teen</option>
                      <option>Adult</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Parent / guardian</span>
                    <input
                      value={newPatientGuardian}
                      onChange={(event) => setNewPatientGuardian(event.target.value)}
                      placeholder="Name and surname"
                    />
                  </label>
                  <label className="field">
                    <span>Parent / guardian cell</span>
                    <input
                      value={newPatientPhone}
                      onChange={(event) => setNewPatientPhone(event.target.value)}
                      placeholder="Parent or guardian cell"
                    />
                  </label>
                  <label className="field">
                    <span>Parent / guardian email</span>
                    <input
                      type="email"
                      value={newPatientEmail}
                      onChange={(event) => setNewPatientEmail(event.target.value)}
                      placeholder="patient@example.com"
                    />
                  </label>
                </div>
              </>
            )}
          </section>

          <section className="form-section">
            <div className="section-title with-action">
              <div className="section-title-copy">
                <span>2</span>
                <div>
                  <strong>Schedule session</strong>
                  <small>Set the appointment time and responsible therapist.</small>
                </div>
              </div>
              <button
                type="button"
                className="text-action-button"
                onClick={() => setIsScheduleCalendarOpen((current) => !current)}
              >
                See calendar
              </button>
            </div>
            <div className="form-grid four-col schedule-session-grid">
              <label className="field">
                <span>Date</span>
                <input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
              </label>
              <label className="field">
                <span>Time</span>
                <input type="time" value={sessionTime} onChange={(event) => setSessionTime(event.target.value)} />
              </label>
              <div className="field duration-field">
                <span>Duration</span>
                <div className="duration-summary-control">
                  <strong>{sessionDurationMinutes} min</strong>
                  <small>{isAssessmentSession ? 'Assessment duration' : 'From selected procedures'}</small>
                </div>
              </div>
              <label className="field">
                <span>Therapist</span>
                <select value={sessionTherapist} onChange={(event) => setSessionTherapist(event.target.value)}>
                  {therapists.filter((therapist) => therapist.name !== 'Team').map((therapist) => (
                    <option key={therapist.name}>{therapist.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Practice</span>
                <select value={selectedPracticeEntityId} onChange={(event) => setSelectedPracticeEntityId(event.target.value)}>
                  {practiceEntityOptions.filter((practice) => practice.isActive).map((practice) => (
                    <option value={practice.id} key={practice.id}>{practice.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Location</span>
                <select value={selectedPracticeLocation?.id ?? ''} onChange={(event) => setSelectedPracticeLocationId(event.target.value)}>
                  {availablePracticeLocations.map((location) => (
                    <option value={location.id} key={location.id}>{location.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Room / mode</span>
                <select value={sessionRoom} onChange={(event) => setSessionRoom(event.target.value)}>
                  <option>Room 1</option>
                  <option>Room 2</option>
                  <option>Gym</option>
                  <option>Telehealth</option>
                </select>
              </label>
              <label className="practice-number-toggle schedule-banking-toggle">
                <input
                  type="checkbox"
                  checked={isAssessmentSession}
                  onChange={(event) => setIsAssessmentSession(event.target.checked)}
                />
                <span>Assessment</span>
              </label>
              {isAssessmentSession && (
                <label className="field">
                  <span>Assessment duration</span>
                  <select value={assessmentDurationMinutes} onChange={(event) => setAssessmentDurationMinutes(Number(event.target.value))}>
                    {Array.from({ length: 12 }, (_, index) => (index + 1) * 15).map((minutes) => (
                      <option value={minutes} key={minutes}>{minutes} min</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {isScheduleCalendarOpen && (
              <div className="quick-schedule-calendar" aria-label="Quick week calendar">
                <div className="quick-calendar-corner" />
                {quickWeekDays.map((day) => (
                  <div className={`quick-calendar-day-head ${day.iso === currentDayIso ? 'today' : ''}`} key={day.iso}>
                    <span>{day.label}</span>
                    <strong>{day.date}</strong>
                  </div>
                ))}
                {calendarHours.map((time) => (
                  <span className="quick-calendar-time" style={{ gridRow: timeToCalendarRow(time) }} key={time}>
                    {time}
                  </span>
                ))}
                {quickWeekDays.map((day, dayIndex) =>
                  scheduleTimes.map((time) => {
                    const isBooked = isBookedSlot(day.iso, time)
                    const isSelected = sessionDate === day.iso && sessionTime === time
                    return (
                      <button
                        type="button"
                        className={`quick-slot ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                        disabled={isBooked}
                        style={{ gridColumn: dayIndex + 2, gridRow: scheduleSlotRow(time) }}
                        key={`${day.iso}-${time}`}
                        onClick={() => {
                          setSessionDate(day.iso)
                          setSessionTime(time)
                        }}
                      />
                    )
                  }),
                )}
                {calendarSessions
                  .map((session) => ({ ...session, day: quickWeekDays.findIndex((day) => day.iso === session.date) }))
                  .filter((session) => session.day >= 0)
                  .map((session) => (
                    <div
                      className="quick-calendar-session"
                      style={{
                        gridColumn: session.day + 2,
                        gridRow: `${timeToCalendarRow(session.startTime)} / span ${sessionRowSpan(session.startTime, session.endTime)}`,
                        ...therapistCalendarStyle(session.therapist),
                      }}
                      key={`quick-${session.id}`}
                    >
                      <strong>{session.patient}</strong>
                      <span>{session.startTime}-{session.endTime}</span>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section className="form-section">
            <div className="section-title">
              <span>3</span>
              <div>
                <strong>Billing</strong>
                <small>Procedure and prices is auto-selected from the chosen practice setup. Choose one ICD-10 code and add invoice line items.</small>
              </div>
            </div>
            <div className="form-grid two-col billing-source-grid">
              {procedurePriceLists.length > 1 ? (
                <label className="field">
                  <span>Procedure and prices</span>
                  <select value={selectedProcedurePriceList.id} onChange={(event) => setSelectedProcedurePriceListId(event.target.value)}>
                    {procedurePriceLists.filter((priceList) => priceList.isActive).map((priceList) => (
                      <option value={priceList.id} key={priceList.id}>{priceList.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="field readonly-field">
                  <span>Procedure and prices</span>
                  <strong>{selectedProcedurePriceList.name}</strong>
                  <small>Auto-selected from practice setup</small>
                </div>
              )}
              <label className="field">
                <span>ICD-10 code</span>
                <select value={selectedIcdCode} onChange={(event) => setSelectedIcdCode(event.target.value)}>
                  {icdCodeDefaults.map((item) => (
                    <option value={item.code} key={item.id}>{item.code}</option>
                  ))}
                </select>
              </label>
              <label className="practice-number-toggle schedule-banking-toggle">
                <input
                  type="checkbox"
                  checked={bankingDetailsSource === 'therapist'}
                  disabled={!canUseTherapistBanking}
                  onChange={(event) => setBankingDetailsSource(event.target.checked ? 'therapist' : 'practice')}
                />
                <span>Use my banking details</span>
              </label>
            </div>
            <div className="billing-choice-table">
              <div className="billing-choice-head">
                <span />
                <span>Procedure</span>
                <span>Description</span>
                <span>Price · duration</span>
              </div>
              {availableBillingCodes.map((item) => (
                <label className="billing-choice" key={item.id}>
                  <input
                    type="checkbox"
                    checked={selectedProcedureIds.includes(item.id)}
                    onChange={() => {
                      setSelectedProcedureIds((ids) => (ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]))
                      setSelectedBillingCodeId(item.id)
                    }}
                  />
                  <code>{item.code}</code>
                  <span className="billing-session-type">
                    <strong>{item.description || item.serviceType || 'Procedure'}</strong>
                    <small>{selectedProcedurePriceList.name}</small>
                  </span>
                  <b>{formatMoney(item.defaultPrice)} · {item.durationMinutes ? `${item.durationMinutes} min` : 'N/A'}</b>
                </label>
              ))}
            </div>
            <div className="form-grid two-col billing-source-grid">
              <div className="field readonly-field">
                <span>Practice number</span>
                <strong>{canUseTherapistPracticeNumber ? selectedTherapistFinance?.practiceNumber : selectedPracticeEntity.practiceNumber}</strong>
                <small>{canUseTherapistPracticeNumber ? 'Therapist own practice number' : 'Main practice number'}</small>
              </div>
              <div className="field readonly-field">
                <span>Banking details</span>
                <strong>{bankingDetailsSource === 'therapist' ? 'My banking details' : 'Practice banking'}</strong>
                <small>{canUseTherapistBanking ? 'Configured in billing' : 'Therapist banking not available'}</small>
              </div>
              <div className="billing-total">
                <span>Estimated session total</span>
                <strong>{formatMoney(billingTotal)}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Create booking</button>
        </div>
        {pendingNewPatientSession && (
          <div className="modal-backdrop nested" role="presentation">
            <section className="modal-window intake-share-modal" aria-label="New patient intake">
              <div className="modal-header">
                <div>
                  <p>New patient</p>
                  <h2>{pendingNewPatientSession.patient.name}</h2>
                </div>
                <button type="button" className="modal-close" onClick={() => setPendingNewPatientSession(null)} aria-label="Close intake share">
                  x
                </button>
              </div>
              <div className="modal-body intake-share-body">
                <section className="intake-first-details">
                  <strong>First personal details</strong>
                  <dl>
                    <div>
                      <dt>Patient</dt>
                      <dd>{pendingNewPatientSession.patient.name}</dd>
                    </div>
                    <div>
                      <dt>{shouldShowGuardianInList(pendingNewPatientSession.patient.type) ? 'Parent / Guardian' : 'Contact'}</dt>
                      <dd>{pendingNewPatientSession.patient.guardian}</dd>
                    </div>
                    <div>
                      <dt>Cell</dt>
                      <dd>{pendingNewPatientSession.patient.phone}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{pendingNewPatientSession.patient.guardianEmail}</dd>
                    </div>
                  </dl>
                </section>
                <section className="intake-share-question">
                  <h3>Do you want to share and collect their intake details now?</h3>
                  <p>The customer will first complete the intake form. After that, their Patient Profile Link opens with sessions, feedback, finance and history.</p>
                  <div className="patient-link-box">
                    <span>Message to share</span>
                    <div className="share-message-preview">
                      <p>Hi {pendingNewPatientSession.patient.guardian || pendingNewPatientSession.patient.name},</p>
                      <p>We are excited that you have booked with {pendingNewPatientSession.session.therapist} at {tenant.name}.</p>
                      <p>We have all your details available on this custom Patient Profile Link. Before you arrive, we would appreciate it if you can complete your patient intake form so your profile is completed and our session can be focused on you.</p>
                      <span>Open Patient Profile Link:</span>
                      <a href={patientProfileUrl} target="_blank" rel="noreferrer">{patientProfileUrl}</a>
                    </div>
                    {intakeMessageCopied && <small>Message copied. Paste it into WhatsApp or email.</small>}
                  </div>
                </section>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={() => finishNewPatientCreate(false)}>Later</button>
                <button type="button" onClick={() => finishNewPatientCreate(true)}>Yes, copy message</button>
              </div>
            </section>
          </div>
        )}
      </form>
    </div>
  )
}

function pageTitle(view: View) {
  return {
    overview: 'Practice overview',
    sessions: 'Booking Calendar',
    patients: 'Patients',
    finances: 'Finances',
    settings: 'Settings',
  }[view]
}

function superAdminPageTitle(module: SuperAdminModule) {
  return {
    dashboard: 'Platform overview',
    tenants: 'Tenant Management',
    subscriptions: 'Subscription Management',
    support: 'Support Centre',
    health: 'System Health',
    configuration: 'Platform Configuration',
  }[module]
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function Overview({
  role,
  calendarSessions,
  pendingInvoiceSessions,
  invoiceRecords,
  onOpenFinances,
  onUpdateSession,
  onOpenPatientProfile,
  onMarkNoShow,
  onCancelSession,
  onSavePatientNote,
  onConfirmInvoice,
  onMarkPaymentReceived,
}: {
  role: string
  calendarSessions: CalendarSession[]
  pendingInvoiceSessions: SessionInvoiceDetail[]
  invoiceRecords: Invoice[]
  onOpenFinances: () => void
  onUpdateSession: (session: CalendarSession) => void
  onOpenPatientProfile: (patientName: string) => void
  onMarkNoShow: (session: CalendarSession) => void
  onCancelSession: (session: CalendarSession, shouldReschedule: boolean) => void
  onSavePatientNote: (patientName: string, note: PatientNote) => void
  onConfirmInvoice: (invoiceId: string) => void
  onMarkPaymentReceived: (invoiceId: string, proofFile?: string, paymentAmount?: number, proofFileName?: string) => void
}) {
  const currentDayIso = useLocalTodayIso()
  const [selectedDayIso, setSelectedDayIso] = useState(getLocalTodayIso)
  const [selectedOverviewSessionId, setSelectedOverviewSessionId] = useState('')
  const [isOverviewSessionOpen, setIsOverviewSessionOpen] = useState(false)
  const [isOverviewSessionEditMode, setIsOverviewSessionEditMode] = useState(false)
  const selectedDate = parseIsoDate(selectedDayIso)
  const selectedDayLabel = selectedDayIso === currentDayIso
    ? 'Today'
    : `${dayLabels[selectedDate.getUTCDay()]} ${selectedDate.getUTCDate()} ${monthLabels[selectedDate.getUTCMonth()]}`
  const overviewDaySessions = calendarSessions
    .filter((session) => session.date === selectedDayIso)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const selectedOverviewSession = calendarSessions.find((session) => session.id === selectedOverviewSessionId)
  const overviewPatientTodos = patients
    .map((patient) => {
      const patientInvoices = invoiceRecords.filter((invoice) => invoice.patientId === patient.patientNumber || invoice.patientName === patient.name)
      const patientSessions = calendarSessions.filter((session) => session.patient === patient.name)
      const todos = getPatientTodoLabels(patient, patientInvoices, patientSessions)
      return { patient, todos }
    })
    .filter((item) => item.todos.length)

  return (
    <div className="page-grid overview-grid">
      <section className="panel overview-command-panel">
        <div className="panel-heading">
          <div>
            <p>{selectedDayLabel}</p>
            <h2>Sessions command centre</h2>
          </div>
          <div className="calendar-nav-pill overview-day-controls" aria-label="Day navigation">
            <button type="button" onClick={() => setSelectedDayIso(toIsoDate(addDays(parseIsoDate(selectedDayIso), -1)))} aria-label="Previous day">
              &lt;
            </button>
            <span>{selectedDayIso === currentDayIso ? 'Today' : selectedDayLabel}</span>
            <button type="button" onClick={() => setSelectedDayIso(toIsoDate(addDays(parseIsoDate(selectedDayIso), 1)))} aria-label="Next day">
              &gt;
            </button>
          </div>
        </div>
        <div className="overview-day-calendar" aria-label={`${selectedDayLabel} sessions`}>
          <div className="overview-day-corner" />
          <div className="overview-day-head">
            <span>{selectedDayLabel}</span>
          </div>
          {calendarHours.map((time, index) => (
            <div className="overview-calendar-time" style={{ gridRow: index * 4 + 2 }} key={time}>
              {time}
            </div>
          ))}
          {calendarSlots.map((slot) => (
            <div className="overview-calendar-slot" style={{ gridRow: slot.row }} key={slot.time} />
          ))}
          {overviewDaySessions.map((session) => (
            <button
              type="button"
              className="overview-calendar-session"
              style={{
                gridRow: `${timeToCalendarRow(session.startTime)} / span ${sessionRowSpan(session.startTime, session.endTime)}`,
                ...therapistCalendarStyle(session.therapist),
              }}
              key={session.id}
              onClick={() => {
                setSelectedOverviewSessionId(session.id)
                setIsOverviewSessionEditMode(false)
                setIsOverviewSessionOpen(true)
              }}
            >
              <strong>{session.patient}</strong>
              <span>{session.startTime}-{session.endTime}</span>
              <small>{session.type} · {session.therapist} · {session.room}</small>
            </button>
          ))}
          {!overviewDaySessions.length && (
            <div className="overview-calendar-empty">
              No sessions booked for this day.
            </div>
          )}
        </div>
      </section>

      <section className="panel overview-task-panel">
        <div className="panel-heading">
          <div>
            <p>Outstanding task</p>
            <h2>Confirm invoices</h2>
          </div>
          <strong>{pendingInvoiceSessions.length}</strong>
        </div>
        <div className="overview-task-list">
          {pendingInvoiceSessions.length ? (
            pendingInvoiceSessions.slice(0, 4).map((session) => (
              <article key={session.id}>
                <div>
                  <strong>{session.patient}</strong>
                  <span>{session.date} · {session.startTime}-{session.endTime}</span>
                </div>
                <b>{formatMoney(session.price)}</b>
              </article>
            ))
          ) : (
            <p className="quiet">No invoices waiting for confirmation.</p>
          )}
        </div>
        {pendingInvoiceSessions.length > 0 && (
          <button type="button" className="overview-task-action" onClick={onOpenFinances}>
            Review in Finance
          </button>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>Patient To Do's</p>
            <h2>Needs attention</h2>
          </div>
        </div>
        <div className="overview-todo-list">
          {overviewPatientTodos.map(({ patient, todos }) => (
            <button type="button" key={patient.name} onClick={() => onOpenPatientProfile(patient.name)}>
              <span>
                <strong>{patient.name}</strong>
                <small>{patient.therapist}</small>
              </span>
              <em>
                {todos.map((todo) => (
                  <b key={`${patient.name}-${todo}`}>{todo}</b>
                ))}
              </em>
            </button>
          ))}
        </div>
      </section>

      {isOverviewSessionOpen && selectedOverviewSession && (
        <SessionDetailModal
          session={selectedOverviewSession}
          isEditing={isOverviewSessionEditMode}
          setIsEditing={setIsOverviewSessionEditMode}
          onChange={onUpdateSession}
          onOpenPatientProfile={onOpenPatientProfile}
          onMarkNoShow={(session) => {
            onMarkNoShow(session)
            setIsOverviewSessionOpen(false)
          }}
          onCancelSession={(session, shouldReschedule) => {
            onCancelSession(session, shouldReschedule)
            setIsOverviewSessionOpen(false)
          }}
          onSavePatientNote={onSavePatientNote}
          invoiceRecords={invoiceRecords}
          onConfirmInvoice={onConfirmInvoice}
          onMarkPaymentReceived={onMarkPaymentReceived}
          onClose={() => setIsOverviewSessionOpen(false)}
        />
      )}
    </div>
  )
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getLocalTodayIso() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function useLocalTodayIso() {
  const [todayIso, setTodayIso] = useState(getLocalTodayIso)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTodayIso(getLocalTodayIso())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  return todayIso
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1))
}

function getFirstTenantBillingDate(createdAtIso: string) {
  const createdAt = parseIsoDate(createdAtIso)
  const monthOffset = createdAt.getUTCDate() <= 15 ? 1 : 2
  return toIsoDate(new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth() + monthOffset, 2)))
}

function getWeekMonday(date: Date) {
  const day = date.getUTCDay()
  return addDays(date, day === 0 ? -6 : 1 - day)
}

function buildWeekDays(iso: string) {
  const monday = getWeekMonday(parseIsoDate(iso))
  return Array.from({ length: 6 }, (_, index) => {
    const date = addDays(monday, index)
    return {
      label: dayLabels[date.getUTCDay()],
      date: String(date.getUTCDate()),
      iso: toIsoDate(date),
    }
  })
}

function buildMonthDays(iso: string) {
  const selected = parseIsoDate(iso)
  const firstOfMonth = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1))
  const start = getWeekMonday(firstOfMonth)
  const days = []
  let cursor = start

  while (days.length < 36) {
    if (cursor.getUTCDay() !== 0) {
      days.push({
        label: dayLabels[cursor.getUTCDay()],
        date: String(cursor.getUTCDate()),
        iso: toIsoDate(cursor),
        inMonth: cursor.getUTCMonth() === selected.getUTCMonth(),
      })
    }
    cursor = addDays(cursor, 1)
  }

  return days
}

function getMonthLabel(iso: string) {
  const date = parseIsoDate(iso)
  return `${monthLabels[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

function getWeekRangeLabel(days: Array<{ date: string; iso: string }>) {
  const start = parseIsoDate(days[0].iso)
  const end = parseIsoDate(days[days.length - 1].iso)
  return `${days[0].date} ${monthLabels[start.getUTCMonth()]} - ${days[days.length - 1].date} ${monthLabels[end.getUTCMonth()]}`
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function buildTimeSlots(start: string, end: string, intervalMinutes: number) {
  const slots = []
  for (let minutes = timeToMinutes(start); minutes <= timeToMinutes(end); minutes += intervalMinutes) {
    slots.push(minutesToTime(minutes))
  }
  return slots
}

function timeToCalendarRow(time: string) {
  return Math.floor((timeToMinutes(time) - timeToMinutes('08:00')) / 15) + 2
}

function sessionRowSpan(startTime: string, endTime: string) {
  return Math.max(1, Math.ceil((timeToMinutes(endTime) - timeToMinutes(startTime)) / 15))
}

const sessionCountByDate = {
  '2026-06-29': 1,
  '2026-06-30': 1,
  '2026-07-01': 1,
  '2026-07-02': 1,
  '2026-07-03': 4,
  '2026-07-04': 1,
} as Record<string, number>

const calendarHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
const calendarQuarterSlots = buildTimeSlots('08:00', '16:00', 15)
const calendarSlots = calendarQuarterSlots.map((time) => ({ time, row: timeToCalendarRow(time) }))
const weekSessions = [
  { id: 'cal-1', date: '2026-06-30', startTime: '08:30', endTime: '09:30', patient: 'Liam Jacobs', type: 'OT', therapist: 'Nadia Botha', room: 'Room 2' },
  { id: 'cal-2', date: '2026-06-30', startTime: '10:00', endTime: '11:00', patient: 'Amahle Dlamini', type: 'Speech', therapist: 'Megan Pillay', room: 'Telehealth' },
  { id: 'cal-3', date: '2026-06-30', startTime: '12:15', endTime: '13:15', patient: 'Ethan Naidoo', type: 'Review', therapist: 'Nadia Botha', room: 'Room 1' },
  { id: 'cal-4', date: '2026-06-30', startTime: '15:00', endTime: '16:00', patient: 'Mila van Wyk', type: 'Physio', therapist: 'Johan Kruger', room: 'Gym' },
  { id: 'cal-5', date: '2026-07-03', startTime: '09:30', endTime: '10:30', patient: 'Jenny Pennig', type: 'OT', therapist: 'Nadia Botha', room: 'Room 2' },
  { id: 'cal-6', date: '2026-07-03', startTime: '10:30', endTime: '11:30', patient: 'Joe Peterson', type: 'Speech', therapist: 'Megan Pillay', room: 'Room 1' },
  { id: 'cal-7', date: '2026-07-03', startTime: '12:00', endTime: '13:00', patient: 'Olivia Riley', type: 'Review', therapist: 'Nadia Botha', room: 'Room 1' },
  { id: 'cal-8', date: '2026-07-03', startTime: '14:00', endTime: '15:00', patient: 'Inkfish Weekly', type: 'Admin', therapist: 'Team', room: 'Admin' },
  { id: 'cal-9', date: '2026-07-04', startTime: '09:00', endTime: '10:00', patient: 'New intake', type: 'Assessment', therapist: 'Johan Kruger', room: 'Room 1' },
]

function getSessionAmount(session: CalendarSession) {
  const matchingDailySession = sessions.find((item) => item.patient === session.patient && item.time === session.startTime)
  const billingItem = billingCodeDefaults.find((item) =>
    item.id === session.billingCodeId ||
    session.type.toLowerCase().includes(item.serviceType.split(' ')[0].toLowerCase()) ||
    item.serviceType.toLowerCase().includes(session.type.toLowerCase()),
  )
  return session.invoiceAmount ?? session.quotedAmount ?? matchingDailySession?.amount ?? billingItem?.defaultPrice ?? 780
}

function getPatientIdByName(patientName: string) {
  return patients.find((patient) => patient.name === patientName)?.patientNumber ?? `PT-${patientName.toLowerCase().replaceAll(' ', '-')}`
}

function createInvoiceFromSession(session: CalendarSession, index: number, status: InvoiceStatus = 'confirm_invoice'): Invoice {
  const confirmedAt = status === 'confirm_invoice' ? undefined : session.date
  const paymentDueDate = confirmedAt ? toIsoDate(addDays(parseIsoDate(confirmedAt), 7)) : undefined
  const practiceEntity = practiceEntities.find((practice) => practice.id === session.practiceEntityId) ?? practiceEntities[0]
  const practiceLocation = practiceLocations.find((location) => location.id === session.practiceLocationId)
  const therapistProfile = therapistFinanceProfiles.find((profile) => profile.therapistName === session.therapist)
  const billingCode = billingCodeDefaults.find((code) => code.id === session.billingCodeId) ?? billingCodeDefaults.find((code) => code.serviceType === session.type)
  const invoiceId = `INV-${2100 + index}`
  const selectedProcedures = billingCodeDefaults.filter((code) => session.billingProcedureIds?.includes(code.id))
  const invoiceLineItems = (selectedProcedures.length ? selectedProcedures : billingCode ? [billingCode] : []).map((code) => ({
    invoiceId,
    sessionDate: session.date,
    procedureCode: code.code,
    description: code.serviceType || code.description,
    icd10Code: session.icd10Code ?? billingCode?.code ?? code.code,
    price: code.defaultPrice,
  }))
  const selectedPracticeNumber = session.selectedPracticeNumberSource === 'therapist' && therapistProfile?.practiceNumber
    ? therapistProfile.practiceNumber
    : practiceEntity.practiceNumber
  const selectedBankingDetails = session.selectedBankingDetailsSource === 'therapist' && therapistProfile?.bankingDetails.accountNumber
    ? formatBankingDetails(therapistProfile.bankingDetails)
    : formatBankingDetails(practiceEntity.bankingDetails)
  const invoice: Invoice = {
    id: invoiceId,
    patientId: getPatientIdByName(session.patient),
    sessionId: session.id,
    patientName: session.patient,
    serviceType: session.type,
    practitionerName: session.therapist,
    amount: getSessionAmount(session),
    invoiceDate: session.date,
    status,
    confirmedAt,
    paymentDueDate,
    paymentReceivedAt: status === 'payment_received' ? appTodayIso : undefined,
    practiceEntityId: practiceEntity.id,
    practiceLocationId: practiceLocation?.id,
    therapistId: therapistProfile?.userId,
    selectedPracticeNumber,
    selectedBankingDetails,
    billingCodeId: billingCode?.id,
    icd10Code: session.icd10Code ?? billingCode?.code,
    serviceDescription: billingCode?.description ?? session.type,
    lineItems: invoiceLineItems.length
      ? invoiceLineItems
      : [{ invoiceId, sessionDate: session.date, procedureCode: billingCode?.code ?? 'PROC', description: session.type, icd10Code: session.icd10Code ?? billingCode?.code ?? 'N/A', price: getSessionAmount(session) }],
    createdAt: session.date,
    updatedAt: session.date,
  }
  return status === 'confirm_invoice' ? invoice : { ...invoice, pdfInvoiceUrl: generateInvoicePdf(invoice) }
}

function buildInitialInvoices() {
  return weekSessions.map((session, index) => {
    if (session.id === 'cal-1') return { ...createInvoiceFromSession(session, 48, 'payment_received'), paymentReceivedAt: '2026-06-30', proofOfPaymentUrl: '/payments/pop-inv-2148.pdf', proofOfPaymentName: 'pop-inv-2148.pdf' }
    if (session.id === 'cal-2') return { ...createInvoiceFromSession(session, 49, 'awaiting_payment'), confirmedAt: '2026-06-30', paymentDueDate: '2026-07-07' }
    if (session.id === 'cal-3') return { ...createInvoiceFromSession(session, 46, 'payment_due'), confirmedAt: '2026-06-23', paymentDueDate: '2026-06-30' }
    if (session.id === 'cal-4') return { ...createInvoiceFromSession(session, 50, 'awaiting_payment'), confirmedAt: '2026-06-30', paymentDueDate: '2026-07-07' }
    return createInvoiceFromSession(session, 60 + index)
  })
}

function Sessions({
  calendarSessions,
  selectedSessionId,
  setSelectedSessionId,
  onUpdateSession,
  onOpenPatientProfile,
  onNewSession,
  onMarkNoShow,
  onCancelSession,
  onSavePatientNote,
  invoiceRecords,
  onConfirmInvoice,
  onMarkPaymentReceived,
}: {
  calendarSessions: CalendarSession[]
  selectedSessionId: string
  setSelectedSessionId: Dispatch<SetStateAction<string>>
  onUpdateSession: (session: CalendarSession) => void
  onOpenPatientProfile: (patientName: string) => void
  onNewSession: (slot?: SessionSlot) => void
  onMarkNoShow: (session: CalendarSession) => void
  onCancelSession: (session: CalendarSession, shouldReschedule: boolean) => void
  onSavePatientNote: (patientName: string, note: PatientNote) => void
  invoiceRecords: Invoice[]
  onConfirmInvoice: (invoiceId: string) => void
  onMarkPaymentReceived: (invoiceId: string, proofFile?: string, paymentAmount?: number, proofFileName?: string) => void
}) {
  const currentDayIso = useLocalTodayIso()
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week')
  const [selectedWeekIso, setSelectedWeekIso] = useState(getLocalTodayIso)
  const [selectedMonthIso, setSelectedMonthIso] = useState(getLocalTodayIso)
  const [isSessionEditMode, setIsSessionEditMode] = useState(false)
  const [isSessionOpen, setIsSessionOpen] = useState(false)
  const [isBlockTimeMode, setIsBlockTimeMode] = useState(false)
  const [blockedCalendarSlots, setBlockedCalendarSlots] = useState<BlockedCalendarSlot[]>([])
  const selectedWeekDays = buildWeekDays(selectedWeekIso)
  const selectedSession = calendarSessions.find((session) => session.id === selectedSessionId) ?? calendarSessions[0]
  const monthCalendarDays = buildMonthDays(selectedMonthIso)
  const visibleWeekSessions = calendarSessions
    .map((session) => ({ ...session, day: selectedWeekDays.findIndex((day) => day.iso === session.date) }))
    .filter((session) => session.day >= 0)
  const visibleBlockedSlots = blockedCalendarSlots
    .map((slot) => ({ ...slot, day: selectedWeekDays.findIndex((day) => day.iso === slot.date) }))
    .filter((slot) => slot.day >= 0)
  const sessionCountByDate = calendarSessions.reduce<Record<string, number>>((counts, session) => {
    counts[session.date] = (counts[session.date] ?? 0) + 1
    return counts
  }, {})
  const navigateCalendar = (direction: -1 | 1) => {
    if (calendarMode === 'week') {
      setSelectedWeekIso(toIsoDate(addDays(parseIsoDate(selectedWeekIso), direction * 7)))
      return
    }

    setSelectedMonthIso(toIsoDate(addMonths(parseIsoDate(selectedMonthIso), direction)))
  }
  const blockCalendarSlot = (date: string, time: string) => {
    const endTime = minutesToTime(timeToMinutes(time) + 60)
    setBlockedCalendarSlots((slots) => [
      ...slots,
      {
        id: `blocked-${date}-${time}-${Date.now()}`,
        date,
        startTime: time,
        endTime,
      },
    ])
  }

  return (
    <div className="page-grid sessions-grid">
      <section className="panel span-3 calendar-panel">
        <div className="panel-heading">
          <div>
            <p>{calendarMode === 'week' ? getWeekRangeLabel(selectedWeekDays) : getMonthLabel(selectedMonthIso)}</p>
            <h2>{calendarMode === 'week' ? 'Week schedule' : 'Month calendar'}</h2>
          </div>
          <div className="calendar-controls">
            <div className="calendar-nav-pill" aria-label="Calendar navigation">
              <button type="button" className="calendar-arrow" onClick={() => navigateCalendar(-1)} aria-label="Previous">
                &lt;
              </button>
              <span className="calendar-active-view">{calendarMode === 'week' ? 'Week' : 'Month'}</span>
              <button type="button" className="calendar-arrow" onClick={() => navigateCalendar(1)} aria-label="Next">
                &gt;
              </button>
            </div>
            <button
              type="button"
              className="calendar-view-switch"
              onClick={() => setCalendarMode(calendarMode === 'week' ? 'month' : 'week')}
            >
              {calendarMode === 'week' ? 'Month' : 'Week'}
            </button>
            <button
              type="button"
              className={`calendar-block-switch ${isBlockTimeMode ? 'active' : ''}`}
              onClick={() => {
                setCalendarMode('week')
                setIsBlockTimeMode((current) => !current)
              }}
            >
              Block time
            </button>
          </div>
        </div>
        {calendarMode === 'week' ? (
          <div className="week-calendar" aria-label="Weekly session calendar">
            <div className="calendar-corner" />
            {selectedWeekDays.map((day) => (
              <div className={`calendar-day-head ${day.iso === currentDayIso ? 'today' : ''}`} key={day.iso}>
                <span>{day.label}</span>
                <strong>{day.date}</strong>
              </div>
            ))}
            {calendarHours.map((time, index) => (
              <div className="calendar-time" style={{ gridRow: index * 4 + 2 }} key={time}>
                {time}
              </div>
            ))}
            {selectedWeekDays.map((day, dayIndex) =>
              calendarSlots.map((slot) => (
                <button
                  type="button"
	                  className="calendar-slot"
	                  aria-label={`${isBlockTimeMode ? 'Block time' : 'Add session'} on ${day.label} at ${slot.time}`}
	                  style={{ gridColumn: dayIndex + 2, gridRow: slot.row }}
	                  key={`${day.iso}-${slot.time}`}
	                  onClick={() => {
	                    if (isBlockTimeMode) {
	                      blockCalendarSlot(day.iso, slot.time)
	                      return
	                    }
	                    onNewSession({ date: day.iso, time: slot.time })
	                  }}
	                />
	              )),
	            )}
	            {visibleBlockedSlots.map((slot) => (
	              <button
	                type="button"
	                className="calendar-blocked-slot"
	                style={{
	                  gridColumn: slot.day + 2,
	                  gridRow: `${timeToCalendarRow(slot.startTime)} / span ${sessionRowSpan(slot.startTime, slot.endTime)}`,
	                }}
	                key={slot.id}
	                aria-label={`Blocked time ${slot.startTime}-${slot.endTime}`}
	                title="Click to remove blocked time"
	                onClick={() => setBlockedCalendarSlots((slots) => slots.filter((item) => item.id !== slot.id))}
	              >
	                <strong>Blocked</strong>
	                <span>{slot.startTime}-{slot.endTime}</span>
	              </button>
	            ))}
	            {visibleWeekSessions.map((session) => (
	              <button
                type="button"
                className={`calendar-session ${selectedSessionId === session.id ? 'selected' : ''}`}
                style={{
                  gridColumn: session.day + 2,
                  gridRow: `${timeToCalendarRow(session.startTime)} / span ${sessionRowSpan(session.startTime, session.endTime)}`,
                  ...therapistCalendarStyle(session.therapist),
                }}
                key={session.id}
                onClick={() => {
                  setSelectedSessionId(session.id)
                  setIsSessionEditMode(false)
                  setIsSessionOpen(true)
                }}
              >
                <strong>{session.patient}</strong>
                <span>{session.startTime}-{session.endTime}</span>
                <small>{session.type} · {session.therapist}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="month-calendar" aria-label="Monthly session calendar">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div className="month-day-label" key={day}>
                {day}
              </div>
            ))}
            {monthCalendarDays.map((day) => {
              const sessionCount = sessionCountByDate[day.iso] ?? 0
              return (
                <button
                  type="button"
                  className={`month-date ${day.inMonth ? '' : 'outside'} ${day.iso === currentDayIso ? 'today' : ''}`}
                  key={day.iso}
                  onClick={() => {
                    setSelectedWeekIso(day.iso)
                    setSelectedMonthIso(toIsoDate(new Date(Date.UTC(parseIsoDate(day.iso).getUTCFullYear(), parseIsoDate(day.iso).getUTCMonth(), 1))))
                    setCalendarMode('week')
                  }}
                >
                  <span>{day.date}</span>
                  {sessionCount > 0 && <strong>{sessionCount} session{sessionCount > 1 ? 's' : ''}</strong>}
                </button>
              )
            })}
          </div>
        )}
      </section>
      {isSessionOpen && selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          isEditing={isSessionEditMode}
          setIsEditing={setIsSessionEditMode}
          onChange={onUpdateSession}
          onOpenPatientProfile={onOpenPatientProfile}
          onMarkNoShow={(session) => {
            onMarkNoShow(session)
            setIsSessionOpen(false)
          }}
          onCancelSession={(session, shouldReschedule) => {
            onCancelSession(session, shouldReschedule)
            setIsSessionOpen(false)
          }}
          onSavePatientNote={onSavePatientNote}
          invoiceRecords={invoiceRecords}
          onConfirmInvoice={onConfirmInvoice}
          onMarkPaymentReceived={onMarkPaymentReceived}
          onClose={() => setIsSessionOpen(false)}
        />
      )}
    </div>
  )
}

function SessionDetailModal({
  session,
  isEditing,
  setIsEditing,
  onChange,
  onOpenPatientProfile,
  onMarkNoShow,
  onCancelSession,
  onSavePatientNote,
  invoiceRecords,
  onConfirmInvoice,
  onMarkPaymentReceived,
  onClose,
}: {
  session: CalendarSession
  isEditing: boolean
  setIsEditing: Dispatch<SetStateAction<boolean>>
  onChange: (session: CalendarSession) => void
  onOpenPatientProfile: (patientName: string) => void
  onMarkNoShow: (session: CalendarSession) => void
  onCancelSession: (session: CalendarSession, shouldReschedule: boolean) => void
  onSavePatientNote: (patientName: string, note: PatientNote) => void
  invoiceRecords: Invoice[]
  onConfirmInvoice: (invoiceId: string) => void
  onMarkPaymentReceived: (invoiceId: string, proofFile?: string, paymentAmount?: number, proofFileName?: string) => void
  onClose: () => void
}) {
  const [draftSessionDate, setDraftSessionDate] = useState(session.date)
  const [draftSessionStartTime, setDraftSessionStartTime] = useState(session.startTime)
  const [draftSessionEndTime, setDraftSessionEndTime] = useState(session.endTime)
  const toggleSessionEdit = () => {
    if (isEditing) {
      onChange({
        ...session,
        date: draftSessionDate,
        startTime: draftSessionStartTime,
        endTime: draftSessionEndTime,
      })
    } else {
      setDraftSessionDate(session.date)
      setDraftSessionStartTime(session.startTime)
      setDraftSessionEndTime(session.endTime)
    }
    setIsEditing((current) => !current)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-window session-modal" aria-label="Booked session">
        <div className="modal-header">
          <div>
            <p>Booked session</p>
            <h2>{session.patient}</h2>
          </div>
          <div className="session-modal-actions">
            <button
              type="button"
              className={`icon-button ${isEditing ? 'active' : ''}`}
              aria-label={isEditing ? 'Save session' : 'Edit session'}
              title={isEditing ? 'Save session' : 'Edit session'}
              onClick={toggleSessionEdit}
            >
              <PencilIcon />
            </button>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close booked session">
              x
            </button>
          </div>
        </div>
        <div className="modal-body">
          <SessionDetailView
            session={session}
            isEditing={isEditing}
            onChange={onChange}
            onOpenPatientProfile={onOpenPatientProfile}
            onMarkNoShow={onMarkNoShow}
            onCancelSession={onCancelSession}
            onSavePatientNote={onSavePatientNote}
            invoiceRecords={invoiceRecords}
            onConfirmInvoice={onConfirmInvoice}
            onMarkPaymentReceived={onMarkPaymentReceived}
            draftSessionDate={draftSessionDate}
            setDraftSessionDate={setDraftSessionDate}
            draftSessionStartTime={draftSessionStartTime}
            setDraftSessionStartTime={setDraftSessionStartTime}
            draftSessionEndTime={draftSessionEndTime}
            setDraftSessionEndTime={setDraftSessionEndTime}
          />
        </div>
      </section>
    </div>
  )
}

function SessionDetailView({
  session,
  isEditing,
  onChange,
  onOpenPatientProfile,
  onMarkNoShow,
  onCancelSession,
  onSavePatientNote,
  invoiceRecords,
  onConfirmInvoice,
  onMarkPaymentReceived,
  draftSessionDate,
  setDraftSessionDate,
  draftSessionStartTime,
  setDraftSessionStartTime,
  draftSessionEndTime,
  setDraftSessionEndTime,
}: {
  session: CalendarSession
  isEditing: boolean
  onChange: (session: CalendarSession) => void
  onOpenPatientProfile: (patientName: string) => void
  onMarkNoShow: (session: CalendarSession) => void
  onCancelSession: (session: CalendarSession, shouldReschedule: boolean) => void
  onSavePatientNote: (patientName: string, note: PatientNote) => void
  invoiceRecords: Invoice[]
  onConfirmInvoice: (invoiceId: string) => void
  onMarkPaymentReceived: (invoiceId: string, proofFile?: string, paymentAmount?: number, proofFileName?: string) => void
  draftSessionDate: string
  setDraftSessionDate: Dispatch<SetStateAction<string>>
  draftSessionStartTime: string
  setDraftSessionStartTime: Dispatch<SetStateAction<string>>
  draftSessionEndTime: string
  setDraftSessionEndTime: Dispatch<SetStateAction<string>>
}) {
  const [isBillingEditMode, setIsBillingEditMode] = useState(false)
  const [isCancelChoiceOpen, setIsCancelChoiceOpen] = useState(false)
  const [isPlanningOpen, setIsPlanningOpen] = useState(false)
  const [isSessionNoteOpen, setIsSessionNoteOpen] = useState(false)
  const [sessionPlanning, setSessionPlanning] = useState('')
  const [sessionNoteType, setSessionNoteType] = useState<string>(noteTypeOptions[0].label)
  const [sessionNoteDetail, setSessionNoteDetail] = useState('')
  const [lastSavedSessionNoteKey, setLastSavedSessionNoteKey] = useState('')
  const sessionPracticeEntity = practiceEntities.find((practice) => practice.id === session.practiceEntityId) ?? practiceEntities[0]
  const sessionPracticeLocation = practiceLocations.find((location) => location.id === session.practiceLocationId)
  const sessionBillingCode = billingCodeDefaults.find((code) => code.id === session.billingCodeId)
  const availableSessionProcedures = billingCodeDefaults.filter((code) =>
    code.isActive &&
    (!session.procedurePriceListId || code.priceListId === session.procedurePriceListId) &&
    (!code.practiceEntityId || !session.practiceEntityId || code.practiceEntityId === session.practiceEntityId),
  )
  const initialProcedureIds = session.billingProcedureIds?.length
    ? session.billingProcedureIds
    : sessionBillingCode
      ? [sessionBillingCode.id]
      : availableSessionProcedures[0]
        ? [availableSessionProcedures[0].id]
        : []
  const [draftProcedureIds, setDraftProcedureIds] = useState<string[]>(initialProcedureIds)
  const selectedProcedureItems = availableSessionProcedures.filter((procedure) => draftProcedureIds.includes(procedure.id))
  const displayedProcedureItems = selectedProcedureItems.length
    ? selectedProcedureItems
    : sessionBillingCode
      ? [sessionBillingCode]
      : []
  const sessionBillingTotal = displayedProcedureItems.reduce((total, item) => total + item.defaultPrice, 0) || session.invoiceAmount || session.quotedAmount || 0
  const sessionInvoices = invoiceRecords.filter((invoice) => invoice.sessionId === session.id)
  const isSessionInvoiceConfirmed = sessionInvoices.some((invoice) => getInvoiceStatus(invoice) !== 'confirm_invoice')
  const patientInvoices = invoiceRecords.filter((invoice) => invoice.patientName === session.patient)
  const patientOutstanding = patientInvoices
    .filter((invoice) => getInvoiceStatus(invoice) !== 'payment_received')
    .reduce((total, invoice) => total + invoice.amount, 0)
  const oldestOverdueDays = Math.max(
    0,
    ...patientInvoices
      .map(getOverdueDays)
      .filter((age) => Number.isFinite(age)),
  )
  const toggleSessionNoteEditor = () => {
    if (isSessionNoteOpen) {
      const noteDetail = sessionNoteDetail.trim()
      const noteKey = `${sessionNoteType}|${noteDetail}`
      if (noteDetail && noteKey !== lastSavedSessionNoteKey) {
        onSavePatientNote(session.patient, {
          noteType: sessionNoteType,
          date: session.date,
          detail: noteDetail,
        })
        setLastSavedSessionNoteKey(noteKey)
      }
    }
    setIsSessionNoteOpen((current) => !current)
  }
  const toggleBillingEdit = () => {
    if (isBillingEditMode) {
      const savedProcedures = selectedProcedureItems.length ? selectedProcedureItems : displayedProcedureItems
      const primaryProcedure = savedProcedures[0]
      const savedAmount = savedProcedures.reduce((total, item) => total + item.defaultPrice, 0)
      const savedDuration = savedProcedures.reduce((total, item) => total + (item.durationMinutes ?? 0), 0)
      onChange({
        ...session,
        type: savedProcedures.map((item) => item.serviceType || item.description || item.code).join(', ') || session.type,
        billingCodeId: primaryProcedure?.id ?? session.billingCodeId,
        billingProcedureIds: savedProcedures.map((item) => item.id),
        icd10Code: primaryProcedure?.code ?? session.icd10Code,
        quotedAmount: savedAmount || session.quotedAmount,
        invoiceAmount: savedAmount || session.invoiceAmount,
        durationMinutes: savedDuration || session.durationMinutes,
      })
    } else {
      setDraftProcedureIds(initialProcedureIds)
    }
    setIsBillingEditMode((current) => !current)
  }

  return (
    <div className="session-detail-view">
      <div className="session-detail-banner" style={therapistCalendarStyle(session.therapist)}>
        <div>
          <span>Session</span>
          <strong>{session.patient}</strong>
          <button type="button" className="session-profile-link" onClick={() => onOpenPatientProfile(session.patient)}>
            Patient profile
          </button>
        </div>
        <small>{session.type}</small>
      </div>
      <div className="session-meta-grid">
        <article>
          <span>Date</span>
          {isEditing ? (
            <input
              className="session-meta-input"
              type="date"
              value={draftSessionDate}
              onChange={(event) => setDraftSessionDate(event.target.value)}
            />
          ) : (
            <strong>{session.date}</strong>
          )}
        </article>
        <article>
          <span>Time</span>
          {isEditing ? (
            <div className="session-time-edit">
              <input
                className="session-meta-input"
                type="time"
                value={draftSessionStartTime}
                onChange={(event) => setDraftSessionStartTime(event.target.value)}
              />
              <input
                className="session-meta-input"
                type="time"
                value={draftSessionEndTime}
                onChange={(event) => setDraftSessionEndTime(event.target.value)}
              />
            </div>
          ) : (
            <strong>{session.startTime}-{session.endTime}</strong>
          )}
        </article>
        <article>
          <span>Therapist</span>
          <strong>{session.therapist}</strong>
        </article>
        <article>
          <span>Room</span>
          <strong>{session.room}</strong>
        </article>
      </div>
      {isCancelChoiceOpen && !isSessionInvoiceConfirmed ? (
        <div className="session-cancel-choice" role="dialog" aria-label="Cancel session options">
          <div className="session-cancel-copy">
            <strong>Cancel this session?</strong>
            <span>This removes the session from the calendar and logs the change in patient history.</span>
          </div>
          <div className="session-cancel-buttons">
            <button type="button" onClick={() => onCancelSession(session, true)}>Reschedule</button>
            <button type="button" className="danger-text-button" onClick={() => onCancelSession(session, false)}>Just cancel</button>
            <button type="button" className="secondary-text-button" onClick={() => setIsCancelChoiceOpen(false)}>Keep session</button>
          </div>
        </div>
      ) : (
        <>
      <div className="session-workspace-grid">
        <section className="session-detail-card">
          <div className="panel-heading compact-heading">
            <div>
              <p>Session information</p>
            </div>
          </div>
          <div className="session-section-list">
            <article>
              <div className="session-section-action-row">
                <strong>Session planning</strong>
                <div className="session-section-actions">
                  {sessionPlanning && !isPlanningOpen && (
                    <button
                      type="button"
                      className="session-planning-edit-icon"
                      aria-label="Edit session planning"
                      title="Edit session planning"
                      onClick={() => setIsPlanningOpen(true)}
                    >
                      <PencilIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    className={isPlanningOpen ? 'save-mode' : ''}
                    onClick={() => setIsPlanningOpen((current) => !current)}
                  >
                    {isPlanningOpen ? 'Save planning' : '+ Planning'}
                  </button>
                </div>
              </div>
              {isPlanningOpen ? (
                <textarea
                  value={sessionPlanning}
                  onChange={(event) => setSessionPlanning(event.target.value)}
                  placeholder="Add session planning, goals, prep items and therapist plan."
                />
              ) : (
                <p className={`session-planning-display ${sessionPlanning ? '' : 'empty'}`}>
                  {sessionPlanning || `${session.type} goals, prep items and therapist plan for this session.`}
                </p>
              )}
            </article>
            <article>
              <div className="session-section-action-row">
                <strong>Notes</strong>
                <button
                  type="button"
                  className={isSessionNoteOpen ? 'save-mode' : ''}
                  onClick={toggleSessionNoteEditor}
                >
                  {isSessionNoteOpen ? 'Save note' : '+ Note'}
                </button>
              </div>
              {isSessionNoteOpen ? (
                <div className="session-note-editor">
                  <select value={sessionNoteType} onChange={(event) => setSessionNoteType(event.target.value)}>
                    {noteTypeOptions.map((option) => (
                      <option key={option.label} value={option.label}>{option.label}</option>
                    ))}
                  </select>
                  {sessionNoteType === 'Session Feedback' && (
                    <small className="session-note-visibility">Available on patient link</small>
                  )}
                  <textarea
                    value={sessionNoteDetail}
                    onChange={(event) => setSessionNoteDetail(event.target.value)}
                    placeholder="Add a note connected to this session and patient profile."
                  />
                </div>
              ) : (
                <span>{sessionNoteDetail || 'Add session feedback, process notes or case management notes.'}</span>
              )}
            </article>
          </div>
        </section>

        <section className="session-detail-card">
          <div className="panel-heading compact-heading billing-finance-heading">
            <div>
              <p>Billing and finances</p>
            </div>
            <button
              type="button"
              className={`billing-edit-icon ${isBillingEditMode ? 'save-mode' : ''}`}
              aria-label={isBillingEditMode ? 'Save billing edits' : 'Edit billing and finance'}
              title={isBillingEditMode ? 'Save billing edits' : 'Edit billing and finance'}
              onClick={toggleBillingEdit}
            >
              <PencilIcon />
            </button>
          </div>
          <div className="session-finance-summary">
            <article className="finance-row-two">
              <span>Practice / venue</span>
              <strong>{sessionPracticeEntity.name}{sessionPracticeLocation ? ` · ${sessionPracticeLocation.name}` : ''}</strong>
            </article>
            <article className="finance-row-one">
              <span>Billing item</span>
              {isBillingEditMode ? (
                <details className="session-icd-dropdown session-procedure-dropdown" open>
                  <summary>{displayedProcedureItems.length} procedure{displayedProcedureItems.length === 1 ? '' : 's'} selected</summary>
                  <div className="session-icd-edit-list session-procedure-edit-list">
                    {availableSessionProcedures.map((item) => (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          checked={draftProcedureIds.includes(item.id)}
                          onChange={() =>
                            setDraftProcedureIds((current) =>
                              current.includes(item.id)
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id],
                            )
                          }
                        />
                        <span>{item.code}</span>
                        <small>{item.serviceType} · {formatMoney(item.defaultPrice)}</small>
                      </label>
                    ))}
                  </div>
                </details>
              ) : (
                <strong>{displayedProcedureItems.map((item) => item.serviceType).join(', ') || session.type}</strong>
              )}
            </article>
            <article className="finance-row-one">
              <span>Price</span>
              <strong>{formatMoney(sessionBillingTotal)}</strong>
            </article>
            <article className="finance-row-two">
              <span>ICD codes</span>
              {isBillingEditMode ? (
                <details className="session-icd-dropdown">
                  <summary>
                    {displayedProcedureItems.length} selected
                  </summary>
                  <div className="session-icd-edit-list">
                    {availableSessionProcedures.map((item) => (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          checked={draftProcedureIds.includes(item.id)}
                          onChange={() =>
                            setDraftProcedureIds((current) =>
                              current.includes(item.id)
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id],
                            )
                          }
                        />
                        <span>{item.code}</span>
                        <small>{item.description}</small>
                      </label>
                    ))}
                  </div>
                </details>
              ) : (
                <div className="session-code-pills">
                  {displayedProcedureItems.map((item) => (
                    <code key={item.code}>{item.code}</code>
                  ))}
                </div>
              )}
            </article>
            <article className="finance-row-two">
              <div className="patient-account-heading">
                <span>Patient account</span>
                {oldestOverdueDays >= 30 && (
                  <small className="overdue-account-label">{oldestOverdueDays} days overdue</small>
                )}
              </div>
              <strong>{formatMoney(patientOutstanding)} outstanding from previous invoices</strong>
            </article>
            <article className="finance-row-three">
              <span>Status</span>
              <InvoiceWorkflowList
                invoices={sessionInvoices}
                compact
                onConfirmInvoice={onConfirmInvoice}
                onMarkPaymentReceived={onMarkPaymentReceived}
              />
            </article>
          </div>
        </section>
      </div>
      {!isSessionInvoiceConfirmed && (
        <div className="session-detail-actions">
          <button type="button" onClick={() => onMarkNoShow(session)}>Mark no show</button>
          <button type="button" className="danger-text-button" onClick={() => setIsCancelChoiceOpen((current) => !current)}>
            Cancel session
          </button>
        </div>
      )}
        </>
      )}
    </div>
  )
}

function Patients({
  query,
  setQuery,
  filteredPatients,
  calendarSessions,
  selectedPatientName,
  setSelectedPatientName,
  setPatientRecords,
  onUpdateSession,
  onOpenPatientProfile,
  onMarkNoShow,
  onCancelSession,
  onSavePatientNote,
  invoiceRecords,
  onConfirmInvoice,
  onMarkPaymentReceived,
  onCreateStatement,
}: {
  query: string
  setQuery: (query: string) => void
  filteredPatients: Patient[]
  calendarSessions: CalendarSession[]
  selectedPatientName: string
  setSelectedPatientName: Dispatch<SetStateAction<string>>
  setPatientRecords: Dispatch<SetStateAction<Patient[]>>
  onUpdateSession: (session: CalendarSession) => void
  onOpenPatientProfile: (patientName: string) => void
  onMarkNoShow: (session: CalendarSession) => void
  onCancelSession: (session: CalendarSession, shouldReschedule: boolean) => void
  onSavePatientNote: (patientName: string, note: PatientNote) => void
  invoiceRecords: Invoice[]
  onConfirmInvoice: (invoiceId: string) => void
  onMarkPaymentReceived: (invoiceId: string, proofFile?: string, paymentAmount?: number, proofFileName?: string) => void
  onCreateStatement: (patientName: string, invoiceIds: string[]) => void
}) {
  const [activePatientTab, setActivePatientTab] = useState<PatientWorkspaceTab>('Personal Details')
  const [isPatientEditMode, setIsPatientEditMode] = useState(false)
  const [patientLinkCopied, setPatientLinkCopied] = useState(false)
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false)
  const [selectedPatientSessionId, setSelectedPatientSessionId] = useState('')
  const [isPatientSessionOpen, setIsPatientSessionOpen] = useState(false)
  const [isPatientSessionEditMode, setIsPatientSessionEditMode] = useState(false)
  const currentDayIso = useLocalTodayIso()
  const selectedPatient = filteredPatients.find((patient) => patient.name === selectedPatientName) ?? filteredPatients[0] ?? patients[0]
  const selectedPatientSessions = calendarSessions
    .filter((session) => session.patient === selectedPatient.name)
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
  const nextScheduledSession = [...selectedPatientSessions]
    .filter((session) => `${session.date} ${session.startTime}` >= `${currentDayIso} 00:00`)
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0]
  const nextSessionValue = nextScheduledSession
    ? `${nextScheduledSession.date === currentDayIso ? 'Today' : nextScheduledSession.date} · ${nextScheduledSession.startTime}`
    : 'None'
  const nextSessionDetail = nextScheduledSession?.therapist ?? 'No session scheduled'
  const selectedPatientSession = calendarSessions.find((session) => session.id === selectedPatientSessionId)
  const selectedPatientInvoices = sortInvoicesNewestFirst(
    invoiceRecords.filter((invoice) => invoice.patientId === selectedPatient.patientNumber || invoice.patientName === selectedPatient.name),
  )
  const selectedPatientOutstandingBalance = getOutstandingInvoiceTotal(selectedPatientInvoices)
  const selectedPatientOverdueDays = Math.max(
    0,
    ...selectedPatientInvoices
      .map(getOverdueDays)
      .filter((days) => Number.isFinite(days)),
  )
  const selectedPatientTodos = getPatientTodoLabels(selectedPatient, selectedPatientInvoices, selectedPatientSessions).map((label) => ({
    label,
    tab: label === 'Details' ? 'Personal Details' : label === 'Feedback notes due' ? 'Sessions' : 'Finance',
  })) as Array<{ label: string; tab: PatientWorkspaceTab }>
  const patientProfileUrl = `${window.location.origin}/patient-link/${tenant.tenantId}/${selectedPatient.patientNumber.toLowerCase()}`
  const openTodoAction = (todo: { label: string; tab: PatientWorkspaceTab }) => {
    setActivePatientTab(todo.tab)
    if (todo.tab === 'Personal Details') {
      setIsPatientEditMode(true)
    }
  }
  const updatePatientField = (field: keyof Patient, value: string) => {
    setPatientRecords((records) =>
      records.map((patient) =>
        patient.patientNumber === selectedPatient.patientNumber ? { ...patient, [field]: value } : patient,
      ),
    )
    if (field === 'name') {
      setSelectedPatientName(value)
    }
  }
  const copyPatientProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(patientProfileUrl)
    } catch {
      // Clipboard access can be unavailable in preview contexts; the URL remains visible in the preview modal.
    }
    setPatientLinkCopied(true)
    window.setTimeout(() => setPatientLinkCopied(false), 1800)
  }

  return (
    <div className="patients-layout">
      <section className="panel patient-database-panel">
        <div className="panel-heading">
          <div>
            <p>Patient database</p>
            <h2>{filteredPatients.length} patients</h2>
          </div>
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient or guardian" />
        <div className="patient-list">
          {filteredPatients.map((patient) => (
            <button
              className={`patient-list-item ${selectedPatient.name === patient.name ? 'active' : ''}`}
              key={patient.name}
              onClick={() => setSelectedPatientName(patient.name)}
            >
              <div className="patient-list-head">
                <strong>{patient.name}</strong>
                <span>{patient.patientNumber}</span>
              </div>
              {shouldShowGuardianInList(patient.type) && <span>{patient.guardian}</span>}
              <small>{patient.phone}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel patient-profile-panel">
        <div className="patient-focus-box">
          <div className="patient-profile-header">
            <div>
              <p>Patient profile</p>
              <h2>{selectedPatient.name}</h2>
              <span>{selectedPatient.patientNumber} · {selectedPatient.type} · {selectedPatient.therapist}</span>
            </div>
            <div className="patient-profile-actions">
              <button type="button" onClick={copyPatientProfileLink}>
                {patientLinkCopied ? 'Link copied' : 'Patient Profile Link'}
              </button>
            </div>
          </div>

          <div className="profile-summary-grid">
            <article className="patient-summary-card">
              <span>Next session</span>
              <strong>{nextSessionValue}</strong>
              <small>{nextSessionDetail}</small>
            </article>
            <article className="patient-balance-card">
              <span>Balance</span>
              <strong>{formatMoney(selectedPatientOutstandingBalance)}</strong>
              <small>outstanding balance</small>
              {selectedPatientOverdueDays >= 8 && (
                <em>{selectedPatientOverdueDays} days delayed</em>
              )}
            </article>
            <article className="patient-todo-card">
              <span>To Do's</span>
              <div>
                {selectedPatientTodos.length ? selectedPatientTodos.map((todo) => (
                  <button type="button" key={todo.label} onClick={() => openTodoAction(todo)}>
                    {todo.label}
                  </button>
                )) : (
                  <strong>Clear</strong>
                )}
              </div>
              <small>{selectedPatientTodos.length ? 'requires action' : 'no open actions'}</small>
            </article>
          </div>
        </div>

        <div className="patient-tab-bar">
          <div className="patient-workspace-tabs" role="tablist" aria-label="Patient workspace sections">
            {patientWorkspaceTabs.map((tab) => (
              <button
                className={activePatientTab === tab ? 'active' : ''}
                key={tab}
                onClick={() => setActivePatientTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activePatientTab === 'Personal Details' && (
          <div className="workspace-tab-panel">
            <div className="workspace-panel-header">
              <h3>Personal Details</h3>
              <div className="workspace-panel-actions">
                {isPatientEditMode && <span className="edit-mode-pill">Edit mode</span>}
                <PatientEditActions isEditMode={isPatientEditMode} setIsEditMode={setIsPatientEditMode} />
              </div>
            </div>
            <div className="profile-section-grid">
              <section>
                <h3>Patient Details</h3>
                <dl className="profile-detail-list">
                  <EditableDetail label="Patient name" value={selectedPatient.name} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('name', value)} />
                  <EditableDetail label="Patient number" value={selectedPatient.patientNumber} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('patientNumber', value)} />
                  <EditableDetail label="Dependant code" value={selectedPatient.dependantCode} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('dependantCode', value)} />
                  <EditableDetail label="Title" value={selectedPatient.title} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('title', value)} />
                  <div>
                    <dt>Date of birth</dt>
                    <dd>
                      {isPatientEditMode ? (
                        <input className="editable-field" type="date" value={selectedPatient.dateOfBirth} onChange={(event) => updatePatientField('dateOfBirth', event.target.value)} />
                      ) : (
                        selectedPatient.dateOfBirth
                      )}
                    </dd>
                  </div>
                  <EditableDetail label="ID number" value={selectedPatient.idNumber} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('idNumber', value)} />
                  <EditableDetail label="Residential address" value={selectedPatient.residentialAddress} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('residentialAddress', value)} />
                  <EditableDetail label="Cell number" value={selectedPatient.phone} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('phone', value)} />
                  <EditableDetail label="Referring doctor" value={selectedPatient.referralSource} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('referralSource', value)} />
                </dl>
              </section>

              <section>
                <h3>{shouldShowGuardianInList(selectedPatient.type) ? 'Parent / Guardian Info' : 'Contact Info'}</h3>
                <dl className="profile-detail-list">
                  {shouldShowGuardianInList(selectedPatient.type) && (
                    <>
                      <EditableDetail label="Parent / guardian" value={selectedPatient.guardian} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('guardian', value)} />
                      <EditableDetail label="Mobile" value={selectedPatient.phone} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('phone', value)} />
                      <EditableDetail label="Email address" value={selectedPatient.guardianEmail} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('guardianEmail', value)} />
                      <EditableDetail label="Occupation" value={selectedPatient.guardianOccupation} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('guardianOccupation', value)} />
                      <EditableDetail label="Employer" value={selectedPatient.guardianEmployer} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('guardianEmployer', value)} />
                      <EditableDetail label="Postal address" value={selectedPatient.guardianPostalAddress} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('guardianPostalAddress', value)} />
                    </>
                  )}
                  <EditableDetail label="Home tel" value={selectedPatient.homeTel} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('homeTel', value)} />
                  <EditableDetail label="Work tel" value={selectedPatient.workTel} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('workTel', value)} />
                  <EditableDetail label="Emergency contact" value={selectedPatient.emergencyContact} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('emergencyContact', value)} />
                  <EditableDetail label="Practice no." value={selectedPatient.practiceNo} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('practiceNo', value)} />
                </dl>
              </section>

              <section>
                <h3>Medical Aid Details</h3>
                <dl className="profile-detail-list">
                  <EditableDetail label="Medical aid" value={selectedPatient.medicalAid} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('medicalAid', value)} />
                  <EditableDetail label="Plan / option" value={selectedPatient.medicalAidPlan} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('medicalAidPlan', value)} />
                  <EditableDetail label="Medical aid no." value={selectedPatient.medicalAid} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('medicalAid', value)} />
                  <EditableDetail label="Member responsible" value={selectedPatient.guardian} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('guardian', value)} />
                  <EditableDetail label="Dependent" value={selectedPatient.name} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('name', value)} />
                  <EditableDetail label="Next of kin" value={selectedPatient.emergencyContact} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('emergencyContact', value)} />
                </dl>
              </section>

              <section>
                <h3>Consent & Account Responsibility</h3>
                <dl className="profile-detail-list">
                  <EditableDetail label="Medical aid consent" value={selectedPatient.consentStatus} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('consentStatus', value)} />
                  <EditableDetail label="Therapy consent" value={selectedPatient.consentStatus} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('consentStatus', value)} />
                  <EditableDetail label="Account responsibility" value={selectedPatient.accountResponsibility} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('accountResponsibility', value)} />
                  <EditableDetail label="Responsible person" value={selectedPatient.accountResponsibleName} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('accountResponsibleName', value)} />
                  <EditableDetail label="Responsible ID number" value={selectedPatient.accountResponsibleId} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('accountResponsibleId', value)} />
                  <EditableDetail label="Date signed" value={selectedPatient.dateSigned} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('dateSigned', value)} />
                  <div><dt>Outstanding balance</dt><dd>{formatMoney(selectedPatient.balance)}</dd></div>
                  <EditableDetail label="Signed by" value={selectedPatient.guardian} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('guardian', value)} />
                </dl>
              </section>
            </div>
          </div>
        )}

        {activePatientTab === 'Notes' && (
          <div className="workspace-tab-panel">
            <div className="workspace-panel-header">
              <h3>Clinical Notes</h3>
              <div className="workspace-panel-actions">
                <button>Add note</button>
              </div>
            </div>
            <ul className="notes-list">
              {selectedPatient.notes.map((note, index) => (
                <NoteLineItem
                  key={`${note.noteType}-${note.date}-${index}`}
                  noteType={note.noteType}
                  date={note.date}
                  detail={note.detail}
                />
              ))}
              <NoteLineItem noteType="Session Feedback" date={selectedPatient.lastSession} detail="Goals and progress reviewed." />
              <NoteLineItem noteType="Session Process Note" date={selectedPatient.lastSession} detail="Therapist-only working note for session planning and follow-up." />
              <NoteLineItem noteType="Case Management" date="Today" detail="Fine motor, sensory regulation and parent carry-over tasks." />
            </ul>
          </div>
        )}

        {activePatientTab === 'Sessions' && (
          <div className="workspace-tab-panel">
            <div className="workspace-panel-header">
              <h3>Sessions</h3>
              <div className="workspace-panel-actions">
                <PatientEditActions isEditMode={isPatientEditMode} setIsEditMode={setIsPatientEditMode} />
                <button>Book session</button>
              </div>
            </div>
            <div className="table">
              {selectedPatientSessions.length ? selectedPatientSessions.map((session) => (
                <button
                  type="button"
                  className="table-row clickable-table-row"
                  key={session.id}
                  onClick={() => {
                    setSelectedPatientSessionId(session.id)
                    setIsPatientSessionEditMode(false)
                    setIsPatientSessionOpen(true)
                  }}
                >
                  <span>{session.date}</span>
                  <span>{session.type}</span>
                  <span>{session.therapist}</span>
                  <Status label={`${session.startTime}-${session.endTime}`} />
                </button>
              )) : (
                <p className="quiet">No sessions listed for this patient yet.</p>
              )}
            </div>
          </div>
        )}

        {activePatientTab === 'Finance' && (
          <div className="workspace-tab-panel">
            <div className="workspace-panel-header">
              <h3>Finance</h3>
              <div className="workspace-panel-actions">
                <button type="button" onClick={() => setIsStatementModalOpen(true)}>Create statement</button>
              </div>
            </div>
            <InvoiceWorkflowList
              invoices={selectedPatientInvoices}
              onConfirmInvoice={onConfirmInvoice}
              onMarkPaymentReceived={onMarkPaymentReceived}
            />
            {isStatementModalOpen && (
              <StatementModal
                patient={selectedPatient}
                invoices={selectedPatientInvoices}
                onCreateStatement={(invoiceIds) => {
                  onCreateStatement(selectedPatient.name, invoiceIds)
                  setIsStatementModalOpen(false)
                }}
                onClose={() => setIsStatementModalOpen(false)}
              />
            )}
          </div>
        )}

        {activePatientTab === 'Documents & Reports' && (
          <div className="workspace-tab-panel">
            <div className="workspace-panel-header">
              <h3>Documents & Reports</h3>
              <div className="workspace-panel-actions">
                <PatientEditActions isEditMode={isPatientEditMode} setIsEditMode={setIsPatientEditMode} />
                <button>Upload document</button>
              </div>
            </div>
            <div className="workspace-list">
              <article><strong>Consent forms</strong><span>{selectedPatient.consentStatus}</span></article>
              <article><strong>Assessments</strong><span>Assessment uploads and therapist attachments.</span></article>
              <article><strong>Reports</strong><span>{selectedPatient.reportStatus}</span></article>
            </div>
          </div>
        )}

        {activePatientTab === 'History' && (
          <div className="workspace-tab-panel">
            <div className="workspace-panel-header">
              <h3>Patient History</h3>
            </div>
            <ul className="history-list">
              {selectedPatient.historyEvents.map((event) => (
                <li key={`${event.title}-${event.detail}`}>
                  <strong>{event.title}</strong>
                  <em>{event.visibility}</em>
                  <span>{event.detail}</span>
                </li>
              ))}
              <li>
                <strong>Session planned · {selectedPatient.nextSession}</strong>
                <em>Available on patient link</em>
                <span>Upcoming session scheduled with {selectedPatient.therapist}.</span>
              </li>
              <li>
                <strong>Session completed · {selectedPatient.lastSession}</strong>
                <em>Available on patient link</em>
                <span>Session completed and attendance confirmed.</span>
              </li>
              <li>
                <strong>Session feedback shared · {selectedPatient.lastSession}</strong>
                <em>Available on patient link</em>
                <span>Parent-facing feedback added to the patient timeline.</span>
              </li>
              <li>
                <strong>Session process note added · {selectedPatient.lastSession}</strong>
                <em>Internal only</em>
                <span>Internal clinical process note added. Hidden from patient link.</span>
              </li>
              <li>
                <strong>Patient information updated · Today</strong>
                <em>Available on patient link</em>
                <span>Personal details, guardian details, medical aid or consent information changed.</span>
              </li>
              <li>
                <strong>Invoice available · Today</strong>
                <em>Available on patient link</em>
                <span>New invoice linked to session billing and visible to the customer.</span>
              </li>
              <li>
                <strong>Payment received · Today</strong>
                <em>Available on patient link</em>
                <span>Payment allocated to the patient account.</span>
              </li>
              <li>
                <strong>Report available · {selectedPatient.reportStatus}</strong>
                <em>Available on patient link</em>
                <span>Report or assessment document made available for customer viewing.</span>
              </li>
              <li>
                <strong>Referral received · Intake</strong>
                <em>Internal and patient record</em>
                <span>{selectedPatient.referralSource}</span>
              </li>
            </ul>
          </div>
        )}
        {isPatientSessionOpen && selectedPatientSession && (
          <SessionDetailModal
            session={selectedPatientSession}
            isEditing={isPatientSessionEditMode}
            setIsEditing={setIsPatientSessionEditMode}
            onChange={onUpdateSession}
            onOpenPatientProfile={onOpenPatientProfile}
            onMarkNoShow={(session) => {
              onMarkNoShow(session)
              setIsPatientSessionOpen(false)
            }}
            onCancelSession={(session, shouldReschedule) => {
              onCancelSession(session, shouldReschedule)
              setIsPatientSessionOpen(false)
            }}
            onSavePatientNote={onSavePatientNote}
            invoiceRecords={invoiceRecords}
            onConfirmInvoice={onConfirmInvoice}
            onMarkPaymentReceived={onMarkPaymentReceived}
            onClose={() => setIsPatientSessionOpen(false)}
          />
        )}
      </section>
    </div>
  )
}

function PatientLinkPage({
  patient,
  sessions: patientSessions,
  invoiceRecords,
  onUpdatePatientField,
}: {
  patient: Patient
  sessions: PatientLinkSession[]
  invoiceRecords: Invoice[]
  onUpdatePatientField: (field: keyof Patient, value: string) => void
}) {
  type PatientLinkSection = 'personal' | 'sessions' | 'feedback' | 'finance' | 'history'
  const [isPersonalEditMode, setIsPersonalEditMode] = useState(false)
  const [isNoticeSessionOpen, setIsNoticeSessionOpen] = useState(false)
  const [isCompletedSessionOpen, setIsCompletedSessionOpen] = useState(false)
  const [activePatientLinkSection, setActivePatientLinkSection] = useState<PatientLinkSection>('personal')
  const [hasStartedIntake, setHasStartedIntake] = useState(false)
  const [hasCompletedIntake, setHasCompletedIntake] = useState(false)
  const [hasAcceptedPopia, setHasAcceptedPopia] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState('')
  const isAdultPatient = !shouldShowGuardianInList(patient.type)
  const hasNoMedicalAid = patient.medicalAid === 'No medical aid'
  const emergencyParts = patient.emergencyContact.split(' · ')
  const emergencyName = emergencyParts[0] ?? ''
  const emergencyCell = emergencyParts[1] ?? ''
  const emergencyRelation = emergencyParts[2] ?? ''
  const guardianAddressParts = patient.guardianPostalAddress.split(',').map((part) => part.trim())
  const guardianStreet = guardianAddressParts[0] ?? ''
  const guardianArea = guardianAddressParts[1] ?? ''
  const guardianCity = guardianAddressParts[2] ?? ''
  const guardianCode = guardianAddressParts[3] ?? ''
  const therapistContact = therapistContactDetails.find((therapist) => therapist.name === patient.therapist)
  const patientFeedbackNotes = patient.notes.filter((note) => note.noteType === 'Session Feedback')
  const patientLinkSessions = patientSessions.length ? patientSessions : []
  const noticeSession = patientLinkSessions[0]
  const currentDayIso = useLocalTodayIso()
  const maybeDatedNoticeSession = noticeSession as { date?: unknown }
  const upcomingSessionDate = typeof maybeDatedNoticeSession.date === 'string' ? maybeDatedNoticeSession.date : ''
  const upcomingSessionCountdown = upcomingSessionDate
    ? (() => {
        const dayDifference = Math.round((parseIsoDate(upcomingSessionDate).getTime() - parseIsoDate(currentDayIso).getTime()) / 86400000)
        if (dayDifference <= 0) return 'Today'
        if (dayDifference === 1) return 'Tomorrow'
        return `In ${dayDifference} days`
      })()
    : patient.nextSession.toLowerCase().includes('tomorrow')
      ? 'Tomorrow'
      : patient.nextSession.toLowerCase().includes('today')
        ? 'Today'
        : ''
  const completedSessionNote = patientFeedbackNotes[0] ?? { noteType: 'Session Feedback', date: patient.lastSession, detail: 'Goals and progress reviewed.' }
  const patientInvoices = invoiceRecords.filter((invoice) => invoice.patientId === patient.patientNumber || invoice.patientName === patient.name)
  const completedSessionInvoice = patientInvoices.find((invoice) => invoice.sessionId) ?? patientInvoices[0]
  const sessionFeedbackDetail = noticeSession ? `${patient.lastSession} · ${noticeSession.time}` : `${patient.lastSession} · session time`
  const patientLinkSections: Array<{ id: PatientLinkSection; label: string }> = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'feedback', label: 'Feedback' },
    { id: 'finance', label: 'Finance' },
    { id: 'history', label: 'History' },
  ]
  const visibleHistory = [
    ...patient.historyEvents.filter((event) => event.visibility !== 'Internal only'),
    {
      title: `Session planned · ${patient.nextSession}`,
      visibility: 'Available on patient link',
      detail: `Upcoming session scheduled with ${patient.therapist}.`,
    },
    {
      title: `Invoice available · Today`,
      visibility: 'Available on patient link',
      detail: 'New invoice linked to session billing and visible to the customer.',
    },
    {
      title: `Report available · ${patient.reportStatus}`,
      visibility: 'Available on patient link',
      detail: 'Report or assessment document made available for customer viewing.',
    },
  ]
  const patientInvoice = patientInvoices.find((invoice) => getInvoiceStatus(invoice) !== 'payment_received')
  const patientFinanceItems = [
    {
      title: 'March statement',
      detail: 'Monthly statement',
      amount: 0,
      status: 'Paid',
    },
    ...(patientInvoice
      ? [
          {
            title: `${patientInvoice.id} session invoice`,
            detail: invoiceStatusLabels[getInvoiceStatus(patientInvoice)],
            amount: patientInvoice.amount,
            status: getInvoiceStatus(patientInvoice) === 'payment_received' ? 'Paid' : 'Unpaid',
          },
        ]
      : [
          {
            title: 'Latest session invoice',
            detail: 'No outstanding invoice',
            amount: 0,
            status: 'Paid',
          },
        ]),
  ]
  const patientInvoiceAge = patientInvoice ? getOverdueDays(patientInvoice) : 0
  const isPatientProfileIncomplete =
    patient.alert === 'Patient link incomplete' ||
    [
      patient.phone,
      patient.guardianEmail,
      patient.residentialAddress,
      patient.dateOfBirth,
      patient.emergencyContact,
      patient.medicalAid,
      patient.accountResponsibility,
      patient.accountResponsibleName,
      patient.accountResponsibleId,
    ].some((value) => !value.trim() || value.toLowerCase().includes('needs'))
  const noticeBoardItems = [
    isPatientProfileIncomplete
      ? { title: 'Personal details incomplete', detail: 'Please complete the remaining profile details.', action: 'Update profile', urgent: true }
      : null,
    patient.nextSession && patient.nextSession !== 'No completed sessions'
      ? { title: 'Upcoming session', detail: patient.nextSession, action: 'View Sessions', urgent: false, pill: upcomingSessionCountdown }
      : null,
    patientFeedbackNotes.length
      ? { title: 'Session feedback', detail: patientFeedbackNotes[0].detail, action: 'View feedback', urgent: false }
      : null,
    patientInvoice && patientInvoiceAge >= 8
      ? { title: 'Unpaid invoice', detail: `${patientInvoice.id} · ${patientInvoiceAge} days delayed`, action: 'View finance', urgent: true }
      : null,
    patientInvoice && patientInvoiceAge < 8
      ? { title: 'New invoice', detail: `${patientInvoice.id} · ${formatMoney(patientInvoice.amount)} due`, action: 'View finance', urgent: true }
      : null,
    patient.balance > 0 && !patientInvoice
      ? { title: 'New statement', detail: `${formatMoney(patient.balance)} outstanding`, action: 'View finance', urgent: true }
      : null,
  ].filter((item): item is { title: string; detail: string; action: string; urgent: boolean; pill?: string } => Boolean(item))
  const shouldShowIntakeGate = isPatientProfileIncomplete && !hasStartedIntake && !hasCompletedIntake
  const shouldShowIntakeForm = isPatientProfileIncomplete && hasStartedIntake && !hasCompletedIntake
  const completeIntake = () => {
    onUpdatePatientField('consentStatus', 'Signed')
    onUpdatePatientField('alert', 'Consent signed')
    onUpdatePatientField('dateSigned', appTodayIso)
    onUpdatePatientField('accountResponsibility', patient.accountResponsibility.trim() || 'Accepted digitally')
    setHasCompletedIntake(true)
    setIsPersonalEditMode(false)
    setActivePatientLinkSection('personal')
  }
  const updateEmergencyContact = (part: 'name' | 'cell' | 'relation', value: string) => {
    const nextEmergency = {
      name: emergencyName,
      cell: emergencyCell,
      relation: emergencyRelation,
      [part]: value,
    }
    onUpdatePatientField('emergencyContact', [nextEmergency.name, nextEmergency.cell, nextEmergency.relation].filter(Boolean).join(' · '))
  }
  const updateGuardianAddress = (part: 'street' | 'area' | 'city' | 'code', value: string) => {
    const nextAddress = {
      street: guardianStreet,
      area: guardianArea,
      city: guardianCity,
      code: guardianCode,
      [part]: value,
    }
    onUpdatePatientField('guardianPostalAddress', [nextAddress.street, nextAddress.area, nextAddress.city, nextAddress.code].filter(Boolean).join(', '))
  }
  const renderGuardianResidentialAddressFields = (isEditing: boolean, required = false) => (
    <>
      <div>
        <dt>Residential address{required && <sup>*</sup>}</dt>
        <dd>{isEditing ? <input className="editable-field" value={guardianStreet} placeholder="Street" onChange={(event) => updateGuardianAddress('street', event.target.value)} /> : guardianStreet}</dd>
      </div>
      <div>
        <dt>Area</dt>
        <dd>{isEditing ? <input className="editable-field" value={guardianArea} placeholder="Area" onChange={(event) => updateGuardianAddress('area', event.target.value)} /> : guardianArea}</dd>
      </div>
      <div>
        <dt>City</dt>
        <dd>{isEditing ? <input className="editable-field" value={guardianCity} placeholder="City" onChange={(event) => updateGuardianAddress('city', event.target.value)} /> : guardianCity}</dd>
      </div>
      <div>
        <dt>Code</dt>
        <dd>{isEditing ? <input className="editable-field" value={guardianCode} placeholder="Code" onChange={(event) => updateGuardianAddress('code', event.target.value)} /> : guardianCode}</dd>
      </div>
    </>
  )
  const renderTitleSelect = (isEditing: boolean) => (
    <div>
      <dt>Title</dt>
      <dd>
        {isEditing ? (
          <select className="editable-field" value={patient.title} onChange={(event) => onUpdatePatientField('title', event.target.value)}>
            <option value="">Select title</option>
            <option>Mr</option>
            <option>Mrs</option>
            <option>Ms</option>
            <option>Miss</option>
            <option>Dr</option>
            <option>Prof</option>
          </select>
        ) : (
          patient.title
        )}
      </dd>
    </div>
  )
  const renderDateOfBirthField = (isEditing: boolean, required = false) => (
    <div>
      <dt>Date of birth{required && <sup>*</sup>}</dt>
      <dd>
        {isEditing ? (
          <input
            className="editable-field"
            type="date"
            value={patient.dateOfBirth}
            onChange={(event) => onUpdatePatientField('dateOfBirth', event.target.value)}
          />
        ) : (
          patient.dateOfBirth
        )}
      </dd>
    </div>
  )
  const renderEmergencyFields = (isEditing: boolean, required = false) => (
    <>
      <div>
        <dt>Emergency contact{required && <sup>*</sup>}</dt>
        <dd>{isEditing ? <input className="editable-field" value={emergencyName} onChange={(event) => updateEmergencyContact('name', event.target.value)} /> : emergencyName}</dd>
      </div>
      <div>
        <dt>Emergency cell{required && <sup>*</sup>}</dt>
        <dd>{isEditing ? <input className="editable-field" value={emergencyCell} onChange={(event) => updateEmergencyContact('cell', event.target.value)} /> : emergencyCell}</dd>
      </div>
      <div>
        <dt>Emergency relation{required && <sup>*</sup>}</dt>
        <dd>{isEditing ? (
          <select className="editable-field" value={emergencyRelation} onChange={(event) => updateEmergencyContact('relation', event.target.value)}>
            <option value="">Select relation</option>
            <option>Parent</option>
            <option>Guardian</option>
            <option>Spouse / Partner</option>
            <option>Sibling</option>
            <option>Adult child</option>
            <option>Friend</option>
            <option>Caregiver</option>
            <option>Other</option>
          </select>
        ) : emergencyRelation}</dd>
      </div>
    </>
  )
  const responsibleOptions = [
    { source: 'guardian', label: patient.guardian || 'Parent / guardian', name: patient.guardian },
    { source: 'emergency', label: emergencyName || 'Emergency contact', name: emergencyName },
  ]
  const selectedResponsibleSource = patient.accountResponsibleName === emergencyName ? 'emergency' : 'guardian'
  const updateAccountResponsible = (source: string) => {
    const selectedResponsible = responsibleOptions.find((option) => option.source === source) ?? responsibleOptions[0]
    onUpdatePatientField('accountResponsibleName', selectedResponsible.name)
    onUpdatePatientField('accountResponsibility', selectedResponsible.name)
  }
  const renderMedicalAidFields = (isEditing: boolean, requireMedicalAid = false) => (
    <>
      <label className="intake-check-row no-medical-aid-toggle">
        <input
          type="checkbox"
          checked={hasNoMedicalAid}
          onChange={(event) => onUpdatePatientField('medicalAid', event.target.checked ? 'No medical aid' : '')}
        />
        <span>No medical aid</span>
      </label>
      <EditableDetail label="Medical aid" value={hasNoMedicalAid ? '' : patient.medicalAid} isEditing={isEditing && !hasNoMedicalAid} required={requireMedicalAid && !hasNoMedicalAid} onChange={(value) => onUpdatePatientField('medicalAid', value)} />
      <EditableDetail label="Plan / option" value={patient.medicalAidPlan} isEditing={isEditing && !hasNoMedicalAid} onChange={(value) => onUpdatePatientField('medicalAidPlan', value)} />
      <EditableDetail label="Dependent code" value={patient.dependantCode} isEditing={isEditing && !hasNoMedicalAid} onChange={(value) => onUpdatePatientField('dependantCode', value)} />
      <div>
        <dt>Main Member / Responsible for account<sup>*</sup></dt>
        <dd>
          {isEditing ? (
            <select
              className="editable-field"
              value={selectedResponsibleSource}
              onChange={(event) => updateAccountResponsible(event.target.value)}
            >
              {responsibleOptions.map((option) => (
                <option value={option.source} key={option.source}>{option.label}</option>
              ))}
            </select>
          ) : (
            patient.accountResponsibleName
          )}
        </dd>
      </div>
      <EditableDetail label="Responsible ID number" value={patient.accountResponsibleId} isEditing={isEditing} required onChange={(value) => onUpdatePatientField('accountResponsibleId', value)} />
    </>
  )

  return (
    <main className="patient-link-page">
      <section className="patient-link-shell" aria-label="Patient profile link">
        <div className="patient-link-header">
          <div>
            <p>Patient Profile Link</p>
            <h2>{patient.name}</h2>
          </div>
          <img src="/assets/AlliDesk_White_App_logo.png" alt="AlliDesk" className="patient-link-logo" />
        </div>
        <div className="patient-link-body">
          <section className="patient-link-intro">
            <div>
              <strong>{patient.therapist}</strong>
              <span className="therapist-field-pill">{therapistDiscipline(patient.therapist)}</span>
            </div>
            <span>{therapistContact?.phone ?? '021 555 0100'} · {therapistContact?.email ?? 'accounts@kidstherapycentre.co.za'}</span>
            <span>{tenant.name}</span>
          </section>

          {shouldShowIntakeGate ? (
            <section className="patient-link-section patient-intake-gate">
              <h3>Complete intake form</h3>
              <p>This is your first access to the Patient Profile Link. Please complete the intake form first so the practice has your full details, medical aid information, POPIA acknowledgement and signature.</p>
              <div className="intake-gate-summary">
                <span>Patient</span>
                <strong>{patient.name}</strong>
                <small>{patient.type}</small>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHasStartedIntake(true)
                  setActivePatientLinkSection('personal')
                  setIsPersonalEditMode(true)
                }}
              >
                Start intake form
              </button>
            </section>
          ) : shouldShowIntakeForm ? (
            <section className="patient-link-section patient-intake-form">
              <div className="patient-link-section-header">
                <div>
                  <h3>Patient intake form</h3>
                  <p>Complete the details below before opening your Patient Profile Link.</p>
                </div>
              </div>
              <div className="profile-section-grid patient-link-profile-grid">
                <section>
                  <h3>Patient Details</h3>
                  <dl className="profile-detail-list">
                    <EditableDetail label="Patient name" value={patient.name} isEditing required onChange={(value) => onUpdatePatientField('name', value)} />
                    {renderTitleSelect(true)}
                    {renderDateOfBirthField(true, true)}
                    <EditableDetail label="ID number" value={patient.idNumber} isEditing required onChange={(value) => onUpdatePatientField('idNumber', value)} />
                    {isAdultPatient && (
                      <>
                        <EditableDetail label="Residential address" value={patient.residentialAddress} isEditing required onChange={(value) => onUpdatePatientField('residentialAddress', value)} />
                        <EditableDetail label="Cell number" value={patient.phone} isEditing required onChange={(value) => onUpdatePatientField('phone', value)} />
                      </>
                    )}
                  </dl>
                </section>

                <section>
                  <h3>{shouldShowGuardianInList(patient.type) ? 'Parent / Guardian Info' : 'Contact Info'}</h3>
                  <dl className="profile-detail-list">
                    <EditableDetail label={shouldShowGuardianInList(patient.type) ? 'Parent / guardian' : 'Secondary contact'} value={patient.guardian} isEditing required onChange={(value) => onUpdatePatientField('guardian', value)} />
                    <EditableDetail label="Mobile" value={patient.phone} isEditing={!isAdultPatient} required={!isAdultPatient} onChange={(value) => onUpdatePatientField('phone', value)} />
                    <EditableDetail label="Email address" value={patient.guardianEmail} isEditing required onChange={(value) => onUpdatePatientField('guardianEmail', value)} />
                    <EditableDetail label="Occupation" value={patient.guardianOccupation} isEditing onChange={(value) => onUpdatePatientField('guardianOccupation', value)} />
                    <EditableDetail label="Employer" value={patient.guardianEmployer} isEditing onChange={(value) => onUpdatePatientField('guardianEmployer', value)} />
                    {renderGuardianResidentialAddressFields(true, !isAdultPatient)}
                    <EditableDetail label="Home tel" value={patient.homeTel} isEditing onChange={(value) => onUpdatePatientField('homeTel', value)} />
                    <EditableDetail label="Work tel" value={patient.workTel} isEditing onChange={(value) => onUpdatePatientField('workTel', value)} />
                    {renderEmergencyFields(true, true)}
                  </dl>
                </section>

                <section>
                  <h3>Medical Aid Details</h3>
                  <dl className="profile-detail-list">
                    {renderMedicalAidFields(true, true)}
                  </dl>
                </section>

                <section className="intake-consent-section">
                  <h3>POPIA & Consent</h3>
                  <p>
                    I confirm that the details supplied are accurate and consent to {tenant.name} processing personal,
                    medical aid and therapy-related information for care, billing, communication and legal record keeping.
                  </p>
                  <label className="intake-check-row">
                    <input type="checkbox" checked={hasAcceptedPopia} onChange={(event) => setHasAcceptedPopia(event.target.checked)} />
                    <span>I accept the POPIA commitment and consent terms.</span>
                  </label>
                  <div className="intake-signature-field">
                    <span>Digital signature<sup>*</sup></span>
                    <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />
                  </div>
                  <button
                    type="button"
                    className="intake-submit-button"
                    disabled={!hasAcceptedPopia || !signatureDataUrl}
                    onClick={completeIntake}
                  >
                    Submit intake and open Patient Profile Link
                  </button>
                </section>
              </div>
            </section>
          ) : (
          <>
          {noticeBoardItems.length > 0 && (
            <section className="patient-link-notice-board">
              <h3>Notice board</h3>
              <div>
                {noticeBoardItems.map((notice, index) => (
                  <article className={notice.urgent ? 'urgent' : ''} key={`${notice.title}-${index}`}>
                    <div>
                      <strong>{notice.title}{notice.pill && <em className="notice-countdown-pill">{notice.pill}</em>}</strong>
                      <span>{notice.detail}</span>
                    </div>
                    {notice.action === 'View Sessions' ? (
                      <button type="button" onClick={() => setIsNoticeSessionOpen((current) => !current)}>
                        {notice.action}
                      </button>
                    ) : (
                      <a href={`#${notice.action.toLowerCase().replaceAll(' ', '-')}`}>{notice.action}</a>
                    )}
                  </article>
                ))}
                {isNoticeSessionOpen && noticeSession && (
                  <article className="patient-link-notice-session-card">
                    <div>
                      <strong>{noticeSession.type}</strong>
                      <span>{noticeSession.time} · {noticeSession.therapist}</span>
                      <small>{noticeSession.room} · {noticeSession.status}</small>
                    </div>
                  </article>
                )}
              </div>
            </section>
          )}

          <nav className="patient-link-quick-nav" aria-label="Patient link sections">
            {patientLinkSections.map((section) => (
              <button
                type="button"
                className={activePatientLinkSection === section.id ? 'active' : ''}
                onClick={() => setActivePatientLinkSection(section.id)}
                key={section.id}
              >
                {section.label}
              </button>
            ))}
          </nav>

          {activePatientLinkSection === 'personal' && (
          <section className="patient-link-section">
            <div className="patient-link-section-header">
              <h3>Personal details</h3>
              <button
                type="button"
                className={`icon-button ${isPersonalEditMode ? 'active' : ''}`}
                aria-label={isPersonalEditMode ? 'Save personal details' : 'Edit personal details'}
                title={isPersonalEditMode ? 'Save personal details' : 'Edit personal details'}
                onClick={() => setIsPersonalEditMode((current) => !current)}
              >
                <PencilIcon />
              </button>
            </div>
            <div className="profile-section-grid patient-link-profile-grid">
              <section>
                <h3>Patient Details</h3>
                <dl className="profile-detail-list">
                  <EditableDetail label="Patient name" value={patient.name} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('name', value)} />
                  {renderTitleSelect(isPersonalEditMode)}
                  {renderDateOfBirthField(isPersonalEditMode)}
                  <EditableDetail label="ID number" value={patient.idNumber} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('idNumber', value)} />
                  {isAdultPatient && (
                    <>
                      <EditableDetail label="Residential address" value={patient.residentialAddress} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('residentialAddress', value)} />
                      <EditableDetail label="Cell number" value={patient.phone} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('phone', value)} />
                    </>
                  )}
                </dl>
              </section>

              <section>
                <h3>{shouldShowGuardianInList(patient.type) ? 'Parent / Guardian Info' : 'Contact Info'}</h3>
                <dl className="profile-detail-list">
                  <EditableDetail label={shouldShowGuardianInList(patient.type) ? 'Parent / guardian' : 'Secondary contact'} value={patient.guardian} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('guardian', value)} />
                  <EditableDetail label="Mobile" value={patient.phone} isEditing={isPersonalEditMode && !isAdultPatient} onChange={(value) => onUpdatePatientField('phone', value)} />
                  <EditableDetail label="Email address" value={patient.guardianEmail} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('guardianEmail', value)} />
                  <EditableDetail label="Occupation" value={patient.guardianOccupation} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('guardianOccupation', value)} />
                  <EditableDetail label="Employer" value={patient.guardianEmployer} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('guardianEmployer', value)} />
                  {renderGuardianResidentialAddressFields(isPersonalEditMode)}
                  <EditableDetail label="Home tel" value={patient.homeTel} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('homeTel', value)} />
                  <EditableDetail label="Work tel" value={patient.workTel} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('workTel', value)} />
                  {renderEmergencyFields(isPersonalEditMode)}
                  <EditableDetail label="Practice no." value={patient.practiceNo} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('practiceNo', value)} />
                </dl>
              </section>

              <section>
                <h3>Medical Aid Details</h3>
                <dl className="profile-detail-list">
                  {renderMedicalAidFields(isPersonalEditMode)}
                </dl>
              </section>

              <section>
                <h3>Consent & Account Responsibility</h3>
                <dl className="profile-detail-list">
                  <EditableDetail label="Medical aid consent" value={patient.consentStatus} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('consentStatus', value)} />
                  <EditableDetail label="Therapy consent" value={patient.consentStatus} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('consentStatus', value)} />
                  <EditableDetail label="Account responsibility" value={patient.accountResponsibility} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('accountResponsibility', value)} />
                  <EditableDetail label="Responsible person" value={patient.accountResponsibleName} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('accountResponsibleName', value)} />
                  <EditableDetail label="Responsible ID number" value={patient.accountResponsibleId} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('accountResponsibleId', value)} />
                  <EditableDetail label="Date signed" value={patient.dateSigned} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('dateSigned', value)} />
                  <div><dt>Outstanding balance</dt><dd>{formatMoney(patient.balance)}</dd></div>
                  <EditableDetail label="Signed by" value={patient.guardian} isEditing={isPersonalEditMode} onChange={(value) => onUpdatePatientField('guardian', value)} />
                </dl>
              </section>
            </div>
          </section>
          )}

          {activePatientLinkSection === 'sessions' && (
          <section className="patient-link-section">
            <h3>Sessions</h3>
            <div className="patient-link-session-groups">
              <div className="patient-link-session-group">
                <h4>Planned sessions</h4>
                <div className="patient-link-list">
                  {patientLinkSessions.length ? patientLinkSessions.map((session) => (
                    <article
                      className="patient-link-session-card planned"
                      key={`${patient.patientNumber}-planned-${session.date}-${session.time}`}
                      style={therapistCalendarStyle(session.therapist)}
                    >
                      <strong>{session.patient}</strong>
                      <span>{session.time}</span>
                      <small>{session.type} · {session.therapist}</small>
                      <em>{session.room} · {session.status}</em>
                    </article>
                  )) : (
                    <article className="patient-link-session-card completed">
                      <strong>No planned sessions</strong>
                      <span>The practice will share new bookings here.</span>
                    </article>
                  )}
                </div>
              </div>
              <div className="patient-link-session-group">
                <h4>Sessions completed</h4>
                <div className="patient-link-list">
                  <button
                    type="button"
                    className="patient-link-session-card completed"
                    onClick={() => setIsCompletedSessionOpen(true)}
                  >
                    <strong>{patient.lastSession}</strong>
                    <span>{patient.therapist} · Attendance confirmed</span>
                    <small>Feedback and progress visible in the Feedback section.</small>
                  </button>
                </div>
              </div>
            </div>
          </section>
          )}

          {isCompletedSessionOpen && (
            <PatientLinkCompletedSessionModal
              patient={patient}
              session={noticeSession}
              note={completedSessionNote}
              invoice={completedSessionInvoice}
              onClose={() => setIsCompletedSessionOpen(false)}
            />
          )}

          {activePatientLinkSection === 'feedback' && (
          <section className="patient-link-section">
            <h3>Feedback</h3>
            <div className="patient-link-feedback-list">
              {(patientFeedbackNotes.length ? patientFeedbackNotes : [{ noteType: 'Session Feedback', date: patient.lastSession, detail: 'Goals and progress reviewed.' }]).map((note, index) => (
                <article className="patient-link-feedback-bubble" key={`${note.noteType}-${note.date}-${index}`}>
                  <strong>{note.noteType}<small>{sessionFeedbackDetail}</small></strong>
                  <span>{note.detail}</span>
                  <time>{note.date}</time>
                </article>
              ))}
            </div>
          </section>
          )}

          {activePatientLinkSection === 'finance' && (
          <section className="patient-link-section">
            <h3>Finance and Billing</h3>
            <div className="patient-link-finance-dashboard">
              <div className="finance-dashboard-summary">
                <span>Outstanding payments</span>
                <strong>{formatMoney(patient.balance)}</strong>
                <small>{patient.balance > 0 ? 'Payment still required' : 'No payments outstanding'}</small>
              </div>
              <div className="patient-link-finance-list">
                {patientFinanceItems.map((item) => (
                  <article className={item.status === 'Unpaid' ? 'unpaid' : ''} key={`${item.title}-${item.status}`}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <div>
                      <strong>{formatMoney(item.amount)}</strong>
                      <em>{item.status}</em>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
          )}

          {activePatientLinkSection === 'history' && (
          <section className="patient-link-section">
            <h3>History</h3>
            <ul className="history-list patient-link-history-list">
              {visibleHistory.map((event) => (
                <li key={`${event.title}-${event.detail}`}>
                  <strong>{event.title}</strong>
                  <em>{event.visibility}</em>
                  <span>{event.detail}</span>
                </li>
              ))}
            </ul>
          </section>
          )}
          </>
          )}
        </div>
      </section>
    </main>
  )
}

function PatientLinkCompletedSessionModal({
  patient,
  session,
  note,
  invoice,
  onClose,
}: {
  patient: Patient
  session?: PatientLinkSession
  note: PatientNote
  invoice?: Invoice
  onClose: () => void
}) {
  const invoiceOutstanding = invoice && getInvoiceStatus(invoice) !== 'payment_received' ? invoice.amount : 0
  const paymentStatus = invoice ? invoiceStatusLabels[getInvoiceStatus(invoice)] : 'Not issued'

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-window patient-link-session-modal" aria-label="Completed session details">
        <div className="modal-header">
          <div>
            <p>Completed session</p>
            <h2>{patient.name}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close completed session">
            x
          </button>
        </div>
        <div className="modal-body patient-link-session-modal-body">
          <div className="patient-link-completed-banner" style={therapistCalendarStyle(session?.therapist ?? patient.therapist)}>
            <div>
              <strong>{session?.type ?? 'Therapy session'}</strong>
              <span>{patient.lastSession} · {session?.time ?? 'Time confirmed'}</span>
            </div>
            <small>{session?.therapist ?? patient.therapist}</small>
          </div>

          <section className="patient-link-modal-card">
            <h3>Session detail</h3>
            <dl className="session-modal-detail-grid">
              <div><dt>Status</dt><dd>Completed</dd></div>
              <div><dt>Attendance</dt><dd>Confirmed</dd></div>
              <div><dt>Room / mode</dt><dd>{session?.room ?? 'Practice room'}</dd></div>
              <div><dt>Therapist</dt><dd>{session?.therapist ?? patient.therapist}</dd></div>
            </dl>
          </section>

          <section className="patient-link-modal-card">
            <h3>Session note</h3>
            <article className="patient-link-feedback-bubble compact">
              <strong>{note.noteType}<small>{note.date} · {session?.time ?? 'session time'}</small></strong>
              <span>{note.detail}</span>
            </article>
          </section>

          <section className="patient-link-modal-card">
            <h3>Finance and Billing</h3>
            {invoice ? (
              <dl className="session-modal-detail-grid">
                <div><dt>Invoice number</dt><dd>{invoice.id}</dd></div>
                <div><dt>Price</dt><dd>{formatMoney(invoice.amount)}</dd></div>
                <div><dt>Status</dt><dd>{paymentStatus}</dd></div>
                <div><dt>Outstanding</dt><dd>{formatMoney(invoiceOutstanding)}</dd></div>
              </dl>
            ) : (
              <p className="patient-link-empty-copy">No invoice has been shared for this completed session yet.</p>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}

function StatementModal({
  patient,
  invoices,
  onCreateStatement,
  onClose,
}: {
  patient: Patient
  invoices: Invoice[]
  onCreateStatement: (invoiceIds: string[]) => void
  onClose: () => void
}) {
  const availableInvoices = invoices.filter((invoice) => invoice.kind !== 'statement')
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>(() => availableInvoices.map((invoice) => invoice.id))
  const selectedInvoices = availableInvoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id))
  const selectedTotal = selectedInvoices.reduce((total, invoice) => total + invoice.amount, 0)
  const selectedOutstandingTotal = selectedInvoices
    .filter((invoice) => getInvoiceStatus(invoice) !== 'payment_received')
    .reduce((total, invoice) => total + invoice.amount, 0)
  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((current) =>
      current.includes(invoiceId) ? current.filter((id) => id !== invoiceId) : [...current, invoiceId],
    )
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-window statement-modal" aria-label="Create patient statement">
        <div className="modal-header">
          <div>
            <p>Patient finance</p>
            <h2>Create statement</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close statement modal">
            x
          </button>
        </div>
        <div className="modal-body statement-modal-body">
          <section className="statement-summary">
            <div>
              <span>Patient</span>
              <strong>{patient.name}</strong>
            </div>
            <div>
              <span>Selected total</span>
              <strong>{formatMoney(selectedTotal)}</strong>
            </div>
            <div>
              <span>Outstanding</span>
              <strong>{formatMoney(selectedOutstandingTotal)}</strong>
            </div>
            <small>Paid invoices can be included for monthly records. Only outstanding invoices require payment.</small>
          </section>
          <div className="statement-invoice-list">
            {availableInvoices.length ? availableInvoices.map((invoice) => (
              <label key={invoice.id}>
                <input
                  type="checkbox"
                  checked={selectedInvoiceIds.includes(invoice.id)}
                  onChange={() => toggleInvoice(invoice.id)}
                />
                <div>
                  <strong>{invoice.id}</strong>
                  <span>{invoice.serviceType} · {invoiceStatusLabels[getInvoiceStatus(invoice)]}</span>
                </div>
                <b>{formatMoney(invoice.amount)}</b>
              </label>
            )) : (
              <p className="quiet">No invoices available for a statement.</p>
            )}
          </div>
          <button
            type="button"
            className="statement-create-button"
            disabled={!selectedInvoiceIds.length}
            onClick={() => onCreateStatement(selectedInvoiceIds)}
          >
            Create statement
          </button>
        </div>
      </section>
    </div>
  )
}

function InvoiceWorkflowList({
  invoices,
  compact = false,
  onConfirmInvoice,
  onMarkPaymentReceived,
}: {
  invoices: Invoice[]
  compact?: boolean
  onConfirmInvoice: (invoiceId: string) => void
  onMarkPaymentReceived: (invoiceId: string, proofFile?: string, paymentAmount?: number, proofFileName?: string) => void
}) {
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('')
  const [proofFile, setProofFile] = useState('')
  const [proofFileName, setProofFileName] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [proofPreviewInvoice, setProofPreviewInvoice] = useState<Invoice | null>(null)
  const attachProofFile = (file: File) => {
    setProofFile(URL.createObjectURL(file))
    setProofFileName(file.name)
  }
  const renderInvoiceRow = (invoice: Invoice) => {
    const status = getInvoiceStatus(invoice)
    const overdueDays = getOverdueDays(invoice)
    const isPaymentCaptureOpen = paymentInvoiceId === invoice.id
    const paymentProofInputId = `payment-proof-${invoice.id}`
    const linkedStatement = invoice.kind !== 'statement'
      ? invoices.find((record) => record.kind === 'statement' && getInvoiceStatus(record) !== 'payment_received' && record.linkedInvoiceIds?.includes(invoice.id))
      : undefined
    const statusDetail = status === 'payment_received'
      ? invoice.paymentReceivedAt ? `Paid ${invoice.paymentReceivedAt}` : 'Paid'
      : invoice.paymentDueDate ? `Due ${invoice.paymentDueDate}` : ''

    return (
      <article className="invoice-workflow-row" key={invoice.id}>
        <div>
          <strong>
            <span className={`invoice-kind-pill ${invoice.kind === 'statement' ? 'statement' : ''}`}>
              {invoice.kind === 'statement' ? 'Statement' : 'Invoice'}
            </span>
            {invoice.patientName}
          </strong>
          <span>{invoice.id} · {invoice.serviceType} · {invoice.practitionerName}</span>
          <small>{invoice.invoiceDate} · {formatMoney(invoice.amount)}</small>
        </div>
        <div className="invoice-row-status">
          <em>{invoiceStatusLabels[status]}</em>
          {statusDetail && <small>{statusDetail}</small>}
          {linkedStatement && <span className="invoice-statement-pill">In {linkedStatement.id}</span>}
          {overdueDays >= 8 && <span className="invoice-overdue-pill">{overdueDays} days delayed</span>}
        </div>
        <div className="invoice-row-actions">
          {status === 'confirm_invoice' && (
            <button type="button" onClick={() => onConfirmInvoice(invoice.id)}>Confirm invoice</button>
          )}
          {invoice.pdfInvoiceUrl && (
            <a className="invoice-document-link" href={invoice.pdfInvoiceUrl} target="_blank" rel="noreferrer" aria-label="View PDF invoice" title="View PDF invoice">
              <DocumentIcon />
            </a>
          )}
          {(status === 'awaiting_payment' || status === 'payment_due') && !linkedStatement && (
            <button
              type="button"
              className={isPaymentCaptureOpen ? 'payment-received-active' : ''}
              onClick={() => {
                if (isPaymentCaptureOpen) {
                  onMarkPaymentReceived(invoice.id, proofFile || undefined, Number(paymentAmount) || invoice.amount, proofFileName || undefined)
                  setProofFile('')
                  setProofFileName('')
                  setPaymentAmount('')
                  setPaymentInvoiceId('')
                  return
                }
                setPaymentInvoiceId(invoice.id)
                setPaymentAmount(String(invoice.amount))
                setProofFile('')
                setProofFileName('')
              }}
            >
              {isPaymentCaptureOpen ? 'Confirm payment' : 'Payment received'}
            </button>
          )}
          {invoice.proofOfPaymentUrl && (
            <button type="button" onClick={() => setProofPreviewInvoice(invoice)}>
              Proof
            </button>
          )}
        </div>
        {isPaymentCaptureOpen && (
          <div className="payment-confirm-panel">
            <div
              className="payment-upload-area"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files[0]
                if (file) attachProofFile(file)
              }}
            >
              <label className="payment-attachment-icon" htmlFor={paymentProofInputId} aria-label="Attach proof of payment" title="Attach proof of payment">
                <AttachmentIcon />
                <input
                  id={paymentProofInputId}
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx"
                  capture="environment"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) attachProofFile(file)
                  }}
                />
              </label>
              <div>
                <span>Proof of payment</span>
                <strong>{proofFileName || 'Take photo, upload or drag file here'}</strong>
              </div>
            </div>
            <label>
              <span>Amount received</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder={String(invoice.amount)}
              />
            </label>
          </div>
        )}
      </article>
    )
  }

  return (
    <div className={`invoice-workflow-list ${compact ? 'compact' : ''}`}>
      {invoices.length ? invoices.map(renderInvoiceRow) : <p className="quiet">No invoices yet.</p>}
      {proofPreviewInvoice && (
        <ProofPreviewModal invoice={proofPreviewInvoice} onClose={() => setProofPreviewInvoice(null)} />
      )}
    </div>
  )
}

function ProofPreviewModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-window proof-preview-modal" aria-label="Proof of payment preview">
        <div className="modal-header">
          <div>
            <p>Proof of payment</p>
            <h2>{invoice.patientName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close proof preview">
            x
          </button>
        </div>
        <div className="modal-body proof-preview-body">
          <div className="proof-preview-card">
            <AttachmentIcon />
            <div>
              <strong>{invoice.proofOfPaymentName ?? invoice.proofOfPaymentUrl}</strong>
              <span>{invoice.id} · {formatMoney(invoice.paymentAmount ?? invoice.amount)}</span>
            </div>
          </div>
          {invoice.proofOfPaymentUrl ? (
            <iframe
              className="proof-preview-frame"
              src={invoice.proofOfPaymentUrl}
              title={`Proof of payment for ${invoice.id}`}
            />
          ) : (
            <div className="proof-preview-file">
              <DocumentIcon />
              <span>No proof file available.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Finances({
  sessionInvoiceDetails,
  invoiceRecords,
  onUpdateSession,
  onOpenPatientProfile,
  onMarkNoShow,
  onCancelSession,
  onSavePatientNote,
  onConfirmInvoice,
  onMarkPaymentReceived,
}: {
  sessionInvoiceDetails: SessionInvoiceDetail[]
  invoiceRecords: Invoice[]
  onUpdateSession: (session: CalendarSession) => void
  onOpenPatientProfile: (patientName: string) => void
  onMarkNoShow: (session: CalendarSession) => void
  onCancelSession: (session: CalendarSession, shouldReschedule: boolean) => void
  onSavePatientNote: (patientName: string, note: PatientNote) => void
  onConfirmInvoice: (invoiceId: string) => void
  onMarkPaymentReceived: (invoiceId: string, proofFile?: string, paymentAmount?: number, proofFileName?: string) => void
}) {
  const [activeInvoiceStage, setActiveInvoiceStage] = useState<InvoiceStatus>('awaiting_payment')
  const [invoiceDateRange, setInvoiceDateRange] = useState('past_month')
  const [selectedFinanceSession, setSelectedFinanceSession] = useState<SessionInvoiceDetail | null>(null)
  const [isFinanceSessionEditMode, setIsFinanceSessionEditMode] = useState(false)
  const sessionsNeedingInvoiceConfirmation = sessionInvoiceDetails.filter((session) => !session.isConfirmed && session.invoice)
  const invoiceStages: Array<{ status: InvoiceStatus; label: string }> = [
    { status: 'awaiting_payment', label: 'Awaiting payment' },
    { status: 'payment_due', label: 'Payment due' },
    { status: 'payment_received', label: 'Payment received' },
  ]
  const filteredInvoiceRecords = invoiceRecords.filter((invoice) => getInvoiceStatus(invoice) === activeInvoiceStage)

  return (
    <div className="page-grid">
      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Billing queue</p>
            <h2>Confirm invoices</h2>
          </div>
        </div>
        <div className="confirm-invoice-list">
          {sessionsNeedingInvoiceConfirmation.length ? (
            sessionsNeedingInvoiceConfirmation.map((session) => (
              <article
                className="confirm-invoice-session-card"
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedFinanceSession(session)
                  setIsFinanceSessionEditMode(false)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedFinanceSession(session)
                    setIsFinanceSessionEditMode(false)
                  }
                }}
              >
                <div>
                  <strong>{session.patient}</strong>
                  <span>{session.date} · {session.startTime}-{session.endTime} · {session.type} · {session.therapist}</span>
                </div>
                <div>
                  <b>{formatMoney(session.price)}</b>
                  <small>No invoice yet</small>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (session.invoice) onConfirmInvoice(session.invoice.id)
                  }}
                >
                  Confirm invoice
                </button>
              </article>
            ))
          ) : (
            <p className="quiet">All session invoices have been confirmed.</p>
          )}
        </div>
      </section>
      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Finance</p>
            <h2>Invoices and payments</h2>
          </div>
          <div className="invoice-filter-controls">
            <select
              className="invoice-date-range"
              value={invoiceDateRange}
              onChange={(event) => setInvoiceDateRange(event.target.value)}
              aria-label="Invoice date range"
            >
              <option value="past_week">Past week</option>
              <option value="past_month">Past month</option>
              <option value="past_3_months">Past 3 months</option>
              <option value="past_6_months">Past 6 months</option>
              <option value="past_year">Past year</option>
            </select>
            {invoiceStages.map((stage) => (
              <button
                type="button"
                className={activeInvoiceStage === stage.status ? 'active' : ''}
                onClick={() => setActiveInvoiceStage(stage.status)}
                key={stage.status}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
        <InvoiceWorkflowList
          invoices={filteredInvoiceRecords}
          onConfirmInvoice={onConfirmInvoice}
          onMarkPaymentReceived={onMarkPaymentReceived}
        />
      </section>
      {selectedFinanceSession && (
        <SessionDetailModal
          session={selectedFinanceSession}
          isEditing={isFinanceSessionEditMode}
          setIsEditing={setIsFinanceSessionEditMode}
          onChange={(updatedSession) => {
            onUpdateSession(updatedSession)
            setSelectedFinanceSession((current) => (current?.id === updatedSession.id ? { ...current, ...updatedSession } : current))
          }}
          onOpenPatientProfile={onOpenPatientProfile}
          onMarkNoShow={(session) => {
            onMarkNoShow(session)
            setSelectedFinanceSession(null)
          }}
          onCancelSession={(session, shouldReschedule) => {
            onCancelSession(session, shouldReschedule)
            setSelectedFinanceSession(null)
          }}
          onSavePatientNote={onSavePatientNote}
          invoiceRecords={invoiceRecords}
          onConfirmInvoice={onConfirmInvoice}
          onMarkPaymentReceived={onMarkPaymentReceived}
          onClose={() => setSelectedFinanceSession(null)}
        />
      )}
    </div>
  )
}

function Settings({
  role,
  setRole,
  practiceEntities: billingPracticeEntities,
  setPracticeEntities: setBillingPracticeEntities,
  practiceLocations: billingPracticeLocations,
  setPracticeLocations: setBillingPracticeLocations,
  procedurePriceLists: billingPriceLists,
  setProcedurePriceLists: setBillingPriceLists,
  procedurePriceRecords: billingCodes,
  setProcedurePriceRecords: setBillingCodes,
}: {
  role: Role
  setRole: (role: Role) => void
  practiceEntities: typeof practiceEntities
  setPracticeEntities: Dispatch<SetStateAction<typeof practiceEntities>>
  practiceLocations: typeof practiceLocations
  setPracticeLocations: Dispatch<SetStateAction<typeof practiceLocations>>
  procedurePriceLists: typeof billingPriceListDefaults
  setProcedurePriceLists: Dispatch<SetStateAction<typeof billingPriceListDefaults>>
  procedurePriceRecords: typeof billingCodeDefaults
  setProcedurePriceRecords: Dispatch<SetStateAction<typeof billingCodeDefaults>>
}) {
  const settingOptions = [
    { id: 'users', label: 'Users', detail: 'Add receptionists or therapists' },
    { id: 'practice', label: 'Practice Configuration', detail: 'Tenant workspace setup' },
    { id: 'patients', label: 'Patient Configuration', detail: 'Patient form fields' },
    { id: 'billing', label: 'Billing Configuration', detail: 'ICD-10, procedures and prices' },
    { id: 'guides', label: 'How To Guides', detail: 'Operating procedure' },
    { id: 'updates', label: "What's New", detail: 'Latest deployments' },
  ] as const
  const [activeSetting, setActiveSetting] = useState<(typeof settingOptions)[number]['id']>('users')
  const activeOption = settingOptions.find((option) => option.id === activeSetting) ?? settingOptions[0]
  const createBlankTenantUser = (): TenantUser => ({
    id: `user-${Date.now()}`,
    tenantId: tenant.tenantId,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'therapist',
    isActive: true,
    practiceNumber: '',
    usesOwnPracticeNumber: false,
    hpcsaNumber: '',
    qualification: '',
    discipline: '',
    bankingDetails: { accountName: '', bank: '', accountNumber: '', branchCode: '' },
    signatureUrl: '',
    createdAt: appTodayIso,
    updatedAt: appTodayIso,
  })
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([
    {
      id: 'user-1',
      tenantId: tenant.tenantId,
      firstName: 'Nadia',
      lastName: 'Botha',
      email: 'nadia@kidstherapy.example',
      phone: '082 551 0174',
      role: 'admin',
      isActive: true,
      practiceNumber: 'OT-88421',
      usesOwnPracticeNumber: true,
      hpcsaNumber: 'OT009921',
      qualification: 'BSc Occupational Therapy',
      discipline: 'Occupational Therapist',
      bankingDetails: { accountName: 'Nadia Botha', bank: 'FNB', accountNumber: '62000999111', branchCode: '250655' },
      signatureUrl: '',
      createdAt: '2026-06-20',
      updatedAt: '2026-07-03',
    },
    {
      id: 'user-2',
      tenantId: tenant.tenantId,
      firstName: 'Megan',
      lastName: 'Pillay',
      email: 'megan@kidstherapy.example',
      phone: '076 882 3149',
      role: 'therapist',
      isActive: true,
      practiceNumber: 'SP-33104',
      usesOwnPracticeNumber: true,
      hpcsaNumber: 'ST008331',
      qualification: 'B Speech-Language Pathology',
      discipline: 'Speech Therapist',
      bankingDetails: { accountName: 'Megan Pillay', bank: 'FNB', accountNumber: '62000888111', branchCode: '250655' },
      signatureUrl: '',
      createdAt: '2026-06-21',
      updatedAt: '2026-07-03',
    },
    {
      id: 'user-3',
      tenantId: tenant.tenantId,
      firstName: 'Lara',
      lastName: 'Meyer',
      email: 'frontdesk@kidstherapy.example',
      phone: '021 555 0100',
      role: 'receptionist',
      isActive: true,
      practiceNumber: '',
      usesOwnPracticeNumber: false,
      hpcsaNumber: '',
      qualification: '',
      discipline: '',
      bankingDetails: { accountName: '', bank: '', accountNumber: '', branchCode: '' },
      signatureUrl: '',
      createdAt: '2026-06-22',
      updatedAt: '2026-07-03',
    },
  ])
  const [selectedUserId, setSelectedUserId] = useState('user-1')
  const [isUserEditMode, setIsUserEditMode] = useState(false)
  const [draftUser, setDraftUser] = useState<TenantUser | null>(null)
  const isCreatingUser = Boolean(draftUser)
  const selectedUser = draftUser ?? tenantUsers.find((user) => user.id === selectedUserId) ?? tenantUsers[0]
  const updateSelectedUser = (field: keyof typeof selectedUser, value: string | boolean) => {
    if (draftUser) {
      setDraftUser({ ...draftUser, [field]: value, updatedAt: appTodayIso })
      return
    }
    setTenantUsers((users) =>
      users.map((user) =>
        user.id === selectedUser.id ? { ...user, [field]: value, updatedAt: appTodayIso } : user,
      ),
    )
  }
  const updateSelectedUserBanking = (field: keyof BankingDetails, value: string) => {
    if (draftUser) {
      setDraftUser({
        ...draftUser,
        bankingDetails: { ...draftUser.bankingDetails, [field]: value },
        updatedAt: appTodayIso,
      })
      return
    }
    setTenantUsers((users) =>
      users.map((user) =>
        user.id === selectedUser.id
          ? { ...user, bankingDetails: { ...user.bankingDetails, [field]: value }, updatedAt: appTodayIso }
          : user,
      ),
    )
  }
  const updateSelectedUserPracticeNumberPreference = (usesOwnPracticeNumber: boolean) => {
    if (draftUser) {
      setDraftUser({
        ...draftUser,
        usesOwnPracticeNumber,
        practiceNumber: usesOwnPracticeNumber ? draftUser.practiceNumber : '',
        updatedAt: appTodayIso,
      })
      return
    }
    setTenantUsers((users) =>
      users.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              usesOwnPracticeNumber,
              practiceNumber: usesOwnPracticeNumber ? user.practiceNumber : '',
              updatedAt: appTodayIso,
            }
          : user,
      ),
    )
  }
  const addTenantUser = () => {
    setDraftUser(createBlankTenantUser())
    setIsUserEditMode(false)
  }
  const saveDraftUser = () => {
    if (!draftUser) return
    const newUser = { ...draftUser, updatedAt: appTodayIso }
    setTenantUsers((users) => [...users, newUser])
    setSelectedUserId(newUser.id)
    setDraftUser(null)
    setIsUserEditMode(false)
    setRole(newUser.role === 'admin' ? 'Admin' : newUser.role === 'receptionist' ? 'Reception' : 'Therapist')
  }
  const deleteSelectedUser = () => {
    if (tenantUsers.length <= 1) return
    setTenantUsers((users) => {
      const remainingUsers = users.filter((user) => user.id !== selectedUser.id)
      setSelectedUserId(remainingUsers[0]?.id ?? '')
      setIsUserEditMode(false)
      return remainingUsers
    })
  }
  const [practiceConfig, setPracticeConfig] = useState({
    tenantId: tenant.tenantId,
    practiceName: tenant.name,
    registrationNumber: 'KTC-2026-019',
    address: '12 Oak Street, Cape Town',
    phone: '021 555 0100',
    email: 'admin@kidstherapy.example',
    website: 'https://kidstherapy.example',
    logoUrl: '/assets/AlliDesk_Main_App_logo.png',
    reportTemplateUrl: 'Parent progress report template',
    invoiceTemplateUrl: 'Standard invoice template',
    invoicePrefix: 'INV',
    bankingDetails: { accountName: 'Kids Therapy Centre', bank: 'FNB', accountNumber: '62000000000', branchCode: '250655' },
    paymentTerms: 'Payment due within 7 days',
    consentMessage: 'I consent to the collection, storage and use of patient information for assessment, therapy, reporting, billing and communication according to practice policy and POPIA requirements.',
    taxNumber: '',
    vatNumber: '',
    updatedAt: appTodayIso,
  })
  const [practiceLogoFileName, setPracticeLogoFileName] = useState('')
  const [isPracticeEditMode, setIsPracticeEditMode] = useState(false)
  const [draftPracticeConfig, setDraftPracticeConfig] = useState(practiceConfig)
  const [draftPracticeLogoFileName, setDraftPracticeLogoFileName] = useState('')
  const startPracticeEdit = () => {
    setDraftPracticeConfig(practiceConfig)
    setDraftPracticeLogoFileName(practiceLogoFileName)
    setIsPracticeEditMode(true)
  }
  const discardPracticeDraft = () => {
    setDraftPracticeConfig(practiceConfig)
    setDraftPracticeLogoFileName(practiceLogoFileName)
    setIsPracticeEditMode(false)
  }
  const savePracticeDraft = () => {
    setPracticeConfig({ ...draftPracticeConfig, updatedAt: appTodayIso })
    setPracticeLogoFileName(draftPracticeLogoFileName)
    setIsPracticeEditMode(false)
  }
  const updatePracticeConfig = (field: keyof typeof practiceConfig, value: string) => {
    setDraftPracticeConfig((config) => ({ ...config, [field]: value }))
  }
  const attachPracticeLogo = (file: File) => {
    setDraftPracticeLogoFileName(file.name)
    updatePracticeConfig('logoUrl', URL.createObjectURL(file))
  }
  const updatePracticeConfigBanking = (field: keyof BankingDetails, value: string) => {
    setDraftPracticeConfig((config) => ({
      ...config,
      bankingDetails: { ...config.bankingDetails, [field]: value },
    }))
  }
  const [patientConfig, setPatientConfig] = useState({
    tenantId: tenant.tenantId,
    intakeFields: [
      { id: 'field-name', label: 'Patient name', required: true, isActive: true },
      { id: 'field-dob', label: 'Date of birth', required: true, isActive: true },
      { id: 'field-address', label: 'Residential address', required: true, isActive: true },
      { id: 'field-medical-aid', label: 'Medical aid details', required: false, isActive: true },
      { id: 'field-consent', label: 'POPIA consent and signature', required: true, isActive: true },
    ],
    patientCategories: ['Child', 'Teen', 'Adult'],
    referralSources: ['Parent referral', 'School referral', 'Paediatrician', 'Doctor', 'Other therapist'],
    updatedAt: appTodayIso,
  })
  const togglePatientField = (fieldId: string, key: 'required' | 'isActive') => {
    setPatientConfig((config) => ({
      ...config,
      intakeFields: config.intakeFields.map((field) =>
        field.id === fieldId ? { ...field, [key]: !field[key] } : field,
      ),
      updatedAt: appTodayIso,
    }))
  }
  const addPatientField = () => {
    setPatientConfig((config) => ({
      ...config,
      intakeFields: [
        ...config.intakeFields,
        { id: `field-${Date.now()}`, label: 'New custom field', required: false, isActive: true },
      ],
      updatedAt: appTodayIso,
    }))
  }
  const updatePatientListValue = (key: 'patientCategories' | 'referralSources', value: string) => {
    setPatientConfig((config) => ({
      ...config,
      [key]: value.split(',').map((item) => item.trim()).filter(Boolean),
      updatedAt: appTodayIso,
    }))
  }
  const [billingRules, setBillingRules] = useState({
    tenantId: tenant.tenantId,
    allowTherapistBankingDetails: true,
    practiceNumberMode: 'mixed' as 'main_practice' | 'individual_therapist' | 'mixed',
    updatedAt: appTodayIso,
  })
  const billingSettingOptions = [
    { id: 'rules', label: 'User finance controls', detail: 'Billing rules' },
    { id: 'practices', label: 'Practice partners and locations', detail: 'Practices and venues' },
    { id: 'documents', label: 'Invoices and statements', detail: 'PDF tests' },
    { id: 'icd', label: 'ICD-10 codes', detail: 'Diagnosis codes' },
    { id: 'procedures', label: 'Procedure and prices', detail: 'Procedure pricing' },
  ] as const
  const [activeBillingSetting, setActiveBillingSetting] = useState<(typeof billingSettingOptions)[number]['id']>('rules')
  const [isBillingPracticesExpanded, setIsBillingPracticesExpanded] = useState(false)
  const activeBillingOption = billingSettingOptions.find((option) => option.id === activeBillingSetting) ?? billingSettingOptions[0]
  const openBillingDocumentPreview = (documentKind: 'invoice' | 'statement') => {
    const sampleInvoice = createInvoiceFromSession(weekSessions[0], 901, 'awaiting_payment')
    const invoiceForPreview: Invoice = {
      ...sampleInvoice,
      id: documentKind === 'statement' ? 'ST-TEST-001' : 'INV-TEST-001',
      kind: documentKind,
      serviceType: documentKind === 'statement' ? 'Customer statement - 2 invoices' : sampleInvoice.serviceType,
      amount: documentKind === 'statement' ? sampleInvoice.amount + billingCodeDefaults[1].defaultPrice : sampleInvoice.amount,
      lineItems: documentKind === 'statement'
        ? [
            ...(sampleInvoice.lineItems ?? []).map((item) => ({ ...item, invoiceId: 'INV-TEST-001', sessionDate: sampleInvoice.invoiceDate })),
            {
              invoiceId: 'INV-TEST-002',
              sessionDate: appTodayIso,
              procedureCode: billingCodeDefaults[1].code,
              description: billingCodeDefaults[1].serviceType,
              icd10Code: billingCodeDefaults[1].code,
              price: billingCodeDefaults[1].defaultPrice,
            },
          ]
        : sampleInvoice.lineItems,
      invoiceDate: appTodayIso,
      confirmedAt: appTodayIso,
      paymentDueDate: toIsoDate(addDays(parseIsoDate(appTodayIso), 7)),
      updatedAt: appTodayIso,
    }
    const documentOptions: InvoiceDocumentOptions = {
      practiceName: practiceConfig.practiceName,
      practiceAddress: practiceConfig.address,
      practicePhone: practiceConfig.phone,
      practiceEmail: practiceConfig.email,
      practiceWebsite: practiceConfig.website,
      practiceNumber: practiceConfig.registrationNumber,
      logoUrl: practiceConfig.logoUrl,
      paymentTerms: practiceConfig.paymentTerms,
      bankingDetails: practiceConfig.bankingDetails,
    }
    const documentUrl = documentKind === 'statement'
      ? generateStatementPdf(invoiceForPreview, documentOptions)
      : generateInvoicePdf(invoiceForPreview, documentOptions)
    window.open(documentUrl, '_blank', 'noopener,noreferrer')
  }
  const [selectedBillingPracticeId, setSelectedBillingPracticeId] = useState(billingPracticeEntities[0]?.id ?? '')
  const [editingPracticeLocationId, setEditingPracticeLocationId] = useState('')
  const selectedBillingPractice = billingPracticeEntities.find((practice) => practice.id === selectedBillingPracticeId) ?? billingPracticeEntities[0]
  const mainBillingPracticeId = billingPracticeEntities[0]?.id ?? ''
  const isSelectedMainPractice = selectedBillingPractice.id === mainBillingPracticeId
  const orderedBillingPracticeEntities = [...billingPracticeEntities].sort((practiceA, practiceB) => {
    if (practiceA.id === mainBillingPracticeId) return -1
    if (practiceB.id === mainBillingPracticeId) return 1
    return practiceA.name.localeCompare(practiceB.name)
  })
  const updateBillingRule = (field: keyof typeof billingRules, value: string | boolean) => {
    setBillingRules((rules) => ({ ...rules, [field]: value, updatedAt: appTodayIso }))
  }
  const addPracticeEntity = () => {
    const newPractice = {
      id: `practice-${Date.now()}`,
      tenantId: tenant.tenantId,
      name: 'New practice entity',
      practiceNumber: '',
      bankingDetails: { accountName: '', bank: '', accountNumber: '', branchCode: '' },
      invoicePrefix: 'INV',
      quotePrefix: 'QUO',
      paymentTerms: 'Payment due within 7 days',
      priceListId: selectedBillingPriceList.id,
      allowTherapistBankingOverride: billingRules.allowTherapistBankingDetails,
      isActive: true,
      createdAt: appTodayIso,
      updatedAt: appTodayIso,
    }
    setBillingPracticeEntities((items) => [...items, newPractice])
    setSelectedBillingPracticeId(newPractice.id)
  }
  const updatePracticeEntity = (id: string, field: keyof (typeof billingPracticeEntities)[number], value: string | boolean) => {
    if (id === mainBillingPracticeId && field !== 'priceListId') return
    setBillingPracticeEntities((items) => items.map((item) => (item.id === id ? { ...item, [field]: value, updatedAt: appTodayIso } : item)))
  }
  const updatePracticeEntityBanking = (id: string, field: keyof BankingDetails, value: string) => {
    if (id === mainBillingPracticeId) return
    setBillingPracticeEntities((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, bankingDetails: { ...item.bankingDetails, [field]: value }, updatedAt: appTodayIso }
          : item,
      ),
    )
  }
  const addPracticeLocation = () => {
    const newLocationId = `loc-${Date.now()}`
    setBillingPracticeLocations((items) => [
      ...items,
      { id: newLocationId, tenantId: tenant.tenantId, practiceEntityId: selectedBillingPractice.id, name: 'New location', address: '', contactNumber: '', isActive: true, createdAt: appTodayIso, updatedAt: appTodayIso },
    ])
    setEditingPracticeLocationId(newLocationId)
  }
  const updatePracticeLocation = (id: string, field: keyof (typeof billingPracticeLocations)[number], value: string | boolean) => {
    setBillingPracticeLocations((items) => items.map((item) => (item.id === id ? { ...item, [field]: value, updatedAt: appTodayIso } : item)))
  }
  const removePracticeLocation = (id: string) => {
    setBillingPracticeLocations((items) => items.filter((item) => item.id !== id))
    setEditingPracticeLocationId((current) => (current === id ? '' : current))
  }
  const [selectedBillingPriceListId, setSelectedBillingPriceListId] = useState(billingPriceLists[0]?.id ?? '')
  const [editingBillingPriceListId, setEditingBillingPriceListId] = useState('')
  const selectedBillingPriceList = billingPriceLists.find((priceList) => priceList.id === selectedBillingPriceListId) ?? billingPriceLists[0]
  const updateBillingPriceList = (id: string, field: keyof (typeof billingPriceLists)[number], value: string | boolean) => {
    setBillingPriceLists((items) => items.map((item) => (item.id === id ? { ...item, [field]: value, updatedAt: appTodayIso } : item)))
  }
  const removeBillingPriceList = (id: string) => {
    if (billingPriceLists.length <= 1) return
    const nextPriceList = billingPriceLists.find((priceList) => priceList.id !== id)
    setBillingPriceLists((items) => items.filter((item) => item.id !== id))
    setBillingCodes((codes) => codes.filter((code) => code.priceListId !== id))
    setBillingPracticeEntities((items) =>
      items.map((practice) => (practice.priceListId === id && nextPriceList ? { ...practice, priceListId: nextPriceList.id, updatedAt: appTodayIso } : practice)),
    )
    if (selectedBillingPriceListId === id && nextPriceList) setSelectedBillingPriceListId(nextPriceList.id)
    setEditingBillingPriceListId((current) => (current === id ? '' : current))
  }
  const addBillingPriceList = () => {
    const nextLetter = String.fromCharCode(65 + billingPriceLists.length)
    const newPriceList = {
      id: `price-list-${Date.now()}`,
      tenantId: tenant.tenantId,
      code: nextLetter,
      name: `Procedure and prices ${nextLetter}`,
      isActive: true,
      createdAt: appTodayIso,
      updatedAt: appTodayIso,
    }
    setBillingPriceLists((items) => [...items, newPriceList])
    setSelectedBillingPriceListId(newPriceList.id)
    setEditingBillingPriceListId(newPriceList.id)
  }
  const [icdCodes, setIcdCodes] = useState(icdCodeDefaults)
  const [editingIcdCodeId, setEditingIcdCodeId] = useState('')
  const [editingProcedureId, setEditingProcedureId] = useState('')
  const visibleBillingCodes = billingCodes.filter((item) => (item.priceListId || billingPriceLists[0]?.id) === selectedBillingPriceList.id)
  const addIcdCode = () => {
    const newIcdCodeId = `icd-${Date.now()}`
    setIcdCodes((codes) => [
      ...codes,
      {
        id: newIcdCodeId,
        tenantId: tenant.tenantId,
        code: '',
        createdAt: appTodayIso,
        updatedAt: appTodayIso,
      },
    ])
    setEditingIcdCodeId(newIcdCodeId)
  }
  const updateIcdCode = (id: string, value: string) => {
    setIcdCodes((codes) => codes.map((code) => (code.id === id ? { ...code, code: value, updatedAt: appTodayIso } : code)))
  }
  const removeIcdCode = (id: string) => {
    setIcdCodes((codes) => codes.filter((code) => code.id !== id))
    setEditingIcdCodeId((current) => (current === id ? '' : current))
  }
  const addBillingCode = () => {
    const newProcedureId = `billing-${Date.now()}`
    setBillingCodes((codes) => [
      ...codes,
      {
        id: newProcedureId,
        tenantId: tenant.tenantId,
        practiceEntityId: selectedBillingPractice.id,
        priceListId: selectedBillingPriceList.id,
        code: '',
        description: '',
        serviceType: '',
        defaultPrice: 0,
        durationMinutes: 30,
        discipline: '',
        isActive: true,
        createdAt: appTodayIso,
        updatedAt: appTodayIso,
      },
    ])
    setEditingProcedureId(newProcedureId)
  }
  const updateBillingCode = (id: string, field: keyof (typeof billingCodes)[number], value: string | number | boolean) => {
    setBillingCodes((codes) =>
      codes.map((code) => (code.id === id ? { ...code, [field]: value, updatedAt: appTodayIso } : code)),
    )
  }
  const removeBillingCode = (id: string) => {
    setBillingCodes((codes) => codes.filter((code) => code.id !== id))
    setEditingProcedureId((current) => (current === id ? '' : current))
  }
  const [guides, setGuides] = useState([
    { id: 'guide-1', tenantId: tenant.tenantId, title: 'Patient setup', category: 'Patients', body: 'Create patient, send intake link, confirm POPIA consent.', isActive: true, updatedAt: appTodayIso },
    { id: 'guide-2', tenantId: tenant.tenantId, title: 'Session notes', category: 'Clinical', body: 'Open booked session, add planning, add session feedback or internal process notes.', isActive: true, updatedAt: appTodayIso },
  ])
  const addGuide = () => {
    setGuides((items) => [
      ...items,
      { id: `guide-${Date.now()}`, tenantId: tenant.tenantId, title: 'New guide', category: 'Operations', body: '', isActive: true, updatedAt: appTodayIso },
    ])
  }
  const updateGuide = (id: string, field: keyof (typeof guides)[number], value: string | boolean) => {
    setGuides((items) => items.map((item) => (item.id === id ? { ...item, [field]: value, updatedAt: appTodayIso } : item)))
  }
  const [whatsNewItems, setWhatsNewItems] = useState([
    { id: 'update-1', title: 'Patient intake link', version: '0.7.0', summary: 'Added first-access intake form with POPIA consent and digital signature.', releaseDate: '2026-07-03', visibleToRoles: 'Admin, Therapist, Receptionist' },
    { id: 'update-2', title: 'Finance workflow', version: '0.6.0', summary: 'Added invoice status stages, payment proof capture and patient statements.', releaseDate: '2026-07-02', visibleToRoles: 'Admin, Finance' },
    { id: 'update-3', title: 'Settings areas', version: '0.5.0', summary: 'Grouped tenant configuration into clear admin settings sections.', releaseDate: '2026-06-30', visibleToRoles: 'Admin' },
  ])
  const addWhatsNew = () => {
    setWhatsNewItems((items) => [
      { id: `update-${Date.now()}`, title: 'New deployment note', version: '', summary: '', releaseDate: appTodayIso, visibleToRoles: 'Admin' },
      ...items,
    ])
  }
  const updateWhatsNew = (id: string, field: keyof (typeof whatsNewItems)[number], value: string) => {
    setWhatsNewItems((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <div className="settings-layout">
      <section className="panel settings-menu-panel">
        <div className="panel-heading">
          <div>
            <p>Settings</p>
            <h2>Configuration areas</h2>
          </div>
        </div>
        <div className="settings-option-list">
          {settingOptions.map((option) => (
            <button
              type="button"
              className={activeSetting === option.id ? 'active' : ''}
              key={option.id}
              onClick={() => setActiveSetting(option.id)}
            >
              <strong>{option.label}</strong>
              <span>{option.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel settings-detail-panel">
        <div className="panel-heading">
          <div>
            <p>{activeOption.detail}</p>
            <h2>{activeOption.label}</h2>
          </div>
        </div>
        {activeSetting === 'users' && (
          <div className="settings-detail-stack">
            <div className="settings-split users-settings-split">
              <section className="settings-config-card">
                <div className="panel-heading compact-heading">
                  <div>
                    <p>Tenant users</p>
                    <h2>Create and activate users</h2>
                  </div>
                  <button type="button" onClick={addTenantUser}>Add user</button>
                </div>
                <div className="settings-record-list">
                  {tenantUsers.length ? tenantUsers.map((user) => (
                    <button
                      type="button"
                      className={selectedUser.id === user.id ? 'active' : ''}
                      key={user.id}
                      onClick={() => {
                        setDraftUser(null)
                        setSelectedUserId(user.id)
                        setIsUserEditMode(false)
                        setRole(user.role === 'admin' ? 'Admin' : user.role === 'receptionist' ? 'Reception' : 'Therapist')
                      }}
                    >
                      <strong>{user.firstName || 'New'} {user.lastName || 'user'}</strong>
                      <span>{user.role} · {user.isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  )) : (
                    <p className="quiet">No tenant users have been created yet.</p>
                  )}
                </div>
              </section>
              <section className="settings-config-card">
                <div className="panel-heading compact-heading">
                  <div>
                    <p>User profile</p>
                    <div className="settings-user-title-row">
                      <h2>{isCreatingUser ? 'New user profile' : `${selectedUser.firstName || 'New'} ${selectedUser.lastName || 'user'}`}</h2>
                      <label className="settings-active-tick" title={selectedUser.isActive ? 'Active user' : 'Inactive user'}>
                        <input
                          type="checkbox"
                          checked={selectedUser.isActive}
                          disabled={!isCreatingUser && !isUserEditMode}
                          onChange={(event) => updateSelectedUser('isActive', event.target.checked)}
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>
                  {isCreatingUser ? (
                    <button type="button" className="settings-save-pill" onClick={saveDraftUser}>Save profile</button>
                  ) : (
                    <div className="settings-icon-actions">
                      {isUserEditMode && tenantUsers.length > 1 && (
                        <button type="button" className="danger" aria-label="Delete user" title="Delete user" onClick={deleteSelectedUser}>
                          <TrashIcon />
                        </button>
                      )}
                      <button
                        type="button"
                        className={isUserEditMode ? 'save-mode' : ''}
                        aria-label={isUserEditMode ? 'Save user' : 'Edit user'}
                        title={isUserEditMode ? 'Save user' : 'Edit user'}
                        onClick={() => setIsUserEditMode((current) => !current)}
                      >
                        <PencilIcon />
                      </button>
                    </div>
                  )}
                </div>
                {(isUserEditMode || isCreatingUser) ? (
                  <>
                    <div className="settings-form-grid">
                      <label><span>First name</span><input value={selectedUser.firstName} onChange={(event) => updateSelectedUser('firstName', event.target.value)} /></label>
                      <label><span>Last name</span><input value={selectedUser.lastName} onChange={(event) => updateSelectedUser('lastName', event.target.value)} /></label>
                      <label><span>Email</span><input value={selectedUser.email} onChange={(event) => updateSelectedUser('email', event.target.value)} /></label>
                      <label><span>Phone</span><input value={selectedUser.phone} onChange={(event) => updateSelectedUser('phone', event.target.value)} /></label>
                      <label>
                        <span>Role</span>
                        <select value={selectedUser.role} onChange={(event) => updateSelectedUser('role', event.target.value)}>
                          <option value="admin">admin</option>
                          <option value="receptionist">receptionist</option>
                          <option value="therapist">therapist</option>
                          <option value="finance">finance</option>
                        </select>
                      </label>
                    </div>
                    {selectedUser.role === 'therapist' && (
                      <div className="settings-form-grid therapist-detail-grid">
                        <label className="practice-number-toggle wide-field">
                          <input type="checkbox" checked={selectedUser.usesOwnPracticeNumber} onChange={(event) => updateSelectedUserPracticeNumberPreference(event.target.checked)} />
                          <span>Use own practice number</span>
                        </label>
                        {selectedUser.usesOwnPracticeNumber && (
                          <label><span>Therapist practice number</span><input value={selectedUser.practiceNumber} onChange={(event) => updateSelectedUser('practiceNumber', event.target.value)} /></label>
                        )}
                        <label><span>HPCSA number</span><input value={selectedUser.hpcsaNumber} onChange={(event) => updateSelectedUser('hpcsaNumber', event.target.value)} /></label>
                        <label><span>Discipline</span><input value={selectedUser.discipline} onChange={(event) => updateSelectedUser('discipline', event.target.value)} /></label>
                        <label><span>Qualification</span><input value={selectedUser.qualification} onChange={(event) => updateSelectedUser('qualification', event.target.value)} /></label>
                        {billingRules.allowTherapistBankingDetails && (
                          <div className="settings-banking-grid wide-field">
                            <span>Therapist banking details</span>
                            <label><small>Acc Name</small><input value={selectedUser.bankingDetails.accountName} onChange={(event) => updateSelectedUserBanking('accountName', event.target.value)} /></label>
                            <label><small>Bank</small><input value={selectedUser.bankingDetails.bank} onChange={(event) => updateSelectedUserBanking('bank', event.target.value)} /></label>
                            <label><small>Acc nr</small><input value={selectedUser.bankingDetails.accountNumber} onChange={(event) => updateSelectedUserBanking('accountNumber', event.target.value)} /></label>
                            <label><small>Code</small><input value={selectedUser.bankingDetails.branchCode} onChange={(event) => updateSelectedUserBanking('branchCode', event.target.value)} /></label>
                          </div>
                        )}
                        <div className="intake-signature-field professional-signature-field wide-field">
                          <span>Professional signature</span>
                          <SignaturePad
                            value={selectedUser.signatureUrl}
                            onChange={(value) => updateSelectedUser('signatureUrl', value)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="settings-readonly-grid">
                      <div><span>First name</span><strong>{selectedUser.firstName || '-'}</strong></div>
                      <div><span>Last name</span><strong>{selectedUser.lastName || '-'}</strong></div>
                      <div><span>Email</span><strong>{selectedUser.email || '-'}</strong></div>
                      <div><span>Phone</span><strong>{selectedUser.phone || '-'}</strong></div>
                      <div><span>Role</span><strong>{selectedUser.role}</strong></div>
                      <div><span>Updated</span><strong>{selectedUser.updatedAt}</strong></div>
                    </div>
                    {selectedUser.role === 'therapist' && (
                      <div className="settings-readonly-grid therapist-detail-grid">
                        <div className="wide-field"><span>Billing practice number</span><strong>{selectedUser.usesOwnPracticeNumber ? 'Uses therapist own practice number' : 'Uses main practice number'}</strong></div>
                        {selectedUser.usesOwnPracticeNumber && (
                          <div><span>Therapist practice number</span><strong>{selectedUser.practiceNumber || '-'}</strong></div>
                        )}
                        <div><span>HPCSA number</span><strong>{selectedUser.hpcsaNumber || '-'}</strong></div>
                        <div><span>Discipline</span><strong>{selectedUser.discipline || '-'}</strong></div>
                        <div><span>Qualification</span><strong>{selectedUser.qualification || '-'}</strong></div>
                        {billingRules.allowTherapistBankingDetails && (
                          <div className="settings-readonly-banking wide-field">
                            <span>Therapist banking details</span>
                            <div><small>Acc Name</small><strong>{selectedUser.bankingDetails.accountName || '-'}</strong></div>
                            <div><small>Bank</small><strong>{selectedUser.bankingDetails.bank || '-'}</strong></div>
                            <div><small>Acc nr</small><strong>{selectedUser.bankingDetails.accountNumber || '-'}</strong></div>
                            <div><small>Code</small><strong>{selectedUser.bankingDetails.branchCode || '-'}</strong></div>
                          </div>
                        )}
                        <div className="professional-signature-preview wide-field">
                          <span>Professional signature</span>
                          {selectedUser.signatureUrl ? (
                            <img src={selectedUser.signatureUrl} alt="Professional signature" />
                          ) : (
                            <strong>No signature captured</strong>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        )}

        {activeSetting === 'practice' && (
          <div className="settings-detail-stack">
            <div className="settings-config-card">
              <div className="panel-heading compact-heading">
                <div>
                  <p>Practice profile</p>
                  <h2>{practiceConfig.practiceName}</h2>
                </div>
                <div className="settings-icon-actions">
                  {isPracticeEditMode && (
                    <button type="button" className="danger" aria-label="Discard practice changes" title="Discard practice changes" onClick={discardPracticeDraft}>
                      <TrashIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    className={isPracticeEditMode ? 'save-mode' : ''}
                    aria-label={isPracticeEditMode ? 'Editing practice profile' : 'Edit practice profile'}
                    title={isPracticeEditMode ? 'Editing practice profile' : 'Edit practice profile'}
                    onClick={() => {
                      if (!isPracticeEditMode) startPracticeEdit()
                    }}
                  >
                    <PencilIcon />
                  </button>
                </div>
              </div>
              {isPracticeEditMode ? (
                <>
                  <div className="settings-form-grid">
                    <label><span>Practice name</span><input value={draftPracticeConfig.practiceName} onChange={(event) => updatePracticeConfig('practiceName', event.target.value)} /></label>
                    <label><span>Registration number</span><input value={draftPracticeConfig.registrationNumber} onChange={(event) => updatePracticeConfig('registrationNumber', event.target.value)} /></label>
                    <label className="wide-field">
                      <span>Practice address</span>
                      <input value={draftPracticeConfig.address} onChange={(event) => updatePracticeConfig('address', event.target.value)} />
                      <small className="field-helper">Separate main address lines with commas so invoices and statements can stack them correctly.</small>
                    </label>
                    <label><span>Phone</span><input value={draftPracticeConfig.phone} onChange={(event) => updatePracticeConfig('phone', event.target.value)} /></label>
                    <label><span>Email</span><input value={draftPracticeConfig.email} onChange={(event) => updatePracticeConfig('email', event.target.value)} /></label>
                    <label><span>Website</span><input value={draftPracticeConfig.website} onChange={(event) => updatePracticeConfig('website', event.target.value)} /></label>
                    <label><span>Invoice prefix</span><input value={draftPracticeConfig.invoicePrefix} onChange={(event) => updatePracticeConfig('invoicePrefix', event.target.value)} /></label>
                    <label><span>Tax number</span><input value={draftPracticeConfig.taxNumber} onChange={(event) => updatePracticeConfig('taxNumber', event.target.value)} /></label>
                    <label><span>VAT number</span><input value={draftPracticeConfig.vatNumber} onChange={(event) => updatePracticeConfig('vatNumber', event.target.value)} /></label>
                    <div
                      className="payment-upload-area practice-logo-upload wide-field"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        const file = event.dataTransfer.files[0]
                        if (file) attachPracticeLogo(file)
                      }}
                    >
                      <label className="payment-attachment-icon" htmlFor="practice-logo-upload" aria-label="Upload practice logo" title="Upload practice logo">
                        <AttachmentIcon />
                        <input
                          id="practice-logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) attachPracticeLogo(file)
                          }}
                        />
                      </label>
                      <div>
                        <span>Logo upload</span>
                        <strong>{draftPracticeLogoFileName || practiceLogoFileName || 'Upload or drag logo file here'}</strong>
                      </div>
                    </div>
                    <label className="wide-field"><span>Default invoicing details</span><textarea value={draftPracticeConfig.invoiceTemplateUrl} onChange={(event) => updatePracticeConfig('invoiceTemplateUrl', event.target.value)} /></label>
                    <label className="wide-field">
                      <span>Consent</span>
                      <textarea value={draftPracticeConfig.consentMessage} onChange={(event) => updatePracticeConfig('consentMessage', event.target.value)} />
                      <small className="field-helper">Add the consent message patients or guardians should agree to during intake.</small>
                    </label>
                    <div className="settings-banking-grid practice-banking-grid wide-field">
                      <span>Banking details</span>
                      <label><small>Account name</small><input value={draftPracticeConfig.bankingDetails.accountName} onChange={(event) => updatePracticeConfigBanking('accountName', event.target.value)} /></label>
                      <label><small>Bank</small><input value={draftPracticeConfig.bankingDetails.bank} onChange={(event) => updatePracticeConfigBanking('bank', event.target.value)} /></label>
                      <label><small>Account number</small><input value={draftPracticeConfig.bankingDetails.accountNumber} onChange={(event) => updatePracticeConfigBanking('accountNumber', event.target.value)} /></label>
                      <label><small>Code</small><input value={draftPracticeConfig.bankingDetails.branchCode} onChange={(event) => updatePracticeConfigBanking('branchCode', event.target.value)} /></label>
                    </div>
                    <label className="wide-field"><span>Payment terms</span><textarea value={draftPracticeConfig.paymentTerms} onChange={(event) => updatePracticeConfig('paymentTerms', event.target.value)} /></label>
                  </div>
                  <div className="settings-action-row">
                    <button type="button" onClick={savePracticeDraft}>Save practice configuration</button>
                  </div>
                </>
              ) : (
                <div className="settings-readonly-grid">
                  <div><span>Practice name</span><strong>{practiceConfig.practiceName || '-'}</strong></div>
                  <div><span>Registration number</span><strong>{practiceConfig.registrationNumber || '-'}</strong></div>
                  <div className="wide-field"><span>Practice address</span><strong>{practiceConfig.address || '-'}</strong></div>
                  <div><span>Phone</span><strong>{practiceConfig.phone || '-'}</strong></div>
                  <div><span>Email</span><strong>{practiceConfig.email || '-'}</strong></div>
                  <div><span>Website</span><strong>{practiceConfig.website || '-'}</strong></div>
                  <div><span>Invoice prefix</span><strong>{practiceConfig.invoicePrefix || '-'}</strong></div>
                  <div><span>Tax number</span><strong>{practiceConfig.taxNumber || '-'}</strong></div>
                  <div><span>VAT number</span><strong>{practiceConfig.vatNumber || '-'}</strong></div>
                  <div><span>Logo</span><strong>{practiceLogoFileName || practiceConfig.logoUrl || '-'}</strong></div>
                  <div><span>Updated</span><strong>{practiceConfig.updatedAt}</strong></div>
                  <div className="wide-field"><span>Default invoicing details</span><strong>{practiceConfig.invoiceTemplateUrl || '-'}</strong></div>
                  <div className="wide-field"><span>Consent</span><strong>{practiceConfig.consentMessage || '-'}</strong></div>
                  <div className="settings-readonly-banking wide-field">
                    <span>Banking details</span>
                    <div><small>Account name</small><strong>{practiceConfig.bankingDetails.accountName || '-'}</strong></div>
                    <div><small>Bank</small><strong>{practiceConfig.bankingDetails.bank || '-'}</strong></div>
                    <div><small>Account number</small><strong>{practiceConfig.bankingDetails.accountNumber || '-'}</strong></div>
                    <div><small>Code</small><strong>{practiceConfig.bankingDetails.branchCode || '-'}</strong></div>
                  </div>
                  <div className="wide-field"><span>Payment terms</span><strong>{practiceConfig.paymentTerms || '-'}</strong></div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSetting === 'patients' && (
          <div className="settings-detail-stack">
            <div className="settings-config-card">
              <div className="panel-heading compact-heading">
                <div>
                  <p>Patient intake</p>
                  <h2>Fields and required settings</h2>
                </div>
                <button type="button" onClick={addPatientField}>Add field</button>
              </div>
              <div className="settings-table-list">
                {patientConfig.intakeFields.length ? patientConfig.intakeFields.map((field) => (
                  <article key={field.id}>
                    <strong>{field.label}</strong>
                    <button type="button" className={field.required ? 'active' : ''} onClick={() => togglePatientField(field.id, 'required')}>
                      {field.required ? 'Required' : 'Optional'}
                    </button>
                    <button type="button" className={field.isActive ? 'active' : ''} onClick={() => togglePatientField(field.id, 'isActive')}>
                      {field.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </article>
                )) : (
                  <p className="quiet">No patient intake fields configured.</p>
                )}
              </div>
            </div>
            <div className="settings-config-card">
              <div className="settings-form-grid">
                <label className="wide-field"><span>Patient categories</span><textarea value={patientConfig.patientCategories.join(', ')} onChange={(event) => updatePatientListValue('patientCategories', event.target.value)} /></label>
                <label className="wide-field"><span>Referral sources</span><textarea value={patientConfig.referralSources.join(', ')} onChange={(event) => updatePatientListValue('referralSources', event.target.value)} /></label>
              </div>
              <div className="settings-action-row">
                <button type="button">Save patient configuration</button>
                <button type="button" className="secondary-action">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {activeSetting === 'billing' && (
          <div className="settings-detail-stack">
            <div className="settings-split users-settings-split billing-settings-split">
              <section className="settings-config-card">
                <div className="panel-heading compact-heading">
                  <div>
                    <p>Billing configuration</p>
                    <h2>Options</h2>
                  </div>
                </div>
                <div className="settings-record-list">
                  {billingSettingOptions.map((option) => (
                    <div
                      className={`billing-option-item ${activeBillingSetting === option.id ? 'active' : ''} ${option.id === 'practices' && isBillingPracticesExpanded ? 'expanded' : ''}`}
                      key={option.id}
                    >
                      <div className="billing-option-trigger">
                        <button
                          type="button"
                          className="billing-option-main"
                          onClick={() => setActiveBillingSetting(option.id)}
                        >
                          <span>
                            <strong>{option.label}</strong>
                            {option.id !== 'practices' && <small>{option.detail}</small>}
                          </span>
                        </button>
                        {option.id === 'practices' && (
                          <button
                            type="button"
                            className="billing-option-arrow"
                            aria-label={isBillingPracticesExpanded ? 'Hide practice partners and locations' : 'Show practice partners and locations'}
                            title={isBillingPracticesExpanded ? 'Hide practice partners and locations' : 'Show practice partners and locations'}
                            onClick={(event) => {
                              event.stopPropagation()
                              setActiveBillingSetting('practices')
                              setIsBillingPracticesExpanded((current) => !current)
                            }}
                          >
                            <span aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {option.id === 'practices' && isBillingPracticesExpanded && (
                        <div className="billing-partner-list">
                          {orderedBillingPracticeEntities.map((practice) => {
                            const locations = billingPracticeLocations.filter((location) => location.practiceEntityId === practice.id)
                            const isMainPractice = practice.id === mainBillingPracticeId
                            return (
                              <button
                                type="button"
                                className={selectedBillingPractice.id === practice.id ? 'active' : ''}
                                key={practice.id}
                                onClick={() => setSelectedBillingPracticeId(practice.id)}
                              >
                                <strong>{practice.name}</strong>
                                <span>{isMainPractice ? 'Main practice' : practice.practiceNumber || 'No practice number'} · {practice.isActive ? 'Active' : 'Inactive'}</span>
                                <small>{locations.length ? locations.map((location) => location.name).join(', ') : 'No locations yet'}</small>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="settings-config-card">
                <div className="panel-heading compact-heading">
                  <div>
                    <p>{activeBillingOption.detail}</p>
                    <h2>{activeBillingOption.label}</h2>
                  </div>
                  {activeBillingSetting === 'rules' && <span className="config-updated-pill">Updated {billingRules.updatedAt}</span>}
                  {activeBillingSetting === 'practices' && <button type="button" onClick={addPracticeEntity}>Add practice</button>}
                  {activeBillingSetting === 'icd' && <button type="button" onClick={addIcdCode}>Add ICD-10 code</button>}
                  {activeBillingSetting === 'procedures' && (
                    <div className="settings-action-row">
                      <button type="button" onClick={addBillingPriceList}>Add list</button>
                      <button type="button" onClick={addBillingCode}>Add procedure</button>
                    </div>
                  )}
                </div>

                {activeBillingSetting === 'rules' && (
                  <div className="settings-form-grid">
                    <label className="practice-number-toggle wide-field">
                      <input
                        type="checkbox"
                        checked={billingRules.allowTherapistBankingDetails}
                        onChange={(event) => updateBillingRule('allowTherapistBankingDetails', event.target.checked)}
                      />
                      <span>Allow therapists to use their own banking details on quotes and invoices</span>
                    </label>
                    <label>
                      <span>Practice number mode</span>
                      <select value={billingRules.practiceNumberMode} onChange={(event) => updateBillingRule('practiceNumberMode', event.target.value)}>
                        <option value="main_practice">main_practice</option>
                        <option value="individual_therapist">individual_therapist</option>
                        <option value="mixed">mixed</option>
                      </select>
                    </label>
                  </div>
                )}

                {activeBillingSetting === 'practices' && (
                  <div className="settings-detail-stack">
                    <div className="billing-practice-editor">
                      {isSelectedMainPractice ? (
                        <div className="settings-readonly-grid">
                          <div className="wide-field">
                            <span>Main practice</span>
                            <strong>{selectedBillingPractice.name}</strong>
                            <small className="settings-footnote">Main practice details are edited in Practice Configuration. Add or update extra locations here only.</small>
                          </div>
                          <div>
                            <span>Practice number</span>
                            <strong>{selectedBillingPractice.practiceNumber || '-'}</strong>
                          </div>
                          <div>
                            <span>Status</span>
                            <strong>{selectedBillingPractice.isActive ? 'Active' : 'Inactive'}</strong>
                          </div>
                          <label className="settings-readonly-select wide-field">
                            <span>Affiliated procedure and prices</span>
                            <select value={selectedBillingPractice.priceListId} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'priceListId', event.target.value)}>
                              {billingPriceLists.map((priceList) => (
                                <option value={priceList.id} key={priceList.id}>{priceList.name}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      ) : (
                        <div className="settings-form-grid">
                          <label><span>Name</span><input value={selectedBillingPractice.name} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'name', event.target.value)} /></label>
                          <label><span>Practice number</span><input value={selectedBillingPractice.practiceNumber} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'practiceNumber', event.target.value)} /></label>
                          <label><span>Invoice prefix</span><input value={selectedBillingPractice.invoicePrefix} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'invoicePrefix', event.target.value)} /></label>
                          <label><span>Quote prefix</span><input value={selectedBillingPractice.quotePrefix} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'quotePrefix', event.target.value)} /></label>
                          <label>
                            <span>Affiliated procedure and prices</span>
                            <select value={selectedBillingPractice.priceListId} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'priceListId', event.target.value)}>
                              {billingPriceLists.map((priceList) => (
                                <option value={priceList.id} key={priceList.id}>{priceList.name}</option>
                              ))}
                            </select>
                          </label>
                          <div className="settings-banking-grid wide-field">
                            <span>Banking details</span>
                            <label><small>Acc Name</small><input value={selectedBillingPractice.bankingDetails.accountName} onChange={(event) => updatePracticeEntityBanking(selectedBillingPractice.id, 'accountName', event.target.value)} /></label>
                            <label><small>Bank</small><input value={selectedBillingPractice.bankingDetails.bank} onChange={(event) => updatePracticeEntityBanking(selectedBillingPractice.id, 'bank', event.target.value)} /></label>
                            <label><small>Acc nr</small><input value={selectedBillingPractice.bankingDetails.accountNumber} onChange={(event) => updatePracticeEntityBanking(selectedBillingPractice.id, 'accountNumber', event.target.value)} /></label>
                            <label><small>Code</small><input value={selectedBillingPractice.bankingDetails.branchCode} onChange={(event) => updatePracticeEntityBanking(selectedBillingPractice.id, 'branchCode', event.target.value)} /></label>
                          </div>
                          <label className="wide-field"><span>Payment terms</span><textarea value={selectedBillingPractice.paymentTerms} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'paymentTerms', event.target.value)} /></label>
                          <label className="practice-number-toggle wide-field">
                            <input type="checkbox" checked={selectedBillingPractice.allowTherapistBankingOverride} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'allowTherapistBankingOverride', event.target.checked)} />
                            <span>Allow therapist banking override for this practice</span>
                          </label>
                          <label className="practice-number-toggle wide-field">
                            <input type="checkbox" checked={selectedBillingPractice.isActive} onChange={(event) => updatePracticeEntity(selectedBillingPractice.id, 'isActive', event.target.checked)} />
                            <span>{selectedBillingPractice.isActive ? 'Practice active' : 'Practice inactive'}</span>
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="panel-heading compact-heading">
                      <div>
                        <p>Practice locations</p>
                        <h2>{selectedBillingPractice.name}</h2>
                      </div>
                      <button type="button" onClick={addPracticeLocation}>Add location</button>
                    </div>
                    <div className="practice-location-list">
                      {billingPracticeLocations.filter((location) => location.practiceEntityId === selectedBillingPractice.id).map((location) => {
                        const isLocationEditing = editingPracticeLocationId === location.id
                        return (
                          <article className={isLocationEditing ? 'editing' : ''} key={location.id}>
                            {isLocationEditing ? (
                              <>
                                <input value={location.name} onChange={(event) => updatePracticeLocation(location.id, 'name', event.target.value)} />
                                <input value={location.address} onChange={(event) => updatePracticeLocation(location.id, 'address', event.target.value)} />
                                <input value={location.contactNumber} onChange={(event) => updatePracticeLocation(location.id, 'contactNumber', event.target.value)} />
                              </>
                            ) : (
                              <div className="practice-location-summary">
                                <strong>{location.name}</strong>
                                <span>{location.address || 'No address captured'}</span>
                                <small>{location.contactNumber || 'No contact number'} · {location.isActive ? 'Active' : 'Inactive'}</small>
                              </div>
                            )}
                            <div className="practice-location-actions">
                              {isLocationEditing && (
                                <button type="button" className="danger" aria-label="Delete location" title="Delete location" onClick={() => removePracticeLocation(location.id)}>
                                  <TrashIcon />
                                </button>
                              )}
                              <button
                                type="button"
                                className={isLocationEditing ? 'save-mode' : ''}
                                aria-label={isLocationEditing ? 'Save location' : 'Edit location'}
                                title={isLocationEditing ? 'Save location' : 'Edit location'}
                                onClick={() => setEditingPracticeLocationId((current) => (current === location.id ? '' : location.id))}
                              >
                                <PencilIcon />
                              </button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </div>
                )}

                {activeBillingSetting === 'documents' && (
                  <div className="billing-document-tests">
                    <article>
                      <div>
                        <span>Invoice PDF</span>
                        <strong>Physical invoice preview</strong>
                        <small>Tests therapist, practice, patient, guardian, medical aid, procedure rows and ICD-10 display.</small>
                      </div>
                      <button type="button" onClick={() => openBillingDocumentPreview('invoice')}>
                        Test invoice
                      </button>
                    </article>
                    <article>
                      <div>
                        <span>Statement PDF</span>
                        <strong>Physical statement preview</strong>
                        <small>Uses the same design language, practice details and logo position for customer statements.</small>
                      </div>
                      <button type="button" onClick={() => openBillingDocumentPreview('statement')}>
                        Test statement
                      </button>
                    </article>
                    <p className="settings-footnote">Invoice and statement PDF previews use Practice Configuration for address, contact details, logo, payment terms and banking details.</p>
                  </div>
                )}

                {activeBillingSetting === 'icd' && (
                  <>
                    <p className="quiet">Manage ICD-10 codes separately from procedure pricing. These codes can be used when creating sessions, invoices and clinical records.</p>
                    <div className="billing-admin-list icd-code-list">
                      {icdCodes.length ? icdCodes.map((item) => {
                        const isIcdEditing = editingIcdCodeId === item.id
                        return (
                          <article className={isIcdEditing ? 'editing' : ''} key={item.id}>
                            {isIcdEditing ? (
                              <input value={item.code} placeholder="ICD-10 code" onChange={(event) => updateIcdCode(item.id, event.target.value)} />
                            ) : (
                              <strong>{item.code || 'No ICD-10 code captured'}</strong>
                            )}
                            <div className="practice-location-actions">
                              {isIcdEditing && (
                                <button type="button" className="danger" aria-label="Delete ICD-10 code" title="Delete ICD-10 code" onClick={() => removeIcdCode(item.id)}>
                                  <TrashIcon />
                                </button>
                              )}
                              <button
                                type="button"
                                className={isIcdEditing ? 'save-mode' : ''}
                                aria-label={isIcdEditing ? 'Save ICD-10 code' : 'Edit ICD-10 code'}
                                title={isIcdEditing ? 'Save ICD-10 code' : 'Edit ICD-10 code'}
                                onClick={() => setEditingIcdCodeId((current) => (current === item.id ? '' : item.id))}
                              >
                                <PencilIcon />
                              </button>
                            </div>
                          </article>
                        )
                      }) : (
                        <p className="quiet">No ICD-10 codes configured.</p>
                      )}
                    </div>
                  </>
                )}

                {activeBillingSetting === 'procedures' && (
                  <>
                    <div className="price-list-controls" aria-label="Procedure and prices lists">
                      {billingPriceLists.map((priceList) => {
                        const isPriceListEditing = editingBillingPriceListId === priceList.id
                        return (
                          <div className={`price-list-item ${selectedBillingPriceList.id === priceList.id ? 'active' : ''} ${isPriceListEditing ? 'editing' : ''}`} key={priceList.id}>
                            <button
                              type="button"
                              className="price-list-select"
                              onClick={() => setSelectedBillingPriceListId(priceList.id)}
                            >
                              <span>{priceList.code}</span>
                              {isPriceListEditing ? (
                                <input
                                  value={priceList.name}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) => updateBillingPriceList(priceList.id, 'name', event.target.value)}
                                />
                              ) : (
                                <strong>{priceList.name}</strong>
                              )}
                            </button>
                            {isPriceListEditing && (
                              <button
                                type="button"
                                className="price-list-edit danger"
                                aria-label="Delete procedure and prices list"
                                title="Delete procedure and prices list"
                                onClick={() => removeBillingPriceList(priceList.id)}
                              >
                                <TrashIcon />
                              </button>
                            )}
                            <button
                              type="button"
                              className={`price-list-edit ${isPriceListEditing ? 'save-mode' : ''}`}
                              aria-label={isPriceListEditing ? 'Save procedure and prices name' : 'Edit procedure and prices name'}
                              title={isPriceListEditing ? 'Save procedure and prices name' : 'Edit procedure and prices name'}
                              onClick={() => {
                                setSelectedBillingPriceListId(priceList.id)
                                setEditingBillingPriceListId((current) => (current === priceList.id ? '' : priceList.id))
                              }}
                            >
                              <PencilIcon />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <p className="quiet">Manage procedures and prices for {selectedBillingPriceList.name}. ICD-10 codes stay in their own section.</p>
                    <div className="billing-admin-list procedure-price-list">
                      {visibleBillingCodes.length ? visibleBillingCodes.map((item) => {
                        const isProcedureEditing = editingProcedureId === item.id
                        return (
                          <article className={isProcedureEditing ? 'editing' : ''} key={item.id}>
                            {isProcedureEditing ? (
                              <>
                                <input value={item.code} placeholder="Procedure code" onChange={(event) => updateBillingCode(item.id, 'code', event.target.value)} />
                                <input value={item.description} placeholder="Description" onChange={(event) => updateBillingCode(item.id, 'description', event.target.value)} />
                                <input type="number" value={item.defaultPrice} onChange={(event) => updateBillingCode(item.id, 'defaultPrice', Number(event.target.value))} />
                                <select value={item.durationMinutes ?? 0} onChange={(event) => updateBillingCode(item.id, 'durationMinutes', Number(event.target.value))}>
                                  <option value={0}>N/A</option>
                                  {Array.from({ length: 12 }, (_, index) => (index + 1) * 15).map((minutes) => (
                                    <option value={minutes} key={minutes}>{minutes} min</option>
                                  ))}
                                </select>
                              </>
                            ) : (
                              <div className="procedure-price-summary">
                                <strong>{item.code || 'No procedure code'}</strong>
                                <span>{item.description || 'No description captured'}</span>
                                <small>R {item.defaultPrice.toLocaleString('en-ZA')} · {item.durationMinutes ? `${item.durationMinutes} min` : 'N/A'}</small>
                              </div>
                            )}
                            <div className="practice-location-actions">
                              {isProcedureEditing && (
                                <button type="button" className="line-icon-button danger" aria-label="Delete procedure" title="Delete procedure" onClick={() => removeBillingCode(item.id)}>
                                  <TrashIcon />
                                </button>
                              )}
                              <button
                                type="button"
                                className={`line-icon-button ${isProcedureEditing ? 'save-mode' : ''}`}
                                aria-label={isProcedureEditing ? 'Save procedure' : 'Edit procedure'}
                                title={isProcedureEditing ? 'Save procedure' : 'Edit procedure'}
                                onClick={() => setEditingProcedureId((current) => (current === item.id ? '' : item.id))}
                              >
                                <PencilIcon />
                              </button>
                            </div>
                          </article>
                        )
                      }) : (
                        <p className="quiet">No procedures configured for {selectedBillingPriceList.name}.</p>
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        )}

        {activeSetting === 'guides' && (
          <div className="settings-detail-stack">
            <div className="panel-heading compact-heading">
              <div>
                <p>Operating procedures</p>
                <h2>Admin-editable guides</h2>
              </div>
              <button type="button" onClick={addGuide}>Create guide</button>
            </div>
            <div className="guide-admin-list">
              {guides.length ? guides.map((guide) => (
                <article key={guide.id}>
                  <div className="settings-form-grid">
                    <label><span>Title</span><input value={guide.title} onChange={(event) => updateGuide(guide.id, 'title', event.target.value)} /></label>
                    <label><span>Category</span><input value={guide.category} onChange={(event) => updateGuide(guide.id, 'category', event.target.value)} /></label>
                    <label className="wide-field"><span>Body</span><textarea value={guide.body} onChange={(event) => updateGuide(guide.id, 'body', event.target.value)} /></label>
                  </div>
                  <div className="settings-action-row">
                    <button type="button" className={guide.isActive ? 'active' : ''} onClick={() => updateGuide(guide.id, 'isActive', !guide.isActive)}>
                      {guide.isActive ? 'Active guide' : 'Inactive guide'}
                    </button>
                    <small>Updated {guide.updatedAt}</small>
                  </div>
                </article>
              )) : (
                <p className="quiet">No how-to guides have been created.</p>
              )}
            </div>
          </div>
        )}

        {activeSetting === 'updates' && (
          <div className="settings-detail-stack">
            <div className="panel-heading compact-heading">
              <div>
                <p>Deployment notes</p>
                <h2>What's New</h2>
              </div>
              <button type="button" onClick={addWhatsNew}>Add update</button>
            </div>
            <div className="whats-new-list">
              {whatsNewItems.length ? whatsNewItems.map((item) => (
                <article className="whats-new-card editable-update-card" key={item.id}>
                  <input value={item.releaseDate} onChange={(event) => updateWhatsNew(item.id, 'releaseDate', event.target.value)} />
                  <input value={item.version} placeholder="Version" onChange={(event) => updateWhatsNew(item.id, 'version', event.target.value)} />
                  <input value={item.title} placeholder="Title" onChange={(event) => updateWhatsNew(item.id, 'title', event.target.value)} />
                  <textarea value={item.summary} placeholder="Summary" onChange={(event) => updateWhatsNew(item.id, 'summary', event.target.value)} />
                  <input value={item.visibleToRoles} placeholder="Visible to roles" onChange={(event) => updateWhatsNew(item.id, 'visibleToRoles', event.target.value)} />
                </article>
              )) : (
                <p className="quiet">No deployment notes yet.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function SuperAdminWorkspace({ activeModule }: { activeModule: SuperAdminModule }) {
  const [selectedTenantName, setSelectedTenantName] = useState('Kids Therapy Centre')
  const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false)
  const [isSupportTicketOpen, setIsSupportTicketOpen] = useState(false)
  const [selectedSupportTicketNumber, setSelectedSupportTicketNumber] = useState('')
  const [profileTenantName, setProfileTenantName] = useState('')
  const [tenantSearch, setTenantSearch] = useState('')
  const [supabaseConnection, setSupabaseConnection] = useState<SupabaseConnectionTestResult>({
    configured: isSupabaseConfigured,
    ok: false,
    status: isSupabaseConfigured ? 'error' : 'not_configured',
    message: isSupabaseConfigured ? 'Checking Supabase connection...' : 'Supabase env variables are not configured.',
  })
  const platformMetrics = [
    { label: 'Total Tenants', value: '28', detail: 'platform workspaces' },
    { label: 'Active Tenants', value: '24', detail: 'currently subscribed' },
    { label: 'Trial Tenants', value: '3', detail: 'onboarding pilots' },
    { label: 'Expiring Subscriptions', value: '5', detail: 'next 60 days' },
    { label: 'Active Users', value: '186', detail: 'count only' },
    { label: 'System Status', value: 'Operational', detail: 'all core services' },
  ]
  const [platformTenants, setPlatformTenants] = useState([
    { businessName: 'Kids Therapy Centre', tradingName: 'Kids Therapy Centre', companyReg: '2021/018884/07', vat: 'Not registered', contact: 'Practice Admin', email: 'admin@kidstherapy.example', phone: '+27 21 555 0100', country: 'South Africa', timezone: 'Africa/Johannesburg', plan: 'Growth practice', status: 'Active', billingCycle: 'Monthly', renewal: '2026-07-31', trial: 'Completed', users: '42', storage: '18.4 GB', created: '2026-01-12', activity: 'Today' },
    { businessName: 'Smith Occupational Therapy', tradingName: 'Smith OT', companyReg: '2019/442019/07', vat: 'Not registered', contact: 'Tenant Admin', email: 'admin@smithot.example', phone: '+27 11 555 0134', country: 'South Africa', timezone: 'Africa/Johannesburg', plan: 'Solo practice', status: 'Active', billingCycle: 'Annual', renewal: '2026-09-01', trial: 'Completed', users: '3', storage: '2.1 GB', created: '2026-02-18', activity: 'Yesterday' },
    { businessName: 'Family Wellness Practice', tradingName: 'Family Wellness', companyReg: '2020/884211/07', vat: '4120000000', contact: 'Practice Manager', email: 'ops@familywellness.example', phone: '+27 31 555 0170', country: 'South Africa', timezone: 'Africa/Johannesburg', plan: 'Team practice', status: 'Suspended', billingCycle: 'Monthly', renewal: '2026-07-15', trial: 'Completed', users: '18', storage: '9.7 GB', created: '2026-03-04', activity: '5 days ago' },
    { businessName: 'Northside Speech Clinic', tradingName: 'Northside Speech', companyReg: 'Pending', vat: 'Not registered', contact: 'Tenant Admin', email: 'hello@northspeech.example', phone: '+27 12 555 0199', country: 'South Africa', timezone: 'Africa/Johannesburg', plan: 'Growth practice', status: 'Trial', billingCycle: 'Monthly', renewal: '2026-08-20', trial: '21 days left', users: '9', storage: '1.8 GB', created: '2026-07-02', activity: 'Today' },
  ])
  const selectedTenant = platformTenants.find((tenantItem) => tenantItem.businessName === selectedTenantName) ?? platformTenants[0]
  const profileTenant = platformTenants.find((tenantItem) => tenantItem.businessName === profileTenantName)
  const filteredPlatformTenants = platformTenants.filter((tenantItem) => {
    const searchValue = tenantSearch.trim().toLowerCase()
    if (!searchValue) return true
    return [tenantItem.businessName, tenantItem.contact, tenantItem.email]
      .join(' ')
      .toLowerCase()
      .includes(searchValue)
  })
  const [supportTickets, setSupportTickets] = useState<PlatformSupportTicket[]>([
    { number: 'SUP-1042', tenant: 'Kids Therapy Centre', priority: 'Medium', category: 'Email', status: 'In Progress', assigned: 'AlliDesk Support', logged: '2026-07-05', updated: '2026-07-06', subject: 'Email delivery failed', summary: 'Practice reported that appointment reminder emails did not send for two test bookings.' },
    { number: 'SUP-1041', tenant: 'Northside Speech Clinic', priority: 'High', category: 'Subscription', status: 'Waiting for Tenant', assigned: 'Billing Ops', logged: '2026-07-04', updated: '2026-07-05', subject: 'Subscription renewal question', summary: 'Tenant admin asked for clarification on trial billing and first debit date.' },
    { number: 'SYS-884', tenant: 'System Monitoring', priority: 'Low', category: 'Queue Processing', status: 'Resolved', assigned: 'Platform Ops', logged: '2026-07-04', updated: '2026-07-04', subject: 'Queue latency spike', summary: 'Monitoring flagged delayed background jobs. No patient or tenant operational data exposed.' },
  ])
  const selectedSupportTicket = supportTickets.find((ticket) => ticket.number === selectedSupportTicketNumber) ?? null
  const openSupportTicket = (ticketNumber?: string) => {
    setSelectedSupportTicketNumber(ticketNumber ?? '')
    setIsSupportTicketOpen(true)
  }
  const saveSupportTicket = (ticket: PlatformSupportTicket) => {
    setSupportTickets((tickets) => {
      const exists = tickets.some((item) => item.number === ticket.number)
      if (exists) return tickets.map((item) => (item.number === ticket.number ? ticket : item))
      return [ticket, ...tickets]
    })
    setSelectedSupportTicketNumber('')
    setIsSupportTicketOpen(false)
  }
  const serviceStatuses = [
    ['Database', 'Operational', '99.99%', '118ms'],
    ['Authentication', 'Operational', '99.98%', '94ms'],
    ['Email', 'Performance Degraded', '99.40%', '426ms'],
    ['SMS', 'Operational', '99.92%', '210ms'],
    ['AI Services', 'Operational', '99.70%', '860ms'],
    ['Storage', 'Operational', '99.99%', '132ms'],
    ['Queue Processing', 'Operational', '99.95%', '54 jobs'],
    ['Notifications', 'Operational', '99.96%', '84ms'],
    ['Scheduled Jobs', 'Operational', '99.97%', '0 failed'],
  ]
  useEffect(() => {
    let isMounted = true
    testSupabaseConnection().then((result) => {
      if (isMounted) setSupabaseConnection(result)
    })
    return () => {
      isMounted = false
    }
  }, [])
  const supabaseServiceStatus = supabaseConnection.ok
    ? 'Operational'
    : supabaseConnection.configured
      ? 'Service Unavailable'
      : 'Not Configured'
  const platformServiceStatuses = [
    ...serviceStatuses,
    ['Supabase', supabaseServiceStatus, supabaseConnection.status.replaceAll('_', ' '), supabaseConnection.message],
  ]
  const [subscriptionPlans, setSubscriptionPlans] = useState([
    { name: 'Free', description: 'Internal testing and assisted setup', users: 'Internal only', price: 'R 0', isActive: true, isPublic: false },
    { name: 'Starter', description: 'Solo Practitioner', users: '1 User', price: 'R 399', isActive: true, isPublic: true },
    { name: 'Professional', description: 'Small Practice', users: '2-5 Users', price: 'R 899', isActive: true, isPublic: true },
    { name: 'Growth', description: 'Growing Practice', users: '6-15 Users', price: 'R 1 899', isActive: true, isPublic: true },
    { name: 'Business', description: 'Multi-disciplinary Practice', users: '16-50 Users', price: 'R 3 499', isActive: true, isPublic: true },
    { name: 'Enterprise', description: 'Large Healthcare Group', users: '50+ Users', price: 'Custom', isActive: true, isPublic: true },
  ])
  const toggleSubscriptionPlan = (planName: string) => {
    setSubscriptionPlans((plans) =>
      plans.map((plan) => (plan.name === planName ? { ...plan, isActive: !plan.isActive } : plan)),
    )
  }
  return (
    <div className="super-admin-shell">
      <section className="super-admin-content">
        {activeModule === 'dashboard' && (
          <>
            <section className="panel span-3">
              <div className="panel-heading">
                <div>
                  <p>Dashboard</p>
                  <h2>Platform Overview</h2>
                </div>
              </div>
              <div className="super-admin-metric-grid">
                {platformMetrics.map((metric) => (
                  <Metric key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
                ))}
              </div>
            </section>
            <section className="panel span-2">
              <div className="panel-heading">
                <div>
                  <p>Support Centre</p>
                  <h2>Open support tickets</h2>
                </div>
                <button type="button" className="compact-action-button" onClick={() => openSupportTicket()}>Add ticket</button>
              </div>
              <div className="dashboard-support-list">
                {supportTickets.map((ticket) => (
                  <button type="button" key={`dashboard-${ticket.number}`} onClick={() => openSupportTicket(ticket.number)}>
                    <div>
                      <strong>{ticket.number}</strong>
                      <span>{ticket.tenant} · {ticket.category}</span>
                    </div>
                    <Status label={ticket.priority} />
                    <Status label={ticket.status} />
                    <small>Updated {ticket.updated}</small>
                  </button>
                ))}
              </div>
            </section>
            {isSupportTicketOpen && (
              <SupportTicketModal
                ticket={selectedSupportTicket}
                tenants={platformTenants}
                onClose={() => setIsSupportTicketOpen(false)}
                onSave={saveSupportTicket}
              />
            )}
          </>
        )}

        {activeModule === 'tenants' && (
          <section className="panel span-3">
            <div className="panel-heading">
              <div>
                <p>Tenant Management</p>
                <h2>Tenants</h2>
              </div>
              <div className="tenant-header-actions">
                <input
                  type="search"
                  value={tenantSearch}
                  onChange={(event) => setTenantSearch(event.target.value)}
                  placeholder="Search tenants"
                  aria-label="Search tenants"
                />
                <button type="button" onClick={() => setIsCreateTenantOpen(true)}>Create Tenant</button>
              </div>
            </div>
            <div className="tenant-list-table" aria-label="Tenant list">
              <div className="tenant-list-head">
                <span>Tenant Name</span>
                <span>Main User</span>
                <span>Email</span>
              </div>
              {filteredPlatformTenants.map((tenantItem) => (
                <button
                  type="button"
                  className={`tenant-list-row ${selectedTenant.businessName === tenantItem.businessName ? 'active' : ''}`}
                  key={tenantItem.businessName}
                  onClick={() => {
                    setSelectedTenantName(tenantItem.businessName)
                    setProfileTenantName(tenantItem.businessName)
                  }}
                >
                  <strong>{tenantItem.businessName}</strong>
                  <span>{tenantItem.contact}</span>
                  <span>{tenantItem.email}</span>
                </button>
              ))}
              {!filteredPlatformTenants.length && (
                <p className="tenant-empty-state">No tenants match your search.</p>
              )}
            </div>
            {isCreateTenantOpen && (
              <CreateTenantModal
                onClose={() => setIsCreateTenantOpen(false)}
                onCreate={(newTenant) => {
                  setPlatformTenants((tenants) => [newTenant, ...tenants])
                  setSelectedTenantName(newTenant.businessName)
                  setIsCreateTenantOpen(false)
                }}
              />
            )}
            {profileTenant && (
              <TenantProfileModal
                tenantRecord={profileTenant}
                onClose={() => setProfileTenantName('')}
              />
            )}
          </section>
        )}

        {activeModule === 'subscriptions' && (
          <section className="panel span-3">
            <div className="panel-heading">
              <div>
                <p>Subscription Management</p>
                <h2>Subscription options</h2>
              </div>
            </div>
            <div className="subscription-plan-list" aria-label="Subscription plans">
              <div className="subscription-plan-head">
                <span>Plan</span>
                <span>Description</span>
                <span>Users</span>
                <span>Price p.month</span>
                <span>Active</span>
              </div>
              {subscriptionPlans.map((plan) => (
                <article className={plan.isPublic ? '' : 'hidden-plan'} key={plan.name}>
                  <strong>{plan.name}</strong>
                  <span>{plan.description}</span>
                  <span>{plan.users}</span>
                  <span>{plan.price}</span>
                  <label className="settings-active-tick subscription-active-tick" title={plan.isActive ? 'Active subscription option' : 'Inactive subscription option'}>
                    <input type="checkbox" checked={plan.isActive} onChange={() => toggleSubscriptionPlan(plan.name)} />
                    <span>{plan.isPublic ? 'Active' : 'Hidden'}</span>
                  </label>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeModule === 'support' && (
          <section className="panel span-3">
            <div className="panel-heading">
              <div>
                <p>Support Centre</p>
                <h2>Tenant communication hub</h2>
              </div>
              <button type="button" className="compact-action-button" onClick={() => openSupportTicket()}>Add ticket</button>
            </div>
            <div className="support-ticket-list">
              {supportTickets.map((ticket) => (
                <button type="button" key={ticket.number} onClick={() => openSupportTicket(ticket.number)}>
                  <strong>{ticket.number}</strong>
                  <span>{ticket.tenant}</span>
                  <Status label={ticket.priority} />
                  <span>{ticket.category}</span>
                  <Status label={ticket.status} />
                  <span>{ticket.assigned}</span>
                  <small>Logged {ticket.logged} · Updated {ticket.updated}</small>
                </button>
              ))}
            </div>
            <div className="support-boundary-grid">
              <article>
                <strong>Support staff can see</strong>
                <span>System logs, error messages, API failures and service status.</span>
              </article>
              <article>
                <strong>Support staff cannot see</strong>
                <span>Patient records, clinical notes, documents or calendar entries.</span>
              </article>
            </div>
          </section>
        )}
        {isSupportTicketOpen && activeModule === 'support' && (
          <SupportTicketModal
            ticket={selectedSupportTicket}
            tenants={platformTenants}
            onClose={() => setIsSupportTicketOpen(false)}
            onSave={saveSupportTicket}
          />
        )}

        {activeModule === 'health' && (
          <>
            <section className="panel span-3">
              <div className="panel-heading">
                <div>
                  <p>System Health</p>
                  <h2>Live operational dashboard</h2>
                </div>
              </div>
              <div className="system-health-grid">
                {platformServiceStatuses.map(([service, status, uptime, response]) => (
                  <article key={service}>
                    <div>
                      <strong>{service}</strong>
                      <span>{uptime} uptime · {response}</span>
                    </div>
                    <Status label={status} />
                  </article>
                ))}
              </div>
            </section>
            <section className="panel span-3">
              <div className="super-admin-stat-row">
                {[
                  ['Current Uptime', '99.96%'],
                  ['Response Time', '142ms'],
                  ['Failed Jobs', '2'],
                  ['Queue Size', '54'],
                  ['Error Rate', '0.04%'],
                  ['Active Sessions', '73'],
                ].map(([label, value]) => (
                  <Metric key={label} label={label} value={value} detail="platform statistic" />
                ))}
              </div>
            </section>
          </>
        )}

        {activeModule === 'configuration' && (
          <section className="panel span-3">
            <div className="panel-heading">
              <div>
                <p>Platform Configuration</p>
                <h2>Global AlliDesk settings</h2>
              </div>
              <button>Save Platform Settings</button>
            </div>
            <div className="platform-config-grid">
              {[
                ['Platform Name', 'AlliDesk'],
                ['Support Email', 'support@allidesk.co.za'],
                ['Support Phone', '+27 21 000 0000'],
                ['Marketing Website', 'https://allidesk.co.za'],
                ['Web App', 'https://app.allidesk.co.za'],
                ['Maintenance Mode', 'Off'],
                ['Privacy Policy Version', '2026.07'],
                ['Terms & Conditions Version', '2026.07'],
                ['Default Time Zone', 'Africa/Johannesburg'],
                ['Default Language', 'English'],
              ].map(([label, value]) => (
                <label key={label}>
                  <span>{label}</span>
                  <input value={value} readOnly />
                </label>
              ))}
            </div>
            <p className="settings-footnote">No tenant-specific settings belong in Platform Configuration.</p>
          </section>
        )}
      </section>
    </div>
  )
}

type PlatformTenantRecord = {
  businessName: string
  tradingName: string
  companyReg: string
  vat: string
  contact: string
  email: string
  phone: string
  country: string
  timezone: string
  plan: string
  status: string
  billingCycle: string
  renewal: string
  trial: string
  users: string
  storage: string
  created: string
  activity: string
}

type PlatformSupportTicket = {
  number: string
  tenant: string
  priority: string
  category: string
  status: string
  assigned: string
  logged: string
  updated: string
  subject: string
  summary: string
}

function TenantProfileModal({ tenantRecord, onClose }: { tenantRecord: PlatformTenantRecord; onClose: () => void }) {
  const [activeTenantTab, setActiveTenantTab] = useState<'details' | 'subscription' | 'settings'>('details')
  const subscriptionActions = ['Generate Tenant Invoice', 'Mark Invoice Paid', 'Record Offline Payment', 'View Billing History']
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-window tenant-profile-modal" aria-label={`${tenantRecord.businessName} tenant profile`}>
        <div className="modal-header">
          <div>
            <p>Tenant Management</p>
            <h2>{tenantRecord.businessName}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close tenant profile">
            x
          </button>
        </div>
        <div className="modal-body">
          <section className="tenant-profile-card in-modal">
            <div className="tenant-management-header">
              <div>
                <span>Tenant profile</span>
                <strong>{tenantRecord.businessName}</strong>
                <small>Practice metadata is synced from the tenant Admin's Practice Configuration.</small>
              </div>
              <Status label={tenantRecord.status} />
            </div>
            <div className="tenant-profile-summary-row">
              <article>
                <span>Users</span>
                <strong>{tenantRecord.users}</strong>
              </article>
              <article>
                <span>Storage</span>
                <strong>{tenantRecord.storage}</strong>
              </article>
              <article>
                <span>Created</span>
                <strong>{tenantRecord.created}</strong>
              </article>
              <article>
                <span>Activity</span>
                <strong>{tenantRecord.activity}</strong>
              </article>
            </div>
            <p className="tenant-sync-note">Business setup is tenant-supplied metadata from Practice Configuration.</p>
            <div className="tenant-profile-tabs" aria-label="Tenant profile sections">
              {[
                ['details', 'Tenant details'],
                ['subscription', 'Subscription'],
                ['settings', 'Settings'],
              ].map(([id, label]) => (
                <button
                  type="button"
                  className={activeTenantTab === id ? 'active' : ''}
                  key={id}
                  onClick={() => setActiveTenantTab(id as typeof activeTenantTab)}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeTenantTab === 'details' && (
              <div className="tenant-tab-grid">
                <section className="tenant-tab-section">
                  <h3>Admin user</h3>
                  <dl>
                    <div><dt>Name</dt><dd>{tenantRecord.contact}</dd></div>
                    <div><dt>Email</dt><dd>{tenantRecord.email}</dd></div>
                    <div><dt>Contact</dt><dd>{tenantRecord.phone}</dd></div>
                    <div><dt>Region</dt><dd>{tenantRecord.country} · {tenantRecord.timezone}</dd></div>
                  </dl>
                </section>
                <section className="tenant-tab-section">
                  <h3>Practice metadata</h3>
                  <dl>
                    <div><dt>Practice</dt><dd>{tenantRecord.businessName}</dd></div>
                    <div><dt>Trading</dt><dd>{tenantRecord.tradingName}</dd></div>
                    <div><dt>Registration</dt><dd>{tenantRecord.companyReg}</dd></div>
                    <div><dt>VAT</dt><dd>{tenantRecord.vat}</dd></div>
                  </dl>
                </section>
              </div>
            )}
            {activeTenantTab === 'subscription' && (
              <>
                <div className="tenant-tab-grid subscription-tab-grid">
                  <section className="tenant-tab-section">
                    <div className="tenant-tab-section-head">
                      <h3>Subscription</h3>
                      <div>
                        <button type="button">Change Plan</button>
                        <button type="button">Cancel Subscription</button>
                      </div>
                    </div>
                    <dl>
                      <div><dt>Plan</dt><dd>{tenantRecord.plan}</dd></div>
                      <div><dt>Billing</dt><dd>{tenantRecord.status === 'Suspended' ? 'Payment failed' : 'Current'}</dd></div>
                      <div><dt>Trial</dt><dd>{tenantRecord.trial}</dd></div>
                    </dl>
                  </section>
                  <section className="tenant-tab-section">
                    <h3>Billing cycle</h3>
                    <dl>
                      <div><dt>Next bill</dt><dd>{tenantRecord.renewal}</dd></div>
                      <div><dt>Cycle</dt><dd>{tenantRecord.billingCycle}</dd></div>
                      <div><dt>Invoice</dt><dd>{tenantRecord.status === 'Suspended' ? 'Overdue' : tenantRecord.status === 'Trial' ? 'Trial invoice pending' : 'Paid'}</dd></div>
                    </dl>
                  </section>
                </div>
                <div className="tenant-action-row subscription-management-actions">
                  {subscriptionActions.map((action) => (
                    <button type="button" key={`${tenantRecord.businessName}-${action}`}>{action}</button>
                  ))}
                </div>
              </>
            )}
            {activeTenantTab === 'settings' && (
              <>
                <div className="tenant-tab-grid subscription-tab-grid">
                  <section className="tenant-tab-section">
                    <h3>Workspace</h3>
                    <dl>
                      <div><dt>Status</dt><dd>{tenantRecord.status}</dd></div>
                      <div><dt>Access</dt><dd>{tenantRecord.status === 'Suspended' ? 'Suspended' : 'Enabled'}</dd></div>
                      <div><dt>Archive</dt><dd>Active workspace</dd></div>
                    </dl>
                  </section>
                  <section className="tenant-tab-section">
                    <h3>Access boundary</h3>
                    <dl>
                      <div><dt>Configuration</dt><dd>Tenant Admin controlled</dd></div>
                      <div><dt>Data access</dt><dd>Restricted by POPIA boundary</dd></div>
                      <div><dt>Support</dt><dd>Technical diagnostics only</dd></div>
                    </dl>
                  </section>
                </div>
                <div className="tenant-action-row subscription-management-actions">
                  {['Suspend Tenant', 'Reactivate Tenant', 'Archive Tenant', 'View Configuration'].map((action) => (
                    <button type="button" key={`${tenantRecord.businessName}-${action}`}>{action}</button>
                  ))}
                </div>
              </>
            )}
          </section>
          <p className="create-tenant-privacy-note">Super Admin cannot browse or edit tenant patients, bookings, clinical notes, documents or tenant operational records from this profile.</p>
        </div>
      </section>
    </div>
  )
}

function CreateTenantModal({ onClose, onCreate }: { onClose: () => void; onCreate: (tenantRecord: PlatformTenantRecord) => void }) {
  const trialStartDate = appTodayIso
  const firstBillingDate = getFirstTenantBillingDate(appTodayIso)
  const [draftTenant, setDraftTenant] = useState({
    businessName: '',
    tradingName: '',
    companyReg: '',
    vat: '',
    contact: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    passwordAction: 'Require reset on first login',
    country: 'South Africa',
    timezone: 'Africa/Johannesburg',
    plan: 'Monthly subscription',
    status: 'Trial',
    billingCycle: 'Monthly in advance',
    renewal: firstBillingDate,
    trial: `Trial until ${firstBillingDate}`,
  })
  const updateDraftTenant = (field: keyof typeof draftTenant, value: string) => {
    setDraftTenant((current) => ({ ...current, [field]: value }))
  }
  const createTenant = () => {
    const businessName = draftTenant.businessName.trim()
    const tenantAdminName = draftTenant.contact.trim()
    const tenantAdminEmail = draftTenant.email.trim()
    if (!businessName || !tenantAdminName || !tenantAdminEmail) return
    onCreate({
      businessName,
      tradingName: 'Awaiting Practice Configuration',
      companyReg: 'Awaiting Practice Configuration',
      vat: 'Awaiting Practice Configuration',
      contact: tenantAdminName,
      email: tenantAdminEmail,
      phone: draftTenant.phone.trim() || '-',
      country: draftTenant.country,
      timezone: draftTenant.timezone,
      plan: draftTenant.plan,
      status: draftTenant.status,
      billingCycle: draftTenant.billingCycle,
      renewal: draftTenant.renewal,
      trial: draftTenant.trial,
      users: '1',
      storage: '0 GB',
      created: appTodayIso,
      activity: 'New tenant',
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-window create-tenant-modal" aria-label="Create tenant">
        <div className="modal-header">
          <div>
            <p>Tenant Management</p>
            <h2>Create Tenant</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close create tenant">
            x
          </button>
        </div>
        <div className="modal-body">
          <section className="create-tenant-section">
            <h3>Tenant shell</h3>
            <div className="create-tenant-form-grid">
              <label>
                <span>Practice Name *</span>
                <input required value={draftTenant.businessName} onChange={(event) => updateDraftTenant('businessName', event.target.value)} />
              </label>
              <label>
                <span>Country</span>
                <input value={draftTenant.country} onChange={(event) => updateDraftTenant('country', event.target.value)} />
              </label>
              <label>
                <span>Time Zone</span>
                <input value={draftTenant.timezone} onChange={(event) => updateDraftTenant('timezone', event.target.value)} />
              </label>
              <p className="create-tenant-rule-note wide-field">Registration, VAT, address, public contact details, banking and billing setup are completed later by the tenant Admin in Practice Configuration and synced into this tenant profile.</p>
              <div className="create-tenant-subheading">
                <span>Tenant Admin User</span>
              </div>
              <label>
                <span>Primary Contact *</span>
                <input required value={draftTenant.contact} onChange={(event) => updateDraftTenant('contact', event.target.value)} />
              </label>
              <label>
                <span>Contact Email *</span>
                <input required type="email" value={draftTenant.email} onChange={(event) => updateDraftTenant('email', event.target.value)} />
              </label>
              <label>
                <span>Contact Number</span>
                <input value={draftTenant.phone} onChange={(event) => updateDraftTenant('phone', event.target.value)} />
              </label>
              <label>
                <span>Temporary Password</span>
                <input type="password" value={draftTenant.temporaryPassword} onChange={(event) => updateDraftTenant('temporaryPassword', event.target.value)} />
              </label>
              <label>
                <span>Password Action</span>
                <select value={draftTenant.passwordAction} onChange={(event) => updateDraftTenant('passwordAction', event.target.value)}>
                  <option>Require reset on first login</option>
                  <option>Send reset link</option>
                  <option>Set password manually</option>
                </select>
              </label>
            </div>
          </section>
          <section className="create-tenant-section">
            <h3>Trial and billing</h3>
            <div className="create-tenant-form-grid subscription-picker-grid">
              <label>
                <span>Subscription Option</span>
                <select value={draftTenant.plan} onChange={(event) => updateDraftTenant('plan', event.target.value)}>
                  <option>Monthly subscription</option>
                  <option>Solo practice</option>
                  <option>Team practice</option>
                  <option>Growth practice</option>
                </select>
              </label>
            </div>
            <div className="create-tenant-billing-summary">
              <article>
                <span>Status</span>
                <strong>Trial</strong>
              </article>
              <article>
                <span>Trial starts</span>
                <strong>{trialStartDate}</strong>
              </article>
              <article>
                <span>First billing date</span>
                <strong>{firstBillingDate}</strong>
              </article>
              <article>
                <span>Billing cycle</span>
                <strong>Monthly in advance</strong>
              </article>
            </div>
            <p className="create-tenant-rule-note">Billing starts on the 2nd for planning: tenants created from the 1st-15th bill on the 2nd of the next month; tenants created from the 16th onward bill on the 2nd of the following month. If the tenant does not cancel before billing starts, the next month is billed in advance.</p>
          </section>
          <p className="create-tenant-privacy-note">This creates tenant setup metadata only. Super Admin cannot create or view patient, clinical, appointment, document or tenant operational records.</p>
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={createTenant}>Save Tenant</button>
        </div>
      </section>
    </div>
  )
}

function SupportTicketModal({
  ticket,
  tenants,
  onClose,
  onSave,
}: {
  ticket: PlatformSupportTicket | null
  tenants: PlatformTenantRecord[]
  onClose: () => void
  onSave: (ticket: PlatformSupportTicket) => void
}) {
  const ticketNumber = ticket?.number ?? `SUP-${Math.floor(Date.now() / 1000).toString().slice(-4)}`
  const [draftTicket, setDraftTicket] = useState<PlatformSupportTicket>({
    number: ticketNumber,
    tenant: ticket?.tenant ?? tenants[0]?.businessName ?? 'System Monitoring',
    priority: ticket?.priority ?? 'Medium',
    category: ticket?.category ?? 'Technical',
    status: ticket?.status ?? 'New',
    assigned: ticket?.assigned ?? 'AlliDesk Support',
    logged: ticket?.logged ?? appTodayIso,
    updated: appTodayIso,
    subject: ticket?.subject ?? '',
    summary: ticket?.summary ?? '',
  })
  const [validationError, setValidationError] = useState('')
  const updateDraftTicket = (field: keyof PlatformSupportTicket, value: string) => {
    setDraftTicket((current) => ({ ...current, [field]: value, updated: appTodayIso }))
  }
  const saveTicket = () => {
    if (!draftTicket.subject.trim()) {
      setValidationError('Add a short ticket subject before saving.')
      return
    }
    if (!draftTicket.summary.trim()) {
      setValidationError('Add the support detail before saving.')
      return
    }
    onSave({
      ...draftTicket,
      subject: draftTicket.subject.trim(),
      summary: draftTicket.summary.trim(),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-window support-ticket-modal" aria-label={ticket ? `${ticket.number} support ticket` : 'Add support ticket'}>
        <div className="modal-header">
          <div>
            <p>Support Centre</p>
            <h2>{ticket ? draftTicket.number : 'Add Ticket'}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close support ticket">
            x
          </button>
        </div>
        <div className="modal-body">
          <section className="create-tenant-section">
            <h3>Ticket details</h3>
            <div className="create-tenant-form-grid support-ticket-form-grid">
              <label>
                <span>Ticket Number</span>
                <input value={draftTicket.number} readOnly />
              </label>
              <label>
                <span>Tenant</span>
                <select value={draftTicket.tenant} onChange={(event) => updateDraftTicket('tenant', event.target.value)}>
                  <option>System Monitoring</option>
                  {tenants.map((tenantRecord) => (
                    <option key={tenantRecord.businessName}>{tenantRecord.businessName}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Priority</span>
                <select value={draftTicket.priority} onChange={(event) => updateDraftTicket('priority', event.target.value)}>
                  {['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}
                </select>
              </label>
              <label>
                <span>Category</span>
                <select value={draftTicket.category} onChange={(event) => updateDraftTicket('category', event.target.value)}>
                  {['Technical', 'Billing', 'Subscription', 'Feature Request', 'Bug Report', 'AI', 'Email', 'SMS', 'Training', 'Queue Processing'].map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={draftTicket.status} onChange={(event) => updateDraftTicket('status', event.target.value)}>
                  {['New', 'Open', 'Waiting for Tenant', 'Waiting for AlliDesk', 'In Progress', 'Resolved', 'Closed'].map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <span>Assigned To</span>
                <input value={draftTicket.assigned} onChange={(event) => updateDraftTicket('assigned', event.target.value)} />
              </label>
              <label className="wide-field">
                <span>Subject *</span>
                <input value={draftTicket.subject} onChange={(event) => updateDraftTicket('subject', event.target.value)} />
              </label>
              <label className="wide-field">
                <span>Support Detail *</span>
                <textarea value={draftTicket.summary} onChange={(event) => updateDraftTicket('summary', event.target.value)} />
              </label>
            </div>
            {validationError && <p className="form-error">{validationError}</p>}
          </section>
          <section className="support-boundary-grid">
            <article>
              <strong>Allowed support context</strong>
              <span>System logs, error messages, API failures and service status.</span>
            </article>
            <article>
              <strong>Privacy boundary</strong>
              <span>No patient records, clinical notes, documents, calendar entries or tenant operational records.</span>
            </article>
          </section>
        </div>
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={saveTicket}>Save Ticket</button>
        </div>
      </section>
    </div>
  )
}

function Status({ label }: { label: string }) {
  return <span className={`status ${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</span>
}

function SignaturePad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    context.lineWidth = 2.4
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#221672'
  }, [])

  const getPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    canvas.setPointerCapture(event.pointerId)
    const point = getPoint(event)
    isDrawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current?.getContext('2d')
    if (!context || !isDrawingRef.current) return
    const point = getPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const stopDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas || !isDrawingRef.current) return
    isDrawingRef.current = false
    onChange(canvas.toDataURL('image/png'))
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        width="720"
        height="220"
        aria-label="Digital signature pad"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
      />
      <div>
        <span>{value ? 'Signature captured' : 'Sign inside the box with your finger or stylus'}</span>
        <button type="button" onClick={clearSignature}>Clear</button>
      </div>
    </div>
  )
}

function EditableDetail({
  label,
  value,
  isEditing,
  onChange,
  required = false,
}: {
  label: string
  value: string
  isEditing: boolean
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <div>
      <dt>{label}{required && <sup>*</sup>}</dt>
      <dd>
        {isEditing ? (
          <input className="editable-field" value={value} onChange={(event) => onChange(event.target.value)} />
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function NoteLineItem({ noteType, date, detail }: { noteType: string; date: string; detail: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftNoteType, setDraftNoteType] = useState(noteType)
  const [draftDate, setDraftDate] = useState(date)
  const [draftDetail, setDraftDetail] = useState(detail)
  const noteVisibility = noteTypeOptions.find((option) => option.label === draftNoteType)?.visibility ?? 'Internal only'

  return (
    <li>
      <div className="note-line-header">
        <div>
          {isEditing ? (
            <div className="note-edit-grid">
              <select value={draftNoteType} onChange={(event) => setDraftNoteType(event.target.value)} aria-label="Note type">
                {noteTypeOptions.map((option) => (
                  <option key={option.label}>{option.label}</option>
                ))}
              </select>
              <input value={draftDate} onChange={(event) => setDraftDate(event.target.value)} aria-label="Note date" />
            </div>
          ) : (
            <>
              <strong>{draftNoteType} · {draftDate}</strong>
              <em>{noteVisibility}</em>
            </>
          )}
        </div>
        <div className="note-line-actions">
          <PatientEditActions isEditMode={isEditing} setIsEditMode={setIsEditing} />
        </div>
      </div>
      {isEditing ? (
        <textarea value={draftDetail} onChange={(event) => setDraftDetail(event.target.value)} aria-label="Note details" />
      ) : (
        <span>{draftDetail}</span>
      )}
    </li>
  )
}

function PatientEditActions({
  isEditMode,
  setIsEditMode,
}: {
  isEditMode: boolean
  setIsEditMode: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <>
      {isEditMode && (
        <button className="icon-button danger" aria-label="Delete patient" title="Delete patient">
          <TrashIcon />
        </button>
      )}
      <button
        className={`icon-button ${isEditMode ? 'active' : ''}`}
        aria-label={isEditMode ? 'Exit edit mode' : 'Edit patient'}
        title={isEditMode ? 'Exit edit mode' : 'Edit patient'}
        onClick={() => setIsEditMode((current) => !current)}
      >
        <PencilIcon />
      </button>
    </>
  )
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 20h4.2L19.4 8.8a2 2 0 0 0 0-2.8L18 4.6a2 2 0 0 0-2.8 0L4 15.8V20Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m13.8 6 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h4M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AttachmentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="m20 11.5-8.7 8.7a5 5 0 0 1-7.1-7.1l9.2-9.2a3.4 3.4 0 0 1 4.8 4.8L9 18a1.8 1.8 0 0 1-2.6-2.6l8.2-8.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default App
