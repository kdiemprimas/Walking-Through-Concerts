/// <reference types="node" />

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const styles = readFileSync(join(process.cwd(), 'src', 'styles.css'), 'utf8')
const cssRule = (selector: string) => styles.split(`${selector} {`)[1]?.split('}')[0] ?? ''
const cssColor = (name: string) => styles.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1] ?? ''

const contrastRatio = (foreground: string, background: string) => {
  const luminance = (hex: string) => {
    const channels = hex.match(/[0-9a-f]{2}/gi)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? []
    const [red, green, blue] = channels.map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }

  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

describe('Walking Through Concerts dashboard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows the key concert and budget summary', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /xin chào, diễm/i })).toBeInTheDocument()
    expect(screen.getByText('3 concerts')).toBeInTheDocument()
    expect(screen.getByText('TỔNG DỰ TÍNH')).toBeInTheDocument()
    expect(screen.getByText('69.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('TỔNG THỰC TẾ')).toBeInTheDocument()
    expect(screen.getByText('68.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText(/right here/i)).toBeInTheDocument()
  })

  it('keeps important concert and expense text large and consistent enough to read', () => {
    expect(styles).not.toContain("font-family: Inter")
    expect(cssRule('.ticket-meta')).toMatch(/font-size:\s*11px/)
    expect(cssRule('.ticket-total small')).toMatch(/font-size:\s*9px/)
    expect(cssRule('.expense-name strong')).toMatch(/font-size:\s*12px/)
    expect(cssRule('.expense-name span')).toMatch(/font-size:\s*10px/)
    expect(cssRule('.expense-costs > span, .expense-costs > strong')).toMatch(/font-size:\s*11px/)
  })

  it('uses a calm pastel palette with subtle borders and elevation', () => {
    expect(cssColor('canvas')).toBe('#fbf9f7')
    expect(cssColor('surface')).toBe('#fffdfb')
    expect(cssColor('border')).toBe('#e6dcd8')
    expect(cssColor('accent')).toBe('#d99a8e')
    expect(styles).not.toContain('#ff846d')
    expect(cssRule('.stat-card')).toMatch(/box-shadow:\s*var\(--shadow-soft\)/)
    expect(cssRule('.modal')).toMatch(/box-shadow:\s*var\(--shadow-float\)/)
  })

  it('keeps primary and muted text readable on the pale surface', () => {
    expect(contrastRatio(cssColor('ink'), cssColor('surface'))).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(cssColor('muted'), cssColor('surface'))).toBeGreaterThanOrEqual(4.5)
  })

  it('uses the DV V-eri pet as the website brand logo', () => {
    render(<App />)
    const logos = screen.getAllByRole('img', { name: 'DV V-eri' })
    expect(logos).toHaveLength(2)
    expect(logos[0]).toHaveAttribute('src', expect.stringContaining('dv-v-eri-logo'))
  })

  it('switches between concert filters', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Đã đi' }))
    expect(screen.getByText('FOLLOW AGAIN')).toBeInTheDocument()
    expect(screen.queryByText('RIGHT HERE')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tất cả' }))
    expect(screen.getByText('RIGHT HERE')).toBeInTheDocument()
  })

  it('shows only the expenses that belong to the selected concert', async () => {
    const user = userEvent.setup()
    render(<App />)

    const seventeenToggle = screen.getByRole('button', { name: 'Xem chi phí SEVENTEEN' })
    expect(seventeenToggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(seventeenToggle)

    expect(seventeenToggle).toHaveAttribute('aria-expanded', 'true')
    const seventeenExpenses = screen.getByRole('region', { name: 'Chi phí của SEVENTEEN' })
    expect(within(seventeenExpenses).getByText('Vé VIP Soundcheck')).toBeInTheDocument()
    expect(within(seventeenExpenses).getByText('Vé máy bay khứ hồi')).toBeInTheDocument()
    expect(within(seventeenExpenses).getByText('Khách sạn Bangkok')).toBeInTheDocument()
    expect(within(seventeenExpenses).queryByText('Vé CAT 1')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Xem chi phí DAY6' }))

    expect(screen.queryByRole('region', { name: 'Chi phí của SEVENTEEN' })).not.toBeInTheDocument()
    const day6Expenses = screen.getByRole('region', { name: 'Chi phí của DAY6' })
    expect(within(day6Expenses).getByText('Vé CAT 1')).toBeInTheDocument()
    expect(within(day6Expenses).queryByText('Vé VIP Soundcheck')).not.toBeInTheDocument()
  })

  it('opens a concert with the keyboard and preselects it when adding an expense', async () => {
    const user = userEvent.setup()
    render(<App />)

    const toggle = screen.getByRole('button', { name: 'Xem chi phí SEVENTEEN' })
    toggle.focus()
    await user.keyboard('{Enter}')

    const details = screen.getByRole('region', { name: 'Chi phí của SEVENTEEN' })
    await user.click(within(details).getByRole('button', { name: 'Thêm chi phí cho SEVENTEEN' }))

    const dialog = screen.getByRole('dialog', { name: 'Thêm chi phí mới' })
    expect(within(dialog).getByLabelText('Concert')).toHaveValue('concert-1')
  })

  it('shows an empty expense state for a newly created concert', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /thêm concert/i }))
    const dialog = screen.getByRole('dialog', { name: /thêm concert mới/i })
    await user.type(within(dialog).getByLabelText('Nghệ sĩ'), 'IU')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu concert' }))
    await user.click(screen.getByRole('button', { name: 'Xem chi phí IU' }))

    const details = screen.getByRole('region', { name: 'Chi phí của IU' })
    expect(within(details).getByText('Chưa có khoản chi nào cho concert này.')).toBeInTheDocument()
  })

  it('adds an expense, updates the total and persists it', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    const dialog = screen.getByRole('dialog', { name: /thêm chi phí mới/i })
    await user.type(within(dialog).getByLabelText('Tên khoản chi'), 'Taxi về khách sạn')
    await user.clear(within(dialog).getByLabelText('Dự tính / người'))
    await user.type(within(dialog).getByLabelText('Dự tính / người'), '600000')
    await user.clear(within(dialog).getByLabelText('Thực tế / người'))
    await user.type(within(dialog).getByLabelText('Thực tế / người'), '500000')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu chi phí' }))
    expect(screen.getByText('Taxi về khách sạn')).toBeInTheDocument()
    expect(screen.getByText('70.100.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('69.000.000 ₫')).toBeInTheDocument()

    view.unmount()
    render(<App />)
    expect(screen.getByText('Taxi về khách sạn')).toBeInTheDocument()
  })

  it('offers more concert expense categories and saves a predefined choice', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    const dialog = screen.getByRole('dialog', { name: /thêm chi phí mới/i })
    const category = within(dialog).getByLabelText('Danh mục')

    expect(within(category).getByRole('option', { name: 'Freebies' })).toBeInTheDocument()
    expect(within(category).getByRole('option', { name: 'Cá nhân' })).toBeInTheDocument()
    expect(within(category).getByRole('option', { name: 'Fan project' })).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('Tên khoản chi'), 'Quà freebies')
    await user.selectOptions(category, 'Freebies')
    expect(within(dialog).queryByLabelText('Tên danh mục khác')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Lưu chi phí' }))
    expect(screen.getByText('Freebies')).toBeInTheDocument()
  })

  it('requires, displays and persists a custom category when selecting Khác', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    const dialog = screen.getByRole('dialog', { name: /thêm chi phí mới/i })
    await user.type(within(dialog).getByLabelText('Tên khoản chi'), 'Phí đổi vé')
    await user.selectOptions(within(dialog).getByLabelText('Danh mục'), 'Khác')

    const customCategory = within(dialog).getByLabelText('Tên danh mục khác')
    expect(customCategory).toHaveAttribute('aria-required', 'true')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu chi phí' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Vui lòng nhập tên danh mục khác')

    await user.type(customCategory, 'Phí phát sinh')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu chi phí' }))
    expect(screen.getByText('Phí phát sinh')).toBeInTheDocument()

    view.unmount()
    render(<App />)
    expect(screen.getByText('Phí phát sinh')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa Phí đổi vé' }))
    const editDialog = screen.getByRole('dialog', { name: /chỉnh sửa chi phí/i })
    expect(within(editDialog).getByLabelText('Danh mục')).toHaveValue('Khác')
    expect(within(editDialog).getByLabelText('Tên danh mục khác')).toHaveValue('Phí phát sinh')
  })

  it('multiplies planned and actual amounts by the selected number of people', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    const dialog = screen.getByRole('dialog', { name: /thêm chi phí mới/i })
    await user.type(within(dialog).getByLabelText('Tên khoản chi'), 'Khách sạn nhóm')
    await user.clear(within(dialog).getByLabelText('Dự tính / người'))
    await user.type(within(dialog).getByLabelText('Dự tính / người'), '1000000')
    await user.clear(within(dialog).getByLabelText('Thực tế / người'))
    await user.type(within(dialog).getByLabelText('Thực tế / người'), '1200000')
    await user.selectOptions(within(dialog).getByLabelText('Số người'), '3')

    const calculation = within(dialog).getByRole('status', { name: 'Tổng chi phí đã tính' })
    expect(within(calculation).getByText('3.000.000 ₫')).toBeInTheDocument()
    expect(within(calculation).getByText('3.600.000 ₫')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Lưu chi phí' }))
    expect(screen.getByText('72.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('72.100.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('3 người')).toBeInTheDocument()
  })

  it('edits an existing expense', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa Vé VIP Soundcheck' }))
    const dialog = screen.getByRole('dialog', { name: /chỉnh sửa chi phí/i })
    const amount = within(dialog).getByLabelText('Thực tế / người')
    await user.clear(amount)
    await user.type(amount, '8000000')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(screen.getByText('68.650.000 ₫')).toBeInTheDocument()
  })

  it('migrates a saved legacy amount to planned and actual values for one person', async () => {
    localStorage.setItem('walking-through-concerts-data-v2', JSON.stringify({
      concerts: [{ id: 'legacy-concert', artist: 'EXO', tour: 'EXOPLANET', city: 'Seoul', date: '2026-01-01', venue: 'KSPO', status: 'past', color: '#ffd1d9', accent: '#7d3047' }],
      expenses: [{ id: 'legacy-expense', name: 'Vé cũ', concertId: 'legacy-concert', category: 'Vé concert', amount: 1000000, date: '2026-01-01' }],
    }))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa Vé cũ' }))
    const dialog = screen.getByRole('dialog', { name: /chỉnh sửa chi phí/i })
    expect(within(dialog).getByLabelText('Dự tính / người')).toHaveValue(1000000)
    expect(within(dialog).getByLabelText('Thực tế / người')).toHaveValue(1000000)
    expect(within(dialog).getByLabelText('Số người')).toHaveValue('1')
  })

  it('creates and edits a concert', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm concert/i }))
    const createDialog = screen.getByRole('dialog', { name: /thêm concert mới/i })
    await user.type(within(createDialog).getByLabelText('Nghệ sĩ'), 'IU')
    await user.type(within(createDialog).getByLabelText('Tên tour'), 'HEREH WORLD TOUR')
    await user.type(within(createDialog).getByLabelText('Thành phố'), 'Hà Nội')
    await user.type(within(createDialog).getByLabelText('Địa điểm'), 'Mỹ Đình')
    await user.click(within(createDialog).getByRole('button', { name: 'Lưu concert' }))
    expect(screen.getByText('HEREH WORLD TOUR')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa IU' }))
    const editDialog = screen.getByRole('dialog', { name: /chỉnh sửa concert/i })
    const tour = within(editDialog).getByLabelText('Tên tour')
    await user.clear(tour)
    await user.type(tour, 'THE GOLDEN HOUR')
    await user.click(within(editDialog).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(screen.getByText('THE GOLDEN HOUR')).toBeInTheDocument()
  })

  it('deletes an expense after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Xóa Vé VIP Soundcheck' }))
    expect(screen.queryByText('Vé VIP Soundcheck')).not.toBeInTheDocument()
    expect(screen.getByText('60.650.000 ₫')).toBeInTheDocument()
  })

  it('keeps an expense when deletion is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Xóa Vé VIP Soundcheck' }))
    expect(screen.getByText('Vé VIP Soundcheck')).toBeInTheDocument()
  })

  it('deletes a concert and all of its linked expenses', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Xóa SEVENTEEN' }))
    expect(screen.queryByText('RIGHT HERE')).not.toBeInTheDocument()
    expect(screen.getByText('53.070.000 ₫')).toBeInTheDocument()
  })

  it('filters concerts with search and shows an empty state', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByRole('textbox', { name: /tìm kiếm/i }), 'không tồn tại')
    expect(screen.getByText('Chưa tìm thấy concert')).toBeInTheDocument()
  })

  it('falls back to sample data when saved data is invalid', () => {
    localStorage.setItem('walking-through-concerts-data-v2', '{invalid')
    render(<App />)
    expect(screen.getByText('3 concerts')).toBeInTheDocument()
  })

  it('opens the expense form from the recent expenses section', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Thêm khoản chi' }))
    expect(screen.getByRole('dialog', { name: 'Thêm chi phí mới' })).toBeInTheDocument()
  })

  it('validates required expense fields', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    await user.click(screen.getByRole('button', { name: 'Lưu chi phí' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên khoản chi')
  })

  it('closes a form with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm concert/i }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not leak mounted views between tests', () => {
    render(<App />)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    cleanup()
  })
})
