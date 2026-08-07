import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('Walking Through Concerts dashboard', () => {
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

  it('adds a new expense and updates the total', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    const dialog = screen.getByRole('dialog', { name: /thêm chi phí mới/i })
    await user.type(within(dialog).getByLabelText('Tên khoản chi'), 'Taxi về khách sạn')
    await user.clear(within(dialog).getByLabelText('Số tiền'))
    await user.type(within(dialog).getByLabelText('Số tiền'), '500000')
    await user.click(within(dialog).getByRole('button', { name: 'Lưu chi phí' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Taxi về khách sạn')).toBeInTheDocument()
    expect(screen.getByText('69.000.000 ₫')).toBeInTheDocument()
  })

  it('validates required expense fields', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    await user.click(screen.getByRole('button', { name: 'Lưu chi phí' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên khoản chi')
  })

  it('closes the expense dialog with Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /thêm chi phí/i }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
