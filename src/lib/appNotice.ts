export type AppNotice = {
  message: string
  tone: 'success' | 'error'
}

export const appNoticeEventName = 'allidesk:notice'

export function publishAppNotice(notice: AppNotice) {
  window.dispatchEvent(new CustomEvent<AppNotice>(appNoticeEventName, { detail: notice }))
}

export function showSuccessNotice(message: string) {
  publishAppNotice({ message, tone: 'success' })
}

export function showErrorNotice(message: string) {
  publishAppNotice({ message, tone: 'error' })
}
