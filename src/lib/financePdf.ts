type PdfLineItem = {
  columns: string[]
}

type PdfSection = {
  title: string
  rows: Array<[string, string]>
}

type PdfDefinition = {
  title: string
  subtitle?: string
  documentNumber?: string
  generatedAt?: string
  sections: PdfSection[]
  table?: {
    headers: string[]
    rows: PdfLineItem[]
  }
  totals?: Array<[string, string]>
  footer?: string
}

const pageWidth = 595
const pageHeight = 842
const margin = 48
const lineHeight = 15

function ascii(value: string) {
  return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '')
}

function escapePdfText(value: string) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrapText(value: string, maxChars: number) {
  const words = ascii(value || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  })
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function drawText(text: string, x: number, y: number, size = 10, font = 'F1') {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET\n`
}

function drawLine(x1: number, y1: number, x2: number, y2: number) {
  return `0.78 0.78 0.88 RG ${x1} ${y1} m ${x2} ${y2} l S\n`
}

function drawFillRect(x: number, y: number, width: number, height: number, rgb = '1 0.94 0.9') {
  return `${rgb} rg ${x} ${y} ${width} ${height} re f\n`
}

function addPage(pages: string[], current: string) {
  pages.push(current)
  return ''
}

export function buildFinancialPdfFile(definition: PdfDefinition, filename: string) {
  const pages: string[] = []
  let content = ''
  let y = pageHeight - margin

  const ensureSpace = (needed = 42) => {
    if (y - needed > margin) return
    content = addPage(pages, content)
    y = pageHeight - margin
  }

  const write = (text: string, x = margin, size = 10, font = 'F1') => {
    content += drawText(text, x, y, size, font)
    y -= lineHeight
  }

  content += drawText(definition.title, margin, y, 30, 'F2')
  if (definition.documentNumber) content += drawText(definition.documentNumber, 400, y + 6, 11, 'F2')
  y -= 34
  if (definition.subtitle) {
    write(definition.subtitle, margin, 12, 'F2')
  }
  if (definition.generatedAt) {
    write(`Generated ${definition.generatedAt}`, margin, 9)
  }
  content += drawLine(margin, y, pageWidth - margin, y)
  y -= 24

  definition.sections.forEach((section) => {
    ensureSpace(80)
    write(section.title, margin, 13, 'F2')
    y -= 3
    section.rows.forEach(([label, value]) => {
      ensureSpace(28)
      content += drawText(label, margin, y, 8, 'F2')
      wrapText(value || 'Not set', 58).slice(0, 3).forEach((line, index) => {
        content += drawText(line, margin + 130, y - (index * 12), 9)
      })
      y -= Math.max(lineHeight, wrapText(value || 'Not set', 58).slice(0, 3).length * 12)
    })
    y -= 10
  })

  if (definition.table) {
    ensureSpace(90)
    content += drawFillRect(margin, y - 18, pageWidth - margin * 2, 24)
    const widths = [74, 82, 210, 70, 72]
    let x = margin + 8
    definition.table.headers.forEach((header, index) => {
      content += drawText(header, x, y - 3, 8, 'F2')
      x += widths[index] ?? 90
    })
    y -= 32

    definition.table.rows.forEach((row) => {
      ensureSpace(44)
      const descriptionLines = wrapText(row.columns[2] ?? '', 34).slice(0, 3)
      const rowHeight = Math.max(24, descriptionLines.length * 12 + 6)
      content += drawLine(margin, y + 6, pageWidth - margin, y + 6)
      x = margin + 8
      row.columns.forEach((column, index) => {
        if (index === 2) {
          descriptionLines.forEach((line, lineIndex) => {
            content += drawText(line, x, y - (lineIndex * 12), 8)
          })
        } else {
          content += drawText(column, x, y, 8)
        }
        x += widths[index] ?? 90
      })
      y -= rowHeight
    })
    y -= 8
  }

  if (definition.totals?.length) {
    ensureSpace(70)
    const boxWidth = 185
    const boxX = pageWidth - margin - boxWidth
    content += drawFillRect(boxX, y - (definition.totals.length * 18) - 12, boxWidth, definition.totals.length * 18 + 22)
    y -= 16
    definition.totals.forEach(([label, value]) => {
      content += drawText(label, boxX + 14, y, 9, 'F2')
      content += drawText(value, boxX + 105, y, 10, 'F2')
      y -= 18
    })
    y -= 12
  }

  if (definition.footer) {
    ensureSpace(45)
    content += drawLine(margin, margin + 26, pageWidth - margin, margin + 26)
    wrapText(definition.footer, 92).slice(0, 2).forEach((line, index) => {
      content += drawText(line, margin, margin + 10 - index * 11, 8)
    })
  }

  pages.push(content)

  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  const pageObjectIds = pages.map((_, index) => 5 + index * 2)
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  pages.forEach((page, index) => {
    const pageId = 5 + index * 2
    const contentId = pageId + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${page.length} >>\nstream\n${page}endstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new File([new Blob([pdf], { type: 'application/pdf' })], filename, { type: 'application/pdf' })
}
