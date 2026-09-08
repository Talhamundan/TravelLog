// TravelLog ana kabuğu: oturum, veri yükleme ve sayfa geçişlerini yönetir.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Building2, CalendarCheck2, CalendarDays, Car, Check, CreditCard, Eye, EyeOff, LayoutDashboard, Lock, Mail, Map, MapPinned, Plus, Route, Settings, Table2, TramFront } from 'lucide-react';
import { hasFirebaseConfig } from './config/firebase';
import { subscribeToAuth, signInWithGoogle, logout } from './services/authService';
import { createDemoTrips, createTripsBulk, deleteOwnedItem, deleteTrip, listOwnedCollection, listTrips, saveOwnedItem, saveTrip } from './services/tripService';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import { normalizeTrips } from './utils/tripNormalizers';

const TripsPage = lazy(() => import('./pages/TripsPage'));
const TripFormPage = lazy(() => import('./pages/TripFormPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SimpleDirectoryPage = lazy(() => import('./pages/SimpleDirectoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const ExpensesPage = lazy(() => import('./pages/Expenses'));
const PlannerPage = lazy(() => import('./pages/PlannerPage'));
const TurkeyMapPage = lazy(() => import('./pages/TurkeyMapPage'));
const IstanbulTransportPage = lazy(() => import('./pages/IstanbulTransportPage'));

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'trips', label: 'Seyahatler', icon: Table2 },
  { id: 'new-trip', label: 'Yeni Seyahat', icon: Plus },
  { id: 'vehicles', label: 'Araçlar', icon: Car },
  { id: 'companies', label: 'Firmalar', icon: Building2 },
  { id: 'reports', label: 'Raporlar', icon: BarChart3 },
  { id: 'map', label: 'Harita', icon: Map },
  { id: 'expenses', label: 'Masraflar', icon: CreditCard },
  { id: 'calendar', label: 'Takvim', icon: CalendarDays },
  { id: 'planner', label: 'Planlayıcı', icon: CalendarCheck2 },
  { id: 'istanbul-transport', label: 'İstanbul Ulaşım', icon: TramFront },
  { id: 'turkey-map', label: 'Türkiye Haritası', icon: MapPinned },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

const currentYear = String(new Date().getFullYear());
const currentMonth = String(new Date().getMonth() + 1);

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!hasFirebaseConfig);
  const [activePage, setActivePage] = useState('dashboard');
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [trips, setTrips] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [turkeyMapEntries, setTurkeyMapEntries] = useState([]);
  const [editingTrip, setEditingTrip] = useState(null);
  const [detailTrip, setDetailTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', remember: true, showPassword: false, loading: false, error: '' });
  const toastTimerRef = useRef(null);

  useEffect(
    () =>
      subscribeToAuth((nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
        if (!nextUser) {
          setTrips([]);
          setCompanies([]);
          setVehicles([]);
          setSavedLocations([]);
          setExpenses([]);
          setTurkeyMapEntries([]);
          setLoading(false);
        }
      }),
    [],
  );

  useEffect(() => {
    if (!user?.uid) return;
    refreshData(user.uid, { showLoading: true });
  }, [user?.uid]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.querySelector('.main-area')?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
      document.querySelector('.content')?.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [activePage]);

  const refreshData = async (userId = user.uid, options = {}) => {
    const { showLoading = false } = options;
    if (showLoading) setLoading(true);
    setLastError('');
    let loadedPrimaryData = false;
    try {
      const tripRows = await listTrips(userId);
      setTrips(tripRows);
      loadedPrimaryData = true;
      if (showLoading) setLoading(false);

      const [companyRows, vehicleRows, locationRows, expenseRows, turkeyMapRows] = await Promise.all([
        listOwnedCollection('companies', userId),
        listOwnedCollection('vehicles', userId),
        listOwnedCollection('locations', userId),
        listOwnedCollection('expenses', userId),
        listOwnedCollection('turkeyMap', userId),
      ]);
      setCompanies(companyRows.length ? companyRows : []);
      setVehicles(vehicleRows);
      setSavedLocations(locationRows);
      setExpenses(expenseRows);
      setTurkeyMapEntries(turkeyMapRows);
    } catch (error) {
      const message = error?.message || 'Veriler yüklenirken beklenmeyen bir hata oluştu.';
      console.error('Firestore error', error);
      setLastError(message);
      if (showLoading) {
        if (!loadedPrimaryData) {
          setTrips([]);
          setCompanies([]);
          setVehicles([]);
          setSavedLocations([]);
          setExpenses([]);
          setTurkeyMapEntries([]);
        }
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const companyNames = useMemo(
    () => [...new Set(companies.map((company) => company.name).filter(Boolean))],
    [companies],
  );
  const normalizedTrips = useMemo(() => normalizeTrips(trips), [trips]);
  const availableYears = useMemo(
    () => [...new Set([Number(currentYear), ...normalizedTrips.map((trip) => new Date(trip.date).getFullYear()).filter(Boolean)])].sort((a, b) => b - a),
    [normalizedTrips],
  );
  const visibleTrips = useMemo(
    () =>
      normalizedTrips.filter((trip) => {
        const date = new Date(trip.date);
        if (Number.isNaN(date.getTime())) return !yearFilter && !monthFilter;
        if (yearFilter && date.getFullYear() !== Number(yearFilter)) return false;
        if (monthFilter && date.getMonth() + 1 !== Number(monthFilter)) return false;
        return true;
      }),
    [monthFilter, normalizedTrips, yearFilter],
  );

  const handleCreateDemoData = async () => {
    setLastError('');
    try {
      await createDemoTrips(user.uid);
      await refreshData(user.uid);
      showToast('Demo veriler oluşturuldu.');
      setActivePage('dashboard');
    } catch (error) {
      const message = error?.message || 'Demo veriler oluşturulamadı.';
      console.error('Firestore error', error);
      setLastError(message);
      showToast(message, 'error');
    }
  };

  const handleSaveTrip = async (trip) => {
    try {
      await saveTrip(trip, user.uid);
      await refreshData();
      showToast('Seyahat kaydedildi.');
      setEditingTrip(null);
      setActivePage('trips');
    } catch (error) {
      const message = error?.message || 'Seyahat kaydedilemedi.';
      console.error('Firestore error', error);
      setLastError(message);
      showToast(message, 'error');
    }
  };

  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setActivePage('new-trip');
  };

  const requestDeleteTrip = (trip) => {
    setConfirmState({
      title: 'Seyahat silinsin mi?',
      message: `${trip.title || 'Bu seyahat'} kalıcı olarak silinecek.`,
      trip,
    });
  };

  const handleDeleteTrip = async () => {
    if (confirmState?.directory) {
      const { collectionName, item } = confirmState.directory;
      await handleDeleteDirectoryItem(collectionName, item);
      setConfirmState(null);
      return;
    }
    const trip = confirmState?.trip;
    if (!trip) return;
    try {
      await deleteTrip(trip.id, user.uid);
      setConfirmState(null);
      setDetailTrip(null);
      await refreshData();
      showToast('Seyahat silindi.');
    } catch (error) {
      const message = error?.message || 'Seyahat silinemedi.';
      console.error('Firestore error', error);
      setLastError(message);
      showToast(message, 'error');
    }
  };

  const handleSaveDirectoryItem = async (collectionName, item) => {
    try {
      await saveOwnedItem(collectionName, item, user.uid);
      await refreshData();
      showToast('Kayıt eklendi.');
    } catch (error) {
      const message = error?.message || 'Kayıt eklenemedi.';
      console.error('Firestore error', error);
      setLastError(message);
      showToast(message, 'error');
    }
  };

  const handleDeleteDirectoryItem = async (collectionName, item) => {
    try {
      await deleteOwnedItem(collectionName, item.id, user.uid);
      await refreshData();
      showToast('Kayıt silindi.');
    } catch (error) {
      const message = error?.message || 'Kayıt silinemedi.';
      console.error('Firestore error', error);
      setLastError(message);
      showToast(message, 'error');
    }
  };

  const requestDeleteDirectoryItem = (collectionName, item) => {
    setConfirmState({
      title: 'Kayıt silinsin mi?',
      message: `${item.name || item.plate || item.description || 'Bu kayıt'} kalıcı olarak silinecek.`,
      directory: { collectionName, item },
    });
  };

  const handleLogin = async () => {
    setLoginForm((current) => ({ ...current, loading: true, error: '' }));
    try {
      await signInWithGoogle();
    } catch (error) {
      setLoginForm((current) => ({
        ...current,
        error: error?.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      }));
    } finally {
      setLoginForm((current) => ({ ...current, loading: false }));
    }
  };

  const handleSaveExpense = async (expense) => {
    try {
      await saveOwnedItem('expenses', expense, user.uid);
      await refreshData();
      showToast('Masraf kaydedildi.');
    } catch (error) {
      const message = error?.message || 'Masraf kaydedilemedi.';
      console.error('Firestore error', error);
      setLastError(message);
      showToast(message, 'error');
    }
  };

  const handleSaveTurkeyProvince = async (province) => {
    try {
      const saved = await saveOwnedItem('turkeyMap', province, user.uid);
      setTurkeyMapEntries((current) => {
        const others = current.filter((item) => item.code !== saved.code && item.id !== saved.id);
        return [...others, saved];
      });
      showToast(`${province.name} güncellendi.`);
    } catch (error) {
      const message = error?.message || 'Türkiye haritası kaydedilemedi.';
      console.error('Firestore error', error);
      setLastError(message);
      showToast(message, 'error');
    }
  };

  const handleImportTrips = async (rows) => {
    try {
      await createTripsBulk(user.uid, rows);
      await refreshData();
      showToast(`${rows.length} seyahat içe aktarıldı.`);
    } catch (error) {
      const message = error?.message || 'Excel import başarısız oldu.';
      console.error('Firestore error', error);
      setLastError(message);
      showToast(message, 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, type, id: Date.now() });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2600);
  };

  const page = {
    dashboard: (
      <Dashboard
        trips={visibleTrips}
        allTrips={normalizedTrips}
        yearFilter={yearFilter}
        monthFilter={monthFilter}
        onOpenTrips={() => setActivePage('trips')}
        onNewTrip={() => setActivePage('new-trip')}
        onSeed={handleCreateDemoData}
        onImportTrips={handleImportTrips}
        onEdit={handleEditTrip}
        onDelete={requestDeleteTrip}
        onDetail={setDetailTrip}
      />
    ),
    trips: (
      <TripsPage
        trips={visibleTrips}
        companies={companyNames}
        onEdit={handleEditTrip}
        onDelete={requestDeleteTrip}
        onDetail={setDetailTrip}
        onNewTrip={() => setActivePage('new-trip')}
        onSeed={handleCreateDemoData}
      />
    ),
    'new-trip': (
      <TripFormPage
        initialTrip={editingTrip}
        companies={companies}
        vehicles={vehicles}
        trips={normalizedTrips}
        savedLocations={savedLocations}
        onCancel={() => {
          setEditingTrip(null);
          setActivePage('trips');
        }}
        onSave={handleSaveTrip}
      />
    ),
    vehicles: (
      <SimpleDirectoryPage
        title="Araçlar"
        description="Araç seyahati maliyetleri için plakaları filo adına göre yönetin."
        items={vehicles}
        trips={visibleTrips}
        type="vehicles"
        fields={[
          { key: 'plate', label: 'Plaka' },
          { key: 'name', label: 'Filo adı' },
          { key: 'brand', label: 'Marka' },
          { key: 'model', label: 'Model' },
          { key: 'fuelType', label: 'Yakıt türü' },
          { key: 'fuelConsumptionPer100Km', label: 'Ort. tüketim / 100 km', type: 'number', step: '0.1' },
          { key: 'fuelUnitPrice', label: 'Birim fiyat', type: 'number', step: '0.01' },
          { key: 'notes', label: 'Not' },
        ]}
        onSave={(item) => handleSaveDirectoryItem('vehicles', item)}
        onDelete={(item) => requestDeleteDirectoryItem('vehicles', item)}
        onDetail={setDetailTrip}
        onNewTrip={() => setActivePage('new-trip')}
        onSeed={handleCreateDemoData}
      />
    ),
    companies: (
      <SimpleDirectoryPage
        title="Firmalar"
        description="Bilet aldığınız veya kullandığınız firmaları hızlı seçim listesine ekleyin."
        items={companies}
        trips={visibleTrips}
        type="companies"
        fields={[
          { key: 'name', label: 'Firma adı' },
          { key: 'category', label: 'Kategori' },
          { key: 'website', label: 'Web sitesi' },
          { key: 'notes', label: 'Not' },
        ]}
        onSave={(item) => handleSaveDirectoryItem('companies', item)}
        onDelete={(item) => requestDeleteDirectoryItem('companies', item)}
        onNewTrip={() => setActivePage('new-trip')}
        onSeed={handleCreateDemoData}
      />
    ),
    reports: <ReportsPage trips={visibleTrips} onNewTrip={() => setActivePage('new-trip')} onSeed={handleCreateDemoData} />,
    map: (
      <MapPage
        trips={visibleTrips}
        companies={companyNames}
        savedLocations={savedLocations}
        onSaveLocation={(item) => handleSaveDirectoryItem('locations', item)}
        onDeleteLocation={(item) => requestDeleteDirectoryItem('locations', item)}
      />
    ),
    expenses: (
      <ExpensesPage
        trips={visibleTrips}
        expenses={expenses}
        vehicles={vehicles}
        loading={loading}
        onNewTrip={() => setActivePage('new-trip')}
        onSeed={handleCreateDemoData}
        onSaveExpense={handleSaveExpense}
        onDeleteExpense={(item) => requestDeleteDirectoryItem('expenses', item)}
        onDetailTrip={setDetailTrip}
      />
    ),
    calendar: (
      <CalendarPage
        trips={visibleTrips}
        loading={loading}
        onNewTrip={() => setActivePage('new-trip')}
        onSeed={handleCreateDemoData}
        onEdit={handleEditTrip}
        onDetail={setDetailTrip}
      />
    ),
    planner: (
      <PlannerPage
        trips={visibleTrips}
        onNewTrip={() => setActivePage('new-trip')}
        onDetail={setDetailTrip}
      />
    ),
    'istanbul-transport': (
      <IstanbulTransportPage
        onSaveRoute={() => showToast('Rota TravelLog seyahatlerine kaydedildi.')}
      />
    ),
    'turkey-map': (
      <TurkeyMapPage
        trips={visibleTrips}
        entries={turkeyMapEntries}
        onSaveProvince={handleSaveTurkeyProvince}
      />
    ),
    settings: (
      <SettingsPage
        hasFirebaseConfig={hasFirebaseConfig}
        user={user}
        tripsCount={trips.length}
        lastError={lastError}
        onSeed={handleCreateDemoData}
      />
    ),
  }[activePage];

  if (!authReady) {
    return <AppBootstrap />;
  }

  if (user && loading && !trips.length) {
    return <AppBootstrap />;
  }

  if (!user) {
    return (
      <main className="login-screen">
        <div className="login-route-glow" aria-hidden="true" />
        <section className="login-hero">
          <span className="login-badge">Travel Analytics Platform</span>
          <div className="login-brand-lockup">
            <span className="brand-mark travel-logo" aria-hidden="true">
              <Route size={30} />
              <i />
            </span>
            <h1>TravelLog</h1>
          </div>
          <p className="login-slogan">Kişisel seyahat geçmişini harita, masraf ve zaman çizelgesiyle tek yerden takip et.</p>
          <p className="login-description">TravelLog; rotalarınızı, ulaşım geçmişinizi, masraflarınızı, firmaları, araçları ve seyahat istatistiklerinizi modern bir panelde bir araya getirir.</p>
          <div className="login-feature-list">
            {['Rota geçmişi', 'Gerçek harita rotaları', 'Seyahat masraf analizi', 'Takvim ve raporlama', 'Araç / firma yönetimi'].map((item) => (
              <span key={item}>
                <Check size={15} />
                {item}
              </span>
            ))}
          </div>
        </section>
        <section className="login-panel">
          <div className="login-card-head">
            <span>Hesabınıza giriş yapın</span>
            <h2>Kontrol paneline dön</h2>
          </div>
          <label className="login-field">
            <span>E-posta</span>
            <div>
              <Mail size={17} />
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="ornek@travellog.app"
                autoComplete="email"
              />
            </div>
          </label>
          <label className="login-field">
            <span>Şifre</span>
            <div>
              <Lock size={17} />
              <input
                type={loginForm.showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setLoginForm((current) => ({ ...current, showPassword: !current.showPassword }))} aria-label={loginForm.showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                {loginForm.showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={loginForm.remember}
                onChange={(event) => setLoginForm((current) => ({ ...current, remember: event.target.checked }))}
              />
              Beni hatırla
            </label>
            <button type="button">Şifremi unuttum</button>
          </div>
          <button className="primary-button login-submit" onClick={handleLogin} disabled={loginForm.loading}>
            {loginForm.loading ? 'Giriş yapılıyor...' : hasFirebaseConfig ? 'Google ile giriş yap' : 'Demo giriş yap'}
          </button>
          {!hasFirebaseConfig && (
            <button className="ghost-button login-demo" onClick={handleLogin} disabled={loginForm.loading}>
              Demo paneli görüntüle
            </button>
          )}
          {!hasFirebaseConfig && <small>Firebase env değerleri girilmediği için demo mod açıktır.</small>}
        </section>
      </main>
    );
  }

  return (
    <AppShell
      navItems={navItems}
      activePage={activePage}
      onNavigate={(pageId) => {
        setEditingTrip(null);
        setActivePage(pageId);
      }}
      user={user}
      trips={visibleTrips}
      allTrips={normalizedTrips}
      availableYears={availableYears}
      yearFilter={yearFilter}
      onYearFilterChange={setYearFilter}
      monthFilter={monthFilter}
      onMonthFilterChange={setMonthFilter}
      vehicles={vehicles}
      companies={companies}
      savedLocations={savedLocations}
      onLogout={logout}
      loading={loading}
      error={lastError}
      detailTrip={detailTrip}
      onCloseDetail={() => setDetailTrip(null)}
      onEditDetail={handleEditTrip}
      onDeleteDetail={requestDeleteTrip}
      toast={toast}
      confirmState={confirmState}
      onConfirm={handleDeleteTrip}
      onCancelConfirm={() => setConfirmState(null)}
    >
      <Suspense fallback={<PageFallback />}>
        {page}
      </Suspense>
    </AppShell>
  );
}

function AppBootstrap() {
  return (
    <main className="app-bootstrap" aria-busy="true">
      <span className="brand-mark travel-logo" aria-hidden="true">
        <Route size={30} />
        <i />
      </span>
      <strong>TravelLog</strong>
      <small>Panel hazırlanıyor...</small>
    </main>
  );
}

function PageFallback() {
  return (
    <div className="skeleton-stack">
      <div className="skeleton-line wide" />
      <div className="skeleton-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="skeleton-card" key={index} />
        ))}
      </div>
      <div className="skeleton-panel" />
    </div>
  );
}

function Placeholder({ title, description }) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <section className="panel empty-state">
        <h2>Yakında</h2>
        <p>Bu modül mevcut verileri bozmadan aşamalı olarak genişletilecek.</p>
      </section>
    </div>
  );
}
