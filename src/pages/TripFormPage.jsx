// Yeni seyahat kaydını adım adım ilerleyen, seçilen ulaşım türüne göre sadeleşen wizard olarak yönetir.
import { ArrowLeft, ArrowRight, Bus, Car, Check, CircleHelp, Plane, Save, Train, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import TripPreviewMap from '../components/maps/TripPreviewMap';
import CustomSelect from '../components/ui/CustomSelect';
import OsmPlaceInput from '../components/ui/OsmPlaceInput';
import { CURRENCIES, EMPTY_TRIP } from '../constants/travel';
import { estimateDurationByTransport, estimateTravelDistance } from '../utils/distance';
import { formatCurrency, formatKm, minutesToDuration } from '../utils/formatters';
import { findTravelLocation, locationToText } from '../utils/locations';
import { formatPlate } from '../utils/plateFormatter';
import { calculateDurationMinutes, calculateTotalCost, toNumber } from '../utils/tripCalculations';
import { getRoute } from '../services/osmRouteService';
import { getTripWaypoints } from '../utils/tripNormalizers';

const steps = [
  { title: 'Ulaşım türü', hint: 'Nasıl seyahat ettiniz?' },
  { title: 'Rota bilgileri', hint: 'Nereden nereye?' },
  { title: 'Detaylar', hint: 'Zaman, firma, notlar' },
  { title: 'Ödeme & Masraf', hint: 'Maliyet bilgileri' },
  { title: 'Özet', hint: 'Kontrol & Kaydet' },
];

const transportCards = [
  { type: 'Araç', icon: Car, title: 'Araç', desc: 'Kendi aracınızla seyahat', meta: 'Yakıt, yol, köprü masrafı' },
  { type: 'Otobüs', icon: Bus, title: 'Otobüs', desc: 'Otobüs ile seyahat', meta: 'Bilet ve firma bilgisi' },
  { type: 'Uçak', icon: Plane, title: 'Uçak', desc: 'Uçak ile seyahat', meta: 'PNR ve bilet bilgisi' },
  { type: 'Tren', icon: Train, title: 'Tren', desc: 'Tren ile seyahat', meta: 'Bilet ve sefer bilgisi' },
  { type: 'Diğer', icon: CircleHelp, title: 'Diğer', desc: 'Diğer ulaşım türleri', meta: 'Gemi, feribot, vb.' },
];

const fuelTypes = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik', 'Diğer'];
const airlineCompanies = ['THY', 'AJet', 'Pegasus', 'SunExpress', 'Enuygun'];
const busCompanies = ['Metro', 'Kamil Koç', 'Pamukkale', 'Obilet', 'Enuygun'];
const trainCompanies = ['TCDD', 'YHT'];

export default function TripFormPage({ initialTrip, companies, vehicles, savedLocations = [], onSave, onCancel }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [manualDistance, setManualDistance] = useState(Boolean(initialTrip?.distanceManuallyEdited));
  const [manualDuration, setManualDuration] = useState(Boolean(initialTrip?.durationManuallyEdited));
  const [form, setForm] = useState(() => createInitialForm(initialTrip));
  const [routeEstimate, setRouteEstimate] = useState({ distanceKm: 0, durationMinutes: 0, source: '' });
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    setForm(createInitialForm(initialTrip));
    setStep(0);
  }, [initialTrip]);

  const autoDistance = useMemo(
    () => routeEstimate.distanceKm || estimateTravelDistance(form.fromLocation, form.toLocation, form.transportType),
    [form.fromLocation, form.toLocation, form.transportType, routeEstimate.distanceKm],
  );
  const distanceKm = manualDistance ? toNumber(form.distanceKm) : autoDistance || toNumber(form.distanceKm);
  const durationAuto = routeEstimate.durationMinutes || estimateDurationByTransport(distanceKm, form.transportType);
  const durationMinutes = manualDuration ? toNumber(form.durationMinutes) : calculateDurationMinutes(form.departureTime, form.arrivalTime) || durationAuto || toNumber(form.durationMinutes);
  const totalCost = calculateTotalCost({ ...form, distanceKm });
  const costPerKm = distanceKm ? totalCost / distanceKm : 0;
  const missing = getMissingFields(form, step);
  const canContinue = missing.length === 0;

  useEffect(() => {
    if (autoDistance && !manualDistance) {
      setForm((current) => ({ ...current, distanceKm: autoDistance, distanceAutoCalculated: true, distanceSource: routeEstimate.source || 'estimated' }));
    }
  }, [autoDistance, manualDistance, routeEstimate.source]);

  useEffect(() => {
    let alive = true;
    if (!form.fromLocation?.lat || !form.toLocation?.lat) {
      setRouteEstimate({ distanceKm: 0, durationMinutes: 0, source: '' });
      return undefined;
    }
    getRoute({
      origin: form.fromLocation,
      destination: form.toLocation,
      waypoints: (form.waypoints || []).filter((point) => point?.lat && point?.lng),
      transportType: form.transportType,
    })
      .then((route) => {
        if (!alive) return;
        setRouteError('');
        setRouteEstimate({
          distanceKm: Math.round((route.distanceMeters || 0) / 100) / 10,
          durationMinutes: Math.round((route.durationSeconds || 0) / 60),
          source: route.provider,
          route,
        });
      })
      .catch((error) => {
        console.error('OpenStreetMap route calculation error', error);
        if (alive) {
          setRouteError('OpenStreetMap rota hesaplanamadı, manuel km/süre girebilirsiniz.');
          setRouteEstimate({ distanceKm: 0, durationMinutes: 0, source: '' });
        }
      });
    return () => {
      alive = false;
    };
  }, [form.fromLocation, form.toLocation, form.transportType, form.waypoints]);

  useEffect(() => {
    if (durationAuto && !form.durationMinutes && !manualDuration) {
      setForm((current) => ({ ...current, durationMinutes: durationAuto }));
    }
  }, [durationAuto, form.durationMinutes, manualDuration]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateLocation = (prefix, text, selected) => {
    const found = selected || null;
    setForm((current) => ({
      ...current,
      [`${prefix}Text`]: text,
      [`${prefix}Location`]: found || null,
      [prefix === 'from' ? 'from' : 'to']: found || text,
    }));
  };

  const next = () => {
    if (!canContinue) return;
    setStep((value) => Math.min(value + 1, steps.length - 1));
  };
  const back = () => setStep((value) => Math.max(value - 1, 0));

  const submit = async () => {
    const allMissing = getMissingFields(form, 4);
    if (allMissing.length) return;
    setSaving(true);
    const payload = {
      ...form,
      title: form.title || `${form.fromText || 'Başlangıç'} → ${form.toText || 'Varış'}`,
      from: form.fromLocation || form.fromText,
      to: form.toLocation || form.toText,
      waypoints: (form.waypoints || []).map((point, index) => ({ ...point, order: index })),
      stops: (form.waypoints || []).map((point) => point.name || point.formattedAddress).filter(Boolean),
      route: routeEstimate.route || form.route || null,
      distanceKm,
      durationMinutes,
      distanceAutoCalculated: Boolean(routeEstimate.route),
      distanceManuallyEdited: manualDistance,
      durationAutoCalculated: Boolean(routeEstimate.route),
      durationManuallyEdited: manualDuration,
      distanceSource: routeEstimate.route?.provider || routeEstimate.source || (autoDistance ? 'estimated' : ''),
      distanceCalculation: routeEstimate.route?.distanceCalculation || '',
      totalCost,
      costPerKm,
      vehiclePlate: form.plate || form.vehiclePlate || '',
      routeNote: form.routeNote || '',
      notes: form.notes || '',
    };
    await onSave(payload);
    setSaving(false);
  };

  return (
    <div className="trip-wizard page-stack">
      <WizardStepper step={step} />
      <TripPreviewMap form={form} distanceKm={distanceKm} durationMinutes={durationMinutes} totalCost={totalCost} routeResult={routeEstimate.route} routeError={routeError} />
      <div className="wizard-layout">
        <section className="panel wizard-card">
          {step === 0 && <TransportTypeStep form={form} update={update} />}
          {step === 1 && <RouteStep form={form} updateLocation={updateLocation} update={update} />}
          {step === 2 && <DetailsStep form={form} update={update} companies={companies} vehicles={vehicles} />}
          {step === 3 && (
            <CostStep
              form={form}
              update={update}
              distanceKm={distanceKm}
              setManualDistance={setManualDistance}
              setManualDuration={setManualDuration}
              costPerKm={costPerKm}
              durationMinutes={durationMinutes}
              routeError={routeError}
            />
          )}
          {step === 4 && <SummaryStep form={form} distanceKm={distanceKm} durationMinutes={durationMinutes} totalCost={totalCost} costPerKm={costPerKm} missing={getMissingFields(form, 4)} />}
          <div className="wizard-actions">
            <button type="button" className="ghost-button" onClick={step === 0 ? onCancel : back}>
              {step === 0 ? <X size={16} /> : <ArrowLeft size={16} />}
              {step === 0 ? 'Vazgeç' : 'Geri'}
            </button>
            {step < steps.length - 1 ? (
              <button type="button" className="primary-button" disabled={!canContinue} onClick={next}>
                Devam Et
                <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" className="primary-button" disabled={saving || getMissingFields(form, 4).length > 0} onClick={submit}>
                <Save size={16} />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            )}
          </div>
        </section>
        <LiveTripSummary form={form} distanceKm={distanceKm} durationMinutes={durationMinutes} totalCost={totalCost} costPerKm={costPerKm} missing={missing} />
      </div>
    </div>
  );
}

