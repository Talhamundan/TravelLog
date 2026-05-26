// Sol menülü admin panel kabuğu ve seyahat detay modalını içerir.
import { Bell, CalendarDays, Expand, Menu, Moon, PlaneTakeoff, Search, Sparkles, Sun, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createStats } from '../utils/analytics';
import { formatCurrency, formatDate, formatKm } from '../utils/formatters';
import { routeLabel } from '../utils/location';
import TripDetail from './TripDetail';

export default function AppShell({
  navItems,
  activePage,
  onNavigate,
  user,
  trips = [],
  availableYears = [],
  yearFilter = '',
  onYearFilterChange,
  vehicles = [],
  companies = [],
  onLogout,
  loading,
  error,
  detailTrip,
  onCloseDetail,
  onEditDetail,
  onDeleteDetail,
  toast,
  confirmState,
  onConfirm,
  onCancelConfirm,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('travellog:theme') || 'dark');
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const sidebarStats = useMemo(() => createStats(trips), [trips]);

  const notifications = useMemo(() => {
    const latestTrip = [...trips].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    return [
      latestTrip && {
        title: 'Son seyahat',
        text: `${routeLabel(latestTrip)} · ${formatDate(latestTrip.date)}`,
      },
      {
        title: 'Veri özeti',
        text: `${trips.length} seyahat, ${vehicles.length} araç, ${companies.length} firma kayıtlı.`,
      },
    ].filter(Boolean);
  }, [trips, vehicles, companies]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('travellog:theme', theme);
  }, [theme]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const navigate = (pageId) => {
    onNavigate(pageId);
    setMobileOpen(false);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark travel-logo" aria-hidden="true">
            <PlaneTakeoff size={28} />
            <i />
          </span>
          <div>
            <strong>TravelLog</strong>
            <small>Seyahat Takip Paneli</small>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={activePage === item.id ? 'active' : ''} onClick={() => navigate(item.id)}>
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === 'map' && <em>YENİ</em>}
              </button>
            );
          })}
        </nav>
        <section className="sidebar-summary-card">
          <strong>Bu yıl özet</strong>
          <span>Toplam km</span>
          <b>{formatKm(sidebarStats.yearKm)}</b>
          <span>Toplam masraf</span>
          <b>{formatCurrency(sidebarStats.yearCost)}</b>
          <span>Seyahat sayısı</span>
          <b>{sidebarStats.totalTrips}</b>
          <button type="button" onClick={() => navigate('reports')}>
            Raporu Görüntüle <span>→</span>
          </button>
        </section>
        <section className="sidebar-user-card">
          <div>
            <span>{getInitials(user.displayName || user.email)}</span>
            <p>
              <strong>{user.displayName || 'TravelLog Kullanıcı'}</strong>
              <small>{user.email}</small>
            </p>
          </div>
          <button type="button" onClick={onLogout}>Çıkış Yap</button>
        </section>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" title="Menü" onClick={() => setMobileOpen((value) => !value)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <label className="topbar-search">
            <Search size={17} />
            <input placeholder="Ara: şehir, firma, PNR, not..." />
            <kbd>⌘K</kbd>
          </label>
          <div className="topbar-popover-wrap">
            {availableYears.length > 0 && (
              <label className="topbar-year-filter">
                <CalendarDays size={16} />
                <select value={yearFilter} onChange={(event) => onYearFilterChange?.(event.target.value)}>
                  <option value="">Tüm yıllar</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            )}
            <button className="icon-button has-badge" title="Bildirimler" onClick={() => setNotificationsOpen((value) => !value)}>
              <Bell size={18} />
              {notifications.length > 0 && <span>{notifications.length}</span>}
            </button>
            {notificationsOpen && (
              <section className="topbar-popover">
                <h3>Bildirimler</h3>
                {notifications.map((item) => (
                  <article key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </article>
                ))}
              </section>
            )}
          </div>
          <button className="icon-button theme-toggle" title="Tema" onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            <Sparkles size={10} />
          </button>
          <button className={`icon-button ${fullscreen ? 'active-icon' : ''}`} title="Tam ekran" onClick={toggleFullscreen}>
            <Expand size={18} />
          </button>
        </header>
        <main className="content">
          {error && (
            <div className="error-banner">
              Veriler yüklenirken bir sorun oluştu. Detay: {error}
            </div>
          )}
          {loading ? <LoadingSkeleton /> : children}
        </main>
      </div>

      {toast && <div className={`app-toast ${toast.type || 'success'}`}>{toast.message}</div>}
      {detailTrip && <TripDetail trip={detailTrip} onClose={onCloseDetail} onEdit={onEditDetail} onDelete={onDeleteDetail} />}
      {confirmState && (
        <div className="modal-backdrop">
          <section className="confirm-modal">
            <h2>{confirmState.title}</h2>
            <p>{confirmState.message}</p>
            <div className="button-row">
              <button className="ghost-button" onClick={onCancelConfirm}>
                Vazgeç
              </button>
              <button className="primary-button danger-bg" onClick={onConfirm}>
                Sil
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function getInitials(value = '') {
  const parts = value.split(/[ @.]+/).filter(Boolean);
  return (parts[0]?.[0] || 'T') + (parts[1]?.[0] || 'L');
}

function LoadingSkeleton() {
  return (
    <div className="skeleton-stack">
      <div className="skeleton-line wide" />
      <div className="skeleton-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <div className="skeleton-card" key={index} />
        ))}
      </div>
      <div className="skeleton-panel" />
    </div>
  );
}
