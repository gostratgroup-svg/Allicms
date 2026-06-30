import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'

type View = 'overview' | 'sessions' | 'patients' | 'finances' | 'settings'
type Role = 'Admin' | 'Reception' | 'Therapist' | 'Super Admin'
type SessionSlot = { date: string; time: string }
type CalendarSession = {
  id: string
  date: string
  startTime: string
  endTime: string
  patient: string
  type: string
  therapist: string
  room: string
}

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

const therapists = [
  { name: 'Nadia Botha', color: '#2f6fed', background: '#e2ecff' },
  { name: 'Megan Pillay', color: '#12805c', background: '#ddf7e8' },
  { name: 'Johan Kruger', color: '#b4541f', background: '#ffe7da' },
  { name: 'Team', color: '#111114', background: '#d9d9db' },
]

const formatMoney = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)

function therapistCalendarStyle(therapist: string) {
  const therapistConfig = therapists.find((item) => item.name === therapist) ?? therapists[0]
  return {
    background: therapistConfig.background,
    color: therapistConfig.color,
  }
}

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
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false)
  const [newSessionSlot, setNewSessionSlot] = useState<SessionSlot | null>(null)
  const [calendarSessionRecords, setCalendarSessionRecords] = useState<CalendarSession[]>(weekSessions)
  const [selectedCalendarSessionId, setSelectedCalendarSessionId] = useState(weekSessions[0]?.id ?? '')

  const openNewSession = (slot?: SessionSlot) => {
    setNewSessionSlot(slot ?? null)
    setIsNewSessionOpen(true)
  }

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
            <button
              type="button"
              onClick={() => {
                if (role !== 'Super Admin') openNewSession()
              }}
            >
              {role === 'Super Admin' ? 'Manage tenants' : 'New session'}
            </button>
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
            {view === 'sessions' && (
              <Sessions
                calendarSessions={calendarSessionRecords}
                selectedSessionId={selectedCalendarSessionId}
                setSelectedSessionId={setSelectedCalendarSessionId}
                onUpdateSession={(updatedSession) => {
                  setCalendarSessionRecords((records) =>
                    records.map((session) => (session.id === updatedSession.id ? updatedSession : session)),
                  )
                }}
                onNewSession={openNewSession}
              />
            )}
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
      {isNewSessionOpen && (
        <NewSessionModal
          patients={patientRecords}
          calendarSessions={calendarSessionRecords}
          initialDate={newSessionSlot?.date}
          initialTime={newSessionSlot?.time}
          onCreate={(session) => {
            setCalendarSessionRecords((records) => [...records, session])
            setSelectedCalendarSessionId(session.id)
            setView('sessions')
            setIsNewSessionOpen(false)
          }}
          onClose={() => setIsNewSessionOpen(false)}
        />
      )}
    </div>
  )
}