function WizardStepper({ step }) {
  return (
    <section className="panel wizard-stepper">
      {steps.map((item, index) => (
        <div key={item.title} className={`${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`}>
          <span>{index < step ? <Check size={15} /> : index + 1}</span>
          <p><strong>{item.title}</strong><small>{item.hint}</small></p>
        </div>
      ))}
    </section>
  );
}

function TransportTypeStep({ form, update }) {
  return (
    <>
      <StepTitle number="1" title="Ulaşım türünü seçin" desc="Seyahatinizi nasıl gerçekleştirdiniz?" />
      <div className="transport-choice-grid">
        {transportCards.map((card) => {
          const Icon = card.icon;
          const selected = form.transportType === card.type;
          return (
            <button key={card.type} type="button" className={selected ? 'selected' : ''} onClick={() => update('transportType', card.type)}>
              {selected && <Check className="choice-check" size={17} />}
              <span><Icon size={38} /></span>
              <strong>{card.title}</strong>
              <small>{card.desc}</small>
              <em>{card.meta}</em>
            </button>
          );
        })}
      </div>
      <p className="wizard-tip">İpucu: Ulaşım türüne göre sonraki adımlarda sadece ilgili alanlar gösterilir.</p>
    </>
  );
}

function RouteStep({ form, updateLocation, update }) {
  const addWaypoint = () => update('waypoints', [...form.waypoints, { order: form.waypoints.length }]);
  const updateWaypoint = (index, place) =>
    update(
      'waypoints',
      form.waypoints.map((point, pointIndex) => (pointIndex === index ? { ...(place || {}), order: index } : point)),
    );
  const removeWaypoint = (index) => update('waypoints', form.waypoints.filter((_, pointIndex) => pointIndex !== index).map((point, order) => ({ ...point, order })));
  const moveWaypoint = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= form.waypoints.length) return;
    const next = [...form.waypoints];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    update('waypoints', next.map((point, order) => ({ ...point, order })));
  };

  return (
    <>
      <StepTitle number="2" title="Rota bilgileri" desc="OpenStreetMap araması ile başlangıç, ara duraklar ve varış noktalarını seçin." />
      <div className="wizard-form-grid">
        <OsmPlaceInput
          label="Başlangıç noktası"
          value={form.fromText}
          selectedPlace={form.fromLocation}
          placeholder="İstanbul Ümraniye Dudullu Otogarı"
          required
          onChange={(text) => updateLocation('from', text, null)}
          onPlaceSelect={(place) => updateLocation('from', place?.name || '', place)}
        />
        <OsmPlaceInput
          label="Varış noktası"
          value={form.toText}
          selectedPlace={form.toLocation}
          placeholder="Tokat Otogarı"
          required
          onChange={(text) => updateLocation('to', text, null)}
          onPlaceSelect={(place) => updateLocation('to', place?.name || '', place)}
        />
      </div>
      <div className="waypoint-manager">
        <div className="waypoint-head">
          <div>
            <strong>Ara duraklar</strong>
            <span>Sıra korunur, rota otomatik optimize edilmez.</span>
          </div>
          <button type="button" className="secondary-button compact" disabled={form.waypoints.length >= 8} onClick={addWaypoint}>
            + Ara Durak Ekle
          </button>
        </div>
        {form.waypoints.map((point, index) => (
          <div className="waypoint-row" key={`waypoint-${index}`}>
            <b>{index + 1}</b>
            <OsmPlaceInput
              value={point.name || ''}
              selectedPlace={point.placeId ? point : null}
              placeholder="Bursa Şantiye, Ankara AŞTİ..."
              required
              onChange={() => updateWaypoint(index, { order: index })}
              onPlaceSelect={(place) => updateWaypoint(index, place)}
            />
            <button type="button" className="ghost-button" onClick={() => moveWaypoint(index, -1)}>Yukarı</button>
            <button type="button" className="ghost-button" onClick={() => moveWaypoint(index, 1)}>Aşağı</button>
            <button type="button" className="ghost-button danger-text" onClick={() => removeWaypoint(index)}>Sil</button>
          </div>
        ))}
        {!form.waypoints.length && <p className="wizard-tip">Ara durak eklemeden doğrudan başlangıç → varış rotası oluşturabilirsiniz.</p>}
      </div>
    </>
  );
}

