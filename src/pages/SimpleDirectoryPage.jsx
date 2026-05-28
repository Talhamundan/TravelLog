// Araç ve firma gibi küçük kullanıcı koleksiyonlarını yönetir.
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import { companyStats, vehicleStats } from '../utils/analytics';
import { formatCurrency, formatKm } from '../utils/formatters';
import { formatDate } from '../utils/formatters';
import { formatPlate } from '../utils/plateFormatter';
import CustomSelect from '../components/ui/CustomSelect';
import { getTripRouteTitle } from '../utils/routeDisplay';

const fuelTypes = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik', 'Diğer'];
const companyCategories = ['Otobüs', 'Uçak', 'Tren', 'Araç kiralama', 'Diğer'];

export default function SimpleDirectoryPage({ title, description, items, fields, onSave, onDelete, onNewTrip, onSeed, trips = [], type }) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const selectedItem = items.find((item) => item.id === selectedId) || items[0];
  const selectedStats = selectedItem ? (type === 'vehicles' ? vehicleStats(trips, selectedItem) : companyStats(trips, selectedItem)) : null;

  const submit = async (event) => {
    event.preventDefault();
    if (!fields.some((field) => String(form[field.key] || '').trim())) return;
    const payload =
      type === 'vehicles'
        ? {
            ...form,
            plate: formatPlate(form.plate || ''),
            name: form.name || formatPlate(form.plate || ''),
          }
        : form;
    await onSave(editingId ? { ...payload, id: editingId } : payload);
    setForm({});
    setEditingId('');
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ ...item });
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
      <form className="panel inline-form" onSubmit={submit}>
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
          <div className="vehicle-card-grid">
            {items.map((item, index) => {
              const stats = vehicleStats(trips, item);
              const plate = formatPlate(item.plate || item.name || '-');
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
                  <span>{[item.name, item.brand, item.model].filter(Boolean).join(' · ') || 'Araç bilgisi eksik'}</span>
                  <div className="vehicle-card-metrics">
                    <small>{stats.count} seyahat</small>
                    <small>{formatKm(stats.km)}</small>
                    <small>{formatCurrency(stats.cost)}</small>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedItem && selectedStats && (
            <section className="panel vehicle-detail-panel">
              <div className="vehicle-detail-head">
                <div>
                  <span>Seçili plaka</span>
                  <h2>{formatPlate(selectedItem.plate || selectedItem.name)}</h2>
                  <p>{[selectedItem.name, selectedItem.brand, selectedItem.model, selectedItem.fuelType].filter(Boolean).join(' · ')}</p>
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
                    <article key={trip.id}>
                      <div>
                        <strong>{getTripRouteTitle(trip)}</strong>
                        <span>{formatDate(trip.date)} · {trip.transportType}</span>
                      </div>
                      <b>{formatKm(trip.distanceKm)}</b>
                      <b>{formatCurrency(trip.totalCost, trip.currency)}</b>
                    </article>
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

function Metric({ label, value }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}
