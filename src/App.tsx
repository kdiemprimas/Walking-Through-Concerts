import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Home,
  MapPin,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Ticket,
  TrainFront,
  Utensils,
  X,
} from 'lucide-react'

type ConcertStatus = 'upcoming' | 'past'
type Filter = 'all' | ConcertStatus

type Concert = {
  id: number
  artist: string
  tour: string
  city: string
  date: string
  venue: string
  status: ConcertStatus
  color: string
  accent: string
  spent: number
}

type Expense = {
  id: number
  name: string
  concert: string
  category: string
  amount: number
  icon: 'ticket' | 'travel' | 'food'
  date: string
}

const concerts: Concert[] = [
  {
    id: 1,
    artist: 'SEVENTEEN',
    tour: 'RIGHT HERE',
    city: 'Bangkok',
    date: '15.02.2026',
    venue: 'Rajamangala Stadium',
    status: 'upcoming',
    color: '#141414',
    accent: '#e95d45',
    spent: 18_500_000,
  },
  {
    id: 2,
    artist: 'DAY6',
    tour: 'FOREVER YOUNG',
    city: 'Hồ Chí Minh',
    date: '09.05.2026',
    venue: 'SECC',
    status: 'upcoming',
    color: '#245d51',
    accent: '#dbef75',
    spent: 12_000_000,
  },
  {
    id: 3,
    artist: 'KANGDANIEL',
    tour: 'FOLLOW AGAIN',
    city: 'Seoul',
    date: '13.10.2025',
    venue: 'KSPO Dome',
    status: 'past',
    color: '#d6b8df',
    accent: '#391642',
    spent: 38_000_000,
  },
]

const initialExpenses: Expense[] = [
  { id: 1, name: 'Vé VIP Soundcheck', concert: 'SEVENTEEN · Bangkok', category: 'Vé concert', amount: 7_850_000, icon: 'ticket', date: 'Hôm qua' },
  { id: 2, name: 'Vé máy bay khứ hồi', concert: 'SEVENTEEN · Bangkok', category: 'Di chuyển', amount: 4_280_000, icon: 'travel', date: '28 Thg 7' },
  { id: 3, name: 'Ăn tối sau concert', concert: 'KANGDANIEL · Seoul', category: 'Ăn uống', amount: 1_120_000, icon: 'food', date: '14 Thg 10' },
]

const formatMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`

function App() {
  const [filter, setFilter] = useState<Filter>('all')
  const [expenses, setExpenses] = useState(initialExpenses)
  const [isModalOpen, setModalOpen] = useState(false)
  const totalSpent = 68_500_000 + expenses.filter((expense) => expense.id > initialExpenses.length).reduce((sum, expense) => sum + expense.amount, 0)
  const visibleConcerts = concerts.filter((concert) => filter === 'all' || concert.status === filter)

  const addExpense = (expense: Omit<Expense, 'id' | 'date' | 'icon'>) => {
    setExpenses((current) => [
      { ...expense, id: Date.now(), date: 'Vừa xong', icon: expense.category === 'Di chuyển' ? 'travel' : expense.category === 'Ăn uống' ? 'food' : 'ticket' },
      ...current,
    ])
    setModalOpen(false)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua đến nội dung chính</a>
      <Sidebar />

      <main id="main-content" className="main-content">
        <Topbar onAdd={() => setModalOpen(true)} />

        <section className="intro-row" aria-labelledby="welcome-title">
          <div>
            <p className="eyebrow"><span /> NHẬT KÝ CONCERT CỦA BẠN</p>
            <h1 id="welcome-title">Xin chào, Diễm! <span aria-hidden="true">✦</span></h1>
            <p className="intro-copy">Mỗi sân khấu là một dấu mốc. Mình đã gom tất cả vào đây.</p>
          </div>
          <div className="year-picker" aria-label="Khoảng thời gian">
            <Clock3 size={16} aria-hidden="true" />
            <span>Năm 2026</span>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
        </section>

        <section className="stats-grid" aria-label="Tổng quan chi tiêu">
          <article className="stat-card stat-dark">
            <div className="stat-top"><span>TỔNG CHI TIÊU</span><ArrowUpRight size={20} aria-hidden="true" /></div>
            <strong>{formatMoney(totalSpent)}</strong>
            <p><span className="trend-up">↑ 12%</span> so với năm ngoái</p>
            <svg className="sparkline" viewBox="0 0 250 48" role="img" aria-label="Chi tiêu có xu hướng tăng">
              <path d="M2 40 C30 37 38 29 62 31 S92 45 116 29 S146 10 169 17 S202 30 248 2" />
              <circle cx="248" cy="2" r="3" />
            </svg>
          </article>

          <article className="stat-card stat-lime">
            <div className="stat-top"><span>CONCERT ĐÃ LÊN KẾ HOẠCH</span><Ticket size={21} aria-hidden="true" /></div>
            <strong>3 concerts</strong>
            <p>2 sắp tới <span aria-hidden="true">·</span> 1 đã đi</p>
            <div className="artist-stamps" aria-label="Nghệ sĩ: Seventeen, Day6, KangDaniel">
              <span>SVT</span><span>D6</span><span>KD</span>
            </div>
          </article>

          <article className="stat-card stat-paper">
            <div className="stat-top"><span>NGÂN SÁCH CÒN LẠI</span><span className="tiny-label">2026</span></div>
            <strong>{formatMoney(21_500_000 - (totalSpent - 68_500_000))}</strong>
            <div className="budget-track"><span style={{ width: `${Math.min(100, totalSpent / 900_000)}%` }} /></div>
            <p>Đã dùng 76% của 90.000.000 ₫</p>
          </article>
        </section>

        <section className="dashboard-grid">
          <div className="concert-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">LỊCH TRÌNH</p>
                <h2>Concert của tôi</h2>
              </div>
              <div className="filter-tabs" aria-label="Lọc concert">
                {([['all', 'Tất cả'], ['upcoming', 'Sắp tới'], ['past', 'Đã đi']] as const).map(([value, label]) => (
                  <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>
                ))}
              </div>
            </div>

            <div className="concert-list" aria-live="polite">
              {visibleConcerts.map((concert) => <ConcertTicket key={concert.id} concert={concert} />)}
            </div>
          </div>

          <aside className="spending-panel" aria-labelledby="spending-title">
            <div className="panel-title-row">
              <div><p className="section-kicker">PHÂN BỔ</p><h2 id="spending-title">Tiền đã đi đâu?</h2></div>
              <button className="icon-button" aria-label="Xem thêm tùy chọn"><MoreHorizontal size={20} /></button>
            </div>
            <div className="donut-wrap">
              <div className="donut" role="img" aria-label="Vé concert 42%, di chuyển 28%, lưu trú 18%, khác 12%">
                <div><strong>68.5M</strong><span>TỔNG</span></div>
              </div>
            </div>
            <ul className="legend-list">
              <li><span className="legend-dot coral" /><span>Vé concert</span><strong>28.8M</strong><small>42%</small></li>
              <li><span className="legend-dot ink" /><span>Di chuyển</span><strong>19.2M</strong><small>28%</small></li>
              <li><span className="legend-dot purple" /><span>Lưu trú</span><strong>12.3M</strong><small>18%</small></li>
              <li><span className="legend-dot lime" /><span>Khác</span><strong>8.2M</strong><small>12%</small></li>
            </ul>
            <button className="report-link">Xem báo cáo chi tiết <ArrowUpRight size={16} aria-hidden="true" /></button>
          </aside>
        </section>

        <section className="recent-section" aria-labelledby="recent-title">
          <div className="section-heading">
            <div><p className="section-kicker">MỚI NHẤT</p><h2 id="recent-title">Chi phí gần đây</h2></div>
            <button className="text-button">Xem tất cả <ArrowUpRight size={16} aria-hidden="true" /></button>
          </div>
          <div className="expense-table">
            {expenses.slice(0, 4).map((expense) => <ExpenseRow key={expense.id} expense={expense} />)}
          </div>
        </section>
      </main>

      <MobileNav />
      {isModalOpen && <ExpenseModal onClose={() => setModalOpen(false)} onAdd={addExpense} />}
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">W/</span><span>WALKING THROUGH<br /><b>CONCERTS</b></span></div>
      <nav aria-label="Điều hướng chính">
        <a className="nav-item active" href="#main-content"><Home size={18} /> Tổng quan</a>
        <a className="nav-item" href="#concerts"><Ticket size={18} /> Concert</a>
        <a className="nav-item" href="#expenses"><ReceiptText size={18} /> Chi phí</a>
        <a className="nav-item" href="#reports"><BarChart3 size={18} /> Báo cáo</a>
      </nav>
      <div className="sidebar-bottom">
        <a className="nav-item" href="#settings"><Settings size={18} /> Cài đặt</a>
        <div className="profile"><div className="avatar">DV</div><div><strong>Diễm Võ</strong><span>concert lover</span></div><button aria-label="Mở hồ sơ"><MoreHorizontal size={18} /></button></div>
      </div>
    </aside>
  )
}

function Topbar({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="topbar">
      <div className="mobile-brand"><span className="brand-mark">W/</span><b>CONCERTS</b></div>
      <label className="search-box" htmlFor="site-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Tìm kiếm</span><input id="site-search" placeholder="Tìm concert, nghệ sĩ..." /><kbd>⌘ K</kbd></label>
      <button className="add-button" onClick={onAdd}><Plus size={18} aria-hidden="true" /> Thêm chi phí</button>
    </header>
  )
}

function ConcertTicket({ concert }: { concert: Concert }) {
  return (
    <article className="concert-ticket" style={{ '--ticket-color': concert.color, '--ticket-accent': concert.accent } as React.CSSProperties}>
      <div className="poster" aria-hidden="true">
        <div className="poster-beam beam-one" /><div className="poster-beam beam-two" />
        <span className="poster-city">{concert.city}</span>
        <strong>{concert.artist}</strong>
        <small>LIVE · {concert.date.slice(-4)}</small>
      </div>
      <div className="ticket-info">
        <div className="ticket-status"><span className={concert.status}>{concert.status === 'upcoming' ? 'SẮP TỚI' : 'ĐÃ ĐI'}</span><button aria-label={`Tùy chọn cho ${concert.artist}`}><MoreHorizontal size={20} /></button></div>
        <p className="artist-name">{concert.artist}</p>
        <h3>{concert.tour}</h3>
        <div className="ticket-meta"><span><CalendarDays size={15} />{concert.date}</span><span><MapPin size={15} />{concert.venue}</span></div>
        <div className="ticket-footer"><span>ĐÃ CHI</span><strong>{formatMoney(concert.spent)}</strong><button aria-label={`Xem ${concert.artist}`}><ArrowUpRight size={18} /></button></div>
      </div>
      <div className="ticket-code" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
    </article>
  )
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const Icon = expense.icon === 'travel' ? TrainFront : expense.icon === 'food' ? Utensils : Ticket
  return (
    <div className="expense-row">
      <div className={`expense-icon ${expense.icon}`}><Icon size={19} aria-hidden="true" /></div>
      <div className="expense-name"><strong>{expense.name}</strong><span>{expense.concert}</span></div>
      <span className="expense-category">{expense.category}</span>
      <span className="expense-date">{expense.date}</span>
      <strong className="expense-amount">− {formatMoney(expense.amount)}</strong>
      <button className="icon-button" aria-label={`Tùy chọn cho ${expense.name}`}><MoreHorizontal size={19} /></button>
    </div>
  )
}

function ExpenseModal({ onClose, onAdd }: { onClose: () => void; onAdd: (expense: Omit<Expense, 'id' | 'date' | 'icon'>) => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('1200000')
  const [category, setCategory] = useState('Vé concert')
  const [concert, setConcert] = useState('SEVENTEEN · Bangkok')
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement
    dialogRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      previousFocus.current?.focus()
    }
  }, [onClose])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Vui lòng nhập tên khoản chi')
      return
    }
    onAdd({ name: name.trim(), amount: Number(amount) || 0, category, concert })
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title" ref={dialogRef} tabIndex={-1}>
        <div className="modal-heading"><div><p className="section-kicker">GHI LẠI KỶ NIỆM</p><h2 id="expense-modal-title">Thêm chi phí mới</h2></div><button className="close-button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></div>
        <form onSubmit={submit} noValidate>
          <div className="form-field"><label htmlFor="expense-name">Tên khoản chi</label><input id="expense-name" value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Ví dụ: Vé VIP, khách sạn..." aria-invalid={Boolean(error)} aria-describedby={error ? 'expense-error' : undefined} autoFocus />{error && <span id="expense-error" className="field-error" role="alert">{error}</span>}</div>
          <div className="form-row">
            <div className="form-field"><label htmlFor="expense-amount">Số tiền</label><div className="money-input"><input id="expense-amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /><span>VND</span></div></div>
            <div className="form-field"><label htmlFor="expense-category">Danh mục</label><select id="expense-category" value={category} onChange={(e) => setCategory(e.target.value)}><option>Vé concert</option><option>Di chuyển</option><option>Lưu trú</option><option>Ăn uống</option><option>Merchandise</option><option>Khác</option></select></div>
          </div>
          <div className="form-field"><label htmlFor="expense-concert">Concert</label><select id="expense-concert" value={concert} onChange={(e) => setConcert(e.target.value)}>{concerts.map((item) => <option key={item.id}>{item.artist} · {item.city}</option>)}</select></div>
          <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Hủy</button><button type="submit" className="save-button"><Sparkles size={17} aria-hidden="true" /> Lưu chi phí</button></div>
        </form>
      </div>
    </div>
  )
}

function MobileNav() {
  return <nav className="mobile-nav" aria-label="Điều hướng di động"><a className="active" href="#main-content"><Home size={19} /><span>Tổng quan</span></a><a href="#concerts"><Ticket size={19} /><span>Concert</span></a><a href="#expenses"><ReceiptText size={19} /><span>Chi phí</span></a><a href="#profile"><CircleUserRound size={19} /><span>Cá nhân</span></a></nav>
}

export default App