function DetailsStep({ form, update, companies, vehicles }) {
  const companyOptions = form.transportType === 'Uçak' ? airlineCompanies : form.transportType === 'Otobüs' ? busCompanies : form.transportType === 'Tren' ? trainCompanies : companies;
  return (
    <>
      <StepTitle number="3" title={`${form.transportType} detayları`} desc="Zaman, firma ve bilet bilgilerini girin." />
      <div className="wizard-form-grid">
        <Field label="Tarih"><input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} /></Field>
        <Field label="Başlangıç saati"><input type="time" value={form.departureTime} onChange={(event) => update('departureTime', event.target.value)} /></Field>
        <Field label="Varış saati"><input type="time" value={form.arrivalTime} onChange={(event) => update('arrivalTime', event.target.value)} /></Field>
        {form.transportType === 'Araç' ? (
          <>
            <Field label="Araç / plaka">
              <CustomSelect value={form.vehicleId || form.plate} options={vehicles.map((vehicle) => ({ value: vehicle.id || vehicle.plate, label: [vehicle.plate, vehicle.name].filter(Boolean).join(' · ') }))} placeholder="Plaka seç" onChange={(value) => {
                const vehicle = vehicles.find((item) => item.id === value || item.plate === value);
                update('vehicleId', vehicle?.id || '');
                update('vehicleName', vehicle?.name || '');
                update('plate', formatPlate(vehicle?.plate || value));
                update('fuelType', vehicle?.fuelType || form.fuelType);
              }} />
            </Field>
            <Field label="Plaka manuel"><input value={form.plate} onChange={(event) => update('plate', formatPlate(event.target.value))} placeholder="34 EJC 537" /></Field>
            <Field label="Yakıt türü"><CustomSelect value={form.fuelType} options={fuelTypes} placeholder="Yakıt türü" onChange={(value) => update('fuelType', value)} /></Field>
          </>
        ) : (
          <Field label={form.transportType === 'Uçak' ? 'Havayolu firması' : form.transportType === 'Otobüs' ? 'Otobüs firması' : 'Firma'}>
            <CustomSelect value={form.company} options={[...new Set([...companyOptions, ...companies])]} placeholder="Firma seç" onChange={(value) => update('company', value)} />
          </Field>
        )}
        {form.transportType === 'Otobüs' && (
          <>
            <Field label="PNR"><input value={form.pnr} onChange={(event) => update('pnr', event.target.value.toLocaleUpperCase('tr-TR'))} /></Field>
            <Field label="Bilet no"><input value={form.ticketNo} onChange={(event) => update('ticketNo', event.target.value)} /></Field>
            <Field label="Koltuk no"><input value={form.seatNo} onChange={(event) => update('seatNo', event.target.value)} /></Field>
          </>
        )}
        {form.transportType === 'Uçak' && (
          <>
            <Field label="PNR"><input value={form.pnr} onChange={(event) => update('pnr', event.target.value.toLocaleUpperCase('tr-TR'))} /></Field>
            <Field label="Uçuş no"><input value={form.flightNo} onChange={(event) => update('flightNo', event.target.value.toLocaleUpperCase('tr-TR'))} placeholder="TK1234" /></Field>
          </>
        )}
        {form.transportType === 'Tren' && (
          <>
            <Field label="Sefer no"><input value={form.tripNo || form.trainNo} onChange={(event) => update('tripNo', event.target.value.toLocaleUpperCase('tr-TR'))} /></Field>
            <Field label="Bilet no"><input value={form.ticketNo} onChange={(event) => update('ticketNo', event.target.value)} /></Field>
          </>
        )}
        {form.transportType === 'Diğer' && <Field label="Ulaşım açıklaması"><input value={form.company} onChange={(event) => update('company', event.target.value)} placeholder="Transfer, taksi, feribot..." /></Field>}
        <Field label="Not"><textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} /></Field>
      </div>
    </>
  );
}

