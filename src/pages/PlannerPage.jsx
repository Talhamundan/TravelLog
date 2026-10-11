// Rota hesaplama ve yolculuk maliyeti merkezi.
import { AlertTriangle, MapPinned, Plus, RefreshCw, Route } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import LeafletRouteMap from '../components/maps/LeafletRouteMap';
import OsmPlaceInput from '../components/ui/OsmPlaceInput';
import CustomSelect from '../components/ui/CustomSelect';
import { getRoutes } from '../services/osmRouteService';
import { calculateRouteTolls, KGM_TOLL_SOURCE } from '../services/tollCostService';
import { formatCurrency, formatKm, minutesToDuration } from '../utils/formatters';
import { formatPlate } from '../utils/plateFormatter';
const routePreferences = [
  { value: 'fastest', label: 'En Hızlı' },
  { value: 'economic', label: 'En Ekonomik' },
  { value: 'avoid-tolls', label: 'Ücretli Yollardan Kaçın' },
];
const tripTypes = [
  { value: 'one-way', label: 'Tek yön' },
  { value: 'round-trip', label: 'Gidiş-dönüş' },
];
const emptyRouteForm = {
  originText: '',
  destinationText: '',
  origin: null,
  destination: null,
  waypoints: [],
  vehicleId: '',
  tripType: 'one-way',
  preference: 'fastest',
  fuelUnitPrice: '',
  passengerCount: '',
  manualTollAmount: '',
};

