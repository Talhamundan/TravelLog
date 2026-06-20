import { AlertCircle, ArrowLeftRight, CheckCircle2, Clock3, Coins, Footprints, ListTree, Loader2, MapPin, Route, Save, Search, TramFront } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CustomSelect from '../components/ui/CustomSelect';
import IstanbulTransportMap from '../components/maps/IstanbulTransportMap';
import { getTransitRoutes, hasTransitApiConfig, searchPlaces, transportPreferences } from '../services/istanbulTransitApi';
import { formatCurrency, minutesToDuration } from '../utils/formatters';

const defaultForm = {
  from: '',
  to: '',
  dateTime: new Date().toISOString().slice(0, 16),
  preference: 'fastest',
};

export default function IstanbulTransportPage({ onSaveRoute }) {
  const [form, setForm] = useState(defaultForm);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) || routes[0] || null;
  const summary = useMemo(() => buildSummary(routes), [routes]);
  const transitApiReady = hasTransitApiConfig();

  const findRoutes = async () => {
    setNotice('');
    setError('');
    if (!transitApiReady) {
      setError('Toplu taşıma rotası için OpenTripPlanner endpoint’i gerekiyor. .env içindeki VITE_OTP_BASE_URL değerini ekleyin.');
      return;
    }
    if (!origin || !destination) {
      setNotice('Lütfen listeden geçerli bir başlangıç ve varış noktası seçin.');
      return;
    }
    setLoading(true);
    try {
      const nextRoutes = await getTransitRoutes(origin, destination, form.dateTime, form.preference);
      setRoutes(nextRoutes);
      setSelectedRouteId(nextRoutes[0]?.id || '');
      if (!nextRoutes.length) setNotice('Bu iki nokta arasında toplu taşıma rotası bulunamadı.');
    } catch (requestError) {
      console.error('OpenTripPlanner transit route error', requestError);
      setRoutes([]);
      setSelectedRouteId('');
      setError('Rota bilgisi alınamadı. API anahtarını, Maps/Routes/Places izinlerini ve faturalandırmayı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const swapLocations = () => {
    setForm((current) => ({ ...current, from: current.to, to: current.from }));
    setOrigin(destination);
    setDestination(origin);
    setRoutes([]);
    setSelectedRouteId('');
    setNotice('');
    setError('');
  };

  const saveRoute = (route) => {
    if (route.source !== 'opentripplanner') return;
    const payload = {
      type: 'istanbul_transport',
      from: route.from,
      to: route.to,
      durationMinutes: route.durationMinutes,
      estimatedCost: route.estimatedCost,
      transferCount: route.transferCount,
      walkingMinutes: route.walkingMinutes,
      vehicles: route.vehicles,
      lines: route.lines,
      routeSteps: route.routeSteps,
      polyline: route.polyline,
      source: 'opentripplanner',
    };
    onSaveRoute?.(payload);
  };

  return (
    <div className="page-stack istanbul-transport-page">
      <section className="page-heading istanbul-heading">
        <div>
          <span className="page-kicker">
            <TramFront size={16} />
            Şehir içi rota planlama
          </span>
          <h1>İstanbul Ulaşım</h1>
          <p>İstanbul içi metro, metrobüs, Marmaray, otobüs, vapur ve yürüyüş bağlantıları için rota alternatifleri.</p>
        </div>
        <aside className="istanbul-live-card">
          <strong>Canlı takip yok</strong>
          <span>Tahmini rota</span>
        </aside>
      </section>

      <section className="panel pro-panel istanbul-search-panel">
        <div className="istanbul-search-grid">
          <PlaceSearchField
            label="Başlangıç noktası"
            value={form.from}
            selectedPlace={origin}
            placeholder="Örn. Marmara Caddesi"
            onValueChange={(value) => {
              setForm((current) => ({ ...current, from: value }));
              setOrigin(null);
              setRoutes([]);
            }}
            onPlaceSelect={(place) => {
              setOrigin(place);
              setForm((current) => ({ ...current, from: place.formattedAddress }));
              setNotice('');
            }}
          />
          <PlaceSearchField
            label="Varış noktası"
            value={form.to}
            selectedPlace={destination}
            placeholder="Örn. Kadıköy"
            onValueChange={(value) => {
              setForm((current) => ({ ...current, to: value }));
              setDestination(null);
              setRoutes([]);
            }}
            onPlaceSelect={(place) => {
              setDestination(place);
              setForm((current) => ({ ...current, to: place.formattedAddress }));
              setNotice('');
            }}
          />
          <label className="field">
            <span>Tarih/Saat seçimi</span>
            <input type="datetime-local" value={form.dateTime} onChange={(event) => setForm((current) => ({ ...current, dateTime: event.target.value }))} />
          </label>
          <label className="field">
            <span>Yolculuk tercihi</span>
            <CustomSelect value={form.preference} options={transportPreferences} onChange={(value) => setForm((current) => ({ ...current, preference: value }))} />
          </label>
        </div>
        <div className="istanbul-search-actions">
          <button type="button" className="ghost-button" onClick={swapLocations}>
            <ArrowLeftRight size={17} />
            Başlangıç/Varış Değiştir
          </button>
          <button type="button" className="primary-button" onClick={findRoutes}>
            {loading ? <Loader2 className="spin-icon" size={17} /> : <Search size={17} />}
            {loading ? 'Rotalar hesaplanıyor...' : 'Rota Bul'}
          </button>
        </div>
        {!transitApiReady && (
          <div className="istanbul-inline-alert warning">
            <AlertCircle size={17} />
            Adres ve harita OpenStreetMap ile çalışıyor. Toplu taşıma rotası için OpenTripPlanner endpoint’i gerekli: `VITE_OTP_BASE_URL`.
          </div>
        )}
        {notice && (
          <div className="istanbul-inline-alert warning">
            <AlertCircle size={17} />
            {notice}
          </div>
        )}
        {error && (
          <div className="istanbul-inline-alert error">
            <AlertCircle size={17} />
            {error}
          </div>
        )}
      </section>

      <section className="istanbul-summary-grid">
        <TransportMetric icon={Clock3} label="En hızlı rota süresi" value={summary.fastest} />
        <TransportMetric icon={Coins} label="En düşük ücret" value={summary.lowestCost} />
        <TransportMetric icon={ListTree} label="En az aktarma" value={summary.leastTransfer} />
        <TransportMetric icon={Footprints} label="Ortalama yürüyüş süresi" value={summary.averageWalk} />
      </section>

      <section className="istanbul-results-layout">
        <div className="istanbul-route-list">
          {loading ? (
            <div className="panel istanbul-empty">
              <Loader2 className="spin-icon" size={24} />
              <strong>Rotalar hesaplanıyor...</strong>
              <span>OpenTripPlanner toplu taşıma alternatiflerini alıyor.</span>
            </div>
          ) : routes.length ? (
            routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                selected={selectedRoute?.id === route.id}
                onSelect={() => setSelectedRouteId(route.id)}
                onSave={() => saveRoute(route)}
              />
            ))
          ) : (
            <div className="panel istanbul-empty">
              <Route size={24} />
              <strong>Gerçek toplu taşıma rotalarını görmek için adres seçip Rota Bul’a basın.</strong>
              <span>Başlangıç ve varış noktaları öneri listesinden seçilmelidir.</span>
            </div>
          )}
        </div>

        <aside className="panel pro-panel istanbul-detail-panel">
          <div className="planner-panel-head">
            <div>
              <h2>Detay Görünümü</h2>
              <span>{selectedRoute ? selectedRoute.title : 'Rota seçilmedi'}</span>
            </div>
          </div>
          {selectedRoute ? (
            <div className="istanbul-timeline">
              {selectedRoute.routeSteps.map((step, index) => (
                <article key={`${step.title}-${index}`}>
                  <b>{index + 1}</b>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.line} · {step.vehicle} · {step.durationMinutes} dk</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="istanbul-detail-empty">Bir rota seçildiğinde durak ve hat adımları burada dikey timeline olarak açılır.</p>
          )}
        </aside>
      </section>

      <IstanbulTransportMap selectedRoute={selectedRoute} origin={origin} destination={destination} />
    </div>
  );
}

function PlaceSearchField({ label, value, selectedPlace, placeholder, onValueChange, onPlaceSelect, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (disabled || selectedPlace || value.trim().length < 3) {
      setSuggestions([]);
      setFieldError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchPlaces(value);
        if (cancelled) return;
        setSuggestions(results);
        setOpen(true);
        setFieldError(results.length ? '' : 'İstanbul içinde sonuç bulunamadı.');
      } catch (searchError) {
        if (cancelled) return;
        console.error('OpenStreetMap place search error', searchError);
        setSuggestions([]);
        setFieldError('Adres önerileri OpenStreetMap’ten alınamadı.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 360);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [disabled, selectedPlace, value]);

  return (
    <label className="field istanbul-place-field">
      <span>{label}</span>
      <div className={`istanbul-place-input ${selectedPlace ? 'selected' : ''}`}>
        <MapPin size={16} />
        <input
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading ? <Loader2 className="spin-icon" size={15} /> : selectedPlace ? <CheckCircle2 size={15} /> : null}
      </div>
      {open && suggestions.length > 0 && (
        <div className="istanbul-place-suggestions">
          {suggestions.map((place) => (
            <button
              type="button"
              key={place.placeId}
              onClick={() => {
                onPlaceSelect(place);
                setOpen(false);
                setSuggestions([]);
              }}
            >
              <MapPin size={15} />
              <span>{place.label}</span>
              <small>{place.secondaryText || place.formattedAddress}</small>
            </button>
          ))}
        </div>
      )}
      {fieldError && <small className="istanbul-place-error">{fieldError}</small>}
    </label>
  );
}

function TransportMetric({ icon: Icon, label, value }) {
  return (
    <article className="istanbul-metric">
      <span>
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function RouteCard({ route, selected, onSelect, onSave }) {
  return (
    <article className={`panel istanbul-route-card ${selected ? 'selected' : ''}`} style={{ '--route-accent': route.accent }} onClick={onSelect}>
      <div className="istanbul-route-card-head">
        <div>
          <span className="istanbul-route-icon">
            <Route size={18} />
          </span>
          <div>
            <h2>{route.title}</h2>
            <p>{route.from} → {route.to}</p>
          </div>
        </div>
        <div className="istanbul-badge-row">
          {route.badges.map((badge) => <span key={badge}>{badge}</span>)}
        </div>
      </div>

      <div className="istanbul-route-stats">
        <span><Clock3 size={15} /> {minutesToDuration(route.durationMinutes)}</span>
        <span><Coins size={15} /> {route.estimatedCostText || 'Ücret bilgisi API’den gelmedi'}</span>
        <span><ListTree size={15} /> {route.transferCount} aktarma</span>
        <span><Footprints size={15} /> {route.walkingMinutes} dk yürüme</span>
      </div>

      <div className="istanbul-lines">
        {route.lines.map((line) => <span key={line}>{line}</span>)}
      </div>

      <ol className="istanbul-step-preview">
        {route.routeSteps.slice(0, 3).map((step) => <li key={step.title}>{step.title}</li>)}
      </ol>

      <div className="istanbul-route-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={(event) => {
            event.stopPropagation();
            onSave();
          }}
        >
          <Save size={16} />
          TravelLog’a Kaydet
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          Detayları Gör
        </button>
      </div>
    </article>
  );
}

function buildSummary(routes) {
  if (!routes.length) {
    return {
      fastest: '-',
      lowestCost: '-',
      leastTransfer: '-',
      averageWalk: '-',
    };
  }
  return {
    fastest: minutesToDuration(Math.min(...routes.map((route) => route.durationMinutes))),
    lowestCost: buildLowestCostLabel(routes),
    leastTransfer: `${Math.min(...routes.map((route) => route.transferCount))} aktarma`,
    averageWalk: `${Math.round(routes.reduce((total, route) => total + route.walkingMinutes, 0) / routes.length)} dk`,
  };
}

function buildLowestCostLabel(routes) {
  const pricedRoutes = routes.filter((route) => route.estimatedCost != null);
  if (!pricedRoutes.length) return 'Tahmini ücret yok';
  return formatCurrency(Math.min(...pricedRoutes.map((route) => route.estimatedCost)));
}
