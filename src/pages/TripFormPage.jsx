// Yeni seyahat ve düzenleme formu; araç seçilince ek masraf alanlarını açar.
import { Bus, Car, Plane, Save, Ship, Train, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CURRENCIES, EMPTY_TRIP, TRANSPORT_TYPES } from '../constants/travel';
import { calculateDurationMinutes, calculateTotalCost, calculateVehicleCost, toNumber } from '../utils/tripCalculations';
import { formatCurrency } from '../utils/formatters';
import { cityNames } from '../utils/cityCoordinates';
import CustomSelect from '../components/ui/CustomSelect';
import { estimateDistanceKm } from '../services/routeDistanceService';
import { formatPlate } from '../utils/plateFormatter';
import { locationCity } from '../utils/location';

const pointTypes = ['Otogar', 'Havalimanı', 'Gar', 'Ev', 'İş', 'Diğer'];
const fuelTypes = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik', 'Diğer'];

const transportProfiles = {
  Otobüs: {
    title: 'Otobüs bilgileri',
    icon: Bus,
    hint: 'Otogar, firma, koltuk, peron ve bilet bilgilerini takip edin.',
    fromType: 'Otogar',
    toType: 'Otogar',
  },
  Uçak: {
    title: 'Uçuş bilgileri',
    icon: Plane,
    hint: 'Havalimanı, uçuş no, gate, bagaj ve koltuk detaylarını ekleyin.',
    fromType: 'Havalimanı',
    toType: 'Havalimanı',
  },
  Tren: {
    title: 'Tren bilgileri',
    icon: Train,
    hint: 'Gar, tren no, vagon, koltuk ve peron detaylarını kaydedin.',
    fromType: 'Gar',
    toType: 'Gar',
  },
  Araç: {
    title: 'Araç seyahati bilgileri',
    icon: Car,
    hint: 'Araç, plaka, yakıt türü ve yol masraflarını ayrıntılı takip edin.',
    fromType: 'Ev',
    toType: 'Diğer',
  },
  Feribot: {
    title: 'Feribot bilgileri',
    icon: Ship,
    hint: 'Hat, iskele, kabin ve bilet bilgilerini kaydedin.',
    fromType: 'Diğer',
    toType: 'Diğer',
  },
};

