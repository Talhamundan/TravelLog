import { useMemo, useState } from 'react';
import { Download, Filter, Plus, ReceiptText, Sparkles } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ExpenseCharts from '../components/expenses/ExpenseCharts';
import ExpenseSummaryCards from '../components/expenses/ExpenseSummaryCards';
import ExpenseTable from '../components/expenses/ExpenseTable';
import NewExpenseModal from '../components/expenses/NewExpenseModal';
import {
  buildExpenseAnalytics,
  buildExpenseFilterOptions,
  buildExpensesFromTrips,
  expenseCategories,
  filterExpenses,
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
};

export default function ExpensesPage({
  trips,
  expenses,
  vehicles,
  loading,
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
  const filteredExpenses = useMemo(() => filterExpenses(normalizedExpenses, filters), [normalizedExpenses, filters]);
  const analytics = useMemo(() => buildExpenseAnalytics(filteredExpenses, trips), [filteredExpenses, trips]);
  const options = useMemo(() => buildExpenseFilterOptions(normalizedExpenses, trips, vehicles), [normalizedExpenses, trips, vehicles]);

  const changeFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  if (loading && !trips.length) {
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
          <div className="expense-filter-grid">
            <input type="date" value={filters.startDate} onChange={(event) => changeFilter('startDate', event.target.value)} />
            <input type="date" value={filters.endDate} onChange={(event) => changeFilter('endDate', event.target.value)} />
            <select value={filters.category} onChange={(event) => changeFilter('category', event.target.value)}>
              <option value="">Tüm kategoriler</option>
              {[...new Set([...expenseCategories, ...options.categories])].map((item) => <option key={item} value={item}>{item}</option>)}
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
