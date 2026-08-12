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
    expect(screen.getByText('2 concerts')).toBeInTheDocument()
    expect(screen.getByText('TỔNG DỰ TÍNH')).toBeInTheDocument()
    expect(screen.getByText('26.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('TỔNG THỰC TẾ')).toBeInTheDocument()
    expect(screen.getByText('24.850.000 ₫')).toBeInTheDocument()
    expect(screen.getByText(/right here/i)).toBeInTheDocument()
  })

  it('opens a detailed report from the spending card and report navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Xem báo cáo chi tiết' }))
    const report = screen.getByRole('dialog', { name: 'Báo cáo chi tiết' })
    expect(within(report).getByText('Tổng theo danh mục')).toBeInTheDocument()
    expect(within(report).getByText('Tổng theo concert')).toBeInTheDocument()
    expect(within(report).queryByText('KANGDANIEL')).not.toBeInTheDocument()
    expect(within(report).getByText('24.850.000 ₫')).toBeInTheDocument()

    await user.click(within(report).getByRole('button', { name: 'Đóng' }))
    await user.click(screen.getByRole('button', { name: 'Báo cáo' }))
    expect(screen.getByRole('dialog', { name: 'Báo cáo chi tiết' })).toBeInTheDocument()
  })

  it('opens settings, saves preferences and restores them after reload', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Cài đặt' }))
    const settings = screen.getByRole('dialog', { name: 'Cài đặt' })
    await user.clear(within(settings).getByLabelText('Tên hiển thị'))
    await user.type(within(settings).getByLabelText('Tên hiển thị'), 'Diễm Prima')
    await user.clear(within(settings).getByLabelText('Dòng giới thiệu'))
    await user.type(within(settings).getByLabelText('Dòng giới thiệu'), 'VIP concert lover')
    await user.clear(within(settings).getByLabelText('Ngân sách năm'))
    await user.type(within(settings).getByLabelText('Ngân sách năm'), '120000000')
    await user.click(within(settings).getByRole('button', { name: 'Lưu cài đặt' }))

    expect(screen.getByText('Diễm Prima')).toBeInTheDocument()
    expect(screen.getByText('VIP concert lover')).toBeInTheDocument()
    expect(screen.getByText(/120\.000\.000 ₫/)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('walking-through-concerts-preferences-v1') ?? '{}')).toEqual({ displayName: 'Diễm Prima', tagline: 'VIP concert lover', budget: 120000000 })

    cleanup()
    render(<App />)
    expect(screen.getByText('Diễm Prima')).toBeInTheDocument()
    expect(screen.getByText(/120\.000\.000 ₫/)).toBeInTheDocument()
  })

  it('opens settings from the mobile personal navigation and validates the budget', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Cá nhân' }))
    const settings = screen.getByRole('dialog', { name: 'Cài đặt' })
    await user.clear(within(settings).getByLabelText('Ngân sách năm'))
    await user.type(within(settings).getByLabelText('Ngân sách năm'), '0')
    await user.click(within(settings).getByRole('button', { name: 'Lưu cài đặt' }))
    expect(within(settings).getByRole('alert')).toHaveTextContent('Ngân sách phải lớn hơn 0')
  })

  it('filters the entire dashboard and detailed report by year', async () => {
    const user = userEvent.setup()
    render(<App />)
    const yearPicker = screen.getByLabelText('Chọn năm')

    expect(yearPicker).toHaveValue('2026')
    expect(within(yearPicker).getByRole('option', { name: 'Tất cả năm' })).toBeInTheDocument()
    expect(within(yearPicker).getByRole('option', { name: 'Năm 2025' })).toBeInTheDocument()
    await user.selectOptions(yearPicker, '2025')

    expect(screen.getByText('FOLLOW AGAIN')).toBeInTheDocument()
    expect(screen.queryByText('RIGHT HERE')).not.toBeInTheDocument()
    const summary = screen.getByRole('region', { name: 'Tổng quan chi tiêu' })
    expect(within(summary).getByText('43.000.000 ₫')).toBeInTheDocument()
    expect(within(summary).getByText('43.650.000 ₫')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Chi phí gần đây' })).getByText('5 / 5 khoản chi')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Xem báo cáo chi tiết' }))
    const report = screen.getByRole('dialog', { name: 'Báo cáo chi tiết' })
    expect(within(report).getByText('KANGDANIEL')).toBeInTheDocument()
    expect(within(report).queryByText('SEVENTEEN')).not.toBeInTheDocument()
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

  it('keeps all three companion pets in a dedicated content-safe area', () => {
    render(<App />)
    const petCorner = screen.getByRole('region', { name: 'Bộ ba pet đồng hành' })

    expect(within(petCorner).getByRole('img', { name: 'Pet DV V-eri' })).toBeInTheDocument()
    expect(within(petCorner).getByRole('img', { name: 'Pet Kkuru Jam BBH' })).toBeInTheDocument()
    expect(within(petCorner).getByRole('img', { name: 'Pet Tèolaegi Dâu Lá' })).toBeInTheDocument()
  })

  it('adapts concert tickets to their own width and wraps long content', () => {
    expect(cssRule('body')).toMatch(/min-width:\s*0/)
    expect(cssRule('.concert-entry')).toMatch(/container-type:\s*inline-size/)
    expect(cssRule('.ticket-info h3')).toMatch(/overflow-wrap:\s*anywhere/)
    expect(styles).toMatch(/@container concert-card \(max-width: 430px\)/)
    expect(styles).toMatch(/@container concert-card[\s\S]*?\.concert-ticket-toggle\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    expect(styles).toMatch(/@media \(max-width: 360px\)/)
    expect(styles).toMatch(/@media \(max-width: 360px\)[\s\S]*?\.stat-dual-values\s*{[^}]*grid-template-columns:\s*1fr/)
  })

  it('keeps long city labels above the decorative poster tape', () => {
    expect(styles).toMatch(/\.tape\s*{[^}]*z-index:\s*0/)
    expect(styles).toMatch(/\.poster-city\s*{[^}]*z-index:\s*3[^}]*background:/)
  })

  it('switches between concert filters', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Chọn năm'), 'all')
    await user.click(screen.getByRole('button', { name: 'Đã đi' }))
    expect(screen.getByText('FOLLOW AGAIN')).toBeInTheDocument()
    expect(screen.queryByText('RIGHT HERE')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tất cả' }))
    expect(screen.getByText('RIGHT HERE')).toBeInTheDocument()
  })

  it('opens on upcoming concerts and sorts the nearest date first', () => {
    localStorage.setItem('walking-through-concerts-data-v2', JSON.stringify({
      concerts: [
        { id: 'later', artist: 'LATER', tour: 'DECEMBER', city: 'Hà Nội', date: '2026-12-20', venue: 'Stadium', status: 'upcoming', color: '#f5e9eb', accent: '#8c5261' },
        { id: 'past', artist: 'PAST', tour: 'LAST YEAR', city: 'Seoul', date: '2025-10-10', venue: 'Dome', status: 'past', color: '#f5e9eb', accent: '#8c5261' },
        { id: 'near', artist: 'NEAR', tour: 'SEPTEMBER', city: 'Bangkok', date: '2026-09-05', venue: 'Arena', status: 'upcoming', color: '#f5e9eb', accent: '#8c5261' },
      ],
      expenses: [],
    }))
    render(<App />)

    const tabs = screen.getByLabelText('Lọc concert')
    expect(within(tabs).getAllByRole('button').map((button) => button.textContent)).toEqual(['Sắp tới', 'Tất cả', 'Đã đi'])
    expect(within(tabs).getByRole('button', { name: 'Sắp tới' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('LAST YEAR')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Xem chi phí/ }).map((button) => button.getAttribute('aria-label'))).toEqual(['Xem chi phí NEAR', 'Xem chi phí LATER'])
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

  it('paginates the recent expense table four items at a time', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Chọn năm'), 'all')

    const recentExpenses = screen.getByRole('region', { name: 'Chi phí gần đây' })
    expect(within(recentExpenses).getByText('Trang 1 / 3')).toBeInTheDocument()
    expect(within(recentExpenses).getByText('Vé VIP Soundcheck')).toBeInTheDocument()
    expect(within(recentExpenses).queryByText('Vé concert Seoul')).not.toBeInTheDocument()
    expect(within(recentExpenses).getByRole('button', { name: 'Trang trước của Chi phí gần đây' })).toBeDisabled()

    await user.click(within(recentExpenses).getByRole('button', { name: 'Trang sau của Chi phí gần đây' }))

    expect(within(recentExpenses).getByText('Trang 2 / 3')).toBeInTheDocument()
    expect(within(recentExpenses).getByText('Vé concert Seoul')).toBeInTheDocument()
    expect(within(recentExpenses).queryByText('Vé VIP Soundcheck')).not.toBeInTheDocument()
  })

  it('filters recent expenses by name, concert and category, then sorts an amount column', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Chọn năm'), 'all')
    const recentExpenses = screen.getByRole('region', { name: 'Chi phí gần đây' })

    await user.selectOptions(within(recentExpenses).getByLabelText('Lọc theo concert'), 'concert-2')
    expect(within(recentExpenses).getByText('Vé CAT 1')).toBeInTheDocument()
    expect(within(recentExpenses).queryByText('Vé VIP Soundcheck')).not.toBeInTheDocument()

    await user.selectOptions(within(recentExpenses).getByLabelText('Lọc theo danh mục'), 'Di chuyển')
    expect(within(recentExpenses).getByText('Di chuyển nội thành')).toBeInTheDocument()
    expect(within(recentExpenses).queryByText('Vé CAT 1')).not.toBeInTheDocument()

    await user.selectOptions(within(recentExpenses).getByLabelText('Lọc theo concert'), 'all')
    await user.selectOptions(within(recentExpenses).getByLabelText('Lọc theo danh mục'), 'all')
    await user.type(within(recentExpenses).getByLabelText('Lọc theo tên khoản chi'), 'khách sạn')
    expect(within(recentExpenses).getByText('Khách sạn Bangkok')).toBeInTheDocument()
    expect(within(recentExpenses).getByText('Khách sạn Seoul')).toBeInTheDocument()

    await user.clear(within(recentExpenses).getByLabelText('Lọc theo tên khoản chi'))
    await user.selectOptions(within(recentExpenses).getByLabelText('Sắp xếp chi phí'), 'actual-desc')
    expect(within(recentExpenses).getAllByText(/Vé concert Seoul|Chuyến bay Seoul|Khách sạn Seoul|Vé VIP Soundcheck/, { selector: '.expense-name strong' }).map((element) => element.textContent)).toEqual(['Vé concert Seoul', 'Chuyến bay Seoul', 'Khách sạn Seoul', 'Vé VIP Soundcheck'])
  })

  it('keeps pagination independent for each concert expense table', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('Chọn năm'), 'all')
    await user.click(screen.getByRole('button', { name: 'Tất cả' }))
    await user.click(screen.getByRole('button', { name: 'Xem chi phí KANGDANIEL' }))
    const concertExpenses = screen.getByRole('region', { name: 'Chi phí của KANGDANIEL' })
    expect(within(concertExpenses).getByText('Trang 1 / 2')).toBeInTheDocument()
    expect(within(concertExpenses).getByText('Ăn tối sau concert')).toBeInTheDocument()
    expect(within(concertExpenses).queryByText('Merchandise')).not.toBeInTheDocument()

    await user.click(within(concertExpenses).getByRole('button', { name: 'Trang sau của Chi phí KANGDANIEL' }))

    expect(within(concertExpenses).getByText('Trang 2 / 2')).toBeInTheDocument()
    expect(within(concertExpenses).getByText('Merchandise', { selector: 'strong' })).toBeInTheDocument()
    expect(within(concertExpenses).queryByText('Ăn tối sau concert')).not.toBeInTheDocument()
    expect(within(concertExpenses).getByRole('button', { name: 'Trang sau của Chi phí KANGDANIEL' })).toBeDisabled()
  })

  it('returns to a valid page when deleting the only item on the last page', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    localStorage.setItem('walking-through-concerts-data-v2', JSON.stringify({
      concerts: [{ id: 'concert-page', artist: 'TEST', tour: 'PAGING', city: 'Hà Nội', date: '2026-10-10', venue: 'Stadium', status: 'upcoming', color: '#f5e9eb', accent: '#8c5261' }],
      expenses: Array.from({ length: 5 }, (_, index) => ({ id: `expense-page-${index + 1}`, name: `Khoản chi ${index + 1}`, concertId: 'concert-page', category: 'Cá nhân', plannedAmount: 100_000, actualAmount: 90_000, peopleCount: 1, date: '2026-08-01' })),
    }))
    render(<App />)

    const recentExpenses = screen.getByRole('region', { name: 'Chi phí gần đây' })
    await user.click(within(recentExpenses).getByRole('button', { name: 'Trang sau của Chi phí gần đây' }))
    expect(within(recentExpenses).getByText('Khoản chi 5')).toBeInTheDocument()

    await user.click(within(recentExpenses).getByRole('button', { name: 'Xóa Khoản chi 5' }))

    expect(within(recentExpenses).getByText('Khoản chi 1')).toBeInTheDocument()
    expect(within(recentExpenses).queryByRole('navigation', { name: 'Phân trang Chi phí gần đây' })).not.toBeInTheDocument()
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
    expect(screen.getByText('27.100.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('25.350.000 ₫')).toBeInTheDocument()

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
    expect(screen.getByText('Freebies', { selector: '.expense-category' })).toBeInTheDocument()
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
    expect(screen.getByText('29.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('28.450.000 ₫')).toBeInTheDocument()
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
    expect(screen.getByText('25.000.000 ₫')).toBeInTheDocument()
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

  it('saves ticket links and concert information, then shows them in the concert details', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa SEVENTEEN' }))
    const dialog = screen.getByRole('dialog', { name: /chỉnh sửa concert/i })
    await user.type(within(dialog).getByLabelText('Link bán vé'), 'https://ticket.example.com/seventeen')
    await user.type(within(dialog).getByLabelText('Thông tin liên quan'), 'Mở bán lúc 20:00, cần đăng nhập trước.')
    await user.type(within(dialog).getByLabelText('Thông báo / lưu ý'), 'Mang theo hộ chiếu bản gốc.')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))

    await user.click(screen.getByRole('button', { name: 'Xem chi phí SEVENTEEN' }))
    const details = screen.getByRole('region', { name: 'Chi phí của SEVENTEEN' })
    expect(within(details).getByRole('link', { name: 'Mở link bán vé' })).toHaveAttribute('href', 'https://ticket.example.com/seventeen')
    expect(within(details).getByRole('link', { name: 'Mở link bán vé' })).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    expect(within(details).getByText('Mở bán lúc 20:00, cần đăng nhập trước.')).toBeInTheDocument()
    expect(within(details).getByText('Mang theo hộ chiếu bản gốc.')).toBeInTheDocument()

    const saved = JSON.parse(localStorage.getItem('walking-through-concerts-data-v2') ?? '{}')
    expect(saved.concerts[0]).toMatchObject({ ticketUrl: 'https://ticket.example.com/seventeen', relatedInfo: 'Mở bán lúc 20:00, cần đăng nhập trước.', announcement: 'Mang theo hộ chiếu bản gốc.' })
  })

  it('rejects an unsafe concert ticket link', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa SEVENTEEN' }))
    const dialog = screen.getByRole('dialog', { name: /chỉnh sửa concert/i })
    await user.type(within(dialog).getByLabelText('Link bán vé'), 'javascript:alert(1)')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Link bán vé phải bắt đầu bằng http:// hoặc https://')
  })

  it('deletes an expense after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Xóa Vé VIP Soundcheck' }))
    expect(screen.queryByText('Vé VIP Soundcheck')).not.toBeInTheDocument()
    expect(screen.getByText('17.000.000 ₫')).toBeInTheDocument()
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
    expect(within(screen.getByRole('region', { name: 'Tổng quan chi tiêu' })).getByText('9.420.000 ₫')).toBeInTheDocument()
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
    expect(screen.getByText('2 concerts')).toBeInTheDocument()
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
