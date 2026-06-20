// Araç ve firma gibi küçük kullanıcı koleksiyonlarını yönetir.
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { companyStats, vehicleStats } from '../utils/analytics';
import { formatCurrency, formatKm } from '../utils/formatters';
import { formatDate } from '../utils/formatters';
import { formatPlate } from '../utils/plateFormatter';
import CustomSelect from '../components/ui/CustomSelect';
import { getTripRouteTitle } from '../utils/routeDisplay';

const fuelTypes = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik', 'Diğer'];
const companyCategories = ['Otobüs', 'Uçak', 'Tren', 'Araç kiralama', 'Diğer'];

export default function SimpleDirectoryPage({ title, description, items, fields, onSave, onDelete, onDetail, onNewTrip, onSeed, trips = [], type }) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const formRef = useRef(null);
  const selectedItem = items.find((item) => item.id === selectedId) || items[0];
  const selectedStats = selectedItem ? (type === 'vehicles' ? vehicleStats(trips, selectedItem) : companyStats(trips, selectedItem)) : null;
  const vehicleGroups = type === 'vehicles' ? groupVehiclesByFleet(items, trips) : [];

  const submit = async (event) => {
    event.preventDefault();
    if (!fields.some((field) => String(form[field.key] || '').trim())) return;
    const payload =
      type === 'vehicles'
        ? {
            ...form,
            plate: formatPlate(form.plate || ''),
            name: String(form.name || '').trim(),
          }
        : form;
    await onSave(editingId ? { ...payload, id: editingId } : payload);
    setForm({});
    setEditingId('');
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ ...item });
    scrollDirectoryToTop('smooth');
    requestAnimationFrame(() => {
      scrollDirectoryToTop('smooth');
      formRef.current?.querySelector('input, button, [tabindex]:not([tabindex="-1"])')?.focus?.({ preventScroll: true });
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setForm({});
  };

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <form className="panel inline-form" ref={formRef} onSubmit={submit}>
        {fields.map((field) => (
          <label key={field.key} className="field">
            <span>{field.label}</span>
            {field.key === 'fuelType' ? (
              <CustomSelect value={form[field.key] || ''} options={fuelTypes} placeholder="Yakıt türü" onChange={(value) => setForm({ ...form, [field.key]: value })} />
            ) : field.key === 'category' ? (
              <CustomSelect value={form[field.key] || ''} options={companyCategories} placeholder="Kategori" onChange={(value) => setForm({ ...form, [field.key]: value })} />
            ) : (
              <input
                value={form[field.key] || ''}
                onChange={(event) =>
                  setForm({ ...form, [field.key]: field.key === 'plate' ? formatPlate(event.target.value) : event.target.value })
                }
              />
            )}
          </label>
        ))}
        <button className="primary-button">
          <Plus size={17} />
          {editingId ? 'Güncelle' : 'Ekle'}
        </button>
        {editingId && (
          <button type="button" className="ghost-button" onClick={cancelEdit}>
            <X size={17} />
            Vazgeç
          </button>
        )}
      </form>
      {!items.length && <EmptyState title="Henüz kayıt yok" onPrimary={onNewTrip} onSeed={onSeed} />}
      {items.length > 0 && type === 'vehicles' && (
        <section className="vehicle-workbench">
          <div className="vehicle-fleet-list">
            {vehicleGroups.map((group) => (
              <section className="vehicle-fleet-group" key={group.name}>
                <div className="vehicle-fleet-head">
                  <div>
                    <span>Filo</span>
                    <strong>{group.name}</strong>
                  </div>
                  <small>{group.items.length} araç · {group.stats.count} seyahat · {formatKm(group.stats.km)}</small>
                </div>
                <div className="vehicle-card-grid">
                  {group.items.map((item, index) => {
                    const stats = vehicleStats(trips, item);
                    const plate = formatPlate(item.plate || '-');
                    return (
                      <button
                        type="button"
                        className={`panel vehicle-plate-card ${selectedItem?.id === item.id ? 'selected' : ''}`}
                        key={item.id || index}
                        onClick={() => setSelectedId(item.id)}
                      >
                        <div className="card-actions">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              startEdit(item);
                            }}
                          >
                            <Pencil size={15} />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              onDelete?.(item);
                            }}
                          >
                            <Trash2 size={15} />
                          </span>
                        </div>
                        <strong>{plate}</strong>
                        <span>{[item.brand, item.model, item.fuelType].filter(Boolean).join(' · ') || 'Araç bilgisi eksik'}</span>
                        <div className="vehicle-card-metrics">
                          <small>{stats.count} seyahat</small>
                          <small>{formatKm(stats.km)}</small>
                          <small>{formatCurrency(stats.cost)}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          {selectedItem && selectedStats && (
            <section className="panel vehicle-detail-panel">
              <div className="vehicle-detail-head">
                <div>
                  <span>Seçili plaka</span>
                  <h2>{formatPlate(selectedItem.plate || '') || '-'}</h2>
                  <p>{[vehicleFleetName(selectedItem), selectedItem.brand, selectedItem.model, selectedItem.fuelType].filter(Boolean).join(' · ')}</p>
                </div>
                <strong>{formatCurrency(selectedStats.averageCostPerKm)} / km</strong>
              </div>
              <div className="vehicle-detail-grid">
                <Metric label="Seyahat" value={selectedStats.count} />
                <Metric label="Toplam km" value={formatKm(selectedStats.km)} />
                <Metric label="Toplam harcama" value={formatCurrency(selectedStats.cost)} />
                <Metric label="Yakıt" value={formatCurrency(selectedStats.fuelCost)} />
                <Metric label="Yol + köprü + otopark" value={formatCurrency(selectedStats.roadCost + selectedStats.bridgeCost + selectedStats.parkingCost)} />
                <Metric label="Diğer" value={formatCurrency(selectedStats.otherCost)} />
              </div>
              <div className="vehicle-trip-list">
                <h3>Bu plakaya bağlı seyahatler</h3>
                {selectedStats.trips.length ? (
                  selectedStats.trips.slice(0, 8).map((trip) => (
                    <button type="button" className="vehicle-trip-item" key={trip.id} onClick={() => onDetail?.(trip)}>
                      <div>
                        <strong>{getTripRouteTitle(trip)}</strong>
                        <span>{formatDate(trip.date)} · {trip.transportType}</span>
                      </div>
                      <b>{formatKm(trip.distanceKm)}</b>
                      <b>{formatCurrency(trip.totalCost, trip.currency)}</b>
                    </button>
                  ))
                ) : (
                  <p>Bu plakaya bağlı seyahat kaydı yok. Yeni seyahat eklerken araç panelinden bu plakayı seç.</p>
                )}
              </div>
            </section>
          )}
        </section>
      )}
      {items.length > 0 && type !== 'vehicles' && (
        <section className="directory-grid">
          {items.map((item, index) => {
            const stats = type === 'vehicles' ? vehicleStats(trips, item) : companyStats(trips, item);
            return (
              <article className="panel directory-card" key={item.id || index}>
                <div className="card-actions">
                  <button type="button" className="icon-button" title="Düzenle" onClick={() => startEdit(item)}>
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="icon-button danger" title="Sil" onClick={() => onDelete?.(item)}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <strong>{item.name || item.plate}</strong>
                <span>{item.plate || item.category || item.website || '-'}</span>
                <div>
                  <small>Seyahat</small>
                  <b>{stats.count}</b>
                </div>
                <div>
                  <small>Toplam km</small>
                  <b>{formatKm(stats.km)}</b>
                </div>
                <div>
                  <small>Toplam harcama</small>
                  <b>{formatCurrency(stats.cost)}</b>
                </div>
                <div>
                  <small>{type === 'vehicles' ? 'Yakıt + yol' : 'Ortalama bilet'}</small>
                  <b>{formatCurrency(type === 'vehicles' ? stats.fuelCost + stats.roadCost + stats.bridgeCost + stats.parkingCost : stats.averageTicket)}</b>
                </div>
              </article>
            );
          })}
        </section>
      )}
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field.key}>{field.label}</th>
                ))}
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index}>
                  {fields.map((field) => (
                    <td key={field.key}>{field.key === 'plate' ? formatPlate(item[field.key] || '') || '-' : item[field.key] || '-'}</td>
                  ))}
                  <td className="row-actions">
                    <button className="icon-button" title="Düzenle" onClick={() => startEdit(item)}>
                      <Pencil size={16} />
                    </button>
                    <button className="icon-button danger" title="Sil" onClick={() => onDelete?.(item)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function vehicleFleetName(vehicle) {
  return String(vehicle?.name || '').trim() || 'Filo adı yok';
}

function groupVehiclesByFleet(items, trips) {
  const groups = items.reduce((acc, item) => {
    const key = vehicleFleetName(item);
    acc[key] ||= { name: key, items: [], stats: emptyVehicleGroupStats() };
    const stats = vehicleStats(trips, item);
    acc[key].items.push(item);
    acc[key].stats.count += stats.count;
    acc[key].stats.km += stats.km;
    acc[key].stats.cost += stats.cost;
    return acc;
  }, {});

  return Object.values(groups)
    .map((group) => ({
      ...group,
      stats: {
        ...group.stats,
        averageCostPerKm: group.stats.km ? group.stats.cost / group.stats.km : 0,
      },
      items: group.items.sort((a, b) => String(a.plate || '').localeCompare(String(b.plate || ''), 'tr')),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

function emptyVehicleGroupStats() {
  return { count: 0, km: 0, cost: 0, averageCostPerKm: 0 };
}

function scrollDirectoryToTop(behavior = 'auto') {
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTo?.({ top: 0, left: 0, behavior });
  document.body.scrollTo?.({ top: 0, left: 0, behavior });
  document.querySelector('.main-area')?.scrollTo?.({ top: 0, left: 0, behavior });
  document.querySelector('.content')?.scrollTo?.({ top: 0, left: 0, behavior });
}

function Metric({ label, value }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
