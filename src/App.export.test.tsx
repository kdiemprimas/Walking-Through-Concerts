import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { downloadConcertExpenses } from './concert-export'

vi.mock('./concert-export', () => ({ downloadConcertExpenses: vi.fn() }))

const concert = {
  id: 'concert-1', artist: 'DAY6', tour: 'FOREVER YOUNG', city: 'Hồ Chí Minh', date: '2026-10-06',
  venue: 'SECC', status: 'upcoming', color: '#ffd8bd', accent: '#7a3b24', estimatedBudget: 15_000_000,
}
const expenses = Array.from({ length: 5 }, (_, index) => ({
  id: `expense-${index}`, concertId: concert.id, name: `Vé concert ${index}`, category: 'Vé concert',
  plannedAmount: 1_000_000, actualAmount: 1_200_000, depositAmount: 500_000, peopleCount: 3, date: '2026-09-30',
}))

describe('export expenses from a concert', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(downloadConcertExpenses).mockReset().mockResolvedValue('Chi-phi_DAY6_2026-10-06.xlsx')
    localStorage.setItem('walking-through-concerts-data-v2', JSON.stringify({
      concerts: [concert, { ...concert, id: 'concert-2', artist: 'SEVENTEEN' }],
      expenses: [...expenses, { ...expenses[0], id: 'other-expense', concertId: 'concert-2' }],
    }))
  })

  it('exports the entire selected concert even with pagination and recent-expense filters', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByRole('textbox', { name: 'Lọc theo tên khoản chi' }), 'Vé concert 0')
    await user.click(screen.getByRole('button', { name: 'Xem chi phí DAY6' }))
    await user.click(screen.getByRole('button', { name: 'Trang sau của Chi phí DAY6' }))
    await user.click(screen.getByRole('button', { name: 'Xuất Excel chi phí DAY6' }))

    await waitFor(() => expect(downloadConcertExpenses).toHaveBeenCalledOnce())
    expect(downloadConcertExpenses).toHaveBeenCalledWith(concert, expenses)
    expect(await screen.findByText('Đã xuất Excel chi phí DAY6')).toBeInTheDocument()
  })

  it('disables export while preparing the file and makes it available again afterward', async () => {
    const user = userEvent.setup()
    let resolveExport!: (fileName: string) => void
    vi.mocked(downloadConcertExpenses).mockReturnValue(new Promise((resolve) => { resolveExport = resolve }))
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Xem chi phí DAY6' }))
    const button = screen.getByRole('button', { name: 'Xuất Excel chi phí DAY6' })
    await user.click(button)
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Đang xuất...')
    await user.click(button)
    expect(downloadConcertExpenses).toHaveBeenCalledOnce()
    resolveExport('concert.xlsx')
    await waitFor(() => expect(button).toBeEnabled())
    expect(button).toHaveTextContent('Xuất Excel')
  })

  it('shows an error and allows retry when export fails', async () => {
    const user = userEvent.setup()
    vi.mocked(downloadConcertExpenses).mockRejectedValueOnce(new Error('Download blocked'))
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Xem chi phí DAY6' }))
    const button = screen.getByRole('button', { name: 'Xuất Excel chi phí DAY6' })
    await user.click(button)
    expect(await screen.findByText('Không thể xuất Excel. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.queryByText('Đã xuất Excel chi phí DAY6')).not.toBeInTheDocument()
    expect(button).toBeEnabled()
    await user.click(button)
    expect(await screen.findByText('Đã xuất Excel chi phí DAY6')).toBeInTheDocument()
  })

  it('allows exporting a concert without any expenses', async () => {
    localStorage.setItem('walking-through-concerts-data-v2', JSON.stringify({ concerts: [concert], expenses: [] }))
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Xem chi phí DAY6' }))
    await user.click(screen.getByRole('button', { name: 'Xuất Excel chi phí DAY6' }))
    expect(downloadConcertExpenses).toHaveBeenCalledWith(concert, [])
  })
})
