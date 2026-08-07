import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('Walking Through Concerts dashboard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows the key concert and budget summary', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /xin chào, diễm/i })).toBeInTheDocument()
    expect(screen.getByText('3 concerts')).toBeInTheDocument()
    expect(screen.getByText('68.500.000 ₫')).toBeInTheDocument()
    expect(screen.getByText(/right here/i)).toBeInTheDocument()
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

  it('adds an expense, updates the total and persists it', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    const dialog = screen.getByRole('dialog', { name: /thêm chi phí mới/i })
    await user.type(within(dialog).getByLabelText('Tên khoản chi'), 'Taxi về khách sạn')
    await user.clear(within(dialog).getByLabelText('Số tiền'))
    await user.type(within(dialog).getByLabelText('Số tiền'), '500000')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu chi phí' }))
    expect(screen.getByText('Taxi về khách sạn')).toBeInTheDocument()
    expect(screen.getByText('69.000.000 ₫')).toBeInTheDocument()

    view.unmount()
    render(<App />)
    expect(screen.getByText('Taxi về khách sạn')).toBeInTheDocument()
  })

  it('edits an existing expense', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa Vé VIP Soundcheck' }))
    const dialog = screen.getByRole('dialog', { name: /chỉnh sửa chi phí/i })
    const amount = within(dialog).getByLabelText('Số tiền')
    await user.clear(amount)
    await user.type(amount, '8000000')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }))
    expect(screen.getByText('68.650.000 ₫')).toBeInTheDocument()
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
