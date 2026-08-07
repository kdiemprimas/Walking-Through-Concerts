import { FormEvent, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Heart,
  Home,
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
type Category = 'Vé concert' | 'Di chuyển' | 'Lưu trú' | 'Ăn uống' | 'Merchandise' | 'Chuẩn bị' | 'Khác'

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
}

type Expense = {
  id: string
  name: string
  concertId: string
  category: Category
  amount: number
  date: string
}

type AppData = { concerts: Concert[]; expenses: Expense[] }
type ModalState = { type: 'expense'; item?: Expense; concertId?: string } | { type: 'concert'; item?: Concert } | null

const STORAGE_KEY = 'walking-through-concerts-data-v2'
const BUDGET = 90_000_000
const categories: Category[] = ['Vé concert', 'Di chuyển', 'Lưu trú', 'Ăn uống', 'Merchandise', 'Chuẩn bị', 'Khác']
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
    { id: 'expense-1', name: 'Vé VIP Soundcheck', concertId: 'concert-1', category: 'Vé concert', amount: 7_850_000, date: '2026-08-06' },
    { id: 'expense-2', name: 'Vé máy bay khứ hồi', concertId: 'concert-1', category: 'Di chuyển', amount: 4_280_000, date: '2026-07-28' },
    { id: 'expense-3', name: 'Ăn tối sau concert', concertId: 'concert-3', category: 'Ăn uống', amount: 1_120_000, date: '2025-10-14' },
    { id: 'expense-4', name: 'Vé CAT 1', concertId: 'concert-2', category: 'Vé concert', amount: 4_500_000, date: '2026-06-01' },
    { id: 'expense-5', name: 'Vé concert Seoul', concertId: 'concert-3', category: 'Vé concert', amount: 16_450_000, date: '2025-07-10' },
    { id: 'expense-6', name: 'Chuyến bay Seoul', concertId: 'concert-3', category: 'Di chuyển', amount: 12_000_000, date: '2025-08-20' },
    { id: 'expense-7', name: 'Di chuyển nội thành', concertId: 'concert-2', category: 'Di chuyển', amount: 2_920_000, date: '2026-05-08' },
    { id: 'expense-8', name: 'Khách sạn Bangkok', concertId: 'concert-1', category: 'Lưu trú', amount: 3_300_000, date: '2026-01-18' },
    { id: 'expense-9', name: 'Khách sạn Seoul', concertId: 'concert-3', category: 'Lưu trú', amount: 9_000_000, date: '2025-08-22' },
    { id: 'expense-10', name: 'Merchandise', concertId: 'concert-3', category: 'Merchandise', amount: 5_080_000, date: '2025-10-13' },
    { id: 'expense-11', name: 'Trang phục concert', concertId: 'concert-2', category: 'Chuẩn bị', amount: 2_000_000, date: '2026-04-20' },
  ],
}

const cloneInitialData = (): AppData => JSON.parse(JSON.stringify(initialData)) as AppData

const loadData = (): AppData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as AppData : cloneInitialData()
  } catch {
    return cloneInitialData()
  }
}

const formatMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
const formatCompact = (value: number) => `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`
const formatDate = (value: string) => value.split('-').reverse().join('.')
const formatExpenseDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`))

function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [expandedConcertId, setExpandedConcertId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const closeModal = useCallback(() => setModal(null), [])
  const totalSpent = useMemo(() => data.expenses.reduce((sum, expense) => sum + expense.amount, 0), [data.expenses])
  const concertSpend = useMemo(() => Object.fromEntries(data.concerts.map((concert) => [concert.id, data.expenses.filter((expense) => expense.concertId === concert.id).reduce((sum, expense) => sum + expense.amount, 0)])), [data])
  const breakdown = useMemo(() => {
    const getTotal = (matching: Category[]) => data.expenses.filter((expense) => matching.includes(expense.category)).reduce((sum, expense) => sum + expense.amount, 0)
    return [
      { label: 'Vé concert', amount: getTotal(['Vé concert']), className: 'coral' },
      { label: 'Di chuyển', amount: getTotal(['Di chuyển']), className: 'rose' },
      { label: 'Lưu trú', amount: getTotal(['Lưu trú']), className: 'apricot' },
      { label: 'Khác', amount: getTotal(['Ăn uống', 'Merchandise', 'Chuẩn bị', 'Khác']), className: 'berry' },
    ]
  }, [data.expenses])

  const visibleConcerts = data.concerts.filter((concert) => {
    const matchesFilter = filter === 'all' || concert.status === filter
    const normalizedQuery = query.trim().toLocaleLowerCase('vi')
    const matchesQuery = !normalizedQuery || `${concert.artist} ${concert.tour} ${concert.city}`.toLocaleLowerCase('vi').includes(normalizedQuery)
    return matchesFilter && matchesQuery
  })

  const saveExpense = (expense: Expense) => {
    const exists = data.expenses.some((item) => item.id === expense.id)
    setData((current) => ({ ...current, expenses: exists ? current.expenses.map((item) => item.id === expense.id ? expense : item) : [expense, ...current.expenses] }))
    setAnnouncement(exists ? 'Đã cập nhật khoản chi' : 'Đã thêm khoản chi mới')
    closeModal()
  }

  const saveConcert = (concert: Concert) => {
    const exists = data.concerts.some((item) => item.id === concert.id)
    setData((current) => ({ ...current, concerts: exists ? current.concerts.map((item) => item.id === concert.id ? concert : item) : [...current.concerts, concert] }))
    setAnnouncement(exists ? 'Đã cập nhật concert' : 'Đã thêm concert mới')
    closeModal()
  }

  const deleteExpense = (expense: Expense) => {
    if (!window.confirm(`Xóa khoản chi “${expense.name}”?`)) return
    setData((current) => ({ ...current, expenses: current.expenses.filter((item) => item.id !== expense.id) }))
    setAnnouncement('Đã xóa khoản chi')
  }

  const deleteConcert = (concert: Concert) => {
    if (!window.confirm(`Xóa concert “${concert.artist}” và toàn bộ chi phí liên quan?`)) return
    setData((current) => ({ concerts: current.concerts.filter((item) => item.id !== concert.id), expenses: current.expenses.filter((expense) => expense.concertId !== concert.id) }))
    setExpandedConcertId((current) => current === concert.id ? null : current)
    setAnnouncement('Đã xóa concert')
  }

  const upcomingCount = data.concerts.filter((concert) => concert.status === 'upcoming').length
  const pastCount = data.concerts.length - upcomingCount
  const remaining = BUDGET - totalSpent
  const donutStops = useMemo(() => {
    const percentages = breakdown.map((item) => totalSpent ? item.amount / totalSpent * 100 : 0)
    const a = percentages[0]
    const b = a + percentages[1]
    const c = b + percentages[2]
    return `conic-gradient(var(--coral) 0 ${a}%, var(--rose) ${a}% ${b}%, var(--apricot) ${b}% ${c}%, var(--berry) ${c}% 100%)`
  }, [breakdown, totalSpent])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <Sidebar />

      <main id="main-content" className="main-content">
        <Topbar query={query} onQueryChange={setQuery} onAddExpense={() => setModal({ type: 'expense' })} onAddConcert={() => setModal({ type: 'concert' })} />

        <section className="intro-row" aria-labelledby="welcome-title">
          <div>
            <p className="eyebrow"><span /> NHẬT KÝ CONCERT CỦA BẠN</p>
            <h1 id="welcome-title">Xin chào, Diễm! <Heart size={25} fill="currentColor" aria-hidden="true" /></h1>
            <p className="intro-copy">Mỗi sân khấu là một dấu mốc. Mình đã gom tất cả vào đây.</p>
          </div>
          <div className="year-picker" aria-label="Khoảng thời gian"><Clock3 size={16} aria-hidden="true" /><span>Năm 2026</span><ChevronDown size={15} aria-hidden="true" /></div>
        </section>

        <section className="stats-grid" aria-label="Tổng quan chi tiêu">
          <article className="stat-card stat-coral">
            <div className="stat-top"><span>TỔNG CHI TIÊU</span><WalletCards size={20} aria-hidden="true" /></div>
            <strong>{formatMoney(totalSpent)}</strong>
            <p><span className="trend-up">Dữ liệu của bạn</span> · tự động cập nhật</p>
            <svg className="sparkline" viewBox="0 0 250 48" role="img" aria-label="Chi tiêu có xu hướng tăng"><path d="M2 40 C30 37 38 29 62 31 S92 45 116 29 S146 10 169 17 S202 30 248 2" /><circle cx="248" cy="2" r="3" /></svg>
          </article>

          <article className="stat-card stat-pink">
            <div className="stat-top"><span>CONCERT ĐÃ LÊN KẾ HOẠCH</span><Ticket size={21} aria-hidden="true" /></div>
            <strong>{data.concerts.length} concerts</strong>
            <p>{upcomingCount} sắp tới <span aria-hidden="true">·</span> {pastCount} đã đi</p>
            <div className="artist-stamps" aria-label={`Nghệ sĩ: ${data.concerts.map((concert) => concert.artist).join(', ')}`}>
              {data.concerts.slice(0, 3).map((concert) => <span key={concert.id}>{concert.artist.slice(0, 2)}</span>)}
            </div>
          </article>

          <article className="stat-card stat-cream">
            <div className="stat-top"><span>NGÂN SÁCH CÒN LẠI</span><span className="tiny-label">2026</span></div>
            <strong>{formatMoney(remaining)}</strong>
            <div className="budget-track"><span style={{ width: `${Math.min(100, totalSpent / BUDGET * 100)}%` }} /></div>
            <p>Đã dùng {Math.round(totalSpent / BUDGET * 100)}% của {formatMoney(BUDGET)}</p>
          </article>
        </section>

        <section className="dashboard-grid" id="concerts">
          <div className="concert-section">
            <div className="section-heading">
              <div><p className="section-kicker">LỊCH TRÌNH</p><h2>Concert của tôi</h2></div>
              <div className="filter-tabs" aria-label="Lọc concert">
                {([['all', 'Tất cả'], ['upcoming', 'Sắp tới'], ['past', 'Đã đi']] as const).map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>)}
              </div>
            </div>
            <div className="concert-list" aria-live="polite">
              {visibleConcerts.map((concert) => {
                const concertExpenses = data.expenses.filter((expense) => expense.concertId === concert.id)
                return <ConcertTicket
                  key={concert.id}
                  concert={concert}
                  expenses={concertExpenses}
                  spent={concertSpend[concert.id] ?? 0}
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
            <div className="donut-wrap"><div className="donut" style={{ background: donutStops }} role="img" aria-label={breakdown.map((item) => `${item.label} ${Math.round(item.amount / (totalSpent || 1) * 100)}%`).join(', ')}><div><strong>{formatCompact(totalSpent)}</strong><span>TỔNG</span></div></div></div>
            <ul className="legend-list">
              {breakdown.map((item) => <li key={item.label}><span className={`legend-dot ${item.className}`} /><span>{item.label}</span><strong>{formatCompact(item.amount)}</strong><small>{Math.round(item.amount / (totalSpent || 1) * 100)}%</small></li>)}
            </ul>
            <button className="report-link">Xem báo cáo chi tiết <ArrowUpRight size={16} aria-hidden="true" /></button>
          </aside>
        </section>

        <section className="recent-section" id="expenses" aria-labelledby="recent-title">
          <div className="section-heading"><div><p className="section-kicker">MỚI NHẤT</p><h2 id="recent-title">Chi phí gần đây</h2></div><button className="text-button" onClick={() => setModal({ type: 'expense' })}><Plus size={15} /> Thêm khoản chi</button></div>
          <div className="expense-table">
            {data.expenses.slice(0, 6).map((expense) => <ExpenseRow key={expense.id} expense={expense} concert={data.concerts.find((concert) => concert.id === expense.concertId)} onEdit={() => setModal({ type: 'expense', item: expense })} onDelete={() => deleteExpense(expense)} />)}
          </div>
        </section>
      </main>

      <MobileNav />
      {modal?.type === 'expense' && <ExpenseModal key={modal.item?.id ?? `new-expense-${modal.concertId ?? 'general'}`} item={modal.item} initialConcertId={modal.concertId} concerts={data.concerts} onClose={closeModal} onSave={saveExpense} />}
      {modal?.type === 'concert' && <ConcertModal key={modal.item?.id ?? 'new-concert'} item={modal.item} onClose={closeModal} onSave={saveConcert} />}
      <div className={`toast ${announcement ? 'show' : ''}`} role="status" aria-live="polite"><Heart size={16} fill="currentColor" />{announcement}</div>
    </div>
  )
}

function Sidebar() {
  return <aside className="sidebar"><div className="brand"><span className="brand-mark">W/</span><span>WALKING THROUGH<br /><b>CONCERTS</b></span></div><nav aria-label="Điều hướng chính"><a className="nav-item active" href="#main-content"><Home size={18} /> Tổng quan</a><a className="nav-item" href="#concerts"><Ticket size={18} /> Concert</a><a className="nav-item" href="#expenses"><ReceiptText size={18} /> Chi phí</a><a className="nav-item" href="#reports"><BarChart3 size={18} /> Báo cáo</a></nav><div className="sidebar-note"><Heart size={17} fill="currentColor" /><span>Lưu từng khoảnh khắc,<br />nhớ từng sân khấu.</span></div><div className="sidebar-bottom"><a className="nav-item" href="#settings"><Settings size={18} /> Cài đặt</a><div className="profile"><div className="avatar">DV</div><div><strong>Diễm Võ</strong><span>concert lover</span></div></div></div></aside>
}

function Topbar({ query, onQueryChange, onAddExpense, onAddConcert }: { query: string; onQueryChange: (value: string) => void; onAddExpense: () => void; onAddConcert: () => void }) {
  return <header className="topbar"><div className="mobile-brand"><span className="brand-mark">W/</span><b>CONCERTS</b></div><label className="search-box" htmlFor="site-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Tìm kiếm</span><input id="site-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Tìm concert, nghệ sĩ..." /><kbd>⌘ K</kbd></label><div className="topbar-actions"><button className="secondary-button" onClick={onAddConcert}><Ticket size={17} aria-hidden="true" /> Thêm concert</button><button className="add-button" onClick={onAddExpense}><Plus size={17} aria-hidden="true" /> Thêm chi phí</button></div></header>
}

function ConcertTicket({ concert, expenses, spent, isExpanded, onToggle, onAddExpense, onEdit, onDelete, onEditExpense, onDeleteExpense }: { concert: Concert; expenses: Expense[]; spent: number; isExpanded: boolean; onToggle: () => void; onAddExpense: () => void; onEdit: () => void; onDelete: () => void; onEditExpense: (expense: Expense) => void; onDeleteExpense: (expense: Expense) => void }) {
  const detailsId = `concert-expenses-${concert.id}`
  const titleId = `${detailsId}-title`
  return <div className={`concert-entry ${isExpanded ? 'is-open' : ''}`}>
    <article className="concert-ticket" style={{ '--ticket-color': concert.color, '--ticket-accent': concert.accent } as CSSProperties}>
      <button type="button" className="concert-ticket-toggle" aria-label={`${isExpanded ? 'Ẩn' : 'Xem'} chi phí ${concert.artist}`} aria-expanded={isExpanded} aria-controls={detailsId} onClick={onToggle}>
        <div className="poster" aria-hidden="true"><span className="tape" /><div className="poster-orbit" /><span className="poster-city">{concert.city}</span><strong>{concert.artist}</strong><small>LIVE · {concert.date.slice(0, 4)}</small></div>
        <div className="ticket-info"><div className="ticket-status"><span className={concert.status}>{concert.status === 'upcoming' ? 'SẮP TỚI' : 'ĐÃ ĐI'}</span></div><p className="artist-name">{concert.artist}</p><h3>{concert.tour}</h3><div className="ticket-meta"><span><CalendarDays size={15} />{formatDate(concert.date)}</span><span><MapPin size={15} />{concert.venue}</span></div><div className="ticket-footer"><span>ĐÃ CHI</span><strong>{formatMoney(spent)}</strong><span className="ticket-details-hint">{isExpanded ? 'Ẩn chi phí' : 'Xem chi phí'} <ChevronDown size={15} aria-hidden="true" /></span></div></div>
      </button>
      <div className="row-actions ticket-actions"><button aria-label={`Chỉnh sửa ${concert.artist}`} onClick={onEdit}><Pencil size={16} /></button><button aria-label={`Xóa ${concert.artist}`} onClick={onDelete}><Trash2 size={16} /></button></div>
      <div className="ticket-code" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <span key={index} />)}</div>
    </article>
    {isExpanded && <section id={detailsId} className="concert-expenses-panel" role="region" aria-labelledby={titleId}>
      <div className="concert-expenses-header">
        <div><p className="section-kicker">CHI TIẾT CHI TIÊU</p><h3 id={titleId}>Chi phí của {concert.artist}</h3><span>{expenses.length} khoản chi · {concert.city}</span></div>
        <div className="concert-expenses-summary"><strong>{formatMoney(spent)}</strong><button type="button" className="text-button" aria-label={`Thêm chi phí cho ${concert.artist}`} onClick={onAddExpense}><Plus size={15} aria-hidden="true" /> Thêm chi phí</button></div>
      </div>
      {expenses.length ? <div className="expense-table concert-expense-table">
        {expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} concert={concert} onEdit={() => onEditExpense(expense)} onDelete={() => onDeleteExpense(expense)} />)}
      </div> : <div className="concert-expenses-empty"><ReceiptText size={20} aria-hidden="true" /><span>Chưa có khoản chi nào cho concert này.</span></div>}
    </section>}
  </div>
}

function ExpenseRow({ expense, concert, onEdit, onDelete }: { expense: Expense; concert?: Concert; onEdit: () => void; onDelete: () => void }) {
  const Icon = expense.category === 'Di chuyển' ? TrainFront : expense.category === 'Ăn uống' ? Utensils : Ticket
  const iconClass = expense.category === 'Di chuyển' ? 'travel' : expense.category === 'Ăn uống' ? 'food' : 'ticket'
  return <div className="expense-row"><div className={`expense-icon ${iconClass}`}><Icon size={19} aria-hidden="true" /></div><div className="expense-name"><strong>{expense.name}</strong><span>{concert ? `${concert.artist} · ${concert.city}` : 'Không gắn concert'}</span></div><span className="expense-category">{expense.category}</span><span className="expense-date">{formatExpenseDate(expense.date)}</span><strong className="expense-amount">− {formatMoney(expense.amount)}</strong><div className="row-actions"><button aria-label={`Chỉnh sửa ${expense.name}`} onClick={onEdit}><Pencil size={15} /></button><button aria-label={`Xóa ${expense.name}`} onClick={onDelete}><Trash2 size={15} /></button></div></div>
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
  const [amount, setAmount] = useState(String(item?.amount ?? 1_200_000))
  const [category, setCategory] = useState<Category>(item?.category ?? 'Vé concert')
  const [concertId, setConcertId] = useState(item?.concertId ?? initialConcertId ?? concerts[0]?.id ?? '')
  const [date, setDate] = useState(item?.date ?? new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')
  const dialogRef = useAccessibleModal(onClose)
  const isEditing = Boolean(item)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) { setError('Vui lòng nhập tên khoản chi'); return }
    onSave({ id: item?.id ?? `expense-${Date.now()}`, name: name.trim(), amount: Number(amount) || 0, category, concertId, date })
  }

  return <ModalFrame title={isEditing ? 'Chỉnh sửa chi phí' : 'Thêm chi phí mới'} kicker="GHI LẠI KỶ NIỆM" onClose={onClose} dialogRef={dialogRef}><form onSubmit={submit} noValidate><div className="form-field"><label className="required-label" htmlFor="expense-name">Tên khoản chi</label><input id="expense-name" value={name} onChange={(event) => { setName(event.target.value); setError('') }} placeholder="Ví dụ: Vé VIP, khách sạn..." aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'expense-error' : undefined} autoFocus />{error && <span id="expense-error" className="field-error" role="alert">{error}</span>}</div><div className="form-row"><div className="form-field"><label htmlFor="expense-amount">Số tiền</label><div className="money-input"><input id="expense-amount" type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /><span>VND</span></div></div><div className="form-field"><label htmlFor="expense-category">Danh mục</label><select id="expense-category" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></div></div><div className="form-row"><div className="form-field"><label htmlFor="expense-concert">Concert</label><select id="expense-concert" value={concertId} onChange={(event) => setConcertId(event.target.value)}>{concerts.map((concert) => <option key={concert.id} value={concert.id}>{concert.artist} · {concert.city}</option>)}</select></div><div className="form-field"><label htmlFor="expense-date">Ngày thanh toán</label><input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></div><ModalActions onClose={onClose} submitLabel={isEditing ? 'Lưu thay đổi' : 'Lưu chi phí'} /></form></ModalFrame>
}

function ConcertModal({ item, onClose, onSave }: { item?: Concert; onClose: () => void; onSave: (concert: Concert) => void }) {
  const [artist, setArtist] = useState(item?.artist ?? '')
  const [tour, setTour] = useState(item?.tour ?? '')
  const [city, setCity] = useState(item?.city ?? '')
  const [venue, setVenue] = useState(item?.venue ?? '')
  const [date, setDate] = useState(item?.date ?? '2026-12-20')
  const [status, setStatus] = useState<ConcertStatus>(item?.status ?? 'upcoming')
  const [error, setError] = useState('')
  const dialogRef = useAccessibleModal(onClose)
  const isEditing = Boolean(item)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!artist.trim()) { setError('Vui lòng nhập tên nghệ sĩ'); return }
    const pair = item ? [item.color, item.accent] : pastelPairs[Math.floor(Math.random() * pastelPairs.length)]
    onSave({ id: item?.id ?? `concert-${Date.now()}`, artist: artist.trim(), tour: tour.trim() || 'LIVE IN CONCERT', city: city.trim() || 'Chưa xác định', venue: venue.trim() || 'Chưa xác định', date, status, color: pair[0], accent: pair[1] })
  }

  return <ModalFrame title={isEditing ? 'Chỉnh sửa concert' : 'Thêm concert mới'} kicker="LỊCH TRÌNH MỚI" onClose={onClose} dialogRef={dialogRef}><form onSubmit={submit} noValidate><div className="form-row"><div className="form-field"><label className="required-label" htmlFor="concert-artist">Nghệ sĩ</label><input id="concert-artist" value={artist} onChange={(event) => { setArtist(event.target.value); setError('') }} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'concert-error' : undefined} autoFocus />{error && <span id="concert-error" className="field-error" role="alert">{error}</span>}</div><div className="form-field"><label htmlFor="concert-tour">Tên tour</label><input id="concert-tour" value={tour} onChange={(event) => setTour(event.target.value)} /></div></div><div className="form-row"><div className="form-field"><label htmlFor="concert-city">Thành phố</label><input id="concert-city" value={city} onChange={(event) => setCity(event.target.value)} /></div><div className="form-field"><label htmlFor="concert-venue">Địa điểm</label><input id="concert-venue" value={venue} onChange={(event) => setVenue(event.target.value)} /></div></div><div className="form-row"><div className="form-field"><label htmlFor="concert-date">Ngày diễn</label><input id="concert-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="form-field"><label htmlFor="concert-status">Trạng thái</label><select id="concert-status" value={status} onChange={(event) => setStatus(event.target.value as ConcertStatus)}><option value="upcoming">Sắp tới</option><option value="past">Đã đi</option></select></div></div><ModalActions onClose={onClose} submitLabel={isEditing ? 'Lưu thay đổi' : 'Lưu concert'} /></form></ModalFrame>
}

function ModalFrame({ title, kicker, onClose, dialogRef, children }: { title: string; kicker: string; onClose: () => void; dialogRef: React.RefObject<HTMLDivElement | null>; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef} tabIndex={-1}><div className="modal-heading"><div><p className="section-kicker">{kicker}</p><h2 id="modal-title">{title}</h2></div><button className="close-button" type="button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></div>{children}</div></div>
}

function ModalActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Hủy</button><button type="submit" className="save-button"><Sparkles size={17} aria-hidden="true" /> {submitLabel}</button></div>
}

function MobileNav() {
  return <nav className="mobile-nav" aria-label="Điều hướng di động"><a className="active" href="#main-content"><Home size={19} /><span>Tổng quan</span></a><a href="#concerts"><Ticket size={19} /><span>Concert</span></a><a href="#expenses"><ReceiptText size={19} /><span>Chi phí</span></a><a href="#profile"><CircleUserRound size={19} /><span>Cá nhân</span></a></nav>
}

export default App
