// Seyahatleri filtrelenebilir tablo halinde listeler ve aksiyonları dışarıya iletir.
import { Download, Eye, FileSpreadsheet, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TRANSPORT_TYPES } from '../constants/travel';
import EmptyState from '../components/EmptyState';
import { exportTripsToCsv } from '../utils/exporters';
import { downloadTripImportTemplate, exportTripsToXlsx, parseTripWorkbook } from '../utils/excelTransfer';
import { formatCurrency, formatDate, formatKm, minutesToDuration } from '../utils/formatters';
import { sumBy, toNumber } from '../utils/analytics';
import { locationLabel, routeLabel } from '../utils/location';

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

export default function TripsPage({ trips, companies, onEdit, onDelete, onDetail, onNewTrip, onSeed, onImportTrips }) {
  const [filters, setFilters] = useState(initialFilters);
  const [importState, setImportState] = useState({ open: false, loading: false, message: '' });

  const filteredTrips = useMemo(() => {
    const term = filters.search.toLocaleLowerCase('tr-TR');
    return trips
      .filter((trip) => {
        const date = new Date(trip.date);
        const matchesSearch = !term || [trip.title, trip.from, trip.to, trip.company, trip.notes, trip.pnr].join(' ').toLocaleLowerCase('tr-TR').includes(term);
        const matchesYear = !filters.year || date.getFullYear() === Number(filters.year);
        const matchesMonth = !filters.month || date.getMonth() + 1 === Number(filters.month);
        return (
          matchesSearch &&
          (!filters.fromDate || trip.date >= filters.fromDate) &&
          (!filters.toDate || trip.date <= filters.toDate) &&
          (!filters.transportType || trip.transportType === filters.transportType) &&
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

  const years = [...new Set(trips.map((trip) => new Date(trip.date).getFullYear()).filter(Boolean))].sort((a, b) => b - a);
  const filteredKm = sumBy(filteredTrips, 'distanceKm');
  const filteredCost = sumBy(filteredTrips, 'totalCost');

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

      <section className="panel filters-panel">
        <label className="search-input">
          <Search size={17} />
          <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Ara: şehir, firma, PNR, not" />
        </label>
        <input type="date" value={filters.fromDate} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} />
        <input type="date" value={filters.toDate} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} />
        <select value={filters.transportType} onChange={(event) => setFilters({ ...filters, transportType: event.target.value })}>
          <option value="">Ulaşım türü</option>
          {TRANSPORT_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <select value={filters.company} onChange={(event) => setFilters({ ...filters, company: event.target.value })}>
          <option value="">Firma</option>
          {companies.map((company) => (
            <option key={company}>{company}</option>
          ))}
        </select>
        <input value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} placeholder="Başlangıç" />
        <input value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} placeholder="Varış" />
        <select value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
          <option value="">Yıl</option>
          {years.map((year) => (
            <option key={year}>{year}</option>
          ))}
        </select>
        <select value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })}>
          <option value="">Ay</option>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
        <input type="number" value={filters.minKm} onChange={(event) => setFilters({ ...filters, minKm: event.target.value })} placeholder="Min km" />
        <input type="number" value={filters.maxKm} onChange={(event) => setFilters({ ...filters, maxKm: event.target.value })} placeholder="Max km" />
        <input type="number" value={filters.minCost} onChange={(event) => setFilters({ ...filters, minCost: event.target.value })} placeholder="Min maliyet" />
        <input type="number" value={filters.maxCost} onChange={(event) => setFilters({ ...filters, maxCost: event.target.value })} placeholder="Max maliyet" />
      </section>
      {trips.length > 0 && (
        <section className="filter-summary">
          <strong>{filteredTrips.length} kayıt</strong>
          <span>Filtrelenmiş km: {formatKm(filteredKm)}</span>
          <span>Filtrelenmiş masraf: {formatCurrency(filteredCost)}</span>
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
                <tr key={trip.id}>
                  <td>{formatDate(trip.date)}</td>
                  <td>
                    <strong>{routeLabel(trip)}</strong>
                    <small>{trip.title}</small>
                  </td>
                  <td>{trip.transportType}</td>
                  <td>{trip.company || '-'}</td>
                  <td>{minutesToDuration(trip.durationMinutes)}</td>
                  <td>{formatKm(trip.distanceKm)}</td>
                  <td>{formatCurrency(trip.totalCost, trip.currency)}</td>
                  <td>{formatCurrency(trip.costPerKm, trip.currency)}</td>
                  <td className="row-actions">
                    <button className="icon-button" title="Detay" onClick={() => onDetail(trip)}>
                      <Eye size={17} />
                    </button>
                    <button className="icon-button" title="Düzenle" onClick={() => onEdit(trip)}>
                      <Pencil size={17} />
                    </button>
                    <button className="icon-button danger" title="Sil" onClick={() => onDelete(trip)}>
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
