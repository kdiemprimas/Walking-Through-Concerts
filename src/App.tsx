import { FormEvent, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Heart,
  Home,
  Info,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Ticket,
  TrainFront,
  Trash2,
  Utensils,
  WalletCards,
  X,
} from 'lucide-react'

type ConcertStatus = 'upcoming' | 'past'
type Filter = 'all' | ConcertStatus
type Category = 'Vé concert' | 'Di chuyển' | 'Lưu trú' | 'Ăn uống' | 'Merchandise' | 'Freebies' | 'Cá nhân' | 'Chuẩn bị' | 'Trang phục & làm đẹp' | 'Fan project' | 'Quà tặng' | 'Phí dịch vụ' | 'Bảo hiểm' | 'SIM & Internet' | 'Khác'

type Concert = {
  id: string
  artist: string
  tour: string
  city: string
  date: string
  venue: string
  status: ConcertStatus
  color: string
  accent: string
  ticketUrl?: string
  relatedInfo?: string
  announcement?: string
}

type Expense = {
  id: string
  name: string
  concertId: string
  category: Category
  customCategory?: string
  plannedAmount: number
  actualAmount: number
  peopleCount: number
  date: string
}

type AppData = { concerts: Concert[]; expenses: Expense[] }
type StoredExpense = Omit<Expense, 'plannedAmount' | 'actualAmount' | 'peopleCount'> & {
  plannedAmount?: number
  actualAmount?: number
  peopleCount?: number
  amount?: number
}
type StoredData = { concerts: Concert[]; expenses: StoredExpense[] }
type AppPreferences = { displayName: string; tagline: string; budget: number }
type ModalState = { type: 'expense'; item?: Expense; concertId?: string } | { type: 'concert'; item?: Concert } | { type: 'report' } | { type: 'settings' } | null
type ExpenseSort = 'recent-added' | 'date-desc' | 'date-asc' | 'planned-desc' | 'actual-desc'
type YearFilter = number | 'all'

const STORAGE_KEY = 'walking-through-concerts-data-v2'
const PREFERENCES_KEY = 'walking-through-concerts-preferences-v1'
const DEFAULT_PREFERENCES: AppPreferences = { displayName: 'Diễm Võ', tagline: 'concert lover', budget: 90_000_000 }
const EXPENSES_PER_PAGE = 4
const PET_LOGO = `${import.meta.env.BASE_URL}dv-v-eri-logo.png`
const categories: Category[] = ['Vé concert', 'Di chuyển', 'Lưu trú', 'Ăn uống', 'Merchandise', 'Freebies', 'Cá nhân', 'Chuẩn bị', 'Trang phục & làm đẹp', 'Fan project', 'Quà tặng', 'Phí dịch vụ', 'Bảo hiểm', 'SIM & Internet', 'Khác']
const pastelPairs = [
  ['#ffd1d9', '#7d3047'],
  ['#ffd8bd', '#7a3b24'],
  ['#f5c7d8', '#69324a'],
  ['#ffc9b8', '#773426'],
]

const initialData: AppData = {
  concerts: [
    { id: 'concert-1', artist: 'SEVENTEEN', tour: 'RIGHT HERE', city: 'Bangkok', date: '2026-02-15', venue: 'Rajamangala Stadium', status: 'upcoming', color: '#ffd1d9', accent: '#7d3047' },
    { id: 'concert-2', artist: 'DAY6', tour: 'FOREVER YOUNG', city: 'Hồ Chí Minh', date: '2026-05-09', venue: 'SECC', status: 'upcoming', color: '#ffd8bd', accent: '#7a3b24' },
    { id: 'concert-3', artist: 'KANGDANIEL', tour: 'FOLLOW AGAIN', city: 'Seoul', date: '2025-10-13', venue: 'KSPO Dome', status: 'past', color: '#f5c7d8', accent: '#69324a' },
  ],
  expenses: [
    { id: 'expense-1', name: 'Vé VIP Soundcheck', concertId: 'concert-1', category: 'Vé concert', plannedAmount: 8_000_000, actualAmount: 7_850_000, peopleCount: 1, date: '2026-08-06' },
    { id: 'expense-2', name: 'Vé máy bay khứ hồi', concertId: 'concert-1', category: 'Di chuyển', plannedAmount: 4_500_000, actualAmount: 4_280_000, peopleCount: 1, date: '2026-07-28' },
    { id: 'expense-3', name: 'Ăn tối sau concert', concertId: 'concert-3', category: 'Ăn uống', plannedAmount: 1_000_000, actualAmount: 1_120_000, peopleCount: 1, date: '2025-10-14' },
    { id: 'expense-4', name: 'Vé CAT 1', concertId: 'concert-2', category: 'Vé concert', plannedAmount: 5_000_000, actualAmount: 4_500_000, peopleCount: 1, date: '2026-06-01' },
    { id: 'expense-5', name: 'Vé concert Seoul', concertId: 'concert-3', category: 'Vé concert', plannedAmount: 16_000_000, actualAmount: 16_450_000, peopleCount: 1, date: '2025-07-10' },
    { id: 'expense-6', name: 'Chuyến bay Seoul', concertId: 'concert-3', category: 'Di chuyển', plannedAmount: 12_500_000, actualAmount: 12_000_000, peopleCount: 1, date: '2025-08-20' },
    { id: 'expense-7', name: 'Di chuyển nội thành', concertId: 'concert-2', category: 'Di chuyển', plannedAmount: 3_000_000, actualAmount: 2_920_000, peopleCount: 1, date: '2026-05-08' },
    { id: 'expense-8', name: 'Khách sạn Bangkok', concertId: 'concert-1', category: 'Lưu trú', plannedAmount: 3_500_000, actualAmount: 3_300_000, peopleCount: 1, date: '2026-01-18' },
    { id: 'expense-9', name: 'Khách sạn Seoul', concertId: 'concert-3', category: 'Lưu trú', plannedAmount: 8_500_000, actualAmount: 9_000_000, peopleCount: 1, date: '2025-08-22' },
    { id: 'expense-10', name: 'Merchandise', concertId: 'concert-3', category: 'Merchandise', plannedAmount: 5_000_000, actualAmount: 5_080_000, peopleCount: 1, date: '2025-10-13' },
    { id: 'expense-11', name: 'Trang phục concert', concertId: 'concert-2', category: 'Chuẩn bị', plannedAmount: 2_500_000, actualAmount: 2_000_000, peopleCount: 1, date: '2026-04-20' },
  ],
}

const cloneInitialData = (): AppData => JSON.parse(JSON.stringify(initialData)) as AppData

