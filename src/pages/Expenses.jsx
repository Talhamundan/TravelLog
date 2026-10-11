import { useEffect, useMemo, useState } from 'react';
import { BedDouble, Bus, Car, Download, Filter, Fuel, Landmark, Plus, ReceiptText, Sparkles, Utensils } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ExpenseCharts from '../components/expenses/ExpenseCharts';
import ExpenseSummaryCards from '../components/expenses/ExpenseSummaryCards';
import ExpenseTable from '../components/expenses/ExpenseTable';
import NewExpenseModal from '../components/expenses/NewExpenseModal';
import {
  buildExpenseAnalytics,
  buildExpenseFilterOptions,
  buildExpensesFromTrips,
  filterExpenses,
  normalizeExpenseDate,
} from '../utils/expenseAnalytics';

const initialFilters = {
  startDate: '',
  endDate: '',
  category: '',
  transportType: '',
  company: '',
  vehicle: '',
  city: '',
  minAmount: '',
  maxAmount: '',
  quick: '',
};

export default function ExpensesPage({
  trips,
  expenses,
  yearFilter = '',
  monthFilter = '',
  vehicles,
  loading,
  dataReady = true,
  onNewTrip,
  onSeed,
  onSaveExpense,
  onDeleteExpense,
  onDetailTrip,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const normalizedExpenses = useMemo(() => buildExpensesFromTrips(trips, expenses), [trips, expenses]);
  const periodExpenses = useMemo(() => filterExpensesByPeriod(normalizedExpenses, yearFilter, monthFilter), [monthFilter, normalizedExpenses, yearFilter]);
  const filteredExpenses = useMemo(() => filterExpenses(periodExpenses, filters), [periodExpenses, filters]);
  const analytics = useMemo(() => buildExpenseAnalytics(filteredExpenses, trips, { yearFilter, monthFilter }), [filteredExpenses, monthFilter, trips, yearFilter]);
  const options = useMemo(() => buildExpenseFilterOptions(periodExpenses), [periodExpenses]);

  const changeFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyExpensePreset = (preset) => setFilters((current) => ({ ...initialFilters, ...preset.filters(current) }));

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      category: current.category && !options.categories.includes(current.category) ? '' : current.category,
      transportType: current.transportType && !options.transports.includes(current.transportType) ? '' : current.transportType,
      company: current.company && !options.companies.includes(current.company) ? '' : current.company,
      vehicle: current.vehicle && !options.vehicles.includes(current.vehicle) ? '' : current.vehicle,
      city: current.city && !options.cities.includes(current.city) ? '' : current.city,
    }));
  }, [options]);

  if ((!dataReady || loading) && !trips.length && !expenses.length) {
    return (
      <div className="page-stack expenses-page">
        <section className="page-heading skeleton-block heading-skeleton" />
        <section className="expense-kpi-grid skeleton-grid"><div /><div /><div /><div /></section>
      </div>
    );
  }

  if (!trips.length && !expenses.length) {
    return (
      <div className="page-stack expenses-page">
        <section className="page-heading">
          <div>
            <h1>Masraflar</h1>
            <p>Seyahat maliyetlerinizi finans panelinde analiz edin.</p>
          </div>
        </section>
        <EmptyState title="Analiz edilecek masraf yok" primaryLabel="Yeni Seyahat" onPrimary={onNewTrip} onSeed={onSeed} />
      </div>
    );
  }

  return (
    <div className="page-stack expenses-page">
      <section className="page-heading expense-heading">
        <div>
          <h1>Masraflar</h1>
          <p>Tüm seyahat masraflarınızı analiz edin ve kategorilere göre yönetin.</p>
        </div>
        <div className="button-row">
          <button className="secondary-button compact" type="button">
            <Download size={17} />
            Dışa Aktar
          </button>
          <button className="primary-button" type="button" onClick={() => setShowModal(true)}>
            <Plus size={17} />
            Yeni Masraf
          </button>
        </div>
      </section>

      <ExpenseSummaryCards kpis={analytics.kpis} />
      <ExpenseCharts analytics={analytics} />

      <section className="expense-intelligence-grid">
        {analytics.intelligence.map((item) => (
          <article className="expense-intelligence-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <section className="expense-filter-panel panel">
        <div className="panel-heading">
          <div>
            <h2>Filtreler</h2>
            <span>Tarih, kategori, ulaşım ve tutar aralığına göre daraltın.</span>
          </div>
          <button className="secondary-button compact" type="button" onClick={() => setShowFilters((value) => !value)}>
            <Filter size={17} />
            {showFilters ? 'Gizle' : 'Göster'}
          </button>
        </div>
        {showFilters && (
          <>
            <div className="expense-preset-row" aria-label="Masraf presetleri">
              {expensePresets.map((preset) => (
                <button type="button" key={preset.id} className={filters.quick === preset.quick || filters.category === preset.category ? 'active' : ''} onClick={() => applyExpensePreset(preset)}>
                  {preset.icon}
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="expense-filter-grid">
              <input type="date" value={filters.startDate} onChange={(event) => changeFilter('startDate', event.target.value)} />
              <input type="date" value={filters.endDate} onChange={(event) => changeFilter('endDate', event.target.value)} />
              <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, quick: '', category: event.target.value }))}>
                <option value="">Tüm kategoriler</option>
                {options.categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={filters.transportType} onChange={(event) => changeFilter('transportType', event.target.value)}>
                <option value="">Tüm ulaşım</option>
                {options.transports.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={filters.company} onChange={(event) => changeFilter('company', event.target.value)}>
                <option value="">Tüm firmalar</option>
                {options.companies.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={filters.vehicle} onChange={(event) => changeFilter('vehicle', event.target.value)}>
                <option value="">Tüm araçlar</option>
                {options.vehicles.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={filters.city} onChange={(event) => changeFilter('city', event.target.value)}>
                <option value="">Tüm şehirler</option>
                {options.cities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input type="number" placeholder="Min tutar" value={filters.minAmount} onChange={(event) => changeFilter('minAmount', event.target.value)} />
              <input type="number" placeholder="Max tutar" value={filters.maxAmount} onChange={(event) => changeFilter('maxAmount', event.target.value)} />
            </div>
          </>
        )}
      </section>

      <ExpenseTable expenses={filteredExpenses} onDeleteExpense={onDeleteExpense} onDetailTrip={onDetailTrip} />

      <section className="finance-insights panel">
        <div className="panel-heading">
          <div>
            <h2>Finans Analizi</h2>
            <span>Otomatik maliyet yorumları</span>
          </div>
          <Sparkles size={20} />
        </div>
        <div className="insight-list">
          {analytics.insights.map((item) => (
            <article key={item.label}>
              <ReceiptText size={18} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <NewExpenseModal open={showModal} trips={trips} onClose={() => setShowModal(false)} onSave={onSaveExpense} />
    </div>
  );
}

const expensePresets = [
  { id: 'fuel', label: 'Yakıt', category: 'Yakıt', icon: <Fuel size={15} />, filters: () => ({ category: 'Yakıt' }) },
  { id: 'ticket', label: 'Bilet', quick: 'ticket', icon: <Bus size={15} />, filters: () => ({ quick: 'ticket' }) },
  { id: 'hotel', label: 'Otel', quick: 'hotel', category: 'Konaklama', icon: <BedDouble size={15} />, filters: () => ({ quick: 'hotel', category: 'Konaklama' }) },
  { id: 'food', label: 'Yemek', category: 'Yemek', icon: <Utensils size={15} />, filters: () => ({ category: 'Yemek' }) },
  { id: 'parking', label: 'Otopark', category: 'Otopark', icon: <Car size={15} />, filters: () => ({ category: 'Otopark' }) },
  { id: 'road', label: 'Köprü/Otoyol', quick: 'road', category: 'Yol/Köprü', icon: <Landmark size={15} />, filters: () => ({ quick: 'road', category: 'Yol/Köprü' }) },
  { id: 'other', label: 'Diğer', category: 'Diğer', icon: <ReceiptText size={15} />, filters: () => ({ category: 'Diğer' }) },
];

function filterExpensesByPeriod(expenses = [], yearFilter = '', monthFilter = '') {
  if (!yearFilter && !monthFilter) return expenses;
  return expenses.filter((expense) => {
    const date = normalizeExpenseDate(expense);
    if (!date) return false;
    if (yearFilter && date.getFullYear() !== Number(yearFilter)) return false;
    if (monthFilter && date.getMonth() + 1 !== Number(monthFilter)) return false;
    return true;
  });
}
