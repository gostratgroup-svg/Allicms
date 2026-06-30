import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'

type View = 'overview' | 'sessions' | 'patients' | 'finances' | 'settings'
type Role = 'Admin' | 'Reception' | 'Therapist' | 'Super Admin'

const tenant = {
  tenantId: 'tenant-kids-therapy-centre',
  name: 'Kids Therapy Centre',
  plan: 'Growth practice',
  status: 'Active',
  subscription: 'Paid until 31 Jul 2026',
}

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: 'overview', label: 'Overview', icon: '⌂' },
  { id: 'sessions', label: 'Sessions', icon: '□' },
  { id: 'patients', label: 'Patients', icon: '◉' },
  { id: 'finances', label: 'Finances', icon: 'R' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]

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
    permissions: [
      'Activate therapists',
      'Activate receptionists',
      'Manage practice settings',
      'View finances',
      'Access all practice information',
    ],
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
  },
  {
    tenantId: tenant.tenantId,
    patientNumber: 'PT-1002',
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
  },
  {
    tenantId: tenant.tenantId,
    patientNumber: 'PT-1003',
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
  },
  {
    tenantId: tenant.tenantId,
    patientNumber: 'PT-1004',
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
  },
]

const activity = [
  'Nadia completed SOAP note for Liam Jacobs',
  'Reception uploaded POPIA consent for Amahle Dlamini',
  'Invoice INV-2046 marked partially paid',
  'Parent portal link opened by Priya Naidoo',
]

const invoices = [
  { tenantId: tenant.tenantId, id: 'INV-2046', patient: 'Ethan Naidoo', age: '18 days', status: 'Overdue', total: 2340, paid: 0 },
  { tenantId: tenant.tenantId, id: 'INV-2047', patient: 'Liam Jacobs', age: '7 days', status: 'Partial', total: 1560, paid: 780 },
  { tenantId: tenant.tenantId, id: 'INV-2049', patient: 'Amahle Dlamini', age: 'Today', status: 'Draft', total: 690, paid: 0 },
  { tenantId: tenant.tenantId, id: 'INV-2050', patient: 'Mila van Wyk', age: 'Today', status: 'Ready', total: 720, paid: 0 },
]

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)

const shouldShowGuardianInList = (patientType: string) => ['Child', 'Teen'].includes(patientType)
const patientWorkspaceTabs = ['Personal Details', 'Notes', 'Sessions', 'Finance', 'Documents & Reports', 'History'] as const
type PatientWorkspaceTab = (typeof patientWorkspaceTabs)[number]
type Patient = (typeof patients)[number]
const noteTypeOptions = [
  { label: 'Session Feedback', visibility: 'Available to patient link' },
  { label: 'Session Process Note', visibility: 'Internal only' },
  { label: 'Case Management', visibility: 'Internal only' },
] as const

function App() {
  const [view, setView] = useState<View>('overview')
  const [role, setRole] = useState<Role>('Admin')
  const [query, setQuery] = useState('')
  const [patientRecords, setPatientRecords] = useState<Patient[]>(patients)

  const filteredPatients = useMemo(() => {
    const needle = query.toLowerCase().trim()
    if (!needle) return patientRecords
    return patientRecords.filter((patient) =>
      [patient.name, patient.phone, patient.guardian, patient.medicalAid].some((item) => item.toLowerCase().includes(needle)),
    )
  }, [patientRecords, query])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/assets/AlliCMS_Main App_logo copy.png" alt="AlliCMS" className="brand-logo" />
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => setView(item.id)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

      </aside>

      <main>
        <header className="topbar">
          <div>
            <p>{role} view · {role === 'Super Admin' ? 'Platform workspace' : tenant.name}</p>
            <h1>{pageTitle(view)}</h1>
          </div>
          <div className="topbar-actions">
            <span className="role-pill">{role}</span>
            <button>{role === 'Super Admin' ? 'Manage tenants' : 'New session'}</button>
          </div>
        </header>

        {view === 'settings' && <Settings role={role} setRole={setRole} />}
        {view !== 'settings' && role === 'Super Admin' && <SuperAdminWorkspace view={view} />}
        {view !== 'settings' && role !== 'Super Admin' && (
          <>
            <section className="admin-strip" aria-label="Practice health">
              <Metric label="Today's sessions" value="18" detail="4 still need notes" />
              <Metric label="Reports due" value="7" detail="3 parent reports overdue" />
              <Metric label="Outstanding" value={formatMoney(5310)} detail="session-linked balances" />
              <Metric label="Patient alerts" value="9" detail="risk, consent and admin flags" />
            </section>

            {view === 'overview' && <Overview role={role} />}
            {view === 'sessions' && <Sessions />}
            {view === 'patients' && (
              <Patients
                query={query}
                setQuery={setQuery}
                filteredPatients={filteredPatients}
                setPatientRecords={setPatientRecords}
              />
            )}
            {view === 'finances' && <Finances />}
          </>
        )}
      </main>
    </div>
  )
}