export default function PlannerPage({ trips = [], vehicles = [], savedLocations = [], onNewTrip, onCreateTripFromRoute, onDetail }) {
  const [routeForm, setRouteForm] = useState(emptyRouteForm);
  const [routeState, setRouteState] = useState({ loading: false, error: '', routes: [], selectedId: '' });
  const requestIdRef = useRef(0);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === routeForm.vehicleId) || null;
  const routeResults = useMemo(() => buildRouteResults(routeState.routes, routeForm, selectedVehicle), [routeForm, routeState.routes, selectedVehicle]);
  const selectedResult = routeResults.find((item) => item.id === routeState.selectedId) || routeResults[0] || null;
  const mapPreview = selectedResult
    ? routeResultToPreview(selectedResult, routeForm, selectedVehicle)
    : routeForm.origin || routeForm.destination
      ? {
          id: 'draft-route-preview',
          origin: routeForm.origin,
          destination: routeForm.destination,
          waypoints: routeForm.waypoints.filter((point) => point?.lat && point?.lng),
          points: [routeForm.origin, ...routeForm.waypoints.filter((point) => point?.lat && point?.lng), routeForm.destination].filter(Boolean),
          transportType: 'Araç',
        }
      : null;
  const vehicleOptions = useMemo(
    () => vehicles.map((vehicle) => ({
      value: vehicle.id,
      label: [formatPlate(vehicle.plate || ''), vehicle.name, vehicle.fuelType, vehicle.fuelConsumptionPer100Km ? `${vehicle.fuelConsumptionPer100Km} L/100 km` : ''].filter(Boolean).join(' · '),
    })),
    [vehicles],
  );

  useEffect(() => {
    if (!routeState.selectedId && routeResults[0]?.id) setRouteState((current) => ({ ...current, selectedId: routeResults[0].id }));
  }, [routeResults, routeState.selectedId]);

  const runRouteCalculation = async ({ manual = false } = {}) => {
    if (!routeForm.origin?.lat || !routeForm.destination?.lat) {
      if (manual) setRouteState((current) => ({ ...current, error: 'Başlangıç ve varış için listeden koordinatlı konum seçin.' }));
      else setRouteState((current) => ({ ...current, error: '', routes: [], selectedId: '' }));
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setRouteState((current) => ({ ...current, loading: true, error: manual ? '' : current.error }));
    try {
      const cleanWaypoints = routeForm.waypoints.filter((point) => point?.lat && point?.lng);
      const outboundRoutes = await getRoutes({
        origin: routeForm.origin,
        destination: routeForm.destination,
        waypoints: cleanWaypoints,
        transportType: 'Araç',
        alternatives: true,
      });
      let routes = outboundRoutes.map((route, index) => ({ ...route, id: `route-${index + 1}`, direction: 'Gidiş' }));
      if (routeForm.tripType === 'round-trip') {
        const returnRoutes = await getRoutes({
          origin: routeForm.destination,
          destination: routeForm.origin,
          waypoints: [...cleanWaypoints].reverse(),
          transportType: 'Araç',
          alternatives: false,
        });
        routes = routes.map((route) => combineRoundTripRoute(route, returnRoutes[0]));
      }
      if (requestId !== requestIdRef.current) return;
      setRouteState((current) => ({ loading: false, error: '', routes, selectedId: routes.some((route) => route.id === current.selectedId) ? current.selectedId : routes[0]?.id || '' }));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setRouteState((current) => ({ ...current, loading: false, error: error?.message || 'Rota hesaplanamadı.' }));
    }
  };

  useEffect(() => {
    if (!routeForm.origin?.lat || !routeForm.destination?.lat) {
      requestIdRef.current += 1;
      setRouteState((current) => ({ ...current, loading: false, error: '', routes: [], selectedId: '' }));
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      runRouteCalculation();
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [routeForm.origin, routeForm.destination, routeForm.tripType, waypointKey(routeForm.waypoints)]);

  const updateRouteForm = (key, value) => {
    setRouteForm((current) => ({ ...current, [key]: value }));
    setRouteState((current) => ({ ...current, error: '' }));
  };

  const setWaypoint = (index, place) => {
    setRouteForm((current) => {
      const waypoints = [...current.waypoints];
      waypoints[index] = place;
      return { ...current, waypoints };
    });
  };

  const addWaypoint = () => setRouteForm((current) => ({ ...current, waypoints: [...current.waypoints, null] }));
  const removeWaypoint = (index) => setRouteForm((current) => ({ ...current, waypoints: current.waypoints.filter((_, itemIndex) => itemIndex !== index) }));

  const createTripFromRoute = () => {
    if (!selectedResult) return;
    const initialTrip = buildTripDraftFromRoute(selectedResult, routeForm, selectedVehicle);
    onCreateTripFromRoute?.(initialTrip);
  };

  return (
    <div className="page-stack planner-page route-planner-page">
      <section className="page-heading">
        <div>
          <h1>Rota Planlayıcı</h1>
          <p>Türkiye içi araç rotaları için mesafe, süre, yakıt ve geçiş maliyetini hesaplayın.</p>
        </div>
        <button type="button" className="primary-button planner-new-button" onClick={onNewTrip}>
          <Plus size={17} />
          Yeni Plan
        </button>
      </section>

      <section className="route-calculator-shell">
        <form className="panel route-calculator-form" onSubmit={(event) => {
          event.preventDefault();
          runRouteCalculation({ manual: true });
        }}>
          <div className="planner-panel-head">
            <div>
              <h2>Rota Hesapla</h2>
              <span>Adres arama sonuçlarından koordinatlı konum seçin.</span>
            </div>
          </div>

          <OsmPlaceInput
            label="Başlangıç noktası"
            value={routeForm.originText}
            selectedPlace={routeForm.origin}
            savedLocations={savedLocations}
            placeholder="İl, ilçe, mahalle veya açık adres"
            required
            onChange={(value) => updateRouteForm('originText', value)}
            onPlaceSelect={(place) => {
              updateRouteForm('origin', place);
              updateRouteForm('originText', place?.name || '');
            }}
          />
          <OsmPlaceInput
            label="Varış noktası"
            value={routeForm.destinationText}
            selectedPlace={routeForm.destination}
            savedLocations={savedLocations}
            placeholder="İl, ilçe, mahalle veya açık adres"
            required
            onChange={(value) => updateRouteForm('destinationText', value)}
            onPlaceSelect={(place) => {
              updateRouteForm('destination', place);
              updateRouteForm('destinationText', place?.name || '');
            }}
          />

          <div className="route-waypoint-stack">
            <div className="route-form-row-head">
              <span>Ara duraklar</span>
              <button type="button" onClick={addWaypoint}>Durak ekle</button>
            </div>
            {routeForm.waypoints.map((waypoint, index) => (
              <div className="route-waypoint-row" key={`waypoint-${index}`}>
                <OsmPlaceInput
                  value={waypoint?.name || ''}
                  selectedPlace={waypoint}
                  savedLocations={savedLocations}
                  placeholder={`Ara durak ${index + 1}`}
                  onPlaceSelect={(place) => setWaypoint(index, place)}
                />
                <button type="button" className="ghost-button" onClick={() => removeWaypoint(index)}>Sil</button>
              </div>
            ))}
          </div>

          <label className="field">
            <span>Araç seçimi</span>
            <CustomSelect value={routeForm.vehicleId} options={vehicleOptions} placeholder="Araç seç" onChange={(value) => updateRouteForm('vehicleId', value)} />
          </label>

          {selectedVehicle && (
            <div className="route-vehicle-summary">
              <span>{selectedVehicle.fuelType || 'Yakıt belirtilmemiş'}</span>
              <span>{selectedVehicle.fuelConsumptionPer100Km ? `${selectedVehicle.fuelConsumptionPer100Km} L/100 km` : 'Tüketim yok'}</span>
              <span>{formatHgsClass(selectedVehicle.hgsClass)}</span>
            </div>
          )}

          <div className="route-form-grid">
            <label className="field">
              <span>Tek yön / gidiş-dönüş</span>
              <CustomSelect value={routeForm.tripType} options={tripTypes} onChange={(value) => updateRouteForm('tripType', value)} />
            </label>
            <label className="field">
              <span>Güzergah tercihi</span>
              <CustomSelect value={routeForm.preference} options={routePreferences} onChange={(value) => updateRouteForm('preference', value)} />
            </label>
            <label className="field">
              <span>Yakıt litre fiyatı (TL)</span>
              <input type="number" min="0" step="0.01" value={routeForm.fuelUnitPrice} onChange={(event) => updateRouteForm('fuelUnitPrice', event.target.value)} placeholder="Manuel giriş" />
            </label>
            <label className="field">
              <span>Kişi sayısı</span>
              <input type="number" min="1" step="1" value={routeForm.passengerCount} onChange={(event) => updateRouteForm('passengerCount', event.target.value)} placeholder="Opsiyonel" />
            </label>
            <label className="field">
              <span>Manuel geçiş ücreti (TL)</span>
              <input type="number" min="0" step="0.01" value={routeForm.manualTollAmount} onChange={(event) => updateRouteForm('manualTollAmount', event.target.value)} placeholder="Opsiyonel" />
            </label>
          </div>

          <div className="route-source-note">
            <AlertTriangle size={16} />
            <span>Yakıt fiyatı otomatik kaynak bulunamadığında manuel girilir. KGM geçiş ücretleri gişe eşlemesi doğrulanmadan kesinleştirilmez.</span>
          </div>

          {routeState.error && <p className="form-error">{routeState.error}</p>}

          <button type="submit" className="ghost-button route-calculate-button" disabled={routeState.loading}>
            <RefreshCw size={17} />
            {routeState.loading ? 'Hesaplanıyor...' : 'Yeniden hesapla'}
          </button>
        </form>

        <section className="panel route-map-panel">
          <div className="planner-panel-head">
            <div>
              <h2>Harita</h2>
              <span>{selectedResult ? minutesToDuration(Math.round(selectedResult.durationMinutes)) : routeForm.origin || routeForm.destination ? 'Konum seçimi haritada gösteriliyor.' : 'Türkiye haritası hazır.'}</span>
            </div>
            <span className="planner-map-chip"><MapPinned size={14} /> OSRM</span>
          </div>
          <div className="route-map-canvas">
            <LeafletRouteMap routePreview={mapPreview} theme="dark" className="route-planner-map" />
            {routeState.loading && <div className="route-map-loading">Rota güncelleniyor...</div>}
          </div>
        </section>
      </section>

      {routeResults.length > 0 && (
        <section className="panel route-results-panel">
          <div className="planner-panel-head">
            <div>
              <h2>Rota Sonuçları</h2>
              <span>Alternatifler OSRM servisinin döndürdüğü güvenilir seçeneklerle sınırlıdır.</span>
            </div>
            <button type="button" className="primary-button" onClick={createTripFromRoute}>
              <Plus size={17} />
              Seyahat Planı Oluştur
            </button>
          </div>
          <div className="route-result-grid">
            {routeResults.map((result) => (
              <button
                type="button"
                key={result.id}
                className={`route-result-card ${selectedResult?.id === result.id ? 'selected' : ''}`}
                onClick={() => setRouteState((current) => ({ ...current, selectedId: result.id }))}
              >
                <strong>{result.label}</strong>
                <span>{result.confidenceLabel}</span>
                <div>
                  <Metric label="Mesafe" value={formatKm(result.distanceKm)} />
                  <Metric label="Süre" value={minutesToDuration(Math.round(result.durationMinutes))} />
                  <Metric label="Yakıt" value={result.fuelLiters == null ? 'Bilgi eksik' : `${result.fuelLiters.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} L`} />
                  <Metric label="Yakıt maliyeti" value={result.fuelCost == null ? 'Manuel fiyat gerekli' : formatCurrency(result.fuelCost)} />
                  <Metric label="Geçiş ücretleri" value={formatTollSummary(result.tolls)} />
                  <Metric label="Toplam" value={formatTotalSummary(result)} />
                </div>
                {result.perPersonCost != null && <em>Kişi başı: {formatCurrency(result.perPersonCost)}</em>}
              </button>
            ))}
          </div>
          {selectedResult && <TollBreakdown result={selectedResult} />}
        </section>
      )}
    </div>
  );
}

function TollBreakdown({ result }) {
  return (
    <div className="route-toll-breakdown">
      <div>
        <strong>Geçiş Ücretleri</strong>
        <span>Resmi kaynak: {KGM_TOLL_SOURCE.name} · Geçerlilik: {formatDisplayDate(KGM_TOLL_SOURCE.validFrom)}</span>
      </div>
      {result.tolls.items.map((item) => (
        <article key={item.id}>
          <div>
            <strong>{item.name}</strong>
            <span>{[item.entry && item.exit ? `${item.entry} → ${item.exit}` : '', item.hgsClass ? `HGS ${item.hgsClass}. Sınıf` : 'HGS sınıfı yok', item.note].filter(Boolean).join(' · ')}</span>
          </div>
          <b className={item.status === 'Hesaplanamadı' ? 'unresolved' : ''}>{item.status}</b>
          <em>{item.amount ? formatCurrency(item.amount) : '-'}</em>
        </article>
      ))}
    </div>
  );
}

function combineRoundTripRoute(route, returnRoute) {
  const distanceMeters = route.distanceMeters + (returnRoute?.distanceMeters || 0);
  const durationSeconds = route.durationSeconds + (returnRoute?.durationSeconds || 0);
  return {
    ...route,
    returnRoute,
    distanceMeters,
    durationSeconds,
    legs: [...(route.legs || []), ...(returnRoute?.legs || [])],
    overviewPath: [...(route.overviewPath || []), ...(returnRoute?.overviewPath || [])],
    distanceText: `${(distanceMeters / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`,
    durationText: minutesToDuration(Math.round(durationSeconds / 60)),
  };
}

function waypointKey(waypoints = []) {
  return waypoints.map((point) => point?.lat && point?.lng ? `${point.lat},${point.lng}` : 'empty').join('|');
}

function formatTollSummary(tolls) {
  if (tolls.hasUnresolved && !tolls.knownAmount) return 'Geçiş ücreti hesaplanamadı';
  if (tolls.hasUnresolved) return `${formatCurrency(tolls.knownAmount)} bilinen, eksik var`;
  return formatCurrency(tolls.knownAmount);
}

function formatTotalSummary(result) {
  if (result.fuelCost == null) return 'Yakıt fiyatı gerekli';
  if (result.tolls.hasUnresolved) return `${formatCurrency(result.knownCost)} bilinen, eksik var`;
  return formatCurrency(result.totalCost);
}

function formatDisplayDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
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
  const referenceDate = getPlannerCalendarReference(plans, today);
  const month = referenceDate.getMonth();
  const year = referenceDate.getFullYear();
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
      <h2>{new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(referenceDate)}</h2>
      <div className="planner-weekdays">{['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="planner-calendar-grid">
        {blanks.map((_, index) => <i key={`blank-${index}`} />)}
        {days.map((day) => {
          const dayPlans = byDay[day] || [];
          return (
            <button key={day} type="button" className={`${day === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? 'today' : ''} ${dayPlans.length ? 'has-plan' : ''}`} onClick={() => dayPlans[0] && onDetail?.(dayPlans[0].trip)}>
              {day}
              {dayPlans.slice(0, 3).map((plan) => <em key={plan.id} style={{ background: getTransportColor(plan.transportType) }} />)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function buildRouteResults(routes, form, vehicle) {
  const consumption = Number.parseFloat(vehicle?.fuelConsumptionPer100Km);
  const fuelPrice = Number.parseFloat(form.fuelUnitPrice);
  const passengerCount = Number.parseInt(form.passengerCount, 10);
  const avoidTolls = form.preference === 'avoid-tolls';
  return routes.map((route, index) => {
    const distanceKm = (route.distanceMeters || 0) / 1000;
    const durationMinutes = (route.durationSeconds || 0) / 60;
    const fuelLiters = Number.isFinite(consumption) && consumption > 0 ? (distanceKm * consumption) / 100 : null;
    const fuelCost = fuelLiters != null && Number.isFinite(fuelPrice) && fuelPrice > 0 ? fuelLiters * fuelPrice : null;
    const tolls = calculateRouteTolls({ route, hgsClass: vehicle?.hgsClass, manualTollAmount: form.manualTollAmount, avoidTolls });
    const knownCost = (fuelCost || 0) + tolls.knownAmount;
    const totalCost = fuelCost == null || tolls.hasUnresolved ? null : knownCost;
    return {
      id: route.id || `route-${index + 1}`,
      route,
      distanceKm,
      durationMinutes,
      fuelLiters,
      fuelCost,
      tolls,
      knownCost,
      totalCost,
      perPersonCost: totalCost != null && passengerCount > 0 ? totalCost / passengerCount : null,
      label: buildResultLabel(form.preference, index, tolls),
      confidenceLabel: buildConfidenceLabel(form.preference, tolls, fuelCost),
    };
  }).sort((a, b) => {
    if (form.preference === 'economic') return a.knownCost - b.knownCost;
    if (form.preference === 'avoid-tolls') return Number(a.tolls.hasUnresolved) - Number(b.tolls.hasUnresolved) || a.durationMinutes - b.durationMinutes;
    return a.durationMinutes - b.durationMinutes;
  });
}

function buildResultLabel(preference, index, tolls) {
  if (preference === 'economic') return index === 0 && !tolls.hasUnresolved ? 'En Ekonomik' : `Alternatif ${index + 1}`;
  if (preference === 'avoid-tolls') return tolls.hasUnresolved ? `Kaçınma kontrolü ${index + 1}` : 'Ücretli geçiş tespit edilmedi';
  return index === 0 ? 'En Hızlı' : `Alternatif ${index + 1}`;
}

function buildConfidenceLabel(preference, tolls, fuelCost) {
  if (fuelCost == null) return 'Yakıt fiyatı veya tüketim eksik';
  if (preference === 'avoid-tolls') return tolls.hasUnresolved ? 'OSRM demo ücretli yoldan kaçınmayı garanti etmez' : 'OSRM adımlarında ücretli geçiş izi bulunmadı';
  if (tolls.hasUnresolved) return 'Geçiş ücretleri eksik; toplam kesin değil';
  if (preference === 'economic') return 'Yakıt + bilinen geçiş ücretlerine göre';
  return 'Yakıt ve bilinen geçiş ücretleri hesaplandı';
}

function routeResultToPreview(result, form, vehicle) {
  return {
    id: result.id,
    trip: {
      id: result.id,
      title: `${form.origin?.name || 'Başlangıç'} → ${form.destination?.name || 'Varış'}`,
      transportType: 'Araç',
      distanceKm: result.distanceKm,
      durationMinutes: Math.round(result.durationMinutes),
      totalCost: result.totalCost ?? result.knownCost,
      currency: 'TRY',
      vehiclePlate: vehicle?.plate || '',
      fromLocation: form.origin,
      toLocation: form.destination,
      waypoints: form.waypoints.filter((point) => point?.lat && point?.lng),
      route: { overviewPath: result.route.overviewPath },
    },
    origin: form.origin,
    destination: form.destination,
    waypoints: form.waypoints.filter((point) => point?.lat && point?.lng),
    points: result.route.overviewPath,
    transportType: 'Araç',
  };
}

function buildTripDraftFromRoute(result, form, vehicle) {
  const knownTotal = result.totalCost ?? result.knownCost;
  return {
    title: `${form.origin?.name || 'Başlangıç'} → ${form.destination?.name || 'Varış'} planı`,
    transportType: 'Araç',
    company: vehicle?.name || 'Kişisel Araç',
    vehicleId: vehicle?.id || '',
    vehicleName: vehicle?.name || '',
    plate: formatPlate(vehicle?.plate || ''),
    vehiclePlate: formatPlate(vehicle?.plate || ''),
    fuelType: vehicle?.fuelType || '',
    fuelConsumptionPer100Km: vehicle?.fuelConsumptionPer100Km || '',
    from: form.origin?.name || '',
    to: form.destination?.name || '',
    fromText: form.origin?.name || '',
    toText: form.destination?.name || '',
    fromLocation: form.origin,
    toLocation: form.destination,
    waypoints: form.waypoints.filter((point) => point?.lat && point?.lng),
    stops: form.waypoints.filter((point) => point?.name).map((point) => point.name),
    distanceKm: Math.round(result.distanceKm),
    durationMinutes: Math.round(result.durationMinutes),
    currency: 'TRY',
    estimatedFuelLiters: result.fuelLiters == null ? '' : Math.round(result.fuelLiters * 100) / 100,
    estimatedFuelCost: result.fuelCost == null ? '' : Math.round(result.fuelCost * 100) / 100,
    estimatedTollCost: Math.round(result.tolls.knownAmount * 100) / 100,
    estimatedTotalCost: Math.round(knownTotal * 100) / 100,
    tollStatus: result.tolls.hasUnresolved ? 'Hesaplanamadı' : 'Tahmini',
    routePreference: form.preference,
    route: {
      provider: result.route.provider,
      overviewPath: result.route.overviewPath,
      legs: result.route.legs,
      tolls: result.tolls,
      fuelUnitPrice: form.fuelUnitPrice,
      kgmSource: KGM_TOLL_SOURCE,
    },
    notes: result.tolls.hasUnresolved
      ? 'Rota Planlayıcı tahmini: geçiş ücretleri eksik olabilir; gerçek giderleri seyahat sonrası ayrıca girin.'
      : 'Rota Planlayıcı tahmini; gerçek giderleri seyahat sonrası ayrıca girin.',
  };
}

function buildPlannerTrips(trips, today) {
  return trips
    .map((trip) => {
      const date = new Date(trip.date);
      const validDate = !Number.isNaN(date.getTime());
      const daysLeft = validDate ? Math.ceil((startOfDay(date) - today) / 86400000) : 0;
      const transportType = normalizeTransportType(trip.transportType);
      const route = getTripRouteTitle(trip);
      const status = inferStatus(trip, daysLeft, validDate);
      return {
        id: trip.id,
        trip,
        date: trip.date,
        departureTime: trip.departureTime,
        daysLeft,
        route,
        transportType,
        cost: Number(trip.estimatedTotalCost || trip.totalCost || trip.ticketPrice || trip.fuelCost || 0),
        status,
        reminderLabel: daysLeft >= 0 ? 'Hatırlatma aktif' : 'Tamamlandı',
      };
    })
    .filter((plan) => plan.status !== 'Tamamlandı' && plan.status !== 'İptal')
    .sort(sortPlannerPlans);
}

function inferStatus(trip, daysLeft, validDate) {
  if (trip.status === 'İptal' || trip.status === 'Iptal') return 'İptal';
  if (validDate && daysLeft < 0) return 'Tamamlandı';
  if (!trip.from || !trip.to) return 'Taslak';
  if (normalizeTransportType(trip.transportType) !== 'Araç' && !trip.company) return 'Rezervasyon Bekliyor';
  if (!trip.totalCost && !trip.ticketPrice && !trip.estimatedTotalCost && normalizeTransportType(trip.transportType) !== 'Araç') return 'Rezervasyon Bekliyor';
  return 'Hazır';
}

function matchesPlannerFilter(plan, filter, today) {
  if (filter === 'Yaklaşan') return plan.daysLeft >= 0;
  if (filter === 'Bu Hafta') return plan.daysLeft >= 0 && plan.daysLeft <= 7;
  if (filter === 'Bu Ay') {
    const date = new Date(plan.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
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
    text: `Bu rota ${top[1]} kez planlanmış. Hazırlık listesini bu rota için takip edebilirsiniz.`,
  };
}

function Metric({ label, value }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function formatHgsClass(value) {
  const number = Number.parseInt(value, 10);
  return number >= 1 && number <= 6 ? `HGS ${number}. Sınıf` : 'HGS belirtilmemiş';
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function sortPlannerPlans(a, b) {
  if (a.daysLeft >= 0 && b.daysLeft >= 0) return a.daysLeft - b.daysLeft;
  return b.daysLeft - a.daysLeft;
}

function getPlannerCalendarReference(plans, today) {
  const currentMonthPlan = plans.find((plan) => {
    const date = new Date(plan.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  });
  const firstPlanDate = plans[0] ? new Date(plans[0].date) : null;
  if (currentMonthPlan) return today;
  if (firstPlanDate && !Number.isNaN(firstPlanDate.getTime())) return firstPlanDate;
  return today;
}
