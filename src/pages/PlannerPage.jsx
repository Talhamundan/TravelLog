// Gelecek seyahatleri planlama, checklist ve hatırlatma merkezi.
import { Bell, CalendarDays, CheckCircle2, Clock3, Coins, Luggage, MapPinned, Plus, Route, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import TravelMap from '../components/TravelMap';
import { createStats } from '../utils/analytics';
import { formatCurrency, formatDate, formatKm, minutesToDuration } from '../utils/formatters';
import { getTransportColor, normalizeTransportType } from '../constants/transport';
import { getTripRouteTitle } from '../utils/routeDisplay';
import { tripProviderLabel } from '../utils/tripDisplay';

const filters = ['Tümü', 'Yaklaşan', 'Bu Hafta', 'Bu Ay', 'Taslaklar'];
const statusMeta = {
  Taslak: { className: 'draft', label: 'Taslak' },
  'Rezervasyon Bekliyor': { className: 'waiting', label: 'Rezervasyon Bekliyor' },
  Hazır: { className: 'ready', label: 'Hazır' },
  Tamamlandı: { className: 'done', label: 'Tamamlandı' },
  İptal: { className: 'cancelled', label: 'İptal' },
};

export default function PlannerPage({ trips = [], onNewTrip, onDetail }) {
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [checkState, setCheckState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('travellog:plannerChecklist') || '{}');
    } catch {
      return {};
    }
  });
  const [draftItems, setDraftItems] = useState({});
  const today = useMemo(() => startOfDay(new Date()), []);
  const plans = useMemo(() => buildPlannerTrips(trips, today), [today, trips]);
  const visiblePlans = useMemo(() => plans.filter((plan) => matchesPlannerFilter(plan, activeFilter, today)), [activeFilter, plans, today]);
  const upcomingPlans = plans;
  const nextPlan = upcomingPlans[0] || null;
  const stats = createStats(upcomingPlans);
  const pendingReservations = plans.filter((plan) => plan.status === 'Rezervasyon Bekliyor').length;
  const suggestion = buildRouteSuggestion(trips);

  useEffect(() => {
    localStorage.setItem('travellog:plannerChecklist', JSON.stringify(checkState));
  }, [checkState]);

  const toggleChecklist = (planId, item) => {
    setCheckState((current) => {
      const selected = new Set(current[planId] || []);
      if (selected.has(item)) selected.delete(item);
      else selected.add(item);
      return { ...current, [planId]: [...selected] };
    });
  };

  const addChecklistItem = (planId) => {
    const value = String(draftItems[planId] || '').trim();
    if (!value) return;
    setCheckState((current) => ({ ...current, [`${planId}:custom`]: [...new Set([...(current[`${planId}:custom`] || []), value])] }));
    setDraftItems((current) => ({ ...current, [planId]: '' }));
  };

  return (
    <div className="page-stack planner-page">
      <section className="page-heading">
        <div>
          <h1>Seyahat Planlayıcı</h1>
          <p>Gelecek seyahatlerini planla, hazırlıklarını takip et ve hatırlatmaları yönet.</p>
        </div>
        <button type="button" className="primary-button planner-new-button" onClick={onNewTrip}>
          <Plus size={17} />
          Yeni Plan
        </button>
      </section>

      <section className="planner-kpi-grid">
        <PlannerKpi icon={CalendarDays} label="Yaklaşan seyahat" value={upcomingPlans.length} note={nextPlan ? `${nextPlan.route} sırada` : 'Plan bekleniyor'} tone="purple" />
        <PlannerKpi icon={Coins} label="Bu ay tahmini masraf" value={formatCurrency(stats.monthCost)} note="Planlanan seyahatlerden" tone="amber" />
        <PlannerKpi icon={Luggage} label="Bekleyen rezervasyon" value={pendingReservations} note="Tamamlanmayı bekliyor" tone="blue" />
        <PlannerKpi icon={Clock3} label="En yakın seyahat" value={nextPlan ? `${nextPlan.daysLeft} gün` : '-'} note={nextPlan ? `${nextPlan.route} · ${formatDate(nextPlan.date)}` : 'Takvim boş'} tone="green" />
      </section>

      <section className="planner-layout">
        <div className="planner-main-column">
          <section className="panel planner-timeline-panel">
            <div className="planner-panel-head">
              <div>
                <h2>Planlanan Seyahatler</h2>
                <span>{visiblePlans.length} plan görüntüleniyor</span>
              </div>
              <div className="planner-tabs">
                {filters.map((filter) => (
                  <button key={filter} type="button" className={activeFilter === filter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="planner-list">
              {visiblePlans.map((plan) => {
                const checklist = getPlanChecklist(plan, checkState);
                const done = checklist.filter((item) => item.done).length;
                const progress = checklist.length ? Math.round((done / checklist.length) * 100) : 0;
                return (
                  <article className="planner-card" key={plan.id} onClick={() => onDetail?.(plan.trip)}>
                    <span className="planner-card-icon" style={{ '--transport-color': getTransportColor(plan.transportType) }}>
                      <Route size={20} />
                    </span>
                    <div className="planner-card-route">
                      <strong>{plan.route}</strong>
                      <span>{formatDate(plan.date)} · {plan.departureTime || 'Saat yok'}</span>
                      <small>{tripProviderLabel(plan.trip)}</small>
                    </div>
                    <span className="planner-transport" style={{ '--transport-color': getTransportColor(plan.transportType) }}>{plan.transportType}</span>
                    <div className="planner-cost">
                      <strong>{formatCurrency(plan.cost, plan.trip.currency)}</strong>
                      <span>Tahmini masraf</span>
                    </div>
                    <div className="planner-progress">
                      <strong>{done} / {checklist.length}</strong>
                      <i><em style={{ width: `${progress}%`, background: getTransportColor(plan.transportType) }} /></i>
                      <span>%{progress}</span>
                    </div>
                    <div className="planner-card-status">
                      <span className={`planner-status ${statusMeta[plan.status]?.className || 'draft'}`}>{plan.status}</span>
                      <small><Bell size={12} /> {plan.reminderLabel}</small>
                    </div>
                  </article>
                );
              })}
              {!visiblePlans.length && (
                <div className="planner-empty-state">
                  <Sparkles size={22} />
                  <strong>Planlanmış seyahat yok</strong>
                  <span>Yeni seyahat ekleyerek planlayıcı akışını başlatın.</span>
                </div>
              )}
            </div>
          </section>

          <section className="panel planner-checklist-panel">
            <div className="planner-panel-head">
              <div>
                <h2>Hazırlık Checklist’i</h2>
                <span>Ulaşım türüne göre otomatik görevler</span>
              </div>
            </div>
            <div className="planner-checklist-grid">
              {upcomingPlans.slice(0, 3).map((plan) => (
                <ChecklistCard
                  key={plan.id}
                  plan={plan}
                  items={getPlanChecklist(plan, checkState)}
                  draftValue={draftItems[plan.id] || ''}
                  onToggle={toggleChecklist}
                  onDraft={(value) => setDraftItems((current) => ({ ...current, [plan.id]: value }))}
                  onAdd={addChecklistItem}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="planner-side-column">
          <MiniPlannerCalendar plans={plans} today={today} onDetail={onDetail} />
          <section className="panel planner-reminder-panel">
            <h2>Yaklaşan Hatırlatmalar</h2>
            {buildPlannerNotifications(upcomingPlans).slice(0, 5).map((item) => (
              <article key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
                <b>{item.badge}</b>
              </article>
            ))}
          </section>
          {suggestion && (
            <section className="panel planner-suggestion-panel">
              <Sparkles size={18} />
              <strong>{suggestion.title}</strong>
              <span>{suggestion.text}</span>
            </section>
          )}
        </aside>
      </section>

      <section className="panel pro-panel planner-map-panel">
        <div className="planner-panel-head">
          <div>
            <h2>Yaklaşan Rotalar Haritası</h2>
            <span>En yakın seyahat haritada öne çıkarılır.</span>
          </div>
          <span className="planner-map-chip"><MapPinned size={14} /> {upcomingPlans.length} rota</span>
        </div>
        <TravelMap trips={upcomingPlans.map((plan) => plan.trip)} dashboard theme="dark" selectedTripId={nextPlan?.id || ''} />
      </section>
    </div>
  );
}

function PlannerKpi({ icon: Icon, label, value, note, tone }) {
  return (
    <article className={`planner-kpi ${tone}`}>
      <span><Icon size={22} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{note}</em>
      </div>
    </article>
  );
}

function ChecklistCard({ plan, items, draftValue, onToggle, onDraft, onAdd }) {
  return (
    <article className="planner-check-card">
      <strong>{plan.route}</strong>
      <span>{plan.transportType} · {formatKm(plan.trip.distanceKm)} · {minutesToDuration(plan.trip.durationMinutes)}</span>
      <div>
        {items.map((item) => (
          <label key={item.label}>
            <input type="checkbox" checked={item.done} onChange={() => onToggle(plan.id, item.label)} />
            {item.label}
          </label>
        ))}
      </div>
      <div className="planner-add-check">
        <input value={draftValue} placeholder="Yeni görev..." onChange={(event) => onDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onAdd(plan.id); }} />
        <button type="button" onClick={() => onAdd(plan.id)}>Ekle</button>
      </div>
    </article>
  );
}

function MiniPlannerCalendar({ plans, today, onDetail }) {
  const month = today.getMonth();
  const year = today.getFullYear();
  const monthPlans = plans.filter((plan) => {
    const date = new Date(plan.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() === month && date.getFullYear() === year;
  });
  const byDay = monthPlans.reduce((acc, plan) => {
    const day = new Date(plan.date).getDate();
    acc[day] ||= [];
    acc[day].push(plan);
    return acc;
  }, {});
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => index + 1);
  const blanks = Array.from({ length: (new Date(year, month, 1).getDay() + 6) % 7 });
  return (
    <section className="panel planner-calendar-panel">
      <h2>{new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(today)}</h2>
      <div className="planner-weekdays">{['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="planner-calendar-grid">
        {blanks.map((_, index) => <i key={`blank-${index}`} />)}
        {days.map((day) => {
          const dayPlans = byDay[day] || [];
          return (
            <button key={day} type="button" className={`${day === today.getDate() ? 'today' : ''} ${dayPlans.length ? 'has-plan' : ''}`} onClick={() => dayPlans[0] && onDetail?.(dayPlans[0].trip)}>
              {day}
              {dayPlans.slice(0, 3).map((plan) => <em key={plan.id} style={{ background: getTransportColor(plan.transportType) }} />)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function buildPlannerTrips(trips, today) {
  return trips
    .map((trip) => {
      const date = new Date(trip.date);
      const daysLeft = Number.isNaN(date.getTime()) ? 999 : Math.ceil((startOfDay(date) - today) / 86400000);
      const transportType = normalizeTransportType(trip.transportType);
      const route = getTripRouteTitle(trip);
      return {
        id: trip.id,
        trip,
        date: trip.date,
        departureTime: trip.departureTime,
        daysLeft,
        route,
        transportType,
        cost: Number(trip.totalCost || trip.ticketPrice || trip.fuelCost || 0),
        status: inferStatus(trip, daysLeft),
        reminderLabel: daysLeft >= 0 ? 'Hatırlatma aktif' : 'Tamamlandı',
      };
    })
    .filter((plan) => plan.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function inferStatus(trip, daysLeft) {
  if (!trip.from || !trip.to) return 'Taslak';
  if (normalizeTransportType(trip.transportType) !== 'Araç' && !trip.company) return 'Rezervasyon Bekliyor';
  if (!trip.totalCost && !trip.ticketPrice && normalizeTransportType(trip.transportType) !== 'Araç') return 'Rezervasyon Bekliyor';
  return 'Hazır';
}

function matchesPlannerFilter(plan, filter, today) {
  if (filter === 'Yaklaşan') return plan.daysLeft >= 0;
  if (filter === 'Bu Hafta') return plan.daysLeft >= 0 && plan.daysLeft <= 7;
  if (filter === 'Bu Ay') {
    const date = new Date(plan.date);
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }
  if (filter === 'Taslaklar') return plan.status === 'Taslak' || plan.status === 'Rezervasyon Bekliyor';
  return true;
}

function getPlanChecklist(plan, state) {
  const custom = state[`${plan.id}:custom`] || [];
  const done = new Set(state[plan.id] || []);
  return [...defaultChecklist(plan.transportType), ...custom].map((label) => ({ label, done: done.has(label) }));
}

function defaultChecklist(type) {
  const normalized = normalizeTransportType(type);
  if (normalized === 'Uçak') return ['Check-in', 'Koltuk seçimi', 'Bagaj', 'Kimlik'];
  if (normalized === 'Araç') return ['Yakıt', 'HGS', 'Evrak', 'Lastik kontrolü'];
  if (normalized === 'Otobüs') return ['PNR', 'Koltuk', 'Terminal saati'];
  if (normalized === 'Tren') return ['Vagon', 'Koltuk', 'Gar saati'];
  return ['Rezervasyon', 'Kimlik', 'Bilet kontrolü'];
}

function buildPlannerNotifications(plans) {
  return plans.flatMap((plan) => [
    {
      id: `${plan.id}-tomorrow`,
      title: plan.daysLeft === 1 ? `Yarın ${plan.route} seyahatin var` : `${plan.route} planı yaklaşıyor`,
      subtitle: `${formatDate(plan.date)} · ${plan.departureTime || 'Saat yok'}`,
      badge: plan.daysLeft <= 1 ? '1 gün' : `${plan.daysLeft} gün`,
      category: 'Seyahat',
    },
    ...(plan.status === 'Rezervasyon Bekliyor' ? [{
      id: `${plan.id}-reservation`,
      title: `${tripProviderLabel(plan.trip)} rezervasyonu eksik`,
      subtitle: plan.route,
      badge: 'Eksik',
      category: 'Rezervasyon',
    }] : []),
  ]);
}

function buildRouteSuggestion(trips) {
  const counts = trips.reduce((acc, trip) => {
    const route = getTripRouteTitle(trip);
    acc[route] = (acc[route] || 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null;
  return {
    title: `${top[0]} rotasını sık kullanıyorsunuz`,
    text: `Bu rota ${top[1]} kez kaydedilmiş. Planlayıcıda hızlı hazırlık listesiyle takip edebilirsiniz.`,
  };
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}