function NewSessionModal({
  patients,
  calendarSessions,
  initialDate = '2026-06-30',
  initialTime = '09:00',
  onCreate,
  onClose,
}: {
  patients: Patient[]
  calendarSessions: CalendarSession[]
  initialDate?: string
  initialTime?: string
  onCreate: (session: CalendarSession) => void
  onClose: () => void
}) {
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing')
  const [selectedPatientNumber, setSelectedPatientNumber] = useState(patients[0]?.patientNumber ?? '')
  const [patientSearch, setPatientSearch] = useState(patients[0]?.name ?? '')
  const [newPatientName, setNewPatientName] = useState('')
  const [newPatientType, setNewPatientType] = useState('Child')
  const [selectedBillingCodes, setSelectedBillingCodes] = useState<string[]>([billingItems[0].code])
  const [sessionDate, setSessionDate] = useState(initialDate)
  const [sessionTime, setSessionTime] = useState(initialTime)
  const [sessionTherapist, setSessionTherapist] = useState('Nadia Botha')
  const [sessionRoom, setSessionRoom] = useState('Room 1')
  const [isScheduleCalendarOpen, setIsScheduleCalendarOpen] = useState(false)

  const selectedPatient = patients.find((patient) => patient.patientNumber === selectedPatientNumber)
  const patientSearchNeedle = patientSearch.toLowerCase().trim()
  const patientSearchResults = patients.filter((patient) =>
    [patient.name, patient.patientNumber, patient.guardian, patient.phone].some((item) =>
      item.toLowerCase().includes(patientSearchNeedle),
    ),
  )
  const selectedBillingItems = billingItems.filter((item) => selectedBillingCodes.includes(item.code))
  const billingTotal = selectedBillingItems.reduce((total, item) => total + item.price, 0)
  const requiresGuardian = ['Child', 'Teen'].includes(newPatientType)
  const scheduleTimes = calendarQuarterSlots
  const createdSessionType = selectedBillingItems[0]?.sessionType ?? 'Therapy session'

  const toggleBillingCode = (code: string) => {
    setSelectedBillingCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  const isBookedSlot = (date: string, time: string) =>
    calendarSessions.some((session) => session.date === date && session.startTime === time)

  const scheduleSlotRow = (time: string) => timeToCalendarRow(time)

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal-window new-session-modal"
        aria-label="New session"
        onSubmit={(event) => {
          event.preventDefault()
          onCreate({
            id: `session-${Date.now()}`,
            date: sessionDate,
            startTime: sessionTime,
            endTime: minutesToTime(timeToMinutes(sessionTime) + 60),
            patient: patientMode === 'existing' ? selectedPatient?.name ?? 'Selected patient' : newPatientName || 'New patient',
            type: createdSessionType,
            therapist: sessionTherapist,
            room: sessionRoom,
          })
        }}
      >
        <div className="modal-header">
          <div>
            <p>Session intake</p>
            <h2>New session</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close new session">
            x
          </button>
        </div>

        <div className="modal-body">
          <section className="form-section">
            <div className="section-title">
              <span>1</span>
              <div>
                <strong>Identify patient</strong>
                <small>Choose an existing patient or start a new intake link.</small>
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
              <div className="form-grid two-col">
                <div className="field searchable-patient-field">
                  <span>Patient</span>
                  <input
                    value={patientSearch}
                    onChange={(event) => setPatientSearch(event.target.value)}
                    placeholder="Search name, patient number, guardian or cell"
                  />
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
                      </button>
                    ))}
                    {patientSearchResults.length === 0 && <small>No matching patients</small>}
                  </div>
                </div>
                <div className="selected-patient-card">
                  <strong>{selectedPatient?.name ?? 'Select patient'}</strong>
                  <span>{selectedPatient?.guardian ?? 'Guardian not selected'}</span>
                  <small>{selectedPatient?.phone ?? 'No cell number'}</small>
                </div>
              </div>
            ) : (
              <>
                <div className="form-grid two-col">
                  <label className="field">
                    <span>Patient name</span>
                    <input
                      value={newPatientName}
                      onChange={(event) => setNewPatientName(event.target.value)}
                      placeholder="First name and surname"
                    />
                  </label>
                  <label className="field">
                    <span>Patient type</span>
                    <select value={newPatientType} onChange={(event) => setNewPatientType(event.target.value)}>
                      <option>Child</option>
                      <option>Teen</option>
                      <option>Adult</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Cell number</span>
                    <input placeholder="Patient or guardian cell" />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input type="email" placeholder="patient@example.com" />
                  </label>
                  {requiresGuardian && (
                    <label className="field">
                      <span>Parent / guardian</span>
                      <input placeholder="Name and surname" />
                    </label>
                  )}
                </div>
                <div className="patient-link-box">
                  <span>Patient completion link</span>
                  <strong>https://allicms.app/patient-link/new-intake</strong>
                  <small>The patient or guardian completes the remaining personal, consent and account details from this link.</small>
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
            <div className="form-grid four-col">
              <label className="field">
                <span>Date</span>
                <input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
              </label>
              <label className="field">
                <span>Time</span>
                <input type="time" value={sessionTime} onChange={(event) => setSessionTime(event.target.value)} />
              </label>
              <label className="field">
                <span>Therapist</span>
                <select value={sessionTherapist} onChange={(event) => setSessionTherapist(event.target.value)}>
                  {therapists.filter((therapist) => therapist.name !== 'Team').map((therapist) => (
                    <option key={therapist.name}>{therapist.name}</option>
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
            </div>
            {isScheduleCalendarOpen && (
              <div className="quick-schedule-calendar" aria-label="Quick week calendar">
                <div className="quick-calendar-corner" />
                {weekDays.map((day) => (
                  <div className={`quick-calendar-day-head ${day.iso === '2026-06-30' ? 'today' : ''}`} key={day.iso}>
                    <span>{day.label}</span>
                    <strong>{day.date}</strong>
                  </div>
                ))}
                {scheduleTimes.filter((_, index) => index % 2 === 0).map((time) => (
                  <span className="quick-calendar-time" style={{ gridRow: `${scheduleSlotRow(time)} / span 2` }} key={time}>
                    {time}
                  </span>
                ))}
                {weekDays.map((day, dayIndex) =>
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
                  .map((session) => ({ ...session, day: weekDays.findIndex((day) => day.iso === session.date) }))
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
                <strong>Billing and ICD-10</strong>
                <small>Select one or more configured billing items.</small>
              </div>
            </div>
            <div className="billing-choice-table">
              <div className="billing-choice-head">
                <span />
                <span>Code</span>
                <span>Session type</span>
                <span>Price</span>
              </div>
              {billingItems.map((item) => (
                <label className="billing-choice" key={item.code}>
                  <input
                    type="checkbox"
                    checked={selectedBillingCodes.includes(item.code)}
                    onChange={() => toggleBillingCode(item.code)}
                  />
                  <code>{item.code}</code>
                  <span className="billing-session-type">
                    <strong>{item.sessionType}</strong>
                    <small>{item.description}</small>
                  </span>
                  <b>{formatMoney(item.price)}</b>
                </label>
              ))}
            </div>
            <div className="billing-total">
              <span>Estimated session total</span>
              <strong>{formatMoney(billingTotal)}</strong>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Create session</button>
        </div>
      </form>
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

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

const weekDays = buildWeekDays('2026-06-30')
const calendarHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']
const calendarQuarterSlots = buildTimeSlots('08:00', '16:00', 15)
const calendarSlots = calendarQuarterSlots.map((time) => ({ time, row: timeToCalendarRow(time) }))
const weekSessions = [
  { id: 'cal-1', date: '2026-06-29', startTime: '08:30', endTime: '09:30', patient: 'Liam Jacobs', type: 'OT', therapist: 'Nadia Botha', room: 'Room 2' },
  { id: 'cal-2', date: '2026-06-30', startTime: '10:00', endTime: '11:00', patient: 'Amahle Dlamini', type: 'Speech', therapist: 'Megan Pillay', room: 'Telehealth' },
  { id: 'cal-3', date: '2026-07-01', startTime: '12:15', endTime: '13:15', patient: 'Ethan Naidoo', type: 'Review', therapist: 'Nadia Botha', room: 'Room 1' },
  { id: 'cal-4', date: '2026-07-02', startTime: '14:15', endTime: '15:15', patient: 'Mila van Wyk', type: 'Physio', therapist: 'Johan Kruger', room: 'Gym' },
  { id: 'cal-5', date: '2026-07-03', startTime: '09:30', endTime: '10:30', patient: 'Jenny Pennig', type: 'OT', therapist: 'Nadia Botha', room: 'Room 2' },
  { id: 'cal-6', date: '2026-07-03', startTime: '10:30', endTime: '11:30', patient: 'Joe Peterson', type: 'Speech', therapist: 'Megan Pillay', room: 'Room 1' },
  { id: 'cal-7', date: '2026-07-03', startTime: '12:00', endTime: '13:00', patient: 'Olivia Riley', type: 'Review', therapist: 'Nadia Botha', room: 'Room 1' },
  { id: 'cal-8', date: '2026-07-03', startTime: '14:00', endTime: '15:00', patient: 'Inkfish Weekly', type: 'Admin', therapist: 'Team', room: 'Admin' },
  { id: 'cal-9', date: '2026-07-04', startTime: '09:00', endTime: '10:00', patient: 'New intake', type: 'Assessment', therapist: 'Johan Kruger', room: 'Room 1' },
]

function Sessions({
  calendarSessions,
  selectedSessionId,
  setSelectedSessionId,
  onUpdateSession,
  onNewSession,
}: {
  calendarSessions: CalendarSession[]
  selectedSessionId: string
  setSelectedSessionId: Dispatch<SetStateAction<string>>
  onUpdateSession: (session: CalendarSession) => void
  onNewSession: (slot?: SessionSlot) => void
}) {
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week')
  const [selectedWeekIso, setSelectedWeekIso] = useState('2026-06-30')
  const [selectedMonthIso, setSelectedMonthIso] = useState('2026-07-01')
  const [isSessionEditMode, setIsSessionEditMode] = useState(false)
  const [isSessionOpen, setIsSessionOpen] = useState(false)
  const selectedWeekDays = buildWeekDays(selectedWeekIso)
  const selectedSession = calendarSessions.find((session) => session.id === selectedSessionId) ?? calendarSessions[0]
  const monthCalendarDays = buildMonthDays(selectedMonthIso)
  const visibleWeekSessions = calendarSessions
    .map((session) => ({ ...session, day: selectedWeekDays.findIndex((day) => day.iso === session.date) }))
    .filter((session) => session.day >= 0)
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

  return (
    <div className="page-grid sessions-grid">
      <section className="panel span-3 calendar-panel">
        <div className="panel-heading">
          <div>
            <p>{calendarMode === 'week' ? getWeekRangeLabel(selectedWeekDays) : getMonthLabel(selectedMonthIso)}</p>
            <h2>{calendarMode === 'week' ? 'Week schedule' : 'Month calendar'}</h2>
          </div>
          <div className="calendar-controls">
            <button type="button" className="calendar-arrow" onClick={() => navigateCalendar(-1)} aria-label="Previous">
              &lt;
            </button>
            <span className="calendar-active-view">{calendarMode === 'week' ? 'Week' : 'Month'}</span>
            <button type="button" className="calendar-arrow" onClick={() => navigateCalendar(1)} aria-label="Next">
              &gt;
            </button>
            <button
              type="button"
              className="calendar-view-switch"
              onClick={() => setCalendarMode(calendarMode === 'week' ? 'month' : 'week')}
            >
              {calendarMode === 'week' ? 'Month' : 'Week'}
            </button>
          </div>
        </div>
        {calendarMode === 'week' ? (
          <div className="week-calendar" aria-label="Weekly session calendar">
            <div className="calendar-corner" />
            {selectedWeekDays.map((day) => (
              <div className={`calendar-day-head ${day.iso === '2026-06-30' ? 'today' : ''}`} key={day.iso}>
                <span>{day.label}</span>
                <strong>{day.date}</strong>
              </div>
            ))}
            {calendarHours.map((time, index) => (
              <div className="calendar-time" style={{ gridRow: `${index * 2 + 2} / span 2` }} key={time}>
                {time}
              </div>
            ))}
            {selectedWeekDays.map((day, dayIndex) =>
              calendarSlots.map((slot) => (
                <button
                  type="button"
                  className="calendar-slot"
                  aria-label={`Add session on ${day.label} at ${slot.time}`}
                  style={{ gridColumn: dayIndex + 2, gridRow: slot.row }}
                  key={`${day.iso}-${slot.time}`}
                  onClick={() => onNewSession({ date: day.iso, time: slot.time })}
                />
              )),
            )}
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
                  className={`month-date ${day.inMonth ? '' : 'outside'} ${day.iso === '2026-06-30' ? 'today' : ''}`}
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
      {!isSessionOpen && (
      <section className="panel session-detail-panel">
        <div className="panel-heading">
          <div>
            <p>Saved session</p>
            <h2>{selectedSession ? selectedSession.patient : 'No session selected'}</h2>
          </div>
          {selectedSession && (
            <button
              type="button"
              className={`icon-button ${isSessionEditMode ? 'active' : ''}`}
              aria-label={isSessionEditMode ? 'Save session' : 'Edit session'}
              title={isSessionEditMode ? 'Save session' : 'Edit session'}
              onClick={() => setIsSessionEditMode((current) => !current)}
            >
              <PencilIcon />
            </button>
          )}
        </div>
        {selectedSession && (
          <SessionDetailView
            session={selectedSession}
            isEditing={isSessionEditMode}
            onChange={onUpdateSession}
          />
        )}
      </section>
      )}
      {isSessionOpen && selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          isEditing={isSessionEditMode}
          setIsEditing={setIsSessionEditMode}
          onChange={onUpdateSession}
          onClose={() => setIsSessionOpen(false)}
        />
      )}
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

function SessionDetailModal({
  session,
  isEditing,
  setIsEditing,
  onChange,
  onClose,
}: {
  session: CalendarSession
  isEditing: boolean
  setIsEditing: Dispatch<SetStateAction<boolean>>
  onChange: (session: CalendarSession) => void
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-window session-modal" aria-label="Saved session">
        <div className="modal-header">
          <div>
            <p>Saved session</p>
            <h2>{session.patient}</h2>
          </div>
          <div className="session-modal-actions">
            <button
              type="button"
              className={`icon-button ${isEditing ? 'active' : ''}`}
              aria-label={isEditing ? 'Save session' : 'Edit session'}
              title={isEditing ? 'Save session' : 'Edit session'}
              onClick={() => setIsEditing((current) => !current)}
            >
              <PencilIcon />
            </button>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close saved session">
              x
            </button>
          </div>
        </div>
        <div className="modal-body">
          <SessionDetailView session={session} isEditing={isEditing} onChange={onChange} />
        </div>
      </section>
    </div>
  )
}

function SessionDetailView({
  session,
  isEditing,
  onChange,
}: {
  session: CalendarSession
  isEditing: boolean
  onChange: (session: CalendarSession) => void
}) {
  const updateSessionField = (field: keyof CalendarSession, value: string) => {
    onChange({ ...session, [field]: value })
  }

  return (
    <div className="session-detail-view">
      <div className="session-detail-banner" style={therapistCalendarStyle(session.therapist)}>
        <div>
          <span>Session</span>
          <strong>{session.patient}</strong>
        </div>
        <small>{session.type}</small>
      </div>
      <div className="session-meta-grid">
        <article>
          <span>Date</span>
          <strong>{session.date}</strong>
        </article>
        <article>
          <span>Time</span>
          <strong>{session.startTime}-{session.endTime}</strong>
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
      <section className="session-detail-card">
        <div className="panel-heading compact-heading">
          <div>
            <p>Session information</p>
            <h2>{isEditing ? 'Edit saved session' : 'Saved record'}</h2>
          </div>
        </div>
        <dl className="session-detail-list">
          <EditableDetail label="Patient" value={session.patient} isEditing={isEditing} onChange={(value) => updateSessionField('patient', value)} />
          <EditableDetail label="Date" value={session.date} isEditing={isEditing} onChange={(value) => updateSessionField('date', value)} />
          <EditableDetail label="Start time" value={session.startTime} isEditing={isEditing} onChange={(value) => updateSessionField('startTime', value)} />
          <EditableDetail label="End time" value={session.endTime} isEditing={isEditing} onChange={(value) => updateSessionField('endTime', value)} />
          <EditableDetail label="Session type" value={session.type} isEditing={isEditing} onChange={(value) => updateSessionField('type', value)} />
          <EditableDetail label="Therapist" value={session.therapist} isEditing={isEditing} onChange={(value) => updateSessionField('therapist', value)} />
          <EditableDetail label="Room / mode" value={session.room} isEditing={isEditing} onChange={(value) => updateSessionField('room', value)} />
        </dl>
      </section>
      <div className="session-detail-actions">
        <button>Send reminder</button>
        <button>Mark no show</button>
        <button className="danger-text-button">Cancel session</button>
      </div>
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
            </div>
            <ul className="history-list">
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
  const settingOptions = [
    { id: 'users', label: 'Users', detail: 'Add receptionists or therapists' },
    { id: 'practice', label: 'Practice Configuration', detail: 'Tenant workspace setup' },
    { id: 'patients', label: 'Patient Configuration', detail: 'Patient form fields' },
    { id: 'billing', label: 'Billing Configuration', detail: 'ICD-10 and prices' },
    { id: 'guides', label: 'How To Guides', detail: 'Operating procedure' },
    { id: 'updates', label: "What's New", detail: 'Latest deployments' },
  ] as const
  const [activeSetting, setActiveSetting] = useState<(typeof settingOptions)[number]['id']>('users')
  const activeOption = settingOptions.find((option) => option.id === activeSetting) ?? settingOptions[0]

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
        <p className="tenant-note">
          Settings are tenant-specific. Some practices will have these details configured; others will only show the
          sections that apply to their setup.
        </p>

        {activeSetting === 'users' && (
          <div className="settings-detail-stack">
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
            <div className="settings-split">
              <section>
                <div className="panel-heading compact-heading">
                  <div>
                    <p>Selected permissions</p>
                    <h2>{role}</h2>
                  </div>
                </div>
                <Permissions role={role} />
              </section>
              <section>
                <div className="panel-heading compact-heading">
                  <div>
                    <p>User lifecycle</p>
                    <h2>Admin activation</h2>
                  </div>
                </div>
                <p className="quiet">
                  Every practice has at least one Admin. Admin users activate therapists and receptionists inside the tenant.
                </p>
              </section>
            </div>
            <div>
              <div className="panel-heading compact-heading">
                <div>
                  <p>Therapist calendar colours</p>
                  <h2>Colour selected when creating a therapist</h2>
                </div>
                <button>Add therapist</button>
              </div>
              <div className="therapist-colour-list">
                {therapists.filter((therapist) => therapist.name !== 'Team').map((therapist) => (
                  <article className="therapist-colour-row" key={therapist.name}>
                    <span style={{ background: therapist.background, color: therapist.color }} />
                    <strong>{therapist.name}</strong>
                    <small>{therapist.color}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSetting === 'practice' && (
          <div className="settings-detail-stack">
            <div className="module-grid settings-modules">
              {[
                'Practice profile',
                'Rooms',
                'Working hours',
                'Report templates',
                'Reminder templates',
                'Patient portal access',
                'Audit log',
                'Tenant branding',
                'Default appointment length',
              ].map((setting) => (
                <span key={setting}>{setting}</span>
              ))}
            </div>
            <div className="rules-grid">
              <div>
                <strong>1. Super Admin</strong>
                <span>Creates the practice tenant and first tenant Admin user.</span>
              </div>
              <div>
                <strong>2. Practice Admin</strong>
                <span>Controls practice settings and activates therapist or receptionist users.</span>
              </div>
              <div>
                <strong>3. Staff users</strong>
                <span>Operate inside the tenant according to their assigned permissions.</span>
              </div>
            </div>
          </div>
        )}

        {activeSetting === 'patients' && (
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
              'Financial history',
            ].map((module) => (
              <span key={module}>{module}</span>
            ))}
          </div>
        )}

        {activeSetting === 'billing' && (
          <div className="settings-detail-stack">
            <div className="panel-heading compact-heading">
              <div>
                <p>Billing setup</p>
                <h2>ICD-10 codes, session types and prices</h2>
              </div>
              <button>Add billing item</button>
            </div>
            <div className="billing-config-list">
              {billingItems.map((item) => (
                <article className="billing-config-row" key={item.code}>
                  <div>
                    <strong>{item.sessionType}</strong>
                    <span>{item.description}</span>
                  </div>
                  <code>{item.code}</code>
                  <b>{formatMoney(item.price)}</b>
                </article>
              ))}
            </div>
          </div>
        )}

        {activeSetting === 'guides' && (
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
        )}

        {activeSetting === 'updates' && (
          <div className="whats-new-list">
            {[
              ['30 Jun 2026', 'Sessions', 'Added immediate calendar creation from New session.'],
              ['30 Jun 2026', 'Settings', 'Grouped tenant configuration into navigable settings sections.'],
              ['27 Jun 2026', 'Patients', 'Shared base Patients view for Admin, Therapist and Reception users.'],
            ].map(([date, area, update]) => (
              <article className="whats-new-card" key={`${date}-${area}`}>
                <time>{date}</time>
                <strong>{area}</strong>
                <span>{update}</span>
              </article>
            ))}
          </div>
        )}
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
