import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import TravelCalendar from '../components/calendar/TravelCalendar';
import UpcomingTrips from '../components/calendar/UpcomingTrips';
import TripEventModal from '../components/calendar/TripEventModal';
import {
  buildCalendarAnalytics,
  buildCalendarEvents,
  calendarFilterOptions,
  filterCalendarEvents,
  upcomingEvents,
} from '../utils/calendarHelpers';

const initialFilters = {
  query: '',
  transportType: '',
  company: '',
  city: '',
  year: '',
  month: '',
};

export default function CalendarPage({ trips, loading, onNewTrip, onSeed, onEdit, onDetail }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const events = useMemo(() => buildCalendarEvents(trips), [trips]);
  const filteredEvents = useMemo(() => filterCalendarEvents(events, filters), [events, filters]);
  const filterOptions = useMemo(() => calendarFilterOptions(events), [events]);
  const analytics = useMemo(() => buildCalendarAnalytics(filteredEvents, currentDate), [filteredEvents, currentDate]);
  const upcoming = useMemo(() => upcomingEvents(filteredEvents, 7), [filteredEvents]);

  const changeFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      transportType: current.transportType && !filterOptions.transports.includes(current.transportType) ? '' : current.transportType,
      company: current.company && !filterOptions.companies.includes(current.company) ? '' : current.company,
      city: current.city && !filterOptions.cities.includes(current.city) ? '' : current.city,
      year: current.year && !filterOptions.years.map(String).includes(current.year) ? '' : current.year,
      month: current.month !== '' && current.month != null && !filterOptions.months.map((item) => String(item.value)).includes(String(current.month)) ? '' : current.month,
    }));
  }, [filterOptions]);

  if (loading && !trips.length) {
    return (
      <div className="page-stack calendar-page">
        <CalendarSkeleton />
      </div>
    );
  }

  if (!trips.length) {
    return (
      <div className="page-stack calendar-page">
        <section className="page-heading">
          <div>
            <h1>Takvim</h1>
            <p>Seyahatlerinizi ay, hafta, gün ve ajanda görünümünde planlayın.</p>
          </div>
        </section>
        <EmptyState title="Takvime düşecek seyahat yok" primaryLabel="Yeni Seyahat" onPrimary={onNewTrip} onSeed={onSeed} />
      </div>
    );
  }

  return (
    <div className="page-stack calendar-page">
      <section className="page-heading">
        <div>
          <h1>Takvim</h1>
          <p>Yaklaşan seyahatleri ve planlarınızı takvim üzerinde yönetin.</p>
        </div>
      </section>

      <div className="calendar-layout">
        <div className="calendar-main">
          <TravelCalendar
            currentDate={currentDate}
            view={view}
            events={filteredEvents}
            filters={filters}
            filterOptions={filterOptions}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters((value) => !value)}
            onFilterChange={changeFilter}
            onViewChange={setView}
            onDateChange={setCurrentDate}
            onToday={() => setCurrentDate(new Date())}
            onNewTrip={onNewTrip}
            onEventClick={setSelectedTrip}
          />
          <UpcomingTrips events={upcoming} onDetail={onDetail} onEdit={onEdit} onNewTrip={onNewTrip} />
        </div>

        <aside className="calendar-analytics panel">
          <div className="panel-heading">
            <div>
              <h2>Mini Analiz</h2>
              <span>Seçili takvim ve filtreler</span>
            </div>
            <Sparkles size={20} />
          </div>
          <div className="calendar-analytics-grid">
            {analytics.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.hint}</small>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <TripEventModal
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onEdit={(trip) => {
          setSelectedTrip(null);
          onEdit(trip);
        }}
        onDetail={(trip) => {
          setSelectedTrip(null);
          onDetail(trip);
        }}
      />
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <>
      <section className="page-heading skeleton-block heading-skeleton" />
      <section className="panel calendar-skeleton">
        <div />
        <div />
        <div />
      </section>
    </>
  );
}
