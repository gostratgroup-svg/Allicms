import { useRef } from 'react'
import type { ReactNode } from 'react'
import { PencilIcon } from './icons'

type RichTextComposerProps = {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onEdit?: () => void
  onComplete?: () => void
  disabled?: boolean
  readOnly?: boolean
  saving?: boolean
  placeholder?: string
  ariaLabel: string
  saveLabel?: string
}

function renderInline(value: string): ReactNode[] {
  return value.split(/(\*\*.*?\*\*|https?:\/\/[^\s]+)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    if (/^https?:\/\//.test(part)) return <a href={part} target="_blank" rel="noreferrer" key={`${part}-${index}`}>{part}</a>
    return part
  })
}

function FormattedNote({ value }: { value: string }) {
  return (
    <div className="rich-text-composer-preview">
      {value.split('\n').map((line, index) => {
        const bullet = line.match(/^[-•]\s+(.*)$/)
        const numbered = line.match(/^(\d+)\.\s+(.*)$/)
        if (bullet) return <div className="formatted-note-list-line" key={index}><span>•</span><p>{renderInline(bullet[1])}</p></div>
        if (numbered) return <div className="formatted-note-list-line" key={index}><span>{numbered[1]}.</span><p>{renderInline(numbered[2])}</p></div>
        return line ? <p key={index}>{renderInline(line)}</p> : <br key={index} />
      })}
    </div>
  )
}

export function RichTextComposer({ value, onChange, onSave, onEdit, onComplete, disabled = false, readOnly = false, saving = false, placeholder, ariaLabel, saveLabel = 'Save' }: RichTextComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const replaceSelection = (before: string, after = before, fallback = '') => {
    const textarea = textareaRef.current
    if (!textarea || disabled || readOnly) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end) || fallback
    const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
    onChange(nextValue)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const formatLines = (ordered: boolean) => {
    const textarea = textareaRef.current
    if (!textarea || disabled || readOnly) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const nextBreak = value.indexOf('\n', end)
    const lineEnd = nextBreak === -1 ? value.length : nextBreak
    const selectedLines = value.slice(lineStart, lineEnd).split('\n')
    const formatted = selectedLines.map((line, index) => `${ordered ? `${index + 1}.` : '-'} ${line.replace(/^(?:-|\d+\.)\s+/, '')}`).join('\n')
    onChange(`${value.slice(0, lineStart)}${formatted}${value.slice(lineEnd)}`)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + formatted.length)
    })
  }

  return (
    <div className="rich-text-composer">
      <div className="rich-text-composer-toolbar" role="toolbar" aria-label="Text formatting">
        {!readOnly && (
          <div className="rich-text-composer-tools">
            <button type="button" disabled={disabled} onClick={() => replaceSelection('**', '**', 'bold text')} aria-label="Bold" title="Bold"><strong>B</strong></button>
            <button type="button" disabled={disabled} onClick={() => formatLines(false)} aria-label="Bulleted list" title="Bulleted list">•</button>
            <button type="button" disabled={disabled} onClick={() => formatLines(true)} aria-label="Numbered list" title="Numbered list">1.</button>
          </div>
        )}
        {readOnly ? (
          <div className="rich-text-composer-saved-actions">
            {onComplete && <button className="rich-text-composer-complete" type="button" disabled={disabled || saving} onClick={onComplete}>{saving ? 'Saving' : 'Complete'}</button>}
            {onEdit && <button className="rich-text-composer-edit" type="button" disabled={disabled} onClick={onEdit} aria-label="Edit note" title="Edit"><PencilIcon /></button>}
          </div>
        ) : (
          <button className="rich-text-composer-save" type="button" disabled={disabled || saving || !value.trim()} onClick={onSave}>{saving ? 'Saving' : saveLabel}</button>
        )}
      </div>
      {readOnly ? <FormattedNote value={value} /> : (
        <textarea
          ref={textareaRef}
          rows={7}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}
