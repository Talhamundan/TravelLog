// Sol menülü admin panel kabuğu ve seyahat detay modalını içerir.
import { Bell, CalendarDays, Expand, Menu, Moon, PlaneTakeoff, Search, Sparkles, Sun, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createStats } from '../utils/analytics';
import { formatCurrency, formatDate, formatKm, monthName } from '../utils/formatters';
import { getTripRouteTitle } from '../utils/routeDisplay';
import { buildGlobalSearchResults } from '../utils/globalSearch';
import { tripProviderLabel } from '../utils/tripDisplay';
import TripDetail from './TripDetail';

const isMobileSidebarViewport = () => window.matchMedia?.('(max-width: 860px)').matches;

export default function AppShell({
  navItems,
  activePage,
  onNavigate,
  user,
  trips = [],
  allTrips = trips,
  availableYears = [],
  yearFilter = '',
  onYearFilterChange,
  monthFilter = '',
  onMonthFilterChange,
  vehicles = [],
  companies = [],
  savedLocations = [],
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
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (isMobileSidebarViewport()) return false;
    return localStorage.getItem('travellog:sidebarOpen') !== 'false';
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationPopoverRef = useRef(null);
  const [notificationFilter, setNotificationFilter] = useState('Tümü');
  const [readNotifications, setReadNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('travellog:readNotifications') || '[]');
    } catch {
      return [];
    }
  });
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('travellog:recentSearches') || '[]');
    } catch {
      return [];
    }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('travellog:theme') || 'dark');
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const sidebarStats = useMemo(() => createStats(allTrips), [allTrips]);
  const searchGroups = useMemo(
    () => buildGlobalSearchResults({ query: globalQuery, trips, vehicles, companies, locations: savedLocations }),
    [companies, globalQuery, savedLocations, trips, vehicles],
  );

  const notifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = allTrips
      .map((trip) => {
        const date = new Date(trip.date);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((date - today) / 86400000);
        if (daysLeft < 0 || daysLeft > 14) return null;
        const route = getTripRouteTitle(trip);
        return [
          {
            id: `trip-${trip.id}-${trip.date}`,
            category: 'Seyahat',
            title: daysLeft <= 1 ? `${daysLeft === 0 ? 'Bugün' : 'Yarın'} ${route} seyahatin var` : `${route} seyahati yaklaşıyor`,
            text: `${formatDate(trip.date)} · ${trip.departureTime || 'Saat yok'}`,
            time: daysLeft <= 1 ? 'yakın' : `${daysLeft} gün`,
          },
          !trip.company && {
            id: `reservation-${trip.id}`,
            category: 'Rezervasyon',
            title: `${route} rezervasyonu eksik`,
            text: tripProviderLabel(trip),
            time: 'eksik',
          },
          {
            id: `reminder-${trip.id}`,
            category: 'Hatırlatma',
            title: daysLeft <= 1 ? `${route} için son hazırlık zamanı` : `${route} hatırlatması aktif`,
            text: daysLeft <= 7 ? 'Planlayıcı checklist ve rezervasyon durumunu kontrol edin.' : formatDate(trip.date),
            time: daysLeft <= 1 ? 'kritik' : `${daysLeft} gün`,
          },
          {
            id: `checklist-${trip.id}`,
            category: 'Checklist',
            title: `${route} hazırlığını kontrol et`,
            text: 'Checklist ve hatırlatmaları Planlayıcı’da takip edin.',
            time: `${daysLeft} gün`,
          },
        ].filter(Boolean);
      })
      .filter(Boolean)
      .flat();
    if (upcoming.length) return upcoming;
    return [{
      id: allTrips.length ? 'system-no-upcoming' : 'system-summary',
      category: 'Hatırlatma',
      title: allTrips.length ? 'Yaklaşan bildirim yok' : 'Planlayıcı hazır',
      text: allTrips.length
        ? 'Önümüzdeki 14 gün için hatırlatma bulunmuyor.'
        : `${allTrips.length} seyahat, ${vehicles.length} araç, ${companies.length} firma kayıtlı.`,
      time: 'şimdi',
      system: true,
    }];
  }, [allTrips, vehicles, companies]);
  const visibleNotifications = notifications.filter((item) => notificationFilter === 'Tümü' || item.category === notificationFilter);
  const unreadCount = notifications.filter((item) => !item.system && !readNotifications.includes(item.id)).length;
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: monthName(index) })),
    [],
  );

  useEffect(() => {
    localStorage.setItem('travellog:readNotifications', JSON.stringify(readNotifications));
  }, [readNotifications]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!notificationPopoverRef.current?.contains(event.target)) setNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!searchContainerRef.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [searchOpen]);

  useEffect(() => {
    if (isMobileSidebarViewport()) return;
    localStorage.setItem('travellog:sidebarOpen', sidebarOpen ? 'true' : 'false');
  }, [sidebarOpen]);

  useEffect(() => {
    if (isMobileSidebarViewport()) setSidebarOpen(false);
  }, [activePage]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('travellog:theme', theme);
  }, [theme]);

  useEffect(() => {
    const syncFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => document.querySelector('.topbar-search input')?.focus());
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigate = (pageId) => {
    onNavigate(pageId);
    if (isMobileSidebarViewport()) setSidebarOpen(false);
  };

  const selectSearchResult = (result) => {
    if (globalQuery.trim()) {
      const next = [globalQuery.trim(), ...recentSearches.filter((item) => item !== globalQuery.trim())].slice(0, 5);
      setRecentSearches(next);
      localStorage.setItem('travellog:recentSearches', JSON.stringify(next));
    }
    setSearchOpen(false);
    setGlobalQuery('');
    navigate(result.page);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
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
          <b>{sidebarStats.yearTrips}</b>
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
          <button className="icon-button mobile-only" title={sidebarOpen ? 'Menüyü kapat' : 'Menüyü aç'} onClick={() => setSidebarOpen((value) => !value)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div
            className="topbar-search"
            ref={searchContainerRef}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
            }}
          >
            <Search size={17} />
            <input
              value={globalQuery}
              onChange={(event) => {
                setGlobalQuery(event.target.value);
                setSearchOpen(Boolean(event.target.value.trim()));
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Ara: şehir, firma, PNR, not..."
            />
            <kbd>⌘K</kbd>
            {searchOpen && (
              <section className="global-search-popover">
                {globalQuery.trim() && searchGroups.length ? (
                  searchGroups.map((group) => (
                    <div key={group.category}>
                      <strong>{group.category}</strong>
                      {group.items.map((item) => (
                        <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchResult(item)}>
                          <span>{item.title}</span>
                          {item.subtitle && <small>{item.subtitle}</small>}
                        </button>
                      ))}
                    </div>
                  ))
                ) : globalQuery.trim() ? (
                  <p>Sonuç bulunamadı.</p>
                ) : recentSearches.length ? (
                  <div>
                    <strong>Son aramalar</strong>
                    {recentSearches.map((item) => (
                      <button type="button" key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => { setGlobalQuery(item); setSearchOpen(true); }}>
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>Plaka, PNR, rota, firma veya konum arayın.</p>
                )}
              </section>
            )}
          </div>
          <div className="topbar-actions">
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
            <label className="topbar-year-filter">
              <CalendarDays size={16} />
              <select value={monthFilter} onChange={(event) => onMonthFilterChange?.(event.target.value)}>
                <option value="">Tüm aylar</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </label>
            <div className="topbar-popover-wrap" ref={notificationPopoverRef}>
              <button className="icon-button has-badge" title="Bildirimler" onClick={() => setNotificationsOpen((value) => !value)}>
                <Bell size={18} />
                {unreadCount > 0 && <span>{unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <section className="topbar-popover notification-center">
                  <div className="notification-head">
                    <h3>Bildirimler</h3>
                    <button type="button" onClick={() => { setNotificationsOpen(false); navigate('planner'); }}>Tümünü Gör</button>
                  </div>
                  <div className="notification-filters">
                    {['Tümü', 'Seyahat', 'Hatırlatma', 'Checklist', 'Rezervasyon'].map((category) => (
                      <button key={category} type="button" className={notificationFilter === category ? 'active' : ''} onClick={() => setNotificationFilter(category)}>
                        {category}
                      </button>
                    ))}
                  </div>
                  {visibleNotifications.map((item) => (
                    <article key={item.id} className={readNotifications.includes(item.id) ? 'read' : ''} onClick={() => setReadNotifications((current) => [...new Set([...current, item.id])])}>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                      </div>
                      <small>{item.time}</small>
                    </article>
                  ))}
                  {!visibleNotifications.length && (
                    <article className="read">
                      <div>
                        <strong>Bu filtrede bildirim yok</strong>
                        <p>Başka bir bildirim türü seçin veya planlayıcıdan yeni seyahat ekleyin.</p>
                      </div>
                      <small>-</small>
                    </article>
                  )}
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
          </div>
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