const loadPreferences = (): AppPreferences => {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY)
    if (!saved) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(saved) as Partial<AppPreferences>
    const displayName = typeof parsed.displayName === 'string' && parsed.displayName.trim() ? parsed.displayName.trim().slice(0, 60) : DEFAULT_PREFERENCES.displayName
    const tagline = typeof parsed.tagline === 'string' && parsed.tagline.trim() ? parsed.tagline.trim().slice(0, 100) : DEFAULT_PREFERENCES.tagline
    const budget = Number(parsed.budget)
    return { displayName, tagline, budget: Number.isFinite(budget) && budget > 0 && budget <= 1_000_000_000_000 ? budget : DEFAULT_PREFERENCES.budget }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

const normalizeExpense = (expense: StoredExpense): Expense => {
  const legacyAmount = Number(expense.amount) || 0
  return {
    id: expense.id,
    name: expense.name,
    concertId: expense.concertId,
    category: expense.category,
    customCategory: typeof expense.customCategory === 'string' && expense.customCategory.trim() ? expense.customCategory.trim() : undefined,
    plannedAmount: Number.isFinite(expense.plannedAmount) ? Math.max(0, Number(expense.plannedAmount)) : legacyAmount,
    actualAmount: Number.isFinite(expense.actualAmount) ? Math.max(0, Number(expense.actualAmount)) : legacyAmount,
    peopleCount: Math.min(20, Math.max(1, Math.round(Number(expense.peopleCount) || 1))),
    date: expense.date,
  }
}

const loadData = (): AppData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return cloneInitialData()
    const parsed = JSON.parse(saved) as StoredData
    if (!Array.isArray(parsed.concerts) || !Array.isArray(parsed.expenses)) return cloneInitialData()
    return { concerts: parsed.concerts.map(normalizeConcert), expenses: parsed.expenses.map(normalizeExpense) }
  } catch {
    return cloneInitialData()
  }
}

const getPlannedTotal = (expense: Expense) => expense.plannedAmount * expense.peopleCount
const getActualTotal = (expense: Expense) => expense.actualAmount * expense.peopleCount
const getCategoryLabel = (expense: Expense) => expense.category === 'Khác' && expense.customCategory ? expense.customCategory : expense.category
const isSafeExternalUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const normalizeConcert = (concert: Concert): Concert => ({
  ...concert,
  ticketUrl: typeof concert.ticketUrl === 'string' && isSafeExternalUrl(concert.ticketUrl.trim()) ? concert.ticketUrl.trim() : undefined,
  relatedInfo: typeof concert.relatedInfo === 'string' && concert.relatedInfo.trim() ? concert.relatedInfo.trim() : undefined,
  announcement: typeof concert.announcement === 'string' && concert.announcement.trim() ? concert.announcement.trim() : undefined,
})

const formatMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
const formatCompact = (value: number) => `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`
const formatDate = (value: string) => value.split('-').reverse().join('.')
const formatExpenseDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`))
const getConcertYear = (concert: Concert) => Number(concert.date.slice(0, 4))
const getDefaultYear = (concerts: Concert[]): YearFilter => {
  const years = [...new Set(concerts.map(getConcertYear).filter(Number.isFinite))].sort((first, second) => second - first)
  const currentYear = new Date().getFullYear()
  return years.includes(currentYear) ? currentYear : years[0] ?? 'all'
}

function usePagination(itemCount: number, pageSize = EXPENSES_PER_PAGE) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  return { currentPage, totalPages, startIndex, endIndex: startIndex + pageSize, setPage }
}

function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [preferences, setPreferences] = useState<AppPreferences>(loadPreferences)
  const [selectedYear, setSelectedYear] = useState<YearFilter>(() => getDefaultYear(data.concerts))
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [expandedConcertId, setExpandedConcertId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [expenseNameFilter, setExpenseNameFilter] = useState('')
  const [expenseConcertFilter, setExpenseConcertFilter] = useState('all')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all')
  const [expenseSort, setExpenseSort] = useState<ExpenseSort>('recent-added')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  }, [preferences])

  const closeModal = useCallback(() => setModal(null), [])
  const availableYears = useMemo(() => [...new Set(data.concerts.map(getConcertYear).filter(Number.isFinite))].sort((first, second) => second - first), [data.concerts])
  const yearConcerts = useMemo(() => selectedYear === 'all' ? data.concerts : data.concerts.filter((concert) => getConcertYear(concert) === selectedYear), [data.concerts, selectedYear])
  const yearConcertIds = useMemo(() => new Set(yearConcerts.map((concert) => concert.id)), [yearConcerts])
  const yearExpenses = useMemo(() => data.expenses.filter((expense) => yearConcertIds.has(expense.concertId)), [data.expenses, yearConcertIds])

  const totalPlanned = useMemo(() => yearExpenses.reduce((sum, expense) => sum + getPlannedTotal(expense), 0), [yearExpenses])
  const totalActual = useMemo(() => yearExpenses.reduce((sum, expense) => sum + getActualTotal(expense), 0), [yearExpenses])
  const concertTotals = useMemo(() => Object.fromEntries(yearConcerts.map((concert) => {
    const expenses = yearExpenses.filter((expense) => expense.concertId === concert.id)
    return [concert.id, {
      planned: expenses.reduce((sum, expense) => sum + getPlannedTotal(expense), 0),
      actual: expenses.reduce((sum, expense) => sum + getActualTotal(expense), 0),
    }]
  })), [yearConcerts, yearExpenses])
  const breakdown = useMemo(() => {
    const getTotal = (matching: Category[]) => yearExpenses.filter((expense) => matching.includes(expense.category)).reduce((sum, expense) => sum + getActualTotal(expense), 0)
    const getOtherTotal = () => yearExpenses.filter((expense) => !(['Vé concert', 'Di chuyển', 'Lưu trú'] as Category[]).includes(expense.category)).reduce((sum, expense) => sum + getActualTotal(expense), 0)
    return [
      { label: 'Vé concert', amount: getTotal(['Vé concert']), className: 'coral' },
      { label: 'Di chuyển', amount: getTotal(['Di chuyển']), className: 'rose' },
      { label: 'Lưu trú', amount: getTotal(['Lưu trú']), className: 'apricot' },
      { label: 'Khác', amount: getOtherTotal(), className: 'berry' },
    ]
  }, [yearExpenses])

  const visibleConcerts = yearConcerts.filter((concert) => {
    const matchesFilter = filter === 'all' || concert.status === filter
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    const matchesQuery = !normalizedQuery || `${concert.artist} ${concert.tour} ${concert.city}`.toLocaleLowerCase('vi').includes(normalizedQuery)
    return matchesFilter && matchesQuery
  }).sort((first, second) => {
    if (filter === 'all' && first.status !== second.status) return first.status === 'upcoming' ? -1 : 1
    return first.status === 'upcoming'
      ? first.date.localeCompare(second.date)
      : second.date.localeCompare(first.date)
  })

  const filteredRecentExpenses = useMemo(() => {
    const normalizedName = expenseNameFilter.trim().toLocaleLowerCase('vi')
    const filtered = yearExpenses.filter((expense) => {
      const matchesName = !normalizedName || expense.name.toLocaleLowerCase('vi').includes(normalizedName)
      const matchesConcert = expenseConcertFilter === 'all' || expense.concertId === expenseConcertFilter
      const matchesCategory = expenseCategoryFilter === 'all' || expense.category === expenseCategoryFilter
      return matchesName && matchesConcert && matchesCategory
    })
    if (expenseSort === 'recent-added') return filtered
    return [...filtered].sort((first, second) => {
      if (expenseSort === 'date-desc') return second.date.localeCompare(first.date)
      if (expenseSort === 'date-asc') return first.date.localeCompare(second.date)
      if (expenseSort === 'planned-desc') return getPlannedTotal(second) - getPlannedTotal(first)
      return getActualTotal(second) - getActualTotal(first)
    })
  }, [yearExpenses, expenseNameFilter, expenseConcertFilter, expenseCategoryFilter, expenseSort])
  const recentPagination = usePagination(filteredRecentExpenses.length)
  const resetRecentPage = () => recentPagination.setPage(1)
  const changeYear = (value: string) => {
    const nextYear: YearFilter = value === 'all' ? 'all' : Number(value)
    setSelectedYear(nextYear)
    setFilter((current) => current === 'all' || data.concerts.some((concert) => (nextYear === 'all' || getConcertYear(concert) === nextYear) && concert.status === current) ? current : 'all')
    setExpandedConcertId(null)
    setExpenseNameFilter('')
    setExpenseConcertFilter('all')
    setExpenseCategoryFilter('all')
    setExpenseSort('recent-added')
    resetRecentPage()
  }

  const saveExpense = (expense: Expense) => {
    const exists = data.expenses.some((item) => item.id === expense.id)
    setData((current) => ({ ...current, expenses: exists ? current.expenses.map((item) => item.id === expense.id ? expense : item) : [expense, ...current.expenses] }))
    setAnnouncement(exists ? 'Đã cập nhật khoản chi' : 'Đã thêm khoản chi mới')
    closeModal()
  }

  const saveConcert = (concert: Concert) => {
    const exists = data.concerts.some((item) => item.id === concert.id)
    setData((current) => ({ ...current, concerts: exists ? current.concerts.map((item) => item.id === concert.id ? concert : item) : [...current.concerts, concert] }))
    if (!exists) setSelectedYear(getConcertYear(concert))
    setAnnouncement(exists ? 'Đã cập nhật concert' : 'Đã thêm concert mới')
    closeModal()
  }

  const savePreferences = (nextPreferences: AppPreferences) => {
    setPreferences(nextPreferences)
    setAnnouncement('Đã lưu cài đặt')
    closeModal()
  }

  const deleteExpense = (expense: Expense) => {
    if (!window.confirm(`Xóa khoản chi “${expense.name}”?`)) return
    setData((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== expense.id) }))
    setAnnouncement('Đã xóa khoản chi')
  }

  const deleteConcert = (concert: Concert) => {
    if (!window.confirm(`Xóa concert “${concert.artist}” và toàn bộ chi phí liên quan?`)) return
    const remainingConcerts = data.concerts.filter((item) => item.id !== concert.id)
    setData((current) => ({ concerts: remainingConcerts, expenses: current.expenses.filter((expense) => expense.concertId !== concert.id) }))
    if (selectedYear !== 'all' && !remainingConcerts.some((item) => getConcertYear(item) === selectedYear)) setSelectedYear(getDefaultYear(remainingConcerts))
    setExpandedConcertId((current) => current === concert.id ? null : current)
    setAnnouncement('Đã xóa concert')
  }

  const upcomingCount = yearConcerts.filter((concert) => concert.status === 'upcoming').length
  const pastCount = yearConcerts.length - upcomingCount
  const remaining = preferences.budget - totalActual
  const donutStops = useMemo(() => {
    const percentages = breakdown.map((item) => totalActual ? item.amount / totalActual * 100 : 0)
    const a = percentages[0]
    const b = a + percentages[1]
    const c = b + percentages[2]
    return `conic-gradient(var(--coral) 0 ${a}%, var(--rose) ${a}% ${b}%, var(--apricot) ${b}% ${c}%, var(--berry) ${c}% 100%)`
  }, [breakdown, totalActual])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <Sidebar preferences={preferences} onOpenReport={() => setModal({ type: 'report' })} onOpenSettings={() => setModal({ type: 'settings' })} />

      <main id="main-content" className="main-content">
        <Topbar query={query} onQueryChange={setQuery} onAddExpense={() => setModal({ type: 'expense' })} onAddConcert={() => setModal({ type: 'concert' })} />

        <section className="intro-row" aria-labelledby="welcome-title">
          <div>
            <p className="eyebrow"><span /> NHẬT KÝ CONCERT CỦA BẠN</p>
            <h1 id="welcome-title">Xin chào, {preferences.displayName.split(/\s+/)[0]}! <Heart size={25} fill="currentColor" aria-hidden="true" /></h1>
            <p className="intro-copy">Mỗi sân khấu là một dấu mốc. Mình đã gom tất cả vào đây.</p>
          </div>
          <label className="year-picker"><Clock3 size={16} aria-hidden="true" /><span className="sr-only">Chọn năm</span><select aria-label="Chọn năm" value={String(selectedYear)} onChange={(event) => changeYear(event.target.value)}><option value="all">Tất cả năm</option>{availableYears.map((year) => <option key={year} value={year}>Năm {year}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label>
        </section>

        <section className="stats-grid" aria-label="Tổng quan chi tiêu">
          <article className="stat-card stat-coral">
            <div className="stat-top"><span>CHI PHÍ CỦA BẠN</span><WalletCards size={20} aria-hidden="true" /></div>
            <div className="stat-dual-values">
              <div><span>TỔNG DỰ TÍNH</span><strong>{formatMoney(totalPlanned)}</strong></div>
              <div><span>TỔNG THỰC TẾ</span><strong>{formatMoney(totalActual)}</strong></div>
            </div>
            <p><span className="trend-up">Dữ liệu của bạn</span> · tự động cập nhật</p>
            <svg className="sparkline" viewBox="0 0 250 48" role="img" aria-label="Chi tiêu có xu hướng tăng"><path d="M2 40 C30 37 38 29 62 31 S92 45 116 29 S146 10 169 17 S202 30 248 2" /><circle cx="248" cy="2" r="3" /></svg>
          </article>

          <article className="stat-card stat-pink">
            <div className="stat-top"><span>CONCERT ĐÃ LÊN KẾ HOẠCH</span><Ticket size={21} aria-hidden="true" /></div>
            <strong>{yearConcerts.length} concerts</strong>
            <p>{upcomingCount} sắp tới <span aria-hidden="true">·</span> {pastCount} đã đi</p>
            <div className="artist-stamps" aria-label={`Nghệ sĩ: ${yearConcerts.map((concert) => concert.artist).join(', ')}`}>
              {yearConcerts.slice(0, 3).map((concert) => <span key={concert.id}>{concert.artist.slice(0, 2)}</span>)}
            </div>
          </article>

          <article className="stat-card stat-cream">
            <div className="stat-top"><span>NGÂN SÁCH CÒN LẠI</span><span className="tiny-label">{selectedYear === 'all' ? 'TẤT CẢ' : selectedYear}</span></div>
            <strong>{formatMoney(remaining)}</strong>
            <div className="budget-track"><span style={{ width: `${Math.min(100, totalActual / preferences.budget * 100)}%` }} /></div>
            <p>Đã dùng {Math.round(totalActual / preferences.budget * 100)}% của {formatMoney(preferences.budget)}</p>
          </article>
        </section>

        <section className="dashboard-grid" id="concerts">
          <div className="concert-section">
            <div className="section-heading">
              <div><p className="section-kicker">LỊCH TRÌNH</p><h2>Concert của tôi</h2></div>
              <div className="filter-tabs" aria-label="Lọc concert">
                {([['upcoming', 'Sắp tới'], ['all', 'Tất cả'], ['past', 'Đã đi']] as const).map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>)}
              </div>
            </div>
            <div className="concert-list" aria-live="polite">
              {visibleConcerts.map((concert) => {
                const concertExpenses = data.expenses.filter((expense) => expense.concertId === concert.id)
                return <ConcertTicket
                  key={concert.id}
                  concert={concert}
                  expenses={concertExpenses}
                  totals={concertTotals[concert.id] ?? { planned: 0, actual: 0 }}
                  isExpanded={expandedConcertId === concert.id}
                  onToggle={() => setExpandedConcertId((current) => current === concert.id ? null : concert.id)}
                  onAddExpense={() => setModal({ type: 'expense', concertId: concert.id })}
                  onEdit={() => setModal({ type: 'concert', item: concert })}
                  onDelete={() => deleteConcert(concert)}
                  onEditExpense={(expense) => setModal({ type: 'expense', item: expense })}
                  onDeleteExpense={deleteExpense}
                />
              })}
              {!visibleConcerts.length && <div className="empty-state"><Sparkles size={22} /><strong>Chưa tìm thấy concert</strong><span>Thử từ khóa khác hoặc thêm một concert mới nhé.</span></div>}
            </div>
          </div>

          <aside className="spending-panel" aria-labelledby="spending-title">
            <div className="panel-title-row"><div><p className="section-kicker">PHÂN BỔ</p><h2 id="spending-title">Tiền đã đi đâu?</h2></div><Sparkles size={20} aria-hidden="true" /></div>
            <div className="donut-wrap"><div className="donut" style={{ background: donutStops }} role="img" aria-label={breakdown.map((item) => `${item.label} ${Math.round(item.amount / (totalActual || 1) * 100)}%`).join(', ')}><div><strong>{formatCompact(totalActual)}</strong><span>THỰC TẾ</span></div></div></div>
            <ul className="legend-list">
              {breakdown.map((item) => <li key={item.label}><span className={`legend-dot ${item.className}`} /><span>{item.label}</span><strong>{formatCompact(item.amount)}</strong><small>{Math.round(item.amount / (totalActual || 1) * 100)}%</small></li>)}
            </ul>
            <button className="report-link" type="button" onClick={() => setModal({ type: 'report' })}>Xem báo cáo chi tiết <ArrowUpRight size={16} aria-hidden="true" /></button>
          </aside>
        </section>

        <section className="recent-section" id="expenses" aria-labelledby="recent-title">
          <div className="section-heading"><div><p className="section-kicker">MỚI NHẤT</p><h2 id="recent-title">Chi phí gần đây</h2></div><button className="text-button" onClick={() => setModal({ type: 'expense' })}><Plus size={15} /> Thêm khoản chi</button></div>
          <div className="expense-filters" aria-label="Bộ lọc chi phí gần đây">
            <label className="expense-filter-field"><span>Tên khoản chi</span><input aria-label="Lọc theo tên khoản chi" value={expenseNameFilter} onChange={(event) => { setExpenseNameFilter(event.target.value); resetRecentPage() }} placeholder="Tìm tên khoản chi..." /></label>
            <label className="expense-filter-field"><span>Concert</span><select aria-label="Lọc theo concert" value={expenseConcertFilter} onChange={(event) => { setExpenseConcertFilter(event.target.value); resetRecentPage() }}><option value="all">Tất cả concert</option>{yearConcerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.artist} · {concert.city}</option>)}</select></label>
            <label className="expense-filter-field"><span>Danh mục</span><select aria-label="Lọc theo danh mục" value={expenseCategoryFilter} onChange={(event) => { setExpenseCategoryFilter(event.target.value); resetRecentPage() }}><option value="all">Tất cả danh mục</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label className="expense-filter-field"><span>Sắp xếp</span><select aria-label="Sắp xếp chi phí" value={expenseSort} onChange={(event) => { setExpenseSort(event.target.value as ExpenseSort); resetRecentPage() }}><option value="recent-added">Mới thêm gần đây</option><option value="date-desc">Ngày mới nhất</option><option value="date-asc">Ngày cũ nhất</option><option value="planned-desc">Dự tính cao nhất</option><option value="actual-desc">Thực tế cao nhất</option></select></label>
          </div>
          <div className="expense-filter-result" role="status" aria-live="polite">{filteredRecentExpenses.length} / {yearExpenses.length} khoản chi</div>
          <div className="expense-table">
            {filteredRecentExpenses.slice(recentPagination.startIndex, recentPagination.endIndex).map((expense) => <ExpenseRow key={expense.id} expense={expense} concert={data.concerts.find((concert) => concert.id === expense.concertId)} onEdit={() => setModal({ type: 'expense', item: expense })} onDelete={() => deleteExpense(expense)} />)}
            {!filteredRecentExpenses.length && <div className="expense-filter-empty"><Search size={18} aria-hidden="true" /><span>Không có khoản chi phù hợp với bộ lọc.</span></div>}
          </div>
          <TablePagination label="Chi phí gần đây" itemCount={filteredRecentExpenses.length} pagination={recentPagination} />
        </section>
      </main>

      <MobileNav onOpenSettings={() => setModal({ type: 'settings' })} />
      {modal?.type === 'expense' && <ExpenseModal key={modal.item?.id ?? `new-expense-${modal.concertId ?? 'general'}`} item={modal.item} initialConcertId={modal.concertId} concerts={data.concerts} onClose={closeModal} onSave={saveExpense} />}
      {modal?.type === 'concert' && <ConcertModal key={modal.item?.id ?? 'new-concert'} item={modal.item} onClose={closeModal} onSave={saveConcert} />}
      {modal?.type === 'report' && <ReportModal expenses={yearExpenses} concerts={yearConcerts} totalPlanned={totalPlanned} totalActual={totalActual} budget={preferences.budget} periodLabel={selectedYear === 'all' ? 'Tất cả năm' : `Năm ${selectedYear}`} onClose={closeModal} />}
      {modal?.type === 'settings' && <SettingsModal preferences={preferences} onClose={closeModal} onSave={savePreferences} />}
      <div className={`toast ${announcement ? 'show' : ''}`} role="status" aria-live="polite"><Heart size={16} fill="currentColor" />{announcement}</div>
    </div>
  )
}

function Sidebar({ preferences, onOpenReport, onOpenSettings }: { preferences: AppPreferences; onOpenReport: () => void; onOpenSettings: () => void }) {
  const initials = preferences.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase('vi')
  return <aside className="sidebar"><div className="brand"><span className="brand-mark"><img src={PET_LOGO} alt="DV V-eri" /></span><span>WALKING THROUGH<br /><b>CONCERTS</b></span></div><nav aria-label="Điều hướng chính"><a className="nav-item active" href="#main-content"><Home size={18} /> Tổng quan</a><a className="nav-item" href="#concerts"><Ticket size={18} /> Concert</a><a className="nav-item" href="#expenses"><ReceiptText size={18} /> Chi phí</a><button className="nav-item" type="button" onClick={onOpenReport}><BarChart3 size={18} /> Báo cáo</button></nav><div className="sidebar-note"><Heart size={17} fill="currentColor" /><span>Lưu từng khoảnh khắc,<br />nhớ từng sân khấu.</span></div><div className="sidebar-bottom"><button className="nav-item" type="button" onClick={onOpenSettings}><Settings size={18} /> Cài đặt</button><div className="profile"><div className="avatar">{initials}</div><div><strong>{preferences.displayName}</strong><span>{preferences.tagline}</span></div></div></div></aside>
}

function Topbar({ query, onQueryChange, onAddExpense, onAddConcert }: { query: string; onQueryChange: (value: string) => void; onAddExpense: () => void; onAddConcert: () => void }) {
  return <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><img src={PET_LOGO} alt="DV V-eri" /></span><b>CONCERTS</b></div><label className="search-box" htmlFor="site-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Tìm kiếm</span><input id="site-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm concert, nghệ sĩ..." /><kbd>⌘ K</kbd></label><div className="topbar-actions"><button className="secondary-button" onClick={onAddConcert}><Ticket size={17} aria-hidden="true" /> Thêm concert</button><button className="add-button" onClick={onAddExpense}><Plus size={17} aria-hidden="true" /> Thêm chi phí</button></div></header>
}

function ConcertTicket({ concert, expenses, totals, isExpanded, onToggle, onAddExpense, onEdit, onDelete, onEditExpense, onDeleteExpense }: { concert: Concert; expenses: Expense[]; totals: { planned: number; actual: number }; isExpanded: boolean; onToggle: () => void; onAddExpense: () => void; onEdit: () => void; onDelete: () => void; onEditExpense: (expense: Expense) => void; onDeleteExpense: (expense: Expense) => void }) {
  const detailsId = `concert-expenses-${concert.id}`
  const titleId = `${detailsId}-title`
  const pagination = usePagination(expenses.length)
  const hasConcertInformation = Boolean(concert.ticketUrl || concert.relatedInfo || concert.announcement)
  return <div className={`concert-entry ${isExpanded ? 'is-open' : ''}`}>
    <article className="concert-ticket" style={{ '--ticket-color': concert.color, '--ticket-accent': concert.accent } as CSSProperties}>
      <button type="button" className="concert-ticket-toggle" aria-label={`${isExpanded ? 'Ẩn' : 'Xem'} chi phí ${concert.artist}`} aria-expanded={isExpanded} aria-controls={detailsId} onClick={onToggle}>
        <div className="poster" aria-hidden="true"><span className="tape" /><div className="poster-orbit" /><span className="poster-city">{concert.city}</span><strong>{concert.artist}</strong><small>LIVE · {concert.date.slice(0, 4)}</small></div>
        <div className="ticket-info"><div className="ticket-status"><span className={concert.status}>{concert.status === 'upcoming' ? 'SẮP TỚI' : 'ĐÃ ĐI'}</span></div><p className="artist-name">{concert.artist}</p><h3>{concert.tour}</h3><div className="ticket-meta"><span><CalendarDays size={15} />{formatDate(concert.date)}</span><span><MapPin size={15} />{concert.venue}</span></div><div className="ticket-footer"><span className="ticket-total"><small>DỰ TÍNH</small><strong>{formatMoney(totals.planned)}</strong></span><span className="ticket-total actual"><small>THỰC TẾ</small><strong>{formatMoney(totals.actual)}</strong></span><span className="ticket-details-hint">{isExpanded ? 'Ẩn chi phí' : 'Xem chi phí'} <ChevronDown size={15} aria-hidden="true" /></span></div></div>
      </button>
      <div className="row-actions ticket-actions"><button aria-label={`Chỉnh sửa ${concert.artist}`} onClick={onEdit}><Pencil size={16} /></button><button aria-label={`Xóa ${concert.artist}`} onClick={onDelete}><Trash2 size={16} /></button></div>
      <div className="ticket-code" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <span key={index} />)}</div>
    </article>
    {isExpanded && <section id={detailsId} className="concert-expenses-panel" role="region" aria-labelledby={titleId}>
      <div className="concert-expenses-header">
        <div><p className="section-kicker">CHI TIẾT CHI TIÊU</p><h3 id={titleId}>Chi phí của {concert.artist}</h3><span>{expenses.length} khoản chi · {concert.city}</span></div>
        <div className="concert-expenses-summary"><div><span>Dự tính <strong>{formatMoney(totals.planned)}</strong></span><span>Thực tế <strong>{formatMoney(totals.actual)}</strong></span></div><button type="button" className="text-button" aria-label={`Thêm chi phí cho ${concert.artist}`} onClick={onAddExpense}><Plus size={15} aria-hidden="true" /> Thêm chi phí</button></div>
      </div>
      {hasConcertInformation && <div className="concert-information" aria-label={`Thông tin concert ${concert.artist}`}>
        {concert.announcement && <div className="concert-announcement" role="note"><BellRing size={18} aria-hidden="true" /><div><strong>Thông báo / lưu ý</strong><p>{concert.announcement}</p></div></div>}
        {(concert.relatedInfo || concert.ticketUrl) && <div className="concert-related-info"><Info size={18} aria-hidden="true" /><div>{concert.relatedInfo && <p>{concert.relatedInfo}</p>}{concert.ticketUrl && <a href={concert.ticketUrl} target="_blank" rel="noopener noreferrer" aria-label="Mở link bán vé">Link bán vé <ExternalLink size={14} aria-hidden="true" /></a>}</div></div>}
      </div>}
      {expenses.length ? <div className="expense-table concert-expense-table">
        {expenses.slice(pagination.startIndex, pagination.endIndex).map((expense) => <ExpenseRow key={expense.id} expense={expense} concert={concert} onEdit={() => onEditExpense(expense)} onDelete={() => onDeleteExpense(expense)} />)}
      </div> : <div className="concert-expenses-empty"><ReceiptText size={20} aria-hidden="true" /><span>Chưa có khoản chi nào cho concert này.</span></div>}
      {expenses.length > 0 && <TablePagination label={`Chi phí ${concert.artist}`} itemCount={expenses.length} pagination={pagination} />}
    </section>}
  </div>
}

function TablePagination({ label, itemCount, pagination }: { label: string; itemCount: number; pagination: ReturnType<typeof usePagination> }) {
  const { currentPage, totalPages, startIndex, endIndex, setPage } = pagination
  if (totalPages <= 1) return null
  const firstItem = startIndex + 1
  const lastItem = Math.min(endIndex, itemCount)

  return <nav className="table-pagination" aria-label={`Phân trang ${label}`}>
    <span className="pagination-summary">Hiển thị {firstItem}–{lastItem} / {itemCount}</span>
    <div className="pagination-controls">
      <button type="button" aria-label={`Trang trước của ${label}`} disabled={currentPage === 1} onClick={() => setPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} aria-hidden="true" /></button>
      <span className="pagination-page" aria-live="polite" aria-atomic="true">Trang {currentPage} / {totalPages}</span>
      <button type="button" aria-label={`Trang sau của ${label}`} disabled={currentPage === totalPages} onClick={() => setPage((page) => Math.min(totalPages, page + 1))}><ChevronRight size={16} aria-hidden="true" /></button>
    </div>
  </nav>
}

function ExpenseRow({ expense, concert, onEdit, onDelete }: { expense: Expense; concert?: Concert; onEdit: () => void; onDelete: () => void }) {
  const Icon = expense.category === 'Di chuyển' ? TrainFront : expense.category === 'Ăn uống' ? Utensils : Ticket
  const iconClass = expense.category === 'Di chuyển' ? 'travel' : expense.category === 'Ăn uống' ? 'food' : 'ticket'
  return <div className="expense-row"><div className={`expense-icon ${iconClass}`}><Icon size={19} aria-hidden="true" /></div><div className="expense-name"><strong>{expense.name}</strong><span>{concert ? `${concert.artist} · ${concert.city}` : 'Không gắn concert'}</span><small>{expense.peopleCount} người</small></div><span className="expense-category">{getCategoryLabel(expense)}</span><span className="expense-date">{formatExpenseDate(expense.date)}</span><div className="expense-costs"><span><small>Dự tính</small>{formatMoney(getPlannedTotal(expense))}</span><strong><small>Thực tế</small>− {formatMoney(getActualTotal(expense))}</strong></div><div className="row-actions"><button aria-label={`Chỉnh sửa ${expense.name}`} onClick={onEdit}><Pencil size={15} /></button><button aria-label={`Xóa ${expense.name}`} onClick={onDelete}><Trash2 size={15} /></button></div></div>
}

function useAccessibleModal(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement
    dialogRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute('disabled'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previousFocus.current?.focus() }
  }, [onClose])
  return dialogRef
}

function ExpenseModal({ item, initialConcertId, concerts, onClose, onSave }: { item?: Expense; initialConcertId?: string; concerts: Concert[]; onClose: () => void; onSave: (expense: Expense) => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [plannedAmount, setPlannedAmount] = useState(String(item?.plannedAmount ?? 1_200_000))
  const [actualAmount, setActualAmount] = useState(String(item?.actualAmount ?? 0))
  const [peopleCount, setPeopleCount] = useState(String(item?.peopleCount ?? 1))
  const [category, setCategory] = useState<Category>(item?.category ?? 'Vé concert')
  const [customCategory, setCustomCategory] = useState(item?.customCategory ?? '')
  const [concertId, setConcertId] = useState(item?.concertId ?? initialConcertId ?? concerts[0]?.id ?? '')
  const [date, setDate] = useState(item?.date ?? new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const [customCategoryError, setCustomCategoryError] = useState('')
  const dialogRef = useAccessibleModal(onClose)
  const isEditing = Boolean(item)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) { setError('Vui lòng nhập tên khoản chi'); return }
    if (category === 'Khác' && !customCategory.trim()) { setCustomCategoryError('Vui lòng nhập tên danh mục khác'); return }
    onSave({ id: item?.id ?? `expense-${Date.now()}`, name: name.trim(), plannedAmount: Number(plannedAmount) || 0, actualAmount: Number(actualAmount) || 0, peopleCount: Number(peopleCount) || 1, category, customCategory: category === 'Khác' ? customCategory.trim() : undefined, concertId, date })
  }

  const plannedTotal = (Number(plannedAmount) || 0) * (Number(peopleCount) || 1)
  const actualTotal = (Number(actualAmount) || 0) * (Number(peopleCount) || 1)

  return <ModalFrame title={isEditing ? 'Chỉnh sửa chi phí' : 'Thêm chi phí mới'} kicker="GHI LẠI KỶ NIỆM" onClose={onClose} dialogRef={dialogRef}><form onSubmit={submit} noValidate><div className="form-field"><label className="required-label" htmlFor="expense-name">Tên khoản chi</label><input id="expense-name" value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="Ví dụ: Vé VIP, khách sạn..." aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'expense-error' : undefined} autoFocus />{error && <span id="expense-error" className="field-error" role="alert">{error}</span>}</div><div className="form-row expense-money-row"><div className="form-field"><label htmlFor="expense-planned-amount">Dự tính / người</label><div className="money-input"><input id="expense-planned-amount" type="number" min="0" value={plannedAmount} onChange={(event) => setPlannedAmount(event.target.value)} /><span>VND</span></div></div><div className="form-field"><label htmlFor="expense-actual-amount">Thực tế / người</label><div className="money-input"><input id="expense-actual-amount" type="number" min="0" value={actualAmount} onChange={(event) => setActualAmount(event.target.value)} /><span>VND</span></div></div><div className="form-field people-field"><label htmlFor="expense-people">Số người</label><select id="expense-people" value={peopleCount} onChange={(event) => setPeopleCount(event.target.value)}>{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} người</option>)}</select></div></div><div className="expense-calculation" role="status" aria-label="Tổng chi phí đã tính" aria-live="polite"><div><span>Tổng dự tính</span><strong>{formatMoney(plannedTotal)}</strong></div><div><span>Tổng thực tế</span><strong>{formatMoney(actualTotal)}</strong></div></div><div className="form-row"><div className="form-field"><label htmlFor="expense-category">Danh mục</label><select id="expense-category" value={category} onChange={(event) => { setCategory(event.target.value as Category); setCustomCategoryError('') }}>{categories.map((value) => <option key={value}>{value}</option>)}</select></div><div className="form-field"><label htmlFor="expense-concert">Concert</label><select id="expense-concert" value={concertId} onChange={(event) => setConcertId(event.target.value)}>{concerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.artist} · {concert.city}</option>)}</select></div></div>{category === 'Khác' && <div className="form-field custom-category-field"><label className="required-label" htmlFor="expense-custom-category">Tên danh mục khác</label><input id="expense-custom-category" value={customCategory} onChange={(event) => { setCustomCategory(event.target.value); setCustomCategoryError('') }} placeholder="Ví dụ: Phí đổi vé, gửi hành lý..." aria-required="true" aria-invalid={Boolean(customCategoryError)} aria-describedby={customCategoryError ? 'custom-category-error' : undefined} />{customCategoryError && <span id="custom-category-error" className="field-error" role="alert">{customCategoryError}</span>}</div>}<div className="form-field"><label htmlFor="expense-date">Ngày thanh toán</label><input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><ModalActions onClose={onClose} submitLabel={isEditing ? 'Lưu thay đổi' : 'Lưu chi phí'} /></form></ModalFrame>
}

function ConcertModal({ item, onClose, onSave }: { item?: Concert; onClose: () => void; onSave: (concert: Concert) => void }) {
  const [artist, setArtist] = useState(item?.artist ?? '')
  const [tour, setTour] = useState(item?.tour ?? '')
  const [city, setCity] = useState(item?.city ?? '')
  const [venue, setVenue] = useState(item?.venue ?? '')
  const [date, setDate] = useState(item?.date ?? '2026-12-20')
  const [status, setStatus] = useState<ConcertStatus>(item?.status ?? 'upcoming')
  const [ticketUrl, setTicketUrl] = useState(item?.ticketUrl ?? '')
  const [relatedInfo, setRelatedInfo] = useState(item?.relatedInfo ?? '')
  const [announcement, setAnnouncement] = useState(item?.announcement ?? '')
  const [error, setError] = useState('')
  const [ticketUrlError, setTicketUrlError] = useState('')
  const dialogRef = useAccessibleModal(onClose)
  const isEditing = Boolean(item)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!artist.trim()) { setError('Vui lòng nhập tên nghệ sĩ'); return }
    const cleanTicketUrl = ticketUrl.trim()
    if (cleanTicketUrl && !isSafeExternalUrl(cleanTicketUrl)) {
      setTicketUrlError('Link bán vé phải bắt đầu bằng http:// hoặc https://')
      return
    }
    const pair = item ? [item.color, item.accent] : pastelPairs[Math.floor(Math.random() * pastelPairs.length)]
    onSave({
      id: item?.id ?? `concert-${Date.now()}`,
      artist: artist.trim(),
      tour: tour.trim() || 'LIVE IN CONCERT',
      city: city.trim() || 'Chưa xác định',
      venue: venue.trim() || 'Chưa xác định',
      date,
      status,
      color: pair[0],
      accent: pair[1],
      ticketUrl: cleanTicketUrl || undefined,
      relatedInfo: relatedInfo.trim() || undefined,
      announcement: announcement.trim() || undefined,
    })
  }

  return <ModalFrame title={isEditing ? 'Chỉnh sửa concert' : 'Thêm concert mới'} kicker="LỊCH TRÌNH MỚI" onClose={onClose} dialogRef={dialogRef}><form onSubmit={submit} noValidate><div className="form-row"><div className="form-field"><label className="required-label" htmlFor="concert-artist">Nghệ sĩ</label><input id="concert-artist" value={artist} onChange={(event) => { setArtist(event.target.value); setError('') }} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'concert-error' : undefined} autoFocus />{error && <span id="concert-error" className="field-error" role="alert">{error}</span>}</div><div className="form-field"><label htmlFor="concert-tour">Tên tour</label><input id="concert-tour" value={tour} onChange={(event) => setTour(event.target.value)} /></div></div><div className="form-row"><div className="form-field"><label htmlFor="concert-city">Thành phố</label><input id="concert-city" value={city} onChange={(event) => setCity(event.target.value)} /></div><div className="form-field"><label htmlFor="concert-venue">Địa điểm</label><input id="concert-venue" value={venue} onChange={(event) => setVenue(event.target.value)} /></div></div><div className="form-row"><div className="form-field"><label htmlFor="concert-date">Ngày diễn</label><input id="concert-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="form-field"><label htmlFor="concert-status">Trạng thái</label><select id="concert-status" value={status} onChange={(event) => setStatus(event.target.value as ConcertStatus)}><option value="upcoming">Sắp tới</option><option value="past">Đã đi</option></select></div></div><div className="form-field"><label htmlFor="concert-ticket-url">Link bán vé</label><input id="concert-ticket-url" type="url" value={ticketUrl} onChange={(event) => { setTicketUrl(event.target.value); setTicketUrlError('') }} placeholder="https://ticketbox.vn/..." aria-invalid={Boolean(ticketUrlError)} aria-describedby={ticketUrlError ? 'concert-ticket-url-error' : undefined} />{ticketUrlError && <span id="concert-ticket-url-error" className="field-error" role="alert">{ticketUrlError}</span>}</div><div className="form-field"><label htmlFor="concert-related-info">Thông tin liên quan</label><textarea id="concert-related-info" value={relatedInfo} onChange={(event) => setRelatedInfo(event.target.value)} placeholder="Ví dụ: thời gian mở bán, quyền lợi vé, hướng dẫn check-in..." /></div><div className="form-field"><label htmlFor="concert-announcement">Thông báo / lưu ý</label><textarea id="concert-announcement" value={announcement} onChange={(event) => setAnnouncement(event.target.value)} placeholder="Ví dụ: mang CCCD, giờ tập trung, quy định vật dụng..." /></div><ModalActions onClose={onClose} submitLabel={isEditing ? 'Lưu thay đổi' : 'Lưu concert'} /></form></ModalFrame>
}

function ReportModal({ expenses, concerts, totalPlanned, totalActual, budget, periodLabel, onClose }: { expenses: Expense[]; concerts: Concert[]; totalPlanned: number; totalActual: number; budget: number; periodLabel: string; onClose: () => void }) {
  const dialogRef = useAccessibleModal(onClose)
  const categoryRows = useMemo(() => {
    const totals = new Map<string, number>()
    expenses.forEach((expense) => totals.set(getCategoryLabel(expense), (totals.get(getCategoryLabel(expense)) ?? 0) + getActualTotal(expense)))
    return [...totals.entries()].map(([label, amount]) => ({ label, amount })).sort((first, second) => second.amount - first.amount)
  }, [expenses])
  const concertRows = useMemo(() => concerts.map((concert) => ({
    artist: concert.artist,
    city: concert.city,
    amount: expenses.filter((expense) => expense.concertId === concert.id).reduce((sum, expense) => sum + getActualTotal(expense), 0),
  })).sort((first, second) => second.amount - first.amount), [concerts, expenses])
  const variance = totalActual - totalPlanned

  return <ModalFrame title="Báo cáo chi tiết" kicker="TỔNG HỢP CHI TIÊU" onClose={onClose} dialogRef={dialogRef}><div className="report-modal-content"><p className="report-period">{periodLabel}</p><div className="report-summary"><div><span>Tổng dự tính</span><strong>{formatMoney(totalPlanned)}</strong></div><div><span>Tổng thực tế</span><strong>{formatMoney(totalActual)}</strong></div><div><span>{variance > 0 ? 'Vượt dự tính' : 'Tiết kiệm'}</span><strong className={variance > 0 ? 'negative' : 'positive'}>{formatMoney(Math.abs(variance))}</strong></div><div><span>Còn lại trong ngân sách</span><strong>{formatMoney(budget - totalActual)}</strong></div></div><div className="report-columns"><section aria-labelledby="category-report-title"><h3 id="category-report-title">Tổng theo danh mục</h3><div className="report-list" role="list">{categoryRows.map((row) => <div className="report-row" role="listitem" key={row.label}><span>{row.label}</span><div><strong>{formatMoney(row.amount)}</strong><small>{Math.round(row.amount / (totalActual || 1) * 100)}%</small></div></div>)}</div></section><section aria-labelledby="concert-report-title"><h3 id="concert-report-title">Tổng theo concert</h3><div className="report-list" role="list">{concertRows.map((row) => <div className="report-row" role="listitem" key={`${row.artist}-${row.city}`}><span><strong>{row.artist}</strong><small>{row.city}</small></span><div><strong>{formatMoney(row.amount)}</strong><small>{Math.round(row.amount / (totalActual || 1) * 100)}%</small></div></div>)}</div></section></div></div></ModalFrame>
}

function SettingsModal({ preferences, onClose, onSave }: { preferences: AppPreferences; onClose: () => void; onSave: (preferences: AppPreferences) => void }) {
  const [displayName, setDisplayName] = useState(preferences.displayName)
  const [tagline, setTagline] = useState(preferences.tagline)
  const [budget, setBudget] = useState(String(preferences.budget))
  const [nameError, setNameError] = useState('')
  const [budgetError, setBudgetError] = useState('')
  const dialogRef = useAccessibleModal(onClose)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cleanName = displayName.trim()
    const cleanTagline = tagline.trim()
    const parsedBudget = Number(budget)
    if (!cleanName) { setNameError('Vui lòng nhập tên hiển thị'); return }
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0 || parsedBudget > 1_000_000_000_000) { setBudgetError('Ngân sách phải lớn hơn 0'); return }
    onSave({ displayName: cleanName.slice(0, 60), tagline: (cleanTagline || DEFAULT_PREFERENCES.tagline).slice(0, 100), budget: Math.round(parsedBudget) })
  }

  return <ModalFrame title="Cài đặt" kicker="CÁ NHÂN HÓA" onClose={onClose} dialogRef={dialogRef}><form onSubmit={submit} noValidate><div className="form-field"><label className="required-label" htmlFor="settings-display-name">Tên hiển thị</label><input id="settings-display-name" value={displayName} maxLength={60} onChange={(event) => { setDisplayName(event.target.value); setNameError('') }} aria-required="true" aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'settings-name-error' : undefined} autoFocus />{nameError && <span id="settings-name-error" className="field-error" role="alert">{nameError}</span>}</div><div className="form-field"><label htmlFor="settings-tagline">Dòng giới thiệu</label><input id="settings-tagline" value={tagline} maxLength={100} onChange={(event) => setTagline(event.target.value)} placeholder="Ví dụ: concert lover" /></div><div className="form-field"><label className="required-label" htmlFor="settings-budget">Ngân sách năm</label><div className="money-input"><input id="settings-budget" type="number" min="1" max="1000000000000" step="1000" value={budget} onChange={(event) => { setBudget(event.target.value); setBudgetError('') }} aria-required="true" aria-invalid={Boolean(budgetError)} aria-describedby={budgetError ? 'settings-budget-error' : 'settings-budget-hint'} /><span>VND</span></div><small id="settings-budget-hint" className="field-hint">Ngân sách được dùng để tính số tiền còn lại trên trang tổng quan.</small>{budgetError && <span id="settings-budget-error" className="field-error" role="alert">{budgetError}</span>}</div><ModalActions onClose={onClose} submitLabel="Lưu cài đặt" /></form></ModalFrame>
}

function ModalFrame({ title, kicker, onClose, dialogRef, children }: { title: string; kicker: string; onClose: () => void; dialogRef: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef} tabIndex={-1}><div className="modal-heading"><div><p className="section-kicker">{kicker}</p><h2 id="modal-title">{title}</h2></div><button className="close-button" type="button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></div>{children}</div></div>
}

function ModalActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Hủy</button><button type="submit" className="save-button"><Sparkles size={17} aria-hidden="true" /> {submitLabel}</button></div>
}

function MobileNav({ onOpenSettings }: { onOpenSettings: () => void }) {
  return <nav className="mobile-nav" aria-label="Điều hướng di động"><a className="active" href="#main-content"><Home size={19} /><span>Tổng quan</span></a><a href="#concerts"><Ticket size={19} /><span>Concert</span></a><a href="#expenses"><ReceiptText size={19} /><span>Chi phí</span></a><button type="button" onClick={onOpenSettings}><CircleUserRound size={19} /><span>Cá nhân</span></button></nav>
}

export default App
