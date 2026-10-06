import ExcelJS from 'exceljs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createConcertExpenseWorkbook, downloadConcertExpenses } from './concert-export'
import type { Concert, Expense } from './types'

const concert: Concert = {
  id: 'concert-export', artist: 'Diễm & DAY6', tour: 'FOREVER YOUNG', city: 'Hồ Chí Minh',
  date: '2026-10-06', venue: 'SECC', status: 'upcoming', color: '#ffd8bd', accent: '#7a3b24',
  estimatedBudget: 15_000_000,
}
const expense: Expense = {
  id: 'expense-export', concertId: concert.id, name: 'Vé VIP & Soundcheck', category: 'Vé concert',
  plannedAmount: 1_000_000, actualAmount: 1_200_000, depositAmount: 500_000, peopleCount: 3,
  date: '2026-09-30',
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('concert expense Excel export', () => {
  it('writes a readable XLSX with concert information and numeric amounts matching the dashboard', async () => {
    const workbook = await createConcertExpenseWorkbook(concert, [expense, { ...expense, id: 'other', concertId: 'another-concert' }])
    const restored = new ExcelJS.Workbook()
    await restored.xlsx.load(await workbook.xlsx.writeBuffer())
    const sheet = restored.getWorksheet('Chi phí concert')!

    expect(restored.worksheets).toHaveLength(1)
    expect(sheet.getCell('C4').value).toBe(concert.artist)
    expect(sheet.getCell('C5').value).toBe(concert.tour)
    expect(sheet.getCell('C6').value).toBe(concert.city)
    expect(sheet.getCell('C7').value).toBe(concert.venue)
    expect(sheet.getCell('C8').value).toEqual(new Date('2026-10-06T00:00:00Z'))
    expect(sheet.getCell('C8').numFmt).toBe('dd/mm/yyyy')
    expect(sheet.getCell('C9').value).toBe(15_000_000)
    expect(sheet.getCell('C15').value).toBe(expense.name)
    expect(sheet.getCell('B15').value).toEqual(new Date('2026-09-30T00:00:00Z'))
    expect(sheet.getCell('E15').value).toBe(3)
    expect(sheet.getCell('F15').value).toBe(1_000_000)
    expect(sheet.getCell('G15').value).toBe(500_000)
    expect(sheet.getCell('H15').value).toBe(3_500_000)
    expect(sheet.getCell('I15').value).toBe(1_200_000)
    expect(sheet.getCell('J15').value).toBe(3_600_000)
    expect(sheet.getCell('H15').numFmt).toBe('#,##0 "₫"')
    expect(sheet.getCell('A16').value).toBe('TỔNG CỘNG')
    expect(sheet.getCell('G16').value).toBe(500_000)
    expect(sheet.getCell('H16').value).toBe(3_500_000)
    expect(sheet.getCell('J16').value).toBe(3_600_000)
  })

  it('exports every expense beyond a page and keeps custom categories and formula-like text literal', async () => {
    const expenses = ['=SUM(A1:A2)', '+Vé', '-Vé', '@Vé', '<Vé "VIP">'].map((name, index) => ({
      ...expense, id: `expense-${index}`, name, category: 'Khác' as const, customCategory: 'Quà tặng & fan project',
    }))
    const workbook = await createConcertExpenseWorkbook(concert, expenses)
    const restored = new ExcelJS.Workbook()
    await restored.xlsx.load(await workbook.xlsx.writeBuffer())
    const sheet = restored.getWorksheet('Chi phí concert')!

    expenses.forEach((item, index) => {
      expect(sheet.getCell(`C${15 + index}`).value).toBe(item.name)
      expect(sheet.getCell(`C${15 + index}`).type).toBe(ExcelJS.ValueType.String)
      expect(sheet.getCell(`D${15 + index}`).value).toBe(item.customCategory)
    })
    expect(sheet.getCell('H20').value).toBe(17_500_000)
    expect(sheet.getCell('J20').value).toBe(18_000_000)
  })

  it('exports an empty concert with headers and zero totals', async () => {
    const sheet = (await createConcertExpenseWorkbook(concert, [])).getWorksheet('Chi phí concert')!
    expect(sheet.getCell('C14').value).toBe('Khoản chi')
    expect(sheet.getCell('A15').value).toBe('TỔNG CỘNG')
    expect(sheet.getCell('G15').value).toBe(0)
    expect(sheet.getCell('H15').value).toBe(0)
    expect(sheet.getCell('J15').value).toBe(0)
  })

  it('defaults missing deposits to zero and preserves zero planned and actual amounts', async () => {
    const sheet = (await createConcertExpenseWorkbook(concert, [{ ...expense, depositAmount: undefined, plannedAmount: 0, actualAmount: 0 }])).getWorksheet('Chi phí concert')!
    expect(sheet.getCell('G15').value).toBe(0)
    expect(sheet.getCell('H15').value).toBe(0)
    expect(sheet.getCell('J15').value).toBe(0)
  })

  it.each(['', 'not-a-date', '2026-02-30', '2026-13-01'])('exports missing or invalid dates (%s) as blank cells in a readable XLSX', async (date) => {
    const workbook = await createConcertExpenseWorkbook({ ...concert, date }, [{ ...expense, date }])
    const restored = new ExcelJS.Workbook()
    await restored.xlsx.load(await workbook.xlsx.writeBuffer())
    const sheet = restored.getWorksheet('Chi phí concert')!
    expect(sheet.getCell('C8').value).toBeNull()
    expect(sheet.getCell('B15').value).toBeNull()
  })

  it('downloads XLSX with a safe descriptive filename and releases its temporary URL', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:concert-export')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const fileName = await downloadConcertExpenses({ ...concert, artist: 'Diễm / DAY6: "VIP"?', tour: 'CONCERT <LIVE>|*', city: 'Hồ Chí Minh\\' }, [expense])

    expect(fileName).toMatch(/^Chi-phi_Diễm/)
    expect(fileName).toContain('2026-10-06')
    expect(fileName).toMatch(/\.xlsx$/)
    expect(fileName).not.toMatch(/[\\/:*?"<>|]/)
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(createObjectURL.mock.calls[0][0].type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(click).toHaveBeenCalledOnce()
    const anchor = click.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe(fileName)
    expect(anchor.href).toBe('blob:concert-export')
    expect(document.querySelector('a[download]')).toBeNull()
    // URL cleanup is scheduled after the browser starts the download.
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:concert-export')
  })

  it('cleans up and reports a download failure to its caller', async () => {
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:failed-export'), revokeObjectURL })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Download blocked') })
    await expect(downloadConcertExpenses(concert, [expense])).rejects.toThrow('Download blocked')
    expect(document.querySelector('a[download]')).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:failed-export')
  })
})
