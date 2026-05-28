// Tam ekran seyahat haritası ve rota analiz paneli.
import { MapPin, Pencil, Plus, Route, Save, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CustomSelect from '../components/ui/CustomSelect';
import TravelMap from '../components/TravelMap';
import { geocodeLocationText } from '../services/routeDistanceService';
import { createStats, toNumber } from '../utils/analytics';
import { formatCurrency, formatKm, isValidDisplayDate } from '../utils/formatters';
import { findTravelLocation } from '../utils/locations';
import { normalizeTransportType } from '../constants/transport';
import { getTripRouteTitle } from '../utils/routeDisplay';

const locationTypes = ['Ev', 'İş', 'Otogar', 'Havalimanı', 'Gar', 'Diğer'];

export default function MapPage({ trips, savedLocations = [], onSaveLocation, onDeleteLocation }) {
  const [mode, setMode] = useState('locations');
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('travellog:mapTheme') || 'dark');
  const [filters, setFilters] = useState({ year: '', month: '', transportType: '', company: '' });
  const [draftLocation, setDraftLocation] = useState({ name: '', type: 'Ev', lat: '', lng: '', notes: '' });
  const [geocoding, setGeocoding] = useState(false);
  const years = useMemo(() => [...new Set(trips.filter((trip) => isValidDisplayDate(trip.date)).map((trip) => new Date(trip.date).getFullYear()))].sort((a, b) => b - a), [trips]);
  const months = useMemo(
    () => [...new Set(trips.filter((trip) => isValidDisplayDate(trip.date)).map((trip) => new Date(trip.date).getMonth() + 1).filter((month) => month >= 1 && month <= 12))].sort((a, b) => a - b),
    [trips],
  );
  const transportTypes = useMemo(() => [...new Set(trips.map((trip) => normalizeTransportType(trip.transportType)).filter(Boolean))], [trips]);
  const companies = useMemo(() => uniqueTripValues(trips, 'company'), [trips]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      year: current.year && !years.map(String).includes(current.year) ? '' : current.year,
      month: current.month && !months.map(String).includes(current.month) ? '' : current.month,
      transportType: current.transportType && !transportTypes.includes(current.transportType) ? '' : current.transportType,
      company: current.company && !companies.includes(current.company) ? '' : current.company,
    }));
  }, [companies, months, transportTypes, years]);

  useEffect(() => {
    localStorage.setItem('travellog:mapTheme', mapTheme);
  }, [mapTheme]);

  const filtered = useMemo(
    () =>
      trips.filter((trip) => {
        const date = new Date(trip.date);
        const validDate = isValidDisplayDate(trip.date);
        return (
          (!filters.year || (validDate && date.getFullYear() === Number(filters.year))) &&
          (!filters.month || (validDate && date.getMonth() + 1 === Number(filters.month))) &&
          (!filters.transportType || normalizeTransportType(trip.transportType) === filters.transportType) &&
          (!filters.company || trip.company === filters.company)
        );
      }),
    [filters, trips],
  );
  const stats = createStats(filtered);
  const longest = useMemo(() => getLongestRouteSummary(filtered), [filtered]);
  const expensive = [...filtered].sort((a, b) => toNumber(b.totalCost) - toNumber(a.totalCost))[0];
  const hasDraftCoords = Number.isFinite(Number(draftLocation.lat)) && Number.isFinite(Number(draftLocation.lng));

  return (
    <div className="page-stack map-page">
      <section className="page-heading">
        <div>
          <h1>Harita</h1>
          <p>{mode === 'routes' ? 'Türkiye geneli tüm yolculuklar, filtreler ve rota istihbaratı.' : 'Konum arayın, pinleyin ve seyahat formunda hızlıca kullanın.'}</p>
        </div>
        <div className="map-mode-switch" role="tablist" aria-label="Harita modu">
          <button type="button" className={mode === 'routes' ? 'active' : ''} onClick={() => setMode('routes')}>
            <Route size={16} />
            Rotalar
          </button>
          <button type="button" className={mode === 'locations' ? 'active' : ''} onClick={() => setMode('locations')}>
            <MapPin size={16} />
            Konumlar
          </button>
        </div>
      </section>
      {mode === 'routes' && (
        <section className="panel map-filter-panel">
          <CustomSelect value={filters.year} options={['', ...years.map(String)].map((value) => ({ value, label: value || 'Tüm yıllar' }))} onChange={(value) => setFilters({ ...filters, year: value })} />
          <CustomSelect value={filters.month} options={['', ...months.map(String)].map((value) => ({ value, label: value || 'Tüm aylar' }))} onChange={(value) => setFilters({ ...filters, month: value })} />
          <CustomSelect value={filters.transportType} options={['', ...transportTypes].map((value) => ({ value, label: value || 'Tüm ulaşım' }))} onChange={(value) => setFilters({ ...filters, transportType: value })} />
          <CustomSelect value={filters.company} options={['', ...companies].map((value) => ({ value, label: value || 'Tüm firmalar' }))} onChange={(value) => setFilters({ ...filters, company: value })} />
        </section>
      )}
      <div className="map-analysis-grid">
        <section className="panel pro-panel">
          <TravelMap
            trips={mode === 'routes' ? filtered : []}
            savedLocations={savedLocations}
            selectedLocation={hasDraftCoords ? draftLocation : null}
            showRoutes={mode === 'routes'}
            theme={mode === 'routes' ? 'dark' : mapTheme}
            onThemeChange={mode === 'routes' ? undefined : setMapTheme}
            onLocationPick={(coords) =>
              {
                setMode('locations');
                setDraftLocation((current) => ({
                  ...current,
                  lat: coords.lat.toFixed(6),
                  lng: coords.lng.toFixed(6),
                  provider: 'map-click',
                }));
              }
            }
            onSavedLocationSelect={(location) => {
              setMode('locations');
              setDraftLocation({
                name: location.name || '',
                type: location.type || 'Kayıtlı',
                lat: location.lat,
                lng: location.lng,
                city: location.city || '',
                district: location.district || '',
                provider: location.provider || 'saved',
                notes: location.notes || '',
                id: location.id,
              });
            }}
          />
        </section>
        <aside className="panel map-side-panel">
          {mode === 'routes' ? (
            <>
              <h2>Rota Özeti</h2>
              <Metric label="Seyahat sayısı" value={stats.totalTrips} />
              <Metric label="Toplam km" value={formatKm(stats.totalKm)} />
              <Metric label="Toplam masraf" value={formatCurrency(stats.totalCost)} />
              <Metric label="En uzun rota" value={longest ? `${longest.title} · ${formatKm(longest.distanceKm)}` : '-'} />
              <Metric label="En pahalı rota" value={expensive ? `${getTripRouteTitle(expensive)} · ${formatCurrency(expensive.totalCost)}` : '-'} />
            </>
          ) : (
            <LocationSidePanel
              draftLocation={draftLocation}
              savedLocations={savedLocations}
              geocoding={geocoding}
              onDraftChange={setDraftLocation}
              onLocate={() => locateDraftLocation(draftLocation, setDraftLocation, setGeocoding)}
              onSave={async () => {
                if (!draftLocation.name) return;
                const location = await completeLocationDraft(draftLocation, setGeocoding);
                if (!location) return;
                await onSaveLocation?.({
                  ...location,
                  provider: location.provider || 'saved',
                });
                setDraftLocation({ name: '', type: 'Ev', lat: '', lng: '', notes: '' });
              }}
            />
          )}
        </aside>
      </div>
      {mode === 'locations' && (
        <SavedLocationsPanel
          draftLocation={draftLocation}
          savedLocations={savedLocations}
          onDelete={(location) => {
            onDeleteLocation?.(location);
            if (draftLocation.id === location.id) setDraftLocation({ name: '', type: 'Ev', lat: '', lng: '', notes: '' });
          }}
          onSelect={(location) =>
            setDraftLocation({
              name: location.name || '',
              type: location.type || 'Kayıtlı',
              lat: location.lat,
              lng: location.lng,
              city: location.city || '',
              district: location.district || '',
              provider: location.provider || 'saved',
              notes: location.notes || '',
              id: location.id,
            })
          }
        />
      )}
    </div>
  );
}