function CostStep({ form, update, distanceKm, durationMinutes, setManualDistance, setManualDuration, costPerKm, routeError }) {
  const isCar = form.transportType === 'Araç';
  return (
    <>
      <StepTitle number="4" title="Ödeme & masraf" desc="Mesafe otomatik hesaplanır; isterseniz manuel düzenleyebilirsiniz." />
      <div className="wizard-form-grid">
        <Field label="Mesafe / km">
          <input type="number" min="0" step="0.1" value={form.distanceKm || distanceKm} onChange={(event) => { setManualDistance(true); update('distanceKm', event.target.value); }} />
        </Field>
        <Field label="Süre / dakika">
          <input type="number" min="0" step="1" value={form.durationMinutes || durationMinutes} onChange={(event) => { setManualDuration(true); update('durationMinutes', event.target.value); }} />
        </Field>
        <Field label="Para birimi"><CustomSelect value={form.currency} options={CURRENCIES} onChange={(value) => update('currency', value)} /></Field>
        {!isCar && <Field label="Bilet fiyatı"><input type="number" min="0" step="0.01" value={form.ticketPrice} onChange={(event) => update('ticketPrice', event.target.value)} /></Field>}
        {isCar && (
          <>
            <Field label="Yakıt masrafı"><input type="number" min="0" step="0.01" value={form.fuelCost} onChange={(event) => update('fuelCost', event.target.value)} /></Field>
            <Field label="Yol / otoyol masrafı"><input type="number" min="0" step="0.01" value={form.roadCost} onChange={(event) => update('roadCost', event.target.value)} /></Field>
            <Field label="Köprü masrafı"><input type="number" min="0" step="0.01" value={form.bridgeCost} onChange={(event) => update('bridgeCost', event.target.value)} /></Field>
            <Field label="Otopark"><input type="number" min="0" step="0.01" value={form.parkingCost} onChange={(event) => update('parkingCost', event.target.value)} /></Field>
            <Field label="Diğer masraf"><input type="number" min="0" step="0.01" value={form.otherCost} onChange={(event) => update('otherCost', event.target.value)} /></Field>
          </>
        )}
        <div className="computed-box"><span>Km başı maliyet</span><strong>{formatCurrency(costPerKm, form.currency)}</strong></div>
        {routeError && <div className="route-warning">{routeError}</div>}
      </div>
    </>
  );
}

