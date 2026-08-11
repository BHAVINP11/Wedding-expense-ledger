import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const PDF_HEADER = {
  coupleNames: 'Bhavin & Shweta',
  weddingDate: 'March 15, 2026',
}

function addPdfHeader(doc) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(107, 30, 60)
  doc.text(PDF_HEADER.coupleNames, 40, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(86, 70, 60)
  doc.text(`Wedding date: ${PDF_HEADER.weddingDate}`, 40, 58)
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 40, 72)
}

export function exportPdf(tableTitle, headers, rows) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  addPdfHeader(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(74, 19, 41)
  doc.text(tableTitle, 40, 96)

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 112,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 6,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'top',
    },
    headStyles: {
      fillColor: [107, 30, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [253, 247, 241],
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 70 },
      2: { cellWidth: 90 },
      3: { cellWidth: 90 },
      4: { cellWidth: 110 },
    },
  })

  doc.save(`${tableTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
