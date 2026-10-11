// Araç ve firma gibi küçük kullanıcı koleksiyonlarını yönetir.
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import Modal from '../components/ui/Modal';
import CustomSelect from '../components/ui/CustomSelect';
import { companyStats, vehicleStats } from '../utils/analytics';
import { formatCurrency, formatDate, formatKm } from '../utils/formatters';
import { formatPlate } from '../utils/plateFormatter';
import { getTripRouteTitle } from '../utils/routeDisplay';
import { sortTripsByNewestDateTime } from '../utils/tripSorting';

const fuelTypes = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik', 'Diğer'];
const companyCategories = ['Otobüs', 'Uçak', 'Tren', 'Araç kiralama', 'Diğer'];
const hgsClassOptions = [
  { value: '', label: 'Belirtilmemiş' },
  { value: '1', label: '1. Sınıf' },
  { value: '2', label: '2. Sınıf' },
  { value: '3', label: '3. Sınıf' },
  { value: '4', label: '4. Sınıf' },
  { value: '5', label: '5. Sınıf' },
  { value: '6', label: '6. Sınıf' },
];

const emptyVehicleForm = {
  plate: '',
  name: '',
  brand: '',
  model: '',
  modelYear: '',
  fuelType: '',
  fuelConsumptionPer100Km: '',
  hgsClass: '',
  notes: '',
};

export default function SimpleDirectoryPage({ title, description, items, fields, onSave, onDelete, onDetail, onNewTrip, onSeed, trips = [], type, periodFiltered = false }) {
  if (type === 'vehicles') {
    return (
      <VehicleDirectoryPage
        title="Araçlarım"
        description={description || 'Kişisel seyahatlerinizde kullandığınız araçları, filo adlarını ve yakıt maliyetlerini yönetin.'}
        items={items}
        trips={trips}
        periodFiltered={periodFiltered}
        onSave={onSave}
        onDelete={onDelete}
        onDetail={onDetail}
        onNewTrip={onNewTrip}
        onSeed={onSeed}
      />
    );
  }

  return (
    <CompanyDirectoryPage
      title={title}
      description={description}
      items={items}
      fields={fields}
      onSave={onSave}
      onDelete={onDelete}
      onDetail={onDetail}
      onNewTrip={onNewTrip}
      onSeed={onSeed}
      trips={trips}
      type={type}
      periodFiltered={periodFiltered}
    />
  );
}

