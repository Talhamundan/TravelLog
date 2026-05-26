import { ChevronLeft, ChevronRight, Filter, Plus, Search } from 'lucide-react';
import { calendarViews, eventMeta, getMonthGrid, getWeekDays, isoDate, transportColors } from '../../utils/calendarHelpers';
import { formatDate } from '../../utils/formatters';

const weekLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function TravelCalendar({
  currentDate,
  view,
  events,
  filters,
  filterOptions,
  showFilters,
  onToggleFilters,
  onFilterChange,
  onViewChange,
  onDateChange,
  onToday,
  onNewTrip,
  onEventClick,
}) {
  const monthTitle = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(currentDate);
  const byDate = events.reduce((acc, event) => {
    acc[event.dateKey] = acc[event.dateKey] || [];
    acc[event.dateKey].push(event);
    return acc;
  }, {});

  const move = (amount) => {
    const next = new Date(currentDate);
    if (view === 'day') next.setDate(next.getDate() + amount);
    else if (view === 'week') next.setDate(next.getDate() + amount * 7);
    else next.setMonth(next.getMonth() + amount);
    onDateChange(next);
  };

  return (
    <section className="calendar-shell">
      <div className="calendar-toolbar">
        <button className="primary-button" type="button" onClick={onNewTrip}>
          <Plus size={17} />
          Yeni Seyahat
        </button>
        <button className="secondary-button compact" type="button" onClick={onToday}>
          Bugün
        </button>
        <div className="calendar-nav">
          <button type="button" onClick={() => move(-1)} aria-label="Önceki">
            <ChevronLeft size={18} />
          </button>
          <strong>{monthTitle}</strong>
          <button type="button" onClick={() => move(1)} aria-label="Sonraki">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="segmented-control">
          {calendarViews.map((item) => (
            <button type="button" key={item.id} className={view === item.id ? 'active' : ''} onClick={() => onViewChange(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <label className="calendar-search">
          <Search size={17} />
          <input value={filters.query} onChange={(event) => onFilterChange('query', event.target.value)} placeholder="Rota, firma, şehir ara..." />
        </label>
        <button className="secondary-button compact" type="button" onClick={onToggleFilters}>
          <Filter size={17} />
          Filtre
        </button>
      </div>

      {showFilters && (
        <div className="calendar-filter-bar">
          <select value={filters.transportType} onChange={(event) => onFilterChange('transportType', event.target.value)}>
            <option value="">Tüm ulaşım</option>
            {filterOptions.transports.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={filters.company} onChange={(event) => onFilterChange('company', event.target.value)}>
            <option value="">Tüm firmalar</option>
            {filterOptions.companies.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={filters.city} onChange={(event) => onFilterChange('city', event.target.value)}>
            <option value="">Tüm şehirler</option>
            {filterOptions.cities.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={filters.year} onChange={(event) => onFilterChange('year', event.target.value)}>
            <option value="">Tüm yıllar</option>
            {filterOptions.years.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select value={filters.month} onChange={(event) => onFilterChange('month', event.target.value)}>
            <option value="">Tüm aylar</option>
            {filterOptions.months.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
      )}

      {view === 'month' && <MonthView currentDate={currentDate} eventsByDate={byDate} onEventClick={onEventClick} />}
      {view === 'week' && <WeekView currentDate={currentDate} eventsByDate={byDate} onEventClick={onEventClick} />}
      {view === 'day' && <DayView currentDate={currentDate} events={byDate[isoDate(currentDate)] || []} onEventClick={onEventClick} />}
      {view === 'agenda' && <AgendaView events={events} onEventClick={onEventClick} />}
    </section>
  );
}

function MonthView({ currentDate, eventsByDate, onEventClick }) {
  return (
    <div className="calendar-month">
      {weekLabels.map((label) => <span className="calendar-week-label" key={label}>{label}</span>)}
      {getMonthGrid(currentDate).map((date) => {
        const dateKey = isoDate(date);
        const dayEvents = eventsByDate[dateKey] || [];
        const isMuted = date.getMonth() !== currentDate.getMonth();
        const isToday = dateKey === isoDate(new Date());
        return (
          <div className={`calendar-day-cell ${isMuted ? 'muted' : ''} ${isToday ? 'today' : ''}`} key={dateKey}>
            <span className="day-number">{date.getDate()}</span>
            <div className="day-events">
              {dayEvents.slice(0, 3).map((event) => <EventPill key={event.id} event={event} onClick={onEventClick} />)}
              {dayEvents.length > 3 && <small>+{dayEvents.length - 3} kayıt</small>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ currentDate, eventsByDate, onEventClick }) {
  return (
    <div className="calendar-week">
      {getWeekDays(currentDate).map((date) => {
        const dateKey = isoDate(date);
        return (
          <div className="week-day-card" key={dateKey}>
            <strong>{weekLabels[(date.getDay() + 6) % 7]}</strong>
            <span>{date.getDate()}</span>
            {(eventsByDate[dateKey] || []).map((event) => <EventPill key={event.id} event={event} onClick={onEventClick} />)}
          </div>
        );
      })}
    </div>
  );
}

function DayView({ currentDate, events, onEventClick }) {
  return (
    <div className="calendar-agenda">
      <h3>{formatDate(currentDate)}</h3>
      {events.length ? events.map((event) => <AgendaRow key={event.id} event={event} onClick={onEventClick} />) : <p className="empty-inline">Bu gün için seyahat yok.</p>}
    </div>
  );
}

function AgendaView({ events, onEventClick }) {
  return (
    <div className="calendar-agenda">
      {events.length ? events.map((event) => <AgendaRow key={event.id} event={event} onClick={onEventClick} />) : <p className="empty-inline">Filtreye uygun seyahat bulunamadı.</p>}
    </div>
  );
}

function EventPill({ event, onClick }) {
  return (
    <button className="travel-event" type="button" style={{ '--event-color': event.color }} onClick={() => onClick(event.trip)}>
      <b>{event.route}</b>
      <span>{event.transportType} {event.time}</span>
    </button>
  );
}

function AgendaRow({ event, onClick }) {
  const meta = eventMeta(event.trip);
  return (
    <button className="agenda-row" type="button" onClick={() => onClick(event.trip)}>
      <span className="transport-dot" style={{ background: transportColors[event.transportType] || transportColors.Diğer }} />
      <div>
        <strong>{event.route}</strong>
        <small>{formatDate(event.date)} · {event.time || '-'} · {event.transportType}</small>
      </div>
      <span>{meta.provider}</span>
      <span>{meta.km}</span>
      <b>{meta.cost}</b>
    </button>
  );
}
