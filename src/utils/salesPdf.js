/**
 * PDF for proposals and invoices (generated in the browser with jsPDF - no server dependency).
 * Uses only data returned by the API.
 */
const fmt = (v, currency) => {
  const n = Number(v || 0)
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'USD' }).format(n)
  } catch {
    return `${n.toFixed(2)} ${currency || ''}`
  }
}
const d = (x) => (x ? new Date(x).toLocaleDateString() : '-')

export const downloadSalesPdf = async (kind, doc, agencyName) => {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const cur = doc.currency
  const W = pdf.internal.pageSize.getWidth()

  pdf.setFontSize(18)
  pdf.text(kind === 'invoice' ? 'INVOICE' : 'PROPOSAL', 40, 50)
  pdf.setFontSize(10)
  pdf.text(agencyName || '', 40, 68)
  pdf.text(`No: ${doc.number}`, W - 40, 50, { align: 'right' })
  pdf.text(`Date: ${d(doc.issue_date)}`, W - 40, 64, { align: 'right' })
  if (kind === 'invoice') pdf.text(`Due: ${d(doc.due_date)}`, W - 40, 78, { align: 'right' })
  else if (doc.valid_until) pdf.text(`Valid until: ${d(doc.valid_until)}`, W - 40, 78, { align: 'right' })

  const to = doc.client
    ? [doc.client.company_name, doc.client.billing_address || doc.client.address, [doc.client.city, doc.client.country].filter(Boolean).join(', '), doc.client.billing_email, doc.client.tax_id ? `Tax ID: ${doc.client.tax_id}` : null]
    : [doc.lead?.company_name || doc.lead?.name, doc.lead?.email]
  pdf.setFontSize(11)
  pdf.text('Bill to', 40, 110)
  pdf.setFontSize(10)
  to.filter(Boolean).forEach((line, i) => pdf.text(String(line), 40, 126 + i * 14))
  if (kind === 'proposal' && doc.title) { pdf.setFontSize(12); pdf.text(doc.title, 40, 210) }

  autoTable(pdf, {
    startY: 225,
    head: [['Description', 'Qty', 'Unit price', 'Amount']],
    body: (doc.items || []).map((it) => [it.description, String(Number(it.quantity)), fmt(it.unit_price, cur), fmt(it.amount, cur)]),
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    headStyles: { fillColor: [52, 84, 209] },
  })
  let y = pdf.lastAutoTable.finalY + 20
  const row = (k, v, bold) => { pdf.setFont(undefined, bold ? 'bold' : 'normal'); pdf.text(k, W - 200, y); pdf.text(v, W - 40, y, { align: 'right' }); y += 16 }
  row('Subtotal', fmt(doc.subtotal, cur))
  if (Number(doc.discount) > 0) row('Discount', `- ${fmt(doc.discount, cur)}`)
  row(`Tax (${Number(doc.tax_rate)}%)`, fmt(doc.tax_amount, cur))
  row('Total', fmt(doc.total, cur), true)
  if (kind === 'invoice') { row('Paid', fmt(doc.amount_paid, cur)); row('Balance due', fmt(Number(doc.total) - Number(doc.amount_paid), cur), true) }
  pdf.setFont(undefined, 'normal')
  y += 10
  for (const [title, text] of [['Notes', doc.notes], ['Terms', doc.terms]]) {
    if (!text) continue
    pdf.setFontSize(11); pdf.text(title, 40, y); y += 14
    pdf.setFontSize(9)
    const lines = pdf.splitTextToSize(String(text), W - 80)
    pdf.text(lines, 40, y); y += lines.length * 12 + 10
  }
  pdf.save(`${doc.number}.pdf`)
}