function SummaryStep(props) {
  return (
    <>
      <StepTitle number="5" title="Özet & kaydet" desc="Kaydetmeden önce seyahat bilgilerini kontrol edin." />
      <LiveTripSummary {...props} embedded />
    </>
  );
}

function LiveTripSummary({ form, distanceKm, durationMinutes, totalCost, costPerKm, missing, embedded = false }) {
  return (
    <aside className={embedded ? 'live-summary embedded' : 'panel live-summary'}>
      <h2>Canlı seyahat özeti</h2>
      <SummaryRow label="Başlangıç" value={form.fromText || '-'} />
      {form.waypoints.length > 0 && <SummaryRow label="Ara durak" value={form.waypoints.map((point) => point.name || point.formattedAddress || '-').join(' → ')} />}
      <SummaryRow label="Varış" value={form.toText || '-'} />
      <SummaryRow label="Ulaşım türü" value={form.transportType || '-'} />
      <SummaryRow label="Tahmini km" value={formatKm(distanceKm)} />
      <SummaryRow label="Tahmini süre" value={minutesToDuration(durationMinutes)} />
      <SummaryRow label="Toplam masraf" value={formatCurrency(totalCost, form.currency)} />
      <SummaryRow label="Km başı maliyet" value={formatCurrency(costPerKm, form.currency)} />
      <SummaryRow label="Firma / araç" value={form.transportType === 'Araç' ? form.plate || form.vehicleName || '-' : form.company || '-'} />
      <div className="summary-missing">
        <strong>Eksik zorunlu alanlar</strong>
        {missing.length ? missing.map((item) => <span key={item}>{item}</span>) : <span className="ok">Tamam</span>}
      </div>
    </aside>
  );
}