function uniqueTripValues(trips, key) {
  return [...new Set(trips.map((trip) => String(trip[key] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
}

function getLongestRouteSummary(trips = []) {
  const grouped = trips.reduce((acc, trip) => {
    const title = getTripRouteTitle(trip);
    const distanceKm = toNumber(trip.distanceKm);
    if (!title || distanceKm <= 0) return acc;
    acc[title] ||= [];
    acc[title].push(distanceKm);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([title, distances]) => ({
      title,
      distanceKm: representativeRouteDistance(distances),
    }))
    .sort((a, b) => b.distanceKm - a.distanceKm)[0] || null;
}

function representativeRouteDistance(distances = []) {
  const sorted = distances.filter((value) => value > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function completeLocationDraft(draftLocation, setGeocoding) {
  const directLat = Number(draftLocation.lat);
  const directLng = Number(draftLocation.lng);
  if (Number.isFinite(directLat) && Number.isFinite(directLng)) {
    return { ...draftLocation, lat: directLat, lng: directLng };
  }

  const localLocation = findTravelLocation(draftLocation.name);
  if (localLocation?.lat && localLocation?.lng) {
    return {
      ...draftLocation,
      ...localLocation,
      name: draftLocation.name || localLocation.name,
      type: draftLocation.type || localLocation.type,
      notes: draftLocation.notes,
      lat: Number(localLocation.lat),
      lng: Number(localLocation.lng),
    };
  }

  setGeocoding(true);
  try {
    const geocoded = await geocodeLocationText(draftLocation.name);
    if (!geocoded?.lat || !geocoded?.lng) return null;
    return {
      ...draftLocation,
      ...geocoded,
      name: draftLocation.name,
      type: draftLocation.type || geocoded.type,
      notes: draftLocation.notes,
      lat: Number(geocoded.lat),
      lng: Number(geocoded.lng),
    };
  } finally {
    setGeocoding(false);
  }
}

async function locateDraftLocation(draftLocation, setDraftLocation, setGeocoding) {
  const location = await completeLocationDraft(draftLocation, setGeocoding);
  if (!location) return;
  setDraftLocation((current) => ({
    ...current,
    ...location,
    name: current.name || location.name,
    type: current.type || location.type,
    notes: current.notes,
  }));
}

function LocationSidePanel({ draftLocation, geocoding, onDraftChange, onLocate, onSave }) {
  const hasCoords = Number.isFinite(Number(draftLocation.lat)) && Number.isFinite(Number(draftLocation.lng));
  const isEditing = Boolean(draftLocation.id);
  const clearDraft = () => onDraftChange({ name: '', type: 'Ev', lat: '', lng: '', notes: '' });
  return (
    <>
      <div className="location-panel-head">
        <h2>Konumlar</h2>
        <button type="button" className="ghost-button" onClick={clearDraft}>
          <Plus size={15} />
          Yeni
        </button>
      </div>
      <div className="location-draft-card">
        {isEditing && (
          <div className="location-edit-banner">
            <Pencil size={15} />
            <span>Kaydı düzenliyorsunuz</span>
            <button type="button" onClick={clearDraft} title="Düzenlemeyi bırak">
              <X size={14} />
            </button>
          </div>
        )}
        <label className="field">
          <span>Konum adı</span>
          <input value={draftLocation.name} placeholder="Ev, ofis, otogar..." onChange={(event) => onDraftChange((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label className="field">
          <span>Tip</span>
          <CustomSelect value={draftLocation.type} options={locationTypes} onChange={(value) => onDraftChange((current) => ({ ...current, type: value }))} />
        </label>
        <label className="field">
          <span>Not</span>
          <input value={draftLocation.notes || ''} placeholder="Opsiyonel" onChange={(event) => onDraftChange((current) => ({ ...current, notes: event.target.value }))} />
        </label>
        <div className={`location-status ${hasCoords ? 'ready' : ''}`}>
          {hasCoords ? `${Number(draftLocation.lat).toFixed(4)}, ${Number(draftLocation.lng).toFixed(4)}` : 'Konum seçilmedi'}
        </div>
        <div className="location-action-row">
          <button type="button" className="secondary-button" disabled={geocoding || !draftLocation.name} onClick={onLocate}>
            <Search size={16} />
            {geocoding ? 'Aranıyor...' : 'Göster'}
          </button>
          <button type="button" className="primary-button" disabled={geocoding || !draftLocation.name} onClick={onSave}>
            <Save size={16} />
            {isEditing ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </>
  );
}

function SavedLocationsPanel({ draftLocation, savedLocations, onDelete, onSelect }) {
  return (
    <section className="panel saved-locations-panel">
      <div className="saved-locations-head">
        <div>
          <h2>Kayıtlı konumlar</h2>
          <p>Seyahat formunda hızlı seçmek veya haritada odaklanmak için kayıtlı noktalar.</p>
        </div>
        <strong>{savedLocations.length} kayıt</strong>
      </div>
      <div className="saved-location-stack">
        {savedLocations.map((location) => (
          <article key={location.id} className={`saved-location-card ${draftLocation.id === location.id ? 'selected' : ''}`}>
            <button type="button" className="saved-location-main" onClick={() => onSelect(location)}>
              <MapPin size={16} />
              <span>
                <strong>{location.name}</strong>
                <small>{location.type || 'Kayıtlı'} · {Number(location.lat).toFixed(4)}, {Number(location.lng).toFixed(4)}</small>
              </span>
            </button>
            <button type="button" className="icon-button" title="Düzenle" onClick={() => onSelect(location)}>
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className="icon-button danger"
              title="Sil"
              onClick={() => {
                onDelete?.(location);
              }}
            >
              <Trash2 size={15} />
            </button>
          </article>
        ))}
        {!savedLocations.length && <p className="saved-location-empty">Henüz kayıtlı konum yok.</p>}
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="map-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