export default function TripFormPage({ initialTrip, companies, vehicles, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY_TRIP);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm({
      ...EMPTY_TRIP,
      ...initialTrip,
      stops: Array.isArray(initialTrip?.stops) ? initialTrip.stops.join(', ') : initialTrip?.stops || '',
    });
  }, [initialTrip]);

  const isVehicleTrip = form.transportType === 'Araç';
  const isTicketTrip = ['Otobüs', 'Uçak', 'Tren', 'Feribot', 'Taksi'].includes(form.transportType);
  const profile = transportProfiles[form.transportType] || {
    title: `${form.transportType} bilgileri`,
    icon: Bus,
    hint: 'Bu ulaşım türüne özel temel bilet ve rota bilgilerini ekleyin.',
    fromType: 'Diğer',
    toType: 'Diğer',
  };
  const vehicleTotal = calculateVehicleCost(form);
  const totalCost = calculateTotalCost(form);
  const costPerKm = toNumber(form.distanceKm) ? totalCost / toNumber(form.distanceKm) : 0;

  const duration = useMemo(() => calculateDurationMinutes(form.departureTime, form.arrivalTime), [form.departureTime, form.arrivalTime]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateLocation = (key, field, value) =>
    setForm((current) => ({
      ...current,
      [key]: {
        ...(typeof current[key] === 'object' ? current[key] : { city: current[key] || '' }),
        [field]: value,
      },
    }));

  useEffect(() => {
    let mounted = true;
    estimateDistanceKm(form.from, form.to).then((km) => {
      if (mounted && km && !form.distanceKm) update('distanceKm', km);
    });
    return () => {
      mounted = false;
    };
  }, [form.from, form.to]);

  useEffect(() => {
    setForm((current) => {
      const currentFrom = typeof current.from === 'object' ? current.from : { city: current.from || '' };
      const currentTo = typeof current.to === 'object' ? current.to : { city: current.to || '' };
      return {
        ...current,
        from: { ...currentFrom, type: currentFrom.type || profile.fromType },
        to: { ...currentTo, type: currentTo.type || profile.toType },
      };
    });
  }, [form.transportType]);

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Başlık zorunlu.';
    if (!locationCity(form.from)) nextErrors.from = 'Başlangıç zorunlu.';
    if (!locationCity(form.to)) nextErrors.to = 'Varış zorunlu.';
    if (!form.date) nextErrors.date = 'Tarih zorunlu.';
    if (toNumber(form.distanceKm) < 0) nextErrors.distanceKm = 'Km negatif olamaz.';
    if (toNumber(totalCost) < 0) nextErrors.totalCost = 'Masraf negatif olamaz.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSave({ ...form, durationMinutes: form.durationMinutes || duration });
  };

  return (
    <form className="page-stack" onSubmit={submit}>
      <section className="page-heading">
        <div>
          <h1>{initialTrip ? 'Seyahati düzenle' : 'Yeni Seyahat'}</h1>
          <p>Manuel giriş akışı hızlı tutuldu; entegrasyonlar ileride bu formu otomatik doldurabilecek.</p>
        </div>
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={onCancel}>
            <X size={17} />
            Vazgeç
          </button>
          <button className="primary-button">
            <Save size={17} />
            Kaydet
          </button>
        </div>
      </section>

      <section className="panel form-grid">
        <h2 className="form-section-title">Temel bilgiler</h2>
        <Field label="Başlık / açıklama" error={errors.title}>
          <input value={form.title} onChange={(event) => update('title', event.target.value)} />
        </Field>
        <Field label="Ulaşım türü">
          <CustomSelect value={form.transportType} options={TRANSPORT_TYPES} onChange={(value) => update('transportType', value)} />
        </Field>
        <Field label="Firma">
          <CustomSelect value={form.company} options={companies} placeholder="Firma seç" onChange={(value) => update('company', value)} />
        </Field>
        <TransportInfoPanel profile={profile} transportType={form.transportType} />
        <h2 className="form-section-title">Rota bilgileri</h2>
        <Field label="Başlangıç noktası" error={errors.from}>
          <CustomSelect value={locationCity(form.from)} options={cityNames} placeholder="Başlangıç il" onChange={(value) => updateLocation('from', 'city', value)} />
        </Field>
        <Field label="Başlangıç ilçe">
          <input value={typeof form.from === 'object' ? form.from.district || '' : ''} onChange={(event) => updateLocation('from', 'district', event.target.value)} />
        </Field>
        <Field label="Başlangıç nokta adı">
          <input value={typeof form.from === 'object' ? form.from.pointName || '' : ''} onChange={(event) => updateLocation('from', 'pointName', event.target.value)} />
        </Field>
        <Field label="Başlangıç nokta tipi">
          <CustomSelect value={typeof form.from === 'object' ? form.from.type || '' : ''} options={pointTypes} placeholder="Nokta tipi" onChange={(value) => updateLocation('from', 'type', value)} />
        </Field>
        <Field label="Varış noktası" error={errors.to}>
          <CustomSelect value={locationCity(form.to)} options={cityNames} placeholder="Varış il" onChange={(value) => updateLocation('to', 'city', value)} />
        </Field>
        <Field label="Varış ilçe">
          <input value={typeof form.to === 'object' ? form.to.district || '' : ''} onChange={(event) => updateLocation('to', 'district', event.target.value)} />
        </Field>
        <Field label="Varış nokta adı">
          <input value={typeof form.to === 'object' ? form.to.pointName || '' : ''} onChange={(event) => updateLocation('to', 'pointName', event.target.value)} />
        </Field>
        <Field label="Varış nokta tipi">
          <CustomSelect value={typeof form.to === 'object' ? form.to.type || '' : ''} options={pointTypes} placeholder="Nokta tipi" onChange={(value) => updateLocation('to', 'type', value)} />
        </Field>
        <Field label="Ara duraklar">
          <input value={form.stops} onChange={(event) => update('stops', event.target.value)} placeholder="Bursa, Balıkesir" />
        </Field>
        <h2 className="form-section-title">Zaman bilgileri</h2>
        <Field label="Tarih" error={errors.date}>
          <input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} />
        </Field>
        <Field label="Başlangıç saati">
          <input type="time" value={form.departureTime} onChange={(event) => update('departureTime', event.target.value)} />
        </Field>
        <Field label="Varış saati">
          <input type="time" value={form.arrivalTime} onChange={(event) => update('arrivalTime', event.target.value)} />
        </Field>
        <Field label="Toplam süre (dk)">
          <input type="number" min="0" value={form.durationMinutes || duration} onChange={(event) => update('durationMinutes', event.target.value)} />
        </Field>
        <h2 className="form-section-title">Maliyet bilgileri</h2>
        <Field label="Mesafe / km" error={errors.distanceKm}>
          <input type="number" min="0" step="0.1" value={form.distanceKm} onChange={(event) => update('distanceKm', event.target.value)} />
        </Field>
        <Field label="Bilet fiyatı">
          <input type="number" min="0" step="0.01" value={form.ticketPrice} onChange={(event) => update('ticketPrice', event.target.value)} disabled={isVehicleTrip} />
        </Field>
        <Field label="Para birimi">
          <CustomSelect value={form.currency} options={CURRENCIES} onChange={(value) => update('currency', value)} />
        </Field>
      </section>

      {form.transportType === 'Otobüs' && (
        <section className="panel form-grid transport-mode-panel bus-mode">
          <h2 className="form-section-title">Otobüs bilgi ekranı</h2>
          <Field label="Otobüs firması"><CustomSelect value={form.company} options={companies} placeholder="Firma seç" onChange={(value) => update('company', value)} /></Field>
          <Field label="Bilet no"><input value={form.ticketNo} onChange={(event) => update('ticketNo', event.target.value)} /></Field>
          <Field label="PNR"><input value={form.pnr} onChange={(event) => update('pnr', event.target.value.toLocaleUpperCase('tr-TR'))} /></Field>
          <Field label="Koltuk no"><input value={form.seatNo} onChange={(event) => update('seatNo', event.target.value)} /></Field>
          <Field label="Peron"><input value={form.platformNo} onChange={(event) => update('platformNo', event.target.value)} /></Field>
          <Field label="Bagaj / servis notu"><input value={form.baggageInfo} onChange={(event) => update('baggageInfo', event.target.value)} /></Field>
        </section>
      )}

      {form.transportType === 'Uçak' && (
        <section className="panel form-grid transport-mode-panel flight-mode">
          <h2 className="form-section-title">Uçuş bilgi ekranı</h2>
          <Field label="Havayolu"><CustomSelect value={form.company} options={companies} placeholder="Havayolu seç" onChange={(value) => update('company', value)} /></Field>
          <Field label="Uçuş no"><input value={form.flightNo} onChange={(event) => update('flightNo', event.target.value.toLocaleUpperCase('tr-TR'))} placeholder="TK1234" /></Field>
          <Field label="PNR"><input value={form.pnr} onChange={(event) => update('pnr', event.target.value.toLocaleUpperCase('tr-TR'))} /></Field>
          <Field label="Terminal"><input value={form.terminal} onChange={(event) => update('terminal', event.target.value)} /></Field>
          <Field label="Gate"><input value={form.gateNo} onChange={(event) => update('gateNo', event.target.value.toLocaleUpperCase('tr-TR'))} /></Field>
          <Field label="Koltuk"><input value={form.seatNo} onChange={(event) => update('seatNo', event.target.value.toLocaleUpperCase('tr-TR'))} /></Field>
          <Field label="Bagaj"><input value={form.baggageInfo} onChange={(event) => update('baggageInfo', event.target.value)} placeholder="15 kg kabin + 20 kg bagaj" /></Field>
        </section>
      )}

      {form.transportType === 'Tren' && (
        <section className="panel form-grid transport-mode-panel train-mode">
          <h2 className="form-section-title">Tren bilgi ekranı</h2>
          <Field label="İşletmeci / firma"><CustomSelect value={form.company} options={companies} placeholder="Firma seç" onChange={(value) => update('company', value)} /></Field>
          <Field label="Tren no"><input value={form.trainNo} onChange={(event) => update('trainNo', event.target.value.toLocaleUpperCase('tr-TR'))} /></Field>
          <Field label="Vagon no"><input value={form.wagonNo} onChange={(event) => update('wagonNo', event.target.value)} /></Field>
          <Field label="Koltuk no"><input value={form.seatNo} onChange={(event) => update('seatNo', event.target.value)} /></Field>
          <Field label="Peron"><input value={form.platformNo} onChange={(event) => update('platformNo', event.target.value)} /></Field>
          <Field label="Bilet no"><input value={form.ticketNo} onChange={(event) => update('ticketNo', event.target.value)} /></Field>
        </section>
      )}

      {form.transportType === 'Feribot' && (
        <section className="panel form-grid transport-mode-panel ferry-mode">
          <h2 className="form-section-title">Feribot bilgi ekranı</h2>
          <Field label="Hat"><input value={form.ferryLine} onChange={(event) => update('ferryLine', event.target.value)} /></Field>
          <Field label="Firma"><CustomSelect value={form.company} options={companies} placeholder="Firma seç" onChange={(value) => update('company', value)} /></Field>
          <Field label="Kabin / koltuk"><input value={form.cabinNo || form.seatNo} onChange={(event) => update('cabinNo', event.target.value)} /></Field>
          <Field label="Bilet no"><input value={form.ticketNo} onChange={(event) => update('ticketNo', event.target.value)} /></Field>
        </section>
      )}

      {isTicketTrip && (
        <section className="panel form-grid">
          <h2 className="form-section-title">Bilet / belge bilgileri</h2>
          <Field label="PNR / rezervasyon kodu">
            <input value={form.pnr} onChange={(event) => update('pnr', event.target.value.toLocaleUpperCase('tr-TR'))} />
          </Field>
          <Field label="Bilet no">
            <input value={form.ticketNo} onChange={(event) => update('ticketNo', event.target.value)} />
          </Field>
          <Field label="Bilet / belge URL">
            <input value={form.ticketUrl || form.fileUrl} onChange={(event) => update('ticketUrl', event.target.value)} placeholder="TODO: Firebase Storage yükleme eklenecek" />
          </Field>
        </section>
      )}

      {isVehicleTrip && (
        <section className="panel form-grid transport-mode-panel car-mode">
          <h2 className="form-section-title">Araç bilgi ekranı</h2>
          <Field label="Plaka seç">
            <CustomSelect
              value={form.plate || form.vehicleName}
              options={vehicles.map((vehicle) => ({
                value: vehicle.plate || vehicle.name,
                label: [vehicle.plate, vehicle.name, vehicle.brand, vehicle.model].filter(Boolean).join(' · '),
              }))}
              placeholder="Plaka seç"
              onChange={(value) => {
                const vehicle = vehicles.find((item) => item.plate === value || item.name === value);
                update('vehicleName', vehicle?.name || value);
                if (vehicle?.plate) update('plate', formatPlate(vehicle.plate));
                if (vehicle?.fuelType) update('fuelType', vehicle.fuelType);
                if (vehicle?.id) update('vehicleId', vehicle.id);
              }}
            />
          </Field>
          <Field label="Plaka">
            <input value={form.plate || ''} onChange={(event) => update('plate', formatPlate(event.target.value))} />
          </Field>
          <Field label="Yakıt türü">
            <CustomSelect value={form.fuelType || ''} options={fuelTypes} placeholder="Yakıt türü" onChange={(value) => update('fuelType', value)} />
          </Field>
          <Field label="Sürücü / not">
            <input value={form.driverName} onChange={(event) => update('driverName', event.target.value)} />
          </Field>
          <h2 className="form-section-title">Araç masrafları</h2>
          <Field label="Yakıt masrafı">
            <input type="number" min="0" step="0.01" value={form.fuelCost} onChange={(event) => update('fuelCost', event.target.value)} />
          </Field>
          <Field label="Yol / otoyol masrafı">
            <input type="number" min="0" step="0.01" value={form.roadCost} onChange={(event) => update('roadCost', event.target.value)} />
          </Field>
          <Field label="Köprü masrafı">
            <input type="number" min="0" step="0.01" value={form.bridgeCost} onChange={(event) => update('bridgeCost', event.target.value)} />
          </Field>
          <Field label="Otopark masrafı">
            <input type="number" min="0" step="0.01" value={form.parkingCost} onChange={(event) => update('parkingCost', event.target.value)} />
          </Field>
          <Field label="Diğer masraflar">
            <input type="number" min="0" step="0.01" value={form.otherCost} onChange={(event) => update('otherCost', event.target.value)} />
          </Field>
          <div className="computed-box">
            <span>Toplam araç maliyeti</span>
            <strong>{formatCurrency(vehicleTotal, form.currency)}</strong>
          </div>
          <div className="computed-box">
            <span>Ortalama km başı</span>
            <strong>{formatCurrency(costPerKm, form.currency)}</strong>
          </div>
        </section>
      )}

      <section className="panel form-grid textareas">
        <h2 className="form-section-title">Notlar</h2>
        <Field label="Güzergah notu">
          <textarea value={form.routeNote} onChange={(event) => update('routeNote', event.target.value)} />
        </Field>
        <Field label="Notlar">
          <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} />
        </Field>
        <div className="computed-box total">
          <span>Kaydedilecek toplam masraf</span>
          <strong>{formatCurrency(totalCost, form.currency)}</strong>
        </div>
      </section>
    </form>
  );
}

function TransportInfoPanel({ profile, transportType }) {
  const Icon = profile.icon;
  return (
    <div className={`transport-info-card ${transportType}`}>
      <span>
        <Icon size={22} />
      </span>
      <div>
        <strong>{profile.title}</strong>
        <p>{profile.hint}</p>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className={error ? 'field has-error' : 'field'}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
