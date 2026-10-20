import { useSearchParams } from 'react-router-dom'
import { FinancePriceListsPage } from './FinancePriceLists'
import { PracticeBankingPage } from './PracticeBanking'
import { PracticeBillingPage } from './PracticeBilling'

type BillingSection = 'bank-accounts' | 'billing' | 'services-pricing'

export function PracticeBillingConfigurationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedSection = searchParams.get('section')
  const activeSection: BillingSection = requestedSection === 'billing' || requestedSection === 'services-pricing'
    ? requestedSection
    : 'bank-accounts'

  const selectSection = (section: BillingSection) => {
    setSearchParams(section === 'bank-accounts' ? {} : { section }, { replace: true })
  }

  return (
    <div className="practice-billing-configuration-workspace">
      <div className="segmented practice-billing-configuration-tabs" role="tablist" aria-label="Billing configuration sections">
        <button
          type="button"
          className={activeSection === 'bank-accounts' ? 'active' : ''}
          role="tab"
          aria-selected={activeSection === 'bank-accounts'}
          onClick={() => selectSection('bank-accounts')}
        >
          Bank Accounts
        </button>
        <button
          type="button"
          className={activeSection === 'billing' ? 'active' : ''}
          role="tab"
          aria-selected={activeSection === 'billing'}
          onClick={() => selectSection('billing')}
        >
          Billing Configuration
        </button>
        <button
          type="button"
          className={activeSection === 'services-pricing' ? 'active' : ''}
          role="tab"
          aria-selected={activeSection === 'services-pricing'}
          onClick={() => selectSection('services-pricing')}
        >
          Services &amp; Pricing
        </button>
      </div>

      {activeSection === 'bank-accounts' && <PracticeBankingPage />}
      {activeSection === 'billing' && <PracticeBillingPage />}
      {activeSection === 'services-pricing' && <FinancePriceListsPage />}
    </div>
  )
}