function VehicleDirectoryPage({ title, description, items, onSave, onDelete, onDetail, onNewTrip, onSeed, trips = [], periodFiltered = false }) {
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [fleetFilter, setFleetFilter] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const visibleByPeriod = useMemo(
    () => (periodFiltered ? items.filter((item) => vehicleStats(trips, item).count > 0) : items),
    [items, periodFiltered, trips],
  );
  const fleetOptions = useMemo(() => {
    const names = [...new Set(items.map(vehicleFleetName).filter((name) => name !== 'Filo adı yok'))].sort((a, b) => a.localeCompare(b, 'tr'));
    return [{ value: '', label: 'Tüm filolar' }, ...names.map((name) => ({ value: name, label: name }))];
  }, [items]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return visibleByPeriod.filter((item) => {
      const fleetName = vehicleFleetName(item);
      const matchesFleet = !fleetFilter || fleetName === fleetFilter;
      const haystack = normalizeSearch([item.plate, item.name, item.brand, item.model, item.fuelType, item.notes].filter(Boolean).join(' '));
      return matchesFleet && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [fleetFilter, query, visibleByPeriod]);
  const vehicleGroups = useMemo(() => groupVehiclesByFleet(filteredItems, trips), [filteredItems, trips]);
  const selectedItem = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;
  const selectedStats = selectedItem ? vehicleStats(trips, selectedItem) : null;

  useEffect(() => {
    if (!selectedId && filteredItems[0]?.id) setSelectedId(filteredItems[0].id);
    if (selectedId && !filteredItems.some((item) => item.id === selectedId)) setSelectedId(filteredItems[0]?.id || '');
  }, [filteredItems, selectedId]);

  const openCreate = () => {
    setEditingVehicle(null);
    setModalMode('create');
  };

  const openEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingVehicle(null);
  };

  const saveVehicle = async (payload) => {
    const saved = await onSave?.(payload);
    setSelectedId(saved?.id || payload.id || selectedId);
    closeModal();
  };

  return (
    <div className="page-stack vehicle-directory-page">
      <section className="page-heading vehicle-page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button type="button" className="primary-button vehicle-add-button" onClick={openCreate}>
          <Plus size={17} />
          Araç Ekle
        </button>
      </section>

      <section className="panel vehicle-filter-panel">
        <label className="vehicle-search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Plaka, marka, model veya yakıt türü ara" />
        </label>
        <CustomSelect value={fleetFilter} options={fleetOptions} placeholder="Tüm filolar" onChange={setFleetFilter} />
      </section>

      {!items.length && <EmptyState title="Henüz araç yok" onPrimary={onNewTrip} onSeed={onSeed} />}
      {items.length > 0 && !filteredItems.length && <EmptyState title="Aramanızla eşleşen araç yok" onPrimary={openCreate} />}

      {filteredItems.length > 0 && (
        <section className="vehicle-workbench-modern">
          <section className="panel vehicle-list-panel">
            <div className="vehicle-list-head">
              <div>
                <strong>Araç Listesi</strong>
                <span>{filteredItems.length} araç · {trips.length} seyahat kaydı</span>
              </div>
            </div>
            <div className="vehicle-fleet-list-modern">
              {vehicleGroups.map((group) => (
                <section className="vehicle-fleet-group-modern" key={group.name}>
                  <div className="vehicle-fleet-head-modern">
                    <div>
                      <span>Filo</span>
                      <strong>{group.name}</strong>
                    </div>
                    <small>{group.items.length} araç · {group.stats.count} seyahat · {formatKm(group.stats.km)}</small>
                  </div>
                  {group.items.map((item) => (
                    <VehicleListRow
                      key={item.id}
                      vehicle={item}
                      selected={selectedItem?.id === item.id}
                      stats={vehicleStats(trips, item)}
                      onSelect={() => setSelectedId(item.id)}
                      onEdit={() => openEdit(item)}
                      onDelete={() => onDelete?.(item)}
                    />
                  ))}
                </section>
              ))}
            </div>
          </section>

          {selectedItem && selectedStats && (
            <VehicleDetailPanel vehicle={selectedItem} stats={selectedStats} onEdit={() => openEdit(selectedItem)} onDetail={onDetail} />
          )}
        </section>
      )}

      <VehicleFormModal
        open={Boolean(modalMode)}
        mode={modalMode}
        vehicle={editingVehicle}
        fleetNames={fleetOptions.filter((item) => item.value).map((item) => item.value)}
        onClose={closeModal}
        onSave={saveVehicle}
      />
    </div>
  );
}

function VehicleListRow({ vehicle, selected, stats, onSelect, onEdit, onDelete }) {
  return (
    <article
      role="button"
      tabIndex={0}
      className={`vehicle-row-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="vehicle-row-main">
        <strong>{formatPlate(vehicle.plate || '') || 'Plaka yok'}</strong>
        <span>{[vehicle.brand, vehicle.model].filter(Boolean).join(' / ') || 'Marka model belirtilmemiş'}</span>
      </div>
      <span>{vehicle.fuelType || 'Yakıt belirtilmemiş'}</span>
      <span>{vehicleFleetName(vehicle)}</span>
      <b>{stats.count} seyahat</b>
      <b>{formatKm(stats.km)}</b>
      <span className="directory-row-actions">
        <button
          type="button"
          title="Düzenle"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          title="Sil"
          className="danger"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 size={15} />
        </button>
      </span>
    </article>
  );
}

function VehicleDetailPanel({ vehicle, stats, onEdit, onDetail }) {
  const sortedTrips = sortTripsByNewestDateTime(stats.trips || []);
  const visibleTrips = sortedTrips.slice(0, 6);

  return (
    <section className="panel vehicle-detail-panel-modern">
      <div className="vehicle-detail-hero">
        <div>
          <span>Seçili araç</span>
          <h2>{formatPlate(vehicle.plate || '') || 'Plaka yok'}</h2>
          <p>{[vehicle.brand, vehicle.model, vehicle.modelYear].filter(Boolean).join(' / ') || 'Marka modeli belirtilmemiş'}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onEdit}>
          <Pencil size={16} />
          Düzenle
        </button>
      </div>

      <div className="vehicle-detail-tags">
        <InfoPill label="Filo" value={vehicleFleetName(vehicle)} />
        <InfoPill label="Yakıt" value={vehicle.fuelType || 'Belirtilmemiş'} />
        <InfoPill label="HGS" value={formatHgsClass(vehicle.hgsClass)} />
      </div>

      <div className="vehicle-stat-grid">
        <Metric label="Toplam seyahat" value={stats.count} />
        <Metric label="Toplam kilometre" value={formatKm(stats.km)} />
        <Metric label="Toplam harcama" value={formatCurrency(stats.cost)} />
        <Metric label="Yakıt tüketimi" value={vehicle.fuelConsumptionPer100Km ? `${vehicle.fuelConsumptionPer100Km} L / 100 km` : 'Belirtilmemiş'} />
      </div>

      <section className="vehicle-detail-section">
        <h3>Maliyet Özeti</h3>
        <div className="vehicle-cost-list">
          <CostRow label="Yakıt" value={formatCurrency(stats.fuelCost)} />
          <CostRow label="Yol / köprü / otopark" value={formatCurrency(stats.roadCost + stats.bridgeCost + stats.parkingCost)} />
          <CostRow label="Diğer giderler" value={formatCurrency(stats.otherCost)} />
        </div>
      </section>

      <section className="vehicle-detail-section">
        <div className="vehicle-section-head">
          <h3>Bu Araçla Yapılan Seyahatler</h3>
          {sortedTrips.length > visibleTrips.length && <span>{sortedTrips.length - visibleTrips.length} kayıt daha var</span>}
        </div>
        <div className="vehicle-trip-list-modern">
          {visibleTrips.length ? (
            visibleTrips.map((trip) => (
              <button type="button" className="vehicle-trip-row" key={trip.id} onClick={() => onDetail?.(trip)}>
                <div>
                  <strong>{trip.title || getTripRouteTitle(trip)}</strong>
                  <span>{getTripRouteTitle(trip)} · {formatDate(trip.date)}</span>
                </div>
                <b>{formatKm(trip.distanceKm)}</b>
                <b>{formatCurrency(trip.totalCost, trip.currency)}</b>
              </button>
            ))
          ) : (
            <p>Bu araca bağlı seyahat kaydı yok.</p>
          )}
        </div>
      </section>

      {vehicle.notes && (
        <section className="vehicle-detail-section">
          <h3>Not</h3>
          <p className="vehicle-note">{vehicle.notes}</p>
        </section>
      )}
    </section>
  );
}

function VehicleFormModal({ open, mode, vehicle, fleetNames, onClose, onSave }) {
  const [form, setForm] = useState(emptyVehicleForm);
  const [error, setError] = useState('');
  const initialRef = useRef(JSON.stringify(emptyVehicleForm));

  useEffect(() => {
    if (!open) return;
    const nextForm = normalizeVehicleForm(vehicle);
    setForm(nextForm);
    setError('');
    initialRef.current = JSON.stringify(nextForm);
  }, [open, vehicle]);

  const dirty = JSON.stringify(form) !== initialRef.current;
  const title = mode === 'edit' ? 'Aracı Düzenle' : 'Yeni Araç Ekle';

  const closeSafely = () => {
    if (dirty && !window.confirm('Kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?')) return;
    onClose?.();
  };

  const change = (key, value) => {
    setForm((current) => ({ ...current, [key]: key === 'plate' ? formatPlate(value) : value }));
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const plate = formatPlate(form.plate || '');
    if (!plate) {
      setError('Plaka alanı zorunludur.');
      return;
    }
    const payload = {
      ...form,
      id: vehicle?.id,
      plate,
      name: String(form.name || '').trim(),
      brand: String(form.brand || '').trim(),
      model: String(form.model || '').trim(),
      modelYear: toOptionalNumber(form.modelYear),
      fuelConsumptionPer100Km: toOptionalNumber(form.fuelConsumptionPer100Km),
      hgsClass: normalizeHgsClass(form.hgsClass),
      notes: String(form.notes || '').trim(),
    };
    await onSave?.(payload);
  };

  return (
    <Modal open={open} title={title} subtitle="Araç bilgileri" className="vehicle-form-modal" onClose={closeSafely}>
      <form className="vehicle-modal-form" onSubmit={submit}>
        <FormGroup title="Genel Bilgiler">
          <label className="field">
            <span>Plaka</span>
            <input value={form.plate} onChange={(event) => change('plate', event.target.value)} placeholder="34 TL 2026" autoFocus />
          </label>
          <label className="field">
            <span>Filo adı</span>
            <FleetNameInput value={form.name} suggestions={fleetNames} onChange={(value) => change('name', value)} />
          </label>
          <label className="field">
            <span>Marka</span>
            <input value={form.brand} onChange={(event) => change('brand', event.target.value)} placeholder="Toyota" />
          </label>
          <label className="field">
            <span>Model</span>
            <input value={form.model} onChange={(event) => change('model', event.target.value)} placeholder="Corolla" />
          </label>
          <label className="field">
            <span>Model yılı</span>
            <input type="number" min="1900" max="2100" value={form.modelYear} onChange={(event) => change('modelYear', event.target.value)} placeholder="Opsiyonel" />
          </label>
        </FormGroup>

        <FormGroup title="Yakıt ve Maliyet">
          <label className="field">
            <span>Yakıt türü</span>
            <CustomSelect value={form.fuelType} options={fuelTypes} placeholder="Yakıt türü" onChange={(value) => change('fuelType', value)} />
          </label>
          <label className="field">
            <span>Ortalama tüketim (L/100 km)</span>
            <input type="number" min="0" step="0.1" value={form.fuelConsumptionPer100Km} onChange={(event) => change('fuelConsumptionPer100Km', event.target.value)} />
          </label>
        </FormGroup>

        <FormGroup title="Geçiş Bilgileri">
          <label className="field">
            <span>HGS araç sınıfı</span>
            <CustomSelect value={form.hgsClass} options={hgsClassOptions} placeholder="Belirtilmemiş" onChange={(value) => change('hgsClass', value)} />
          </label>
        </FormGroup>

        <FormGroup title="Diğer" wide>
          <label className="field vehicle-notes-field">
            <span>Not</span>
            <textarea value={form.notes} onChange={(event) => change('notes', event.target.value)} placeholder="Opsiyonel" />
          </label>
        </FormGroup>

        {error && <p className="form-error">{error}</p>}

        <footer className="vehicle-modal-actions">
          <button type="button" className="ghost-button" onClick={closeSafely}>
            <X size={17} />
            İptal
          </button>
          <button type="submit" className="primary-button">
            <Check size={17} />
            Kaydet
          </button>
        </footer>
      </form>
    </Modal>
  );
}

function CompanyDirectoryPage({ title, description, items, fields, onSave, onDelete, onDetail, onNewTrip, onSeed, trips = [], type, periodFiltered = false }) {
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const formRef = useRef(null);
  const visibleItems = useMemo(
    () => (periodFiltered ? items.filter((item) => companyStats(trips, item).count > 0) : items),
    [items, periodFiltered, trips],
  );
  const selectedItem = visibleItems.find((item) => item.id === selectedId) || visibleItems[0] || null;

  useEffect(() => {
    if (!selectedId && visibleItems[0]?.id) setSelectedId(visibleItems[0].id);
    if (selectedId && !visibleItems.some((item) => item.id === selectedId)) setSelectedId(visibleItems[0]?.id || '');
  }, [selectedId, visibleItems]);

  const submit = async (event) => {
    event.preventDefault();
    if (!fields.some((field) => String(form[field.key] || '').trim())) return;
    await onSave(editingId ? { ...form, id: editingId } : form);
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

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <form className="panel inline-form directory-form" ref={formRef} onSubmit={submit}>
        {fields.map((field) => (
          <label key={field.key} className="field">
            <span>{field.label}</span>
            {field.key === 'category' ? (
              <CustomSelect value={form[field.key] || ''} options={companyCategories} placeholder="Kategori" onChange={(value) => setForm({ ...form, [field.key]: value })} />
            ) : (
              <input type={field.type || 'text'} min={field.type === 'number' ? '0' : undefined} step={field.step} value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} />
            )}
          </label>
        ))}
        <button className="primary-button">
          <Plus size={17} />
          {editingId ? 'Güncelle' : 'Ekle'}
        </button>
        {editingId && (
          <button type="button" className="ghost-button" onClick={() => {
            setEditingId('');
            setForm({});
          }}>
            <X size={17} />
            Vazgeç
          </button>
        )}
      </form>
      {!items.length && <EmptyState title="Henüz kayıt yok" onPrimary={onNewTrip} onSeed={onSeed} />}
      {items.length > 0 && !visibleItems.length && <EmptyState title="Seçili dönemde kayıt yok" onPrimary={onNewTrip} />}
      {visibleItems.length > 0 && (
        <section className="directory-workbench">
          <section className="panel directory-list-panel">
            <div className="directory-list-head">
              <div>
                <strong>Firma Listesi</strong>
                <span>{visibleItems.length} kayıt · {trips.length} dönem seyahati</span>
              </div>
            </div>
            <div className="directory-list-table">
              {visibleItems.map((item, index) => {
                const stats = companyStats(trips, item);
                return (
                  <article
                    role="button"
                    tabIndex={0}
                    className={`directory-list-row ${selectedItem?.id === item.id ? 'selected' : ''}`}
                    key={item.id || index}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(item.id);
                      }
                    }}
                  >
                    <div>
                      <strong>{item.name || '-'}</strong>
                      <span>{[item.category, item.website].filter(Boolean).join(' · ') || 'Bilgi eksik'}</span>
                    </div>
                    <b>{stats.count}</b>
                    <b>{formatKm(stats.km)}</b>
                    <b>{formatCurrency(stats.cost)}</b>
                    <span className="directory-row-actions">
                      <button type="button" title="Düzenle" onClick={(event) => {
                        event.stopPropagation();
                        startEdit(item);
                      }}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" title="Sil" className="danger" onClick={(event) => {
                        event.stopPropagation();
                        onDelete?.(item);
                      }}>
                        <Trash2 size={15} />
                      </button>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
          <CompanyDetailPanel company={selectedItem} stats={selectedItem ? companyStats(trips, selectedItem) : null} onDetail={onDetail} />
        </section>
      )}
    </div>
  );
}

function CompanyDetailPanel({ company, stats, onDetail }) {
  if (!company || !stats) return null;
  return (
    <section className="panel directory-detail-panel">
      <div className="directory-detail-head">
        <div>
          <span>Seçili firma</span>
          <h2>{company.name || '-'}</h2>
          <p>{[company.category, company.website, company.notes].filter(Boolean).join(' · ') || 'Firma bilgisi eksik'}</p>
        </div>
        <strong>{formatCurrency(stats.averageCostPerKm)} / km</strong>
      </div>
      <div className="directory-detail-grid">
        <Metric label="Seyahat" value={stats.count} />
        <Metric label="Toplam km" value={formatKm(stats.km)} />
        <Metric label="Toplam harcama" value={formatCurrency(stats.cost)} />
        <Metric label="Ortalama bilet" value={formatCurrency(stats.averageTicket)} />
        <Metric label="Yol + köprü + otopark" value={formatCurrency(stats.roadCost + stats.bridgeCost + stats.parkingCost)} />
        <Metric label="Diğer" value={formatCurrency(stats.otherCost)} />
      </div>
      <div className="directory-trip-list">
        <h3>Bu firmaya bağlı seyahatler</h3>
        {stats.trips?.length ? (
          sortTripsByNewestDateTime(stats.trips).slice(0, 8).map((trip) => (
            <button type="button" className="directory-trip-item" key={trip.id} onClick={() => onDetail?.(trip)}>
              <div>
                <strong>{getTripRouteTitle(trip)}</strong>
                <span>{formatDate(trip.date)} · {trip.departureTime || 'Saat yok'} · {trip.transportType}</span>
              </div>
              <b>{formatKm(trip.distanceKm)}</b>
              <b>{formatCurrency(trip.totalCost, trip.currency)}</b>
            </button>
          ))
        ) : (
          <p>Seçili dönemde bağlı seyahat kaydı yok.</p>
        )}
      </div>
    </section>
  );
}

function FleetNameInput({ value, suggestions, onChange }) {
  const [focused, setFocused] = useState(false);
  const filtered = useMemo(() => {
    const query = normalizeSearch(value);
    if (!query) return suggestions.slice(0, 8);
    return suggestions.filter((name) => normalizeSearch(name).includes(query)).slice(0, 8);
  }, [suggestions, value]);

  return (
    <div className="fleet-autocomplete">
      <input value={value || ''} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onChange={(event) => onChange(event.target.value)} />
      {focused && filtered.length > 0 && (
        <div className="location-suggestions fleet-suggestions" onMouseDown={(event) => event.preventDefault()}>
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onPointerDown={(event) => {
                event.preventDefault();
                onChange(name);
                setFocused(false);
              }}
              onClick={() => {
                onChange(name);
                setFocused(false);
              }}
            >
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FormGroup({ title, children, wide = false }) {
  return (
    <fieldset className={`vehicle-form-group ${wide ? 'wide' : ''}`}>
      <legend>{title}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

function InfoPill({ label, value }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function CostRow({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
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

function vehicleFleetName(vehicle) {
  return String(vehicle?.name || '').trim() || 'Filo adı yok';
}

function normalizeVehicleForm(vehicle) {
  return {
    ...emptyVehicleForm,
    ...vehicle,
    plate: formatPlate(vehicle?.plate || ''),
    modelYear: vehicle?.modelYear ?? '',
    fuelConsumptionPer100Km: vehicle?.fuelConsumptionPer100Km ?? '',
    hgsClass: vehicle?.hgsClass == null ? '' : String(vehicle.hgsClass),
    notes: vehicle?.notes || '',
  };
}

function normalizeHgsClass(value) {
  const number = Number.parseInt(value, 10);
  return number >= 1 && number <= 6 ? number : '';
}

function formatHgsClass(value) {
  const number = Number.parseInt(value, 10);
  return number >= 1 && number <= 6 ? `${number}. Sınıf` : 'Belirtilmemiş';
}

function normalizeSearch(value = '') {
  return String(value).toLocaleLowerCase('tr-TR').trim();
}

function toOptionalNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : '';
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
