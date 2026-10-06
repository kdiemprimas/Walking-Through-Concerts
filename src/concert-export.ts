import type { Concert, Expense } from './types'
import { getActualTotal, getCategoryLabel, getPlannedTotal } from './expense-utils'

const MONEY_FORMAT = '#,##0 "₫"'
const DATE_FORMAT = 'dd/mm/yyyy'
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const toExcelDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

export async function createConcertExpenseWorkbook(concert: Concert, expenses: Expense[]) {
  // Load the spreadsheet library only when an export is requested.
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Walking Through Concerts'
  const sheet = workbook.addWorksheet('Chi phí concert')
  const concertExpenses = expenses.filter((expense) => expense.concertId === concert.id)
  const plannedTotal = concertExpenses.reduce((sum, expense) => sum + getPlannedTotal(expense), 0)
  const actualTotal = concertExpenses.reduce((sum, expense) => sum + getActualTotal(expense), 0)
  const depositTotal = concertExpenses.reduce((sum, expense) => sum + (expense.depositAmount ?? 0), 0)

  sheet.columns = [7, 15, 34, 24, 11, 21, 19, 21, 21, 21].map((width) => ({ width }))
  sheet.mergeCells('A1:J1')
  sheet.getCell('A1').value = 'CHI PHÍ CONCERT'
  sheet.getRow(1).font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF7D3047' } }
  sheet.getRow(1).height = 30
  sheet.mergeCells('A2:J2')
  sheet.getCell('A2').value = `${concert.artist} · ${concert.tour}`
  sheet.getRow(2).font = { name: 'Calibri', size: 13, bold: true }

  const summaryRows = [
    ['Nghệ sĩ', concert.artist],
    ['Tour', concert.tour],
    ['Thành phố', concert.city],
    ['Địa điểm', concert.venue],
    ['Ngày concert', toExcelDate(concert.date)],
    ['Ngân sách', concert.estimatedBudget],
    ['Tổng dự tính', plannedTotal],
    ['Tổng thực tế', actualTotal],
    ['Số khoản chi', concertExpenses.length],
  ]
  summaryRows.forEach((values, index) => {
    const rowNumber = index + 4
    sheet.mergeCells(`A${rowNumber}:B${rowNumber}`)
    sheet.mergeCells(`C${rowNumber}:F${rowNumber}`)
    const row = sheet.getRow(rowNumber)
    row.getCell(1).value = values[0]
    row.getCell(3).value = values[1]
    row.getCell(1).font = { bold: true }
  })
  sheet.getCell('C8').numFmt = DATE_FORMAT
  for (const rowNumber of [9, 10, 11]) sheet.getCell(`C${rowNumber}`).numFmt = MONEY_FORMAT
  sheet.mergeCells('A13:J13')
  sheet.getCell('A13').value = 'Dự tính = tiền/người × số người + cọc tiền. Thực tế = tiền/người × số người.'
  sheet.getCell('A13').font = { italic: true, color: { argb: 'FF65515A' } }

  const header = sheet.getRow(14)
  header.values = ['STT', 'Ngày thanh toán', 'Khoản chi', 'Danh mục', 'Số người', 'Dự tính / người', 'Cọc tiền', 'Tổng dự tính', 'Thực tế / người', 'Tổng thực tế']
  header.font = { bold: true, color: { argb: 'FF7D3047' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD1D9' } }
  header.alignment = { vertical: 'middle', wrapText: true }
  header.height = 32

  concertExpenses.forEach((expense, index) => {
    const row = sheet.getRow(15 + index)
    // ExcelJS stores strings as literal text, including names beginning with '='.
    row.values = [
      index + 1, toExcelDate(expense.date), expense.name, getCategoryLabel(expense), expense.peopleCount,
      expense.plannedAmount, expense.depositAmount ?? 0, getPlannedTotal(expense), expense.actualAmount, getActualTotal(expense),
    ]
    row.alignment = { vertical: 'middle', wrapText: true }
    row.getCell(2).numFmt = DATE_FORMAT
    for (const columnNumber of [6, 7, 8, 9, 10]) row.getCell(columnNumber).numFmt = MONEY_FORMAT
  })

  const totalRowNumber = 15 + concertExpenses.length
  const totalRow = sheet.getRow(totalRowNumber)
  sheet.mergeCells(`A${totalRowNumber}:F${totalRowNumber}`)
  totalRow.getCell(1).value = 'TỔNG CỘNG'
  totalRow.getCell(7).value = depositTotal
  totalRow.getCell(8).value = plannedTotal
  totalRow.getCell(10).value = actualTotal
  totalRow.font = { bold: true, color: { argb: 'FF7D3047' } }
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD1D9' } }
  for (const columnNumber of [7, 8, 10]) totalRow.getCell(columnNumber).numFmt = MONEY_FORMAT

  sheet.views = [{ state: 'frozen', ySplit: 14 }]
  sheet.autoFilter = { from: 'A14', to: `J${14 + concertExpenses.length}` }
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '14:14' }
  return workbook
}

export async function downloadConcertExpenses(concert: Concert, expenses: Expense[]) {
  const workbook = await createConcertExpenseWorkbook(concert, expenses)
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([new Uint8Array(buffer)], { type: EXCEL_MIME })
  const name = Array.from(`${concert.artist}_${concert.tour}_${concert.city}`)
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
    .replace(/[. ]+$/g, '')
  const fileName = `Chi-phi_${name}_${toExcelDate(concert.date) ? concert.date : 'chua-co-ngay'}.xlsx`
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    // Give the browser time to consume the URL before releasing the workbook.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return fileName
}