function StepTitle({ number, title, desc }) {
  return <header className="wizard-title"><span>{number}</span><div><h1>{title}</h1><p>{desc}</p></div></header>;
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function SummaryRow({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function createInitialForm(initialTrip) {
  const fromText = initialTrip?.fromText || locationToText(initialTrip?.fromLocation) || locationToText(initialTrip?.from) || '';
  const toText = initialTrip?.toText || locationToText(initialTrip?.toLocation) || locationToText(initialTrip?.to) || '';
  const waypoints = getTripWaypoints(initialTrip).filter((point) => point?.lat && point?.lng);
  return {
    ...EMPTY_TRIP,
    transportType: initialTrip?.transportType || 'Araç',
    currency: initialTrip?.currency || 'TRY',
    ...initialTrip,
    fromText,
    toText,
    stopsText: Array.isArray(initialTrip?.stops) ? initialTrip.stops.join(', ') : initialTrip?.stopsText || initialTrip?.stops || '',
    waypoints: waypoints || [],
    fromLocation: initialTrip?.fromLocation || findTravelLocation(fromText),
    toLocation: initialTrip?.toLocation || findTravelLocation(toText),
    plate: initialTrip?.plate || initialTrip?.vehiclePlate || '',
  };
}

function getMissingFields(form, step) {
  const missing = [];
  if (!form.transportType) missing.push('Ulaşım türü');
  if (step >= 1) {
    if (!form.fromText) missing.push('Başlangıç noktası');
    if (!form.toText) missing.push('Varış noktası');
    if (form.fromText && !form.fromLocation?.lat) missing.push('Başlangıç konum seçimi');
    if (form.toText && !form.toLocation?.lat) missing.push('Varış konum seçimi');
  }
  if (step >= 2) {
    if (!form.date) missing.push('Tarih');
    if (form.transportType === 'Araç' && !form.plate && !form.vehicleId) missing.push('Araç/plaka');
    if (form.transportType !== 'Araç' && form.transportType !== 'Diğer' && !form.company) missing.push('Firma');
  }
  if (step >= 3) {
    if (toNumber(form.distanceKm) < 0) missing.push('Mesafe');
  }
  return missing;
}
