// TravelLog ana kabuğu: oturum, veri yükleme ve sayfa geçişlerini yönetir.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Bell, Building2, CalendarDays, Car, CreditCard, LayoutDashboard, Map, Plus, Route, Settings, Table2 } from 'lucide-react';
import { hasFirebaseConfig } from './config/firebase';
import { subscribeToAuth, signInWithGoogle, logout } from './services/authService';
import { createDemoTrips, createTripsBulk, deleteOwnedItem, deleteTrip, listOwnedCollection, listTrips, saveOwnedItem, saveTrip } from './services/tripService';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import TripsPage from './pages/TripsPage';
import TripFormPage from './pages/TripFormPage';
import ReportsPage from './pages/ReportsPage';
import SimpleDirectoryPage from './pages/SimpleDirectoryPage';
import SettingsPage from './pages/SettingsPage';
import MapPage from './pages/MapPage';
import CalendarPage from './pages/Calendar';
import ExpensesPage from './pages/Expenses';
import { DEFAULT_COMPANIES } from './constants/travel';
import { normalizeTrips } from './utils/tripNormalizers';

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
  { id: 'reminders', label: 'Hatırlatmalar', icon: Bell },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [yearFilter, setYearFilter] = useState('');
  const [trips, setTrips] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [editingTrip, setEditingTrip] = useState(null);
  const [detailTrip, setDetailTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(
    () =>
      subscribeToAuth((nextUser) => {
        setUser(nextUser);
      }),
    [],
  );

  useEffect(() => {
    if (!user?.uid) return;
    refreshData(user.uid, { showLoading: true });
  }, [user?.uid]);

  const refreshData = async (userId = user.uid, options = {}) => {
    const { showLoading = false } = options;
    if (showLoading) setLoading(true);
    setLastError('');
    try {
      const [tripRows, companyRows, vehicleRows, locationRows, expenseRows] = await Promise.all([
        listTrips(userId),
        listOwnedCollection('companies', userId),
        listOwnedCollection('vehicles', userId),
        listOwnedCollection('locations', userId),
        listOwnedCollection('expenses', userId),
      ]);
      setTrips(tripRows);
      setCompanies(companyRows.length ? companyRows : []);
      setVehicles(vehicleRows);
      setSavedLocations(locationRows);
      setExpenses(expenseRows);
    } catch (error) {
      const message = error?.message || 'Veriler yüklenirken beklenmeyen bir hata oluştu.';
      console.error('Firestore error', error);
      setLastError(message);
      if (showLoading) {
        setTrips([]);
        setCompanies([]);
        setVehicles([]);
        setSavedLocations([]);
        setExpenses([]);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const companyNames = useMemo(
    () => [...new Set([...DEFAULT_COMPANIES, ...companies.map((company) => company.name)].filter(Boolean))],
    [companies],
  );
  const normalizedTrips = useMemo(() => normalizeTrips(trips), [trips]);
  const availableYears = useMemo(
    () => [...new Set(normalizedTrips.map((trip) => new Date(trip.date).getFullYear()).filter(Boolean))].sort((a, b) => b - a),
    [normalizedTrips],
  );
  const visibleTrips = useMemo(
    () => (yearFilter ? normalizedTrips.filter((trip) => new Date(trip.date).getFullYear() === Number(yearFilter)) : normalizedTrips),
    [normalizedTrips, yearFilter],
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
        companies={companyNames}
        vehicles={vehicles}
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
        description="Araç seyahati maliyetleri için plaka ve araç adlarını yönetin."
        items={vehicles}
        trips={visibleTrips}
        type="vehicles"
        fields={[
          { key: 'plate', label: 'Plaka' },
          { key: 'name', label: 'Araç adı' },
          { key: 'brand', label: 'Marka' },
          { key: 'model', label: 'Model' },
          { key: 'fuelType', label: 'Yakıt türü' },
          { key: 'notes', label: 'Not' },
        ]}
        onSave={(item) => handleSaveDirectoryItem('vehicles', item)}
        onDelete={(item) => requestDeleteDirectoryItem('vehicles', item)}
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
    reminders: <Placeholder title="Hatırlatmalar" description="PNR, bilet ve yolculuk hatırlatmaları için altyapı burada toplanacak." />,
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

  if (!user) {
    return (
      <main className="login-screen">
        <section className="login-panel">
          <Route size={42} />
          <h1>TravelLog</h1>
          <p>Kişisel seyahat arşivinizi filtrelenebilir, grafik destekli ve haritalı bir panele taşıyın.</p>
          <button className="primary-button" onClick={signInWithGoogle}>
            Google ile giriş yap
          </button>
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
      availableYears={availableYears}
      yearFilter={yearFilter}
      onYearFilterChange={setYearFilter}
      vehicles={vehicles}
      companies={companies}
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
      {page}
    </AppShell>
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