function pageTitle(view: View) {
  return {
    overview: 'Practice overview',
    sessions: 'Sessions calendar',
    patients: 'Patients',
    finances: 'Finances',
    settings: 'Settings',
  }[view]
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

function Overview({ role }: { role: string }) {
  return (
    <div className="page-grid overview-grid">
      <section className="panel span-2">
        <div className="panel-heading">
          <div>
            <p>Today</p>
            <h2>Sessions command centre</h2>
          </div>
          <button>Book session</button>
        </div>
        <div className="session-list">
          {sessions.map((session) => (
            <article className="session-row" key={`${session.time}-${session.patient}`}>
              <time>{session.time}</time>
              <div>
                <strong>{session.patient}</strong>
                <span>{session.type} · {session.therapist} · {session.room}</span>
              </div>
              <Status label={session.status} />
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>Quick actions</p>
            <h2>Daily admin</h2>
          </div>
        </div>
        <div className="action-grid">
          <button>Register patient</button>
          <button>Send reminders</button>
          <button>Create report</button>
          <button>Capture payment</button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>Patient alerts</p>
            <h2>Needs attention</h2>
          </div>
        </div>
        <div className="alert-list">
          {patients.map((patient) => (
            <div key={patient.name}>
              <strong>{patient.alert}</strong>
              <span>{patient.name} · {patient.therapist}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>Recent activity</p>
            <h2>Audit trail</h2>
          </div>
        </div>
        <ol className="activity-list">
          {activity.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <PatientPortal />

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>Role preview</p>
            <h2>{role} permissions</h2>
          </div>
        </div>
        <Permissions role={role} />
      </section>
    </div>
  )
}

function Sessions() {
  return (
    <div className="page-grid sessions-grid">
      <section className="panel span-2">
        <div className="panel-heading">
          <div>
            <p>This week</p>
            <h2>Calendar schedule</h2>
          </div>
          <div className="segmented">
            <button className="active">Today</button>
            <button>Week</button>
            <button>Month</button>
          </div>
        </div>
        <div className="calendar">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
            <div className="day-column" key={day}>
              <strong>{day}</strong>
              {sessions.slice(0, index % 3 === 0 ? 2 : 3).map((session) => (
                <article key={`${day}-${session.patient}`}>
                  <time>{session.time}</time>
                  <span>{session.patient}</span>
                  <small>{session.therapist}</small>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>Session tools</p>
            <h2>Manage bookings</h2>
          </div>
        </div>
        <div className="tool-list">
          {['Reschedule selected session', 'Cancel with reason', 'Mark no show', 'Create recurring series', 'Allocate therapist', 'Send WhatsApp reminder'].map((tool) => (
            <button key={tool}>{tool}</button>
          ))}
        </div>
      </section>
      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Clinical documentation</p>
            <h2>Notes waiting to close</h2>
          </div>
        </div>
        <div className="table">
          {sessions.map((session) => (
            <div className="table-row" key={session.patient}>
              <span>{session.patient}</span>
              <span>{session.type}</span>
              <span>{session.therapist}</span>
              <Status label={session.status === 'Needs note' ? 'Process note due' : 'Ready'} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Patients({
  query,
  setQuery,
  filteredPatients,
  setPatientRecords,
}: {
  query: string
  setQuery: (query: string) => void
  filteredPatients: Patient[]
  setPatientRecords: Dispatch<SetStateAction<Patient[]>>
}) {
  const [selectedPatientName, setSelectedPatientName] = useState(patients[0].name)
  const [activePatientTab, setActivePatientTab] = useState<PatientWorkspaceTab>('Personal Details')
  const [isPatientEditMode, setIsPatientEditMode] = useState(false)
  const selectedPatient = filteredPatients.find((patient) => patient.name === selectedPatientName) ?? filteredPatients[0] ?? patients[0]
  const selectedPatientSessions = sessions.filter((session) => session.patient === selectedPatient.name)
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
            <Status label={selectedPatient.alert} />
          </div>

          <div className="profile-summary-grid">
            <Metric label="Next session" value={selectedPatient.nextSession} detail={selectedPatient.therapist} />
            <Metric label="Balance" value={formatMoney(selectedPatient.balance)} detail="financial history linked" />
            <Metric label="Report status" value={selectedPatient.reportStatus} detail="reports and assessments" />
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
                  <EditableDetail label="Title" value={selectedPatient.title} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('title', value)} />
                  <EditableDetail label="Date of birth" value={selectedPatient.dateOfBirth} isEditing={isPatientEditMode} onChange={(value) => updatePatientField('dateOfBirth', value)} />
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
              {(selectedPatientSessions.length ? selectedPatientSessions : sessions.slice(0, 2)).map((session) => (
                <div className="table-row" key={`${selectedPatient.name}-${session.time}`}>
                  <span>{session.time}</span>
                  <span>{session.type}</span>
                  <span>{session.therapist}</span>
                  <Status label={session.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activePatientTab === 'Finance' && (
          <div className="workspace-tab-panel">
            <div className="workspace-panel-header">
              <h3>Finance</h3>
              <div className="workspace-panel-actions">
                <PatientEditActions isEditMode={isPatientEditMode} setIsEditMode={setIsPatientEditMode} />
                <button>Create invoice</button>
              </div>
            </div>
            <dl className="profile-detail-list finance-detail-list">
              <div><dt>Outstanding balance</dt><dd>{formatMoney(selectedPatient.balance)}</dd></div>
              <div><dt>Medical aid</dt><dd>{selectedPatient.medicalAid}</dd></div>
              <div><dt>Payment status</dt><dd>{selectedPatient.balance > 0 ? 'Outstanding' : 'Paid up'}</dd></div>
              <div><dt>Statements</dt><dd>Monthly statements available</dd></div>
            </dl>
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
              <div className="workspace-panel-actions">
                <PatientEditActions isEditMode={isPatientEditMode} setIsEditMode={setIsPatientEditMode} />
                <button>Export timeline</button>
              </div>
            </div>
            <ol className="history-timeline">
              <li><strong>{selectedPatient.nextSession}</strong><span>Upcoming session scheduled.</span></li>
              <li><strong>{selectedPatient.lastSession}</strong><span>Last session completed with {selectedPatient.therapist}.</span></li>
              <li><strong>Referral received</strong><span>{selectedPatient.referralSource}</span></li>
            </ol>
          </div>
        )}
      </section>
    </div>
  )
}

function Finances() {
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.total - invoice.paid, 0)

  return (
    <div className="page-grid">
      <Metric label="Outstanding balances" value={formatMoney(outstanding)} detail="across session-linked invoices" />
      <Metric label="Overdue invoices" value="2" detail="oldest invoice 18 days" />
      <Metric label="Payments today" value={formatMoney(780)} detail="1 patient payment allocated" />
      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Finance</p>
            <h2>Invoices and payments</h2>
          </div>
          <button>Create invoice</button>
        </div>
        <div className="table finance-table">
          {invoices.map((invoice) => (
            <div className="table-row" key={invoice.id}>
              <span>{invoice.id}</span>
              <span>{invoice.patient}</span>
              <span>{invoice.age}</span>
              <span>{formatMoney(invoice.total - invoice.paid)}</span>
              <Status label={invoice.status} />
            </div>
          ))}
        </div>
      </section>
      <section className="panel span-2">
        <div className="panel-heading">
          <div>
            <p>Payment allocation</p>
            <h2>Session-linked billing</h2>
          </div>
        </div>
        <div className="allocation-list">
          {sessions.map((session) => (
            <div key={session.patient}>
              <span>{session.patient}</span>
              <strong>{session.invoice}</strong>
              <small>{formatMoney(session.amount)}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>Reminders</p>
            <h2>Communication</h2>
          </div>
        </div>
        <div className="tool-list">
          <button>Send overdue WhatsApp</button>
          <button>Email statement</button>
          <button>Upload payment proof</button>
        </div>
      </section>
    </div>
  )
}

function Settings({ role, setRole }: { role: Role; setRole: (role: Role) => void }) {
  return (
    <div className="page-grid">
      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Experience switcher</p>
            <h2>Choose a user type to preview the right app feel</h2>
          </div>
        </div>
        <div className="role-card-grid">
          {roles.map((item) => (
            <button
              className={`role-card ${role === item.role ? 'active' : ''}`}
              key={item.role}
              onClick={() => setRole(item.role)}
            >
              <span>{item.scope}</span>
              <strong>{item.role}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel span-2">
        <div className="panel-heading">
          <div>
            <p>Selected permissions</p>
            <h2>{role}</h2>
          </div>
        </div>
        <Permissions role={role} />
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>Tenant rule</p>
            <h2>Practice Admin scope</h2>
          </div>
        </div>
        <p className="quiet">
          Every practice has at least one Admin. That Admin can activate therapists and receptionists inside the
          practice, and may either work as a therapist or act as a practice manager.
        </p>
      </section>

      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Patient profile</p>
            <h2>Complete record sections</h2>
          </div>
        </div>
        <div className="module-grid settings-modules">
          {[
            'Patient details',
            'Parent / Guardian info',
            'Emergency contact',
            'Referring doctor',
            'Medical aid details',
            'Member responsible for account',
            'Next of kin',
            'Consent and signatures',
            'Account responsibility',
            'Documents',
            'Reports and assessments',
            'Financial history'
          ].map((module) => (
            <span key={module}>{module}</span>
          ))}
        </div>
      </section>

      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Tenant lifecycle</p>
            <h2>How users are created and restricted</h2>
          </div>
        </div>
        <div className="rules-grid">
          <div>
            <strong>1. Super Admin</strong>
            <span>Creates the practice tenant, activates or suspends the tenant, and creates the first practice Admin.</span>
          </div>
          <div>
            <strong>2. Practice Admin</strong>
            <span>Runs the practice workspace and activates therapist or receptionist users for that tenant.</span>
          </div>
          <div>
            <strong>3. Staff users</strong>
            <span>Therapists and receptionists only operate inside their tenant and follow their role permissions.</span>
          </div>
        </div>
      </section>

      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Practice settings preview</p>
            <h2>Tenant configuration areas</h2>
          </div>
        </div>
        <div className="module-grid settings-modules">
          {[
            'Practice profile',
            'Activate therapists',
            'Activate receptionists',
            'Rooms',
            'Working hours',
            'Report templates',
            'Reminder templates',
            'Billing preferences',
            'Patient portal access',
            'Audit log',
          ].map((setting) => (
            <span key={setting}>{setting}</span>
          ))}
        </div>
      </section>

      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>Operating procedure</p>
            <h2>How To guides</h2>
          </div>
          <button>View all</button>
        </div>
        <div className="how-to-grid">
          {[
            ['Patient setup', 'Register a patient, add guardians, medical aid and consent forms.'],
            ['Booking sessions', 'Create, reschedule, cancel and mark no-show appointments.'],
            ['Session notes', 'Complete SOAP notes, process notes, goals and progress updates.'],
            ['Reports', 'Create parent, school, referral, progress and discharge reports.'],
            ['Finance flow', 'Create invoices, allocate payments and send statements.'],
            ['Staff setup', 'Activate therapists and receptionists inside the practice tenant.'],
          ].map(([title, detail]) => (
            <button className="how-to-card" key={title}>
              <strong>{title}</strong>
              <span>{detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel span-3">
        <div className="panel-heading">
          <div>
            <p>What's new</p>
            <h2>Latest app updates</h2>
          </div>
          <button>Release history</button>
        </div>
        <div className="whats-new-list">
          {[
            ['27 Jun 2026', 'Patients', 'Shared base Patients view for Admin, Therapist and Reception users.'],
            ['27 Jun 2026', 'Settings', 'Added Operating Procedure with How To guides for common app workflows.'],
            ['27 Jun 2026', 'Platform', 'Clarified tenant Admin setup and Super Admin tenant restrictions.'],
          ].map(([date, area, update]) => (
            <article className="whats-new-card" key={`${date}-${area}`}>
              <time>{date}</time>
              <strong>{area}</strong>
              <span>{update}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function SuperAdminWorkspace({ view }: { view: View }) {
  return (
    <div className="page-grid">
      {view === 'overview' && (
        <>
          <Metric label="Tenants" value="28" detail="2 pending activation" />
          <Metric label="Tenant admins" value="31" detail="primary practice admin users" />
          <Metric label="Support access" value="4" detail="active tenant support requests" />
        </>
      )}

      <section className="panel span-2">
        <div className="panel-heading">
          <div>
            <p>Tenant management</p>
            <h2>Platform customer workspaces</h2>
          </div>
          <button>Create tenant</button>
        </div>
        <div className="table super-admin-table">
          {[
            ['Kids Therapy Centre', 'Active', 'Growth practice', '42 users'],
            ['Smith Occupational Therapy', 'Active', 'Solo practice', '3 users'],
            ['Family Wellness Practice', 'Suspended', 'Team practice', '18 users'],
            ['Northside Speech Clinic', 'Trial', 'Growth practice', '9 users'],
          ].map(([name, status, plan, users]) => (
            <div className="table-row" key={name}>
              <span>{name}</span>
              <Status label={status} />
              <span>{plan}</span>
              <span>{users}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p>User management</p>
            <h2>Tenant admin actions</h2>
          </div>
        </div>
        <div className="tool-list">
          <button>Create tenant Admin</button>
          <button>Reset Admin access</button>
          <button>Suspend tenant</button>
          <button>Open support access</button>
        </div>
      </section>

      {view === 'overview' && (
        <section className="panel span-3">
          <div className="panel-heading">
            <div>
              <p>Scope reminder</p>
              <h2>Super Admin does not manage practice operations</h2>
            </div>
          </div>
          <p className="quiet">
            Patient records, therapist notes, reports, appointments, invoices and payments belong inside each tenant
            workspace. The platform owner manages tenant lifecycle and tenant Admin access only.
          </p>
        </section>
      )}
    </div>
  )
}

function PatientPortal() {
  return (
    <section className="panel portal-panel">
      <div className="panel-heading">
        <div>
          <p>Secure customer link</p>
          <h2>Patient portal</h2>
        </div>
      </div>
      <div className="phone-frame">
        <strong>Hi Marissa</strong>
        <span>Cellphone OTP verified</span>
        <div>
          <p>Next session</p>
          <b>Today · 08:30 · Room 2</b>
        </div>
        <div>
          <p>Payment due</p>
          <b>{formatMoney(780)}</b>
        </div>
        <button>Request booking change</button>
      </div>
    </section>
  )
}

function Permissions({ role }: { role: string }) {
  const permissions = roles.find((item) => item.role === role)?.permissions ?? []

  return (
    <ul className="permission-list">
      {permissions.map((permission) => (
        <li key={permission}>{permission}</li>
      ))}
    </ul>
  )
}

function Status({ label }: { label: string }) {
  return <span className={`status ${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</span>
}

function EditableDetail({
  label,
  value,
  isEditing,
  onChange,
}: {
  label: string
  value: string
  isEditing: boolean
  onChange: (value: string) => void
}) {
  return (
    <div>
      <dt>{label}</dt>
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

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default App
