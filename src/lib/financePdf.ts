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
  invoiceLayout?: {
    practiceName: string
    practiceDetails: string[]
    recipientName: string
    recipientDetails: string[]
    invoiceDate: string
    dueDate: string
    amountDue: string
    paymentDetails: string[]
    terms?: string
    accentColour?: string
  }
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

function drawColouredText(text: string, x: number, y: number, size: number, font: string, rgb: string) {
  return `${rgb} rg ${drawText(text, x, y, size, font)}0 0 0 rg `
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

function hexToPdfRgb(value: string | undefined, fallback = '0.13 0.55 0.55') {
  const match = value?.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) return fallback
  const hex = match[1]
  return [0, 2, 4]
    .map((offset) => (Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).toFixed(3))
    .join(' ')
}

function addInvoiceSupportFooter(pageContent: string) {
  const allideskBlue = hexToPdfRgb('#281878')
  let footer = drawLine(margin, 46, pageWidth - margin, 46)
  footer += drawText('This practice is supported by', 394, 24, 7)
  footer += drawColouredText('AlliDesk.', 493, 22, 10, 'F2', allideskBlue)
  return pageContent + footer
}

function buildInvoicePages(definition: PdfDefinition) {
  const layout = definition.invoiceLayout
  if (!layout) return []

  const pages: string[] = []
  const accent = hexToPdfRgb(layout.accentColour)
  const paleAccent = accent.split(' ').map((part) => (0.88 + Number(part) * 0.12).toFixed(3)).join(' ')
  const table = definition.table
  const tableHeaders = table?.headers ?? []
  const tableRows = table?.rows ?? []
  const columnX = [margin + 8, 330, 420, 475]
  const columnWidths = [50, 14, 8, 15]
  let content = ''
  let y = 0

  const drawPageHeader = (continuation = false) => {
    content += drawFillRect(0, 532, pageWidth, 310, paleAccent)
    content += drawFillRect(margin, 755, 28, 28, accent)
    content += drawColouredText(layout.practiceName.slice(0, 1).toUpperCase(), margin + 9, 764, 12, 'F2', '1 1 1')
    content += drawColouredText(wrapText(layout.practiceName, 32)[0], margin + 38, 774, continuation ? 14 : 16, 'F2', accent)
    content += drawText(continuation ? 'Invoice continued' : 'Practice invoice', margin + 38, 757, 8, 'F1')
    content += drawText(definition.title.toUpperCase(), 405, 770, continuation ? 20 : 27, 'F2')
    if (definition.documentNumber) content += drawText(definition.documentNumber, 405, 749, 10, 'F2')
    content += drawText(`Invoice date  ${layout.invoiceDate}`, 405, 733, 8)
    content += drawText(`Due date      ${layout.dueDate}`, 405, 720, 8)

    if (!continuation) {
      content += drawColouredText('FROM', margin, 700, 7, 'F2', accent)
      layout.practiceDetails.filter(Boolean).slice(0, 6).forEach((line, index) => {
        content += drawText(line, margin, 684 - index * 13, 8)
      })
      content += drawColouredText('TO', 405, 700, 7, 'F2', accent)
      content += drawText(layout.recipientName, 405, 684, 9, 'F2')
      layout.recipientDetails.filter(Boolean).slice(0, 5).forEach((line, index) => {
        content += drawText(line, 405, 668 - index * 13, 8)
      })
      content += drawFillRect(390, 558, 157, 58, accent)
      content += drawColouredText('TOTAL DUE', 405, 594, 7, 'F2', '1 1 1')
      content += drawColouredText(layout.amountDue, 405, 572, 15, 'F2', '1 1 1')
    }

    y = 506
    content += drawLine(margin, y + 11, pageWidth - margin, y + 11)
    tableHeaders.slice(0, 4).forEach((header, index) => {
      content += drawColouredText(header.toUpperCase(), columnX[index], y, 7, 'F2', accent)
    })
    y -= 27
  }

  drawPageHeader()

  tableRows.forEach((row) => {
    const descriptionLines = wrapText(row.columns[0] ?? '', columnWidths[0]).slice(0, 4)
    const rowHeight = Math.max(34, descriptionLines.length * 11 + 12)
    if (y - rowHeight < 205) {
      pages.push(addInvoiceSupportFooter(content))
      content = ''
      drawPageHeader(true)
    }
    content += drawLine(margin, y + 8, pageWidth - margin, y + 8)
    descriptionLines.forEach((line, index) => {
      content += drawText(line, columnX[0], y - index * 11, index === 0 ? 8 : 7, index === 0 ? 'F2' : 'F1')
    })
    row.columns.slice(1, 4).forEach((column, index) => {
      const safeValue = wrapText(column, columnWidths[index + 1])[0]
      content += drawText(safeValue, columnX[index + 1], y, 8, index === 2 ? 'F2' : 'F1')
    })
    y -= rowHeight
  })

  if (y < 238) {
    pages.push(addInvoiceSupportFooter(content))
    content = ''
    drawPageHeader(true)
  }

  content += drawLine(margin, y + 8, pageWidth - margin, y + 8)
  const totals = definition.totals ?? []
  const totalsY = y - 14
  totals.forEach(([label, value], index) => {
    const lineY = totalsY - index * 16
    const isLast = index === totals.length - 1
    content += drawText(label.toUpperCase(), 380, lineY, isLast ? 9 : 8, 'F2')
    content += drawText(value, 480, lineY, isLast ? 10 : 8, 'F2')
  })

  content += drawColouredText('PAYMENT DETAILS', margin, totalsY, 7, 'F2', accent)
  layout.paymentDetails.filter(Boolean).slice(0, 6).forEach((line, index) => {
    content += drawText(line, margin, totalsY - 17 - index * 12, 8)
  })

  const terms = layout.terms || definition.footer
  if (terms) {
    content += drawColouredText('TERMS & NOTES', margin, 102, 7, 'F2', accent)
    wrapText(terms, 100).slice(0, 4).forEach((line, index) => {
      content += drawText(line, margin, 86 - index * 11, 7)
    })
  }
  pages.push(addInvoiceSupportFooter(content))
  return pages
}

function createPdfFile(pages: string[], filename: string) {
  const numberedPages = pages.map((page, index) => (
    page + drawText(`Page ${index + 1} of ${pages.length}`, 272, 24, 7)
  ))
  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  const pageObjectIds = numberedPages.map((_, index) => 5 + index * 2)
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${numberedPages.length} >>`)
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  numberedPages.forEach((page, index) => {
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

export function buildFinancialPdfFile(definition: PdfDefinition, filename: string) {
  const invoicePages = buildInvoicePages(definition)
  if (invoicePages.length) return createPdfFile(invoicePages, filename)

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
  return createPdfFile(pages, filename)
}
