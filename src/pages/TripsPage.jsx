// Seyahatleri filtrelenebilir tablo halinde listeler ve aksiyonları dışarıya iletir.
import { Download, Eye, FileSpreadsheet, Filter, Pencil, RotateCcw, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import TravelMap from '../components/TravelMap';
import CustomSelect from '../components/ui/CustomSelect';
import { exportTripsToCsv } from '../utils/exporters';
import { downloadTripImportTemplate, exportTripsToXlsx, parseTripWorkbook } from '../utils/excelTransfer';
import { formatCurrency, formatDate, formatKm, isValidDisplayDate, minutesToDuration } from '../utils/formatters';
import { sumBy, toNumber } from '../utils/analytics';
import { locationLabel } from '../utils/location';
import { tripProviderLabel } from '../utils/tripDisplay';
import { getTransportColor, normalizeTransportType } from '../constants/transport';
import { getTripRouteSubtitle, getTripRouteTitle } from '../utils/routeDisplay';
import { includesSearchTerm } from '../utils/search';

const initialFilters = {
  search: '',
  fromDate: '',
  toDate: '',
  transportType: '',
  company: '',
  from: '',
  to: '',
  year: '',
  month: '',
  minKm: '',
  maxKm: '',
  minCost: '',
  maxCost: '',
};

export default function TripsPage({ trips, onEdit, onDelete, onDetail, onNewTrip, onSeed, onImportTrips }) {
  const [filters, setFilters] = useState(initialFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [importState, setImportState] = useState({ open: false, loading: false, message: '' });
  const [selectedMapTripId, setSelectedMapTripId] = useState('');
  const mapPanelRef = useRef(null);

  const transportTypes = useMemo(() => [...new Set(trips.map((trip) => normalizeTransportType(trip.transportType)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr')), [trips]);
  const companies = useMemo(() => uniqueTripValues(trips, 'company'), [trips]);
  const years = useMemo(() => [...new Set(trips.filter((trip) => isValidDisplayDate(trip.date)).map((trip) => new Date(trip.date).getFullYear()))].sort((a, b) => b - a), [trips]);
  const months = useMemo(
    () => [...new Set(trips.filter((trip) => isValidDisplayDate(trip.date)).map((trip) => new Date(trip.date).getMonth() + 1).filter((month) => month >= 1 && month <= 12))].sort((a, b) => a - b),
    [trips],
  );

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      transportType: current.transportType && !transportTypes.includes(current.transportType) ? '' : current.transportType,
      company: current.company && !companies.includes(current.company) ? '' : current.company,
      year: current.year && !years.map(String).includes(current.year) ? '' : current.year,
      month: current.month && !months.map(String).includes(current.month) ? '' : current.month,
    }));
  }, [companies, months, transportTypes, years]);

  const filteredTrips = useMemo(() => {
    const term = filters.search.toLocaleLowerCase('tr-TR');
    return trips
      .filter((trip) => {
        const date = new Date(trip.date);
        const matchesSearch = !term || includesSearchTerm([
          getTripRouteTitle(trip),
          trip.title,
          trip.from,
          trip.to,
          tripProviderLabel(trip),
          trip.company,
          trip.plate,
          trip.vehiclePlate,
          trip.vehicleName,
          trip.licensePlate,
          trip.notes,
          trip.pnr,
          trip.ticketNo,
        ], term);
        const validDate = isValidDisplayDate(trip.date);
        const matchesYear = !filters.year || (validDate && date.getFullYear() === Number(filters.year));
        const matchesMonth = !filters.month || (validDate && date.getMonth() + 1 === Number(filters.month));
        return (
          matchesSearch &&
          (!filters.fromDate || trip.date >= filters.fromDate) &&
          (!filters.toDate || trip.date <= filters.toDate) &&
          (!filters.transportType || normalizeTransportType(trip.transportType) === filters.transportType) &&
          (!filters.company || trip.company === filters.company) &&
          (!filters.from || locationLabel(trip.from).toLocaleLowerCase('tr-TR').includes(filters.from.toLocaleLowerCase('tr-TR'))) &&
          (!filters.to || locationLabel(trip.to).toLocaleLowerCase('tr-TR').includes(filters.to.toLocaleLowerCase('tr-TR'))) &&
          (!filters.minKm || toNumber(trip.distanceKm) >= toNumber(filters.minKm)) &&
          (!filters.maxKm || toNumber(trip.distanceKm) <= toNumber(filters.maxKm)) &&
          (!filters.minCost || toNumber(trip.totalCost) >= toNumber(filters.minCost)) &&
          (!filters.maxCost || toNumber(trip.totalCost) <= toNumber(filters.maxCost)) &&
          matchesYear &&
          matchesMonth
        );
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [filters, trips]);

  const filteredKm = sumBy(filteredTrips, 'distanceKm');
  const filteredCost = sumBy(filteredTrips, 'totalCost');
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const selectedMapTrip = filteredTrips.find((trip) => trip.id === selectedMapTripId) || null;
  const selectedRouteUsage = selectedMapTrip ? filteredTrips.filter((trip) => getTripRouteTitle(trip) === getTripRouteTitle(selectedMapTrip)).length : 0;
  const mapTrips = selectedMapTrip ? [selectedMapTrip] : filteredTrips;
  const resetFilters = () => setFilters(initialFilters);
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const selectTripOnMap = (trip) => {
    setSelectedMapTripId(trip.id);
    const rect = mapPanelRef.current?.getBoundingClientRect();
    if (rect && (rect.top < 86 || rect.bottom > window.innerHeight)) {
      mapPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (selectedMapTripId && !filteredTrips.some((trip) => trip.id === selectedMapTripId)) setSelectedMapTripId('');
  }, [filteredTrips, selectedMapTripId]);

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportState({ open: true, loading: true, message: 'Excel dosyası okunuyor...' });
    try {
      const rows = await parseTripWorkbook(file);
      if (!rows.length) throw new Error('Dosyada içe aktarılacak seyahat bulunamadı.');
      await onImportTrips(rows);
      setImportState({ open: true, loading: false, message: `${rows.length} satır içe aktarıldı.` });
    } catch (error) {
      setImportState({ open: true, loading: false, message: error?.message || 'Import başarısız oldu.' });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>Seyahatler</h1>
          <p>Geçmiş seyahatleri arayın, filtreleyin, düzenleyin veya dışa aktarın.</p>
        </div>
        <div className="button-row trips-actions">
          <button className="secondary-button" onClick={() => exportTripsToXlsx(filteredTrips)}>
            <FileSpreadsheet size={17} />
            Excel dışa aktar
          </button>
          <button className="ghost-button" onClick={() => exportTripsToCsv(filteredTrips)}>
            <Download size={17} />
            CSV
          </button>
          <button className="ghost-button" onClick={downloadTripImportTemplate}>
            Şablon indir
          </button>
          <label className="primary-button import-button">
            <Upload size={17} />
            Excel içe aktar
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} />
          </label>
        </div>
      </section>

      {importState.open && (
        <section className="panel import-status">
          <strong>Toplu veri girişi</strong>
          <span>{importState.loading ? 'İşleniyor...' : importState.message}</span>
        </section>
      )}

      {!trips.length && <EmptyState onPrimary={onNewTrip} onSeed={onSeed} />}

      <section className="trips-filter-bar">
        <div className="trips-filter-primary">
          <label className="trips-search">
            <Search size={18} />
            <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Şehir, firma, PNR veya not ara..." />
            {filters.search && (
              <button type="button" onClick={() => updateFilter('search', '')} aria-label="Aramayı temizle">
                <X size={15} />
              </button>
            )}
          </label>
          <CustomSelect
            value={filters.transportType}
            options={['', ...transportTypes].map((value) => ({ value, label: value || 'Tüm ulaşım' }))}
            onChange={(value) => updateFilter('transportType', value)}
          />
          <CustomSelect
            value={filters.company}
            options={['', ...companies].map((value) => ({ value, label: value || 'Tüm firmalar' }))}
            onChange={(value) => updateFilter('company', value)}
          />
          <button type="button" className={`filter-toggle ${advancedOpen ? 'active' : ''}`} onClick={() => setAdvancedOpen((value) => !value)}>
            <SlidersHorizontal size={17} />
            Detaylı Filtre
            {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
          </button>
        </div>

        {activeFilterCount > 0 && (
          <div className="filter-chip-row">
            <Filter size={15} />
            <span>{filteredTrips.length} kayıt listeleniyor</span>
            {Object.entries(filters)
              .filter(([, value]) => Boolean(value))
              .slice(0, 6)
              .map(([key, value]) => (
                <button type="button" key={key} onClick={() => updateFilter(key, '')}>
                  {filterLabel(key, value)}
                  <X size={13} />
                </button>
              ))}
            <button type="button" className="clear-filters" onClick={resetFilters}>
              <RotateCcw size={14} />
              Temizle
            </button>
          </div>
        )}

        {advancedOpen && (
          <div className="trips-advanced-filters">
            <label>
              <span>Tarih başlangıç</span>
              <input type="date" value={filters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} />
            </label>
            <label>
              <span>Tarih bitiş</span>
              <input type="date" value={filters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} />
            </label>
            <label>
              <span>Başlangıç</span>
              <input value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} placeholder="Şehir veya nokta" />
            </label>
            <label>
              <span>Varış</span>
              <input value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} placeholder="Şehir veya nokta" />
            </label>
            <label>
              <span>Yıl</span>
              <CustomSelect value={filters.year} options={['', ...years.map(String)].map((value) => ({ value, label: value || 'Tüm yıllar' }))} onChange={(value) => updateFilter('year', value)} />
            </label>
            <label>
              <span>Ay</span>
              <CustomSelect value={filters.month} options={['', ...months.map(String)].map((value) => ({ value, label: value || 'Tüm aylar' }))} onChange={(value) => updateFilter('month', value)} />
            </label>
            <label>
              <span>Min km</span>
              <input type="number" value={filters.minKm} onChange={(event) => updateFilter('minKm', event.target.value)} placeholder="0" />
            </label>
            <label>
              <span>Max km</span>
              <input type="number" value={filters.maxKm} onChange={(event) => updateFilter('maxKm', event.target.value)} placeholder="Sınır yok" />
            </label>
            <label>
              <span>Min maliyet</span>
              <input type="number" value={filters.minCost} onChange={(event) => updateFilter('minCost', event.target.value)} placeholder="₺" />
            </label>
            <label>
              <span>Max maliyet</span>
              <input type="number" value={filters.maxCost} onChange={(event) => updateFilter('maxCost', event.target.value)} placeholder="₺" />
            </label>
          </div>
        )}
      </section>
      {trips.length > 0 && (
        <section className="filter-summary">
          <strong>{filteredTrips.length} kayıt</strong>
          <span>Filtrelenmiş km: {formatKm(filteredKm)}</span>
          <span>Filtrelenmiş masraf: {formatCurrency(filteredCost)}</span>
        </section>
      )}

      {trips.length > 0 && (
        <section className="panel pro-panel featured-map trips-map-panel" ref={mapPanelRef}>
          {selectedMapTrip && (
            <div className="trips-map-selection">
              <div>
                <strong>{getTripRouteTitle(selectedMapTrip)}</strong>
                <span>{formatKm(selectedMapTrip.distanceKm)} · {minutesToDuration(selectedMapTrip.durationMinutes)} · {formatCurrency(selectedMapTrip.totalCost, selectedMapTrip.currency)} · {normalizeTransportType(selectedMapTrip.transportType)} · {tripProviderLabel(selectedMapTrip)} · {selectedRouteUsage} kullanım</span>
              </div>
              <button type="button" className="ghost-button" onClick={() => setSelectedMapTripId('')}>
                Tüm rotalar
              </button>
            </div>
          )}
          <TravelMap trips={mapTrips} dashboard theme="dark" onRouteSelect={onDetail} selectedTripId={selectedMapTripId} onRouteFocus={(trip) => setSelectedMapTripId(trip?.id || '')} preserveMapOnEmpty />
        </section>
      )}

      {trips.length > 0 && (
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Rota</th>
                <th>Ulaşım</th>
                <th>Firma</th>
                <th>Süre</th>
                <th>Km</th>
                <th>Masraf</th>
                <th>Km başı</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => (
                <tr
                  key={trip.id}
                  className={selectedMapTripId === trip.id ? 'selected-trip-row' : ''}
                  onClick={() => selectTripOnMap(trip)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectTripOnMap(trip);
                    }
                  }}
                >
                  <td>{formatDate(trip.date)}</td>
                  <td>
                    <strong>{getTripRouteTitle(trip)}</strong>
                    {getTripRouteSubtitle(trip) ? <small>{getTripRouteSubtitle(trip)}</small> : null}
                  </td>
                  <td><span className="transport-pill" style={{ '--transport-color': getTransportColor(trip.transportType) }}>{normalizeTransportType(trip.transportType)}</span></td>
                  <td>{tripProviderLabel(trip)}</td>
                  <td>{minutesToDuration(trip.durationMinutes)}</td>
                  <td>{formatKm(trip.distanceKm)}</td>
                  <td>{formatCurrency(trip.totalCost, trip.currency)}</td>
                  <td>{formatCurrency(trip.costPerKm, trip.currency)}</td>
                  <td className="row-actions">
                    <button className="icon-button" title="Detay" onClick={(event) => { event.stopPropagation(); onDetail(trip); }}>
                      <Eye size={17} />
                    </button>
                    <button className="icon-button" title="Düzenle" onClick={(event) => { event.stopPropagation(); onEdit(trip); }}>
                      <Pencil size={17} />
                    </button>
                    <button className="icon-button danger" title="Sil" onClick={(event) => { event.stopPropagation(); onDelete(trip); }}>
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredTrips.length && (
                <tr>
                  <td colSpan="9" className="empty-cell">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}

function uniqueTripValues(trips, key) {
  return [...new Set(trips.map((trip) => String(trip[key] || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
}

function filterLabel(key, value) {
  const labels = {
    search: 'Ara',
    fromDate: 'Başlangıç tarih',
    toDate: 'Bitiş tarih',
    transportType: 'Ulaşım',
    company: 'Firma',
    from: 'Başlangıç',
    to: 'Varış',
    year: 'Yıl',
    month: 'Ay',
    minKm: 'Min km',
    maxKm: 'Max km',
    minCost: 'Min maliyet',
    maxCost: 'Max maliyet',
  };
  return `${labels[key] || key}: ${value}`;
}
