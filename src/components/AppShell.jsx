// Sol menülü admin panel kabuğu ve seyahat detay modalını içerir.
import { Bell, Expand, LogOut, Menu, Moon, Search, X } from 'lucide-react';
import { useState } from 'react';
import TripDetail from './TripDetail';

export default function AppShell({
  navItems,
  activePage,
  onNavigate,
  user,
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

  const navigate = (pageId) => {
    onNavigate(pageId);
    setMobileOpen(false);
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">TL</span>
          <div>
            <strong>TravelLog</strong>
            <small>Seyahat takip paneli</small>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={activePage === item.id ? 'active' : ''} onClick={() => navigate(item.id)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" title="Menü" onClick={() => setMobileOpen((value) => !value)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <label className="topbar-search">
            <Search size={17} />
            <input placeholder="Ara: şehir, firma, PNR, not..." />
          </label>
          <button className="icon-button" title="Bildirimler"><Bell size={18} /></button>
          <button className="icon-button" title="Tema"><Moon size={18} /></button>
          <button className="icon-button" title="Tam ekran"><Expand size={18} /></button>
          <div className="topbar-user">
            <span>{user.displayName || user.email}</span>
            {user.isDemo && <small>Demo mod</small>}
          </div>
          <button className="ghost-button" onClick={onLogout}>
            <LogOut size={17} />
            Çıkış
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
