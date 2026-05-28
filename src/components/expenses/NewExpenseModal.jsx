import { Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { expenseCategories } from '../../utils/expenseAnalytics';
import { getTripRouteTitle } from '../../utils/routeDisplay';

const initialForm = {
  category: 'Diğer',
  amount: '',
  currency: 'TRY',
  expenseDate: new Date().toISOString().slice(0, 10),
  description: '',
  tripId: '',
  company: '',
  vehiclePlate: '',
  city: '',
  note: '',
};

export default function NewExpenseModal({ open, trips, onClose, onSave }) {
  const [form, setForm] = useState(initialForm);
  const tripOptions = useMemo(() => trips.map((trip) => ({ id: trip.id, label: getTripRouteTitle(trip), trip })), [trips]);

  if (!open) return null;

  const change = (key, value) => {
    if (key === 'tripId') {
      const selected = tripOptions.find((item) => item.id === value)?.trip;
      setForm((current) => ({
        ...current,
        tripId: value,
        company: selected?.company || current.company,
        vehiclePlate: selected?.vehiclePlate || selected?.plate || current.vehiclePlate,
        city: selected ? getTripRouteTitle(selected) : current.city,
      }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    await onSave({
      ...form,
      amount: Number(form.amount) || 0,
      description: form.description || form.note || form.category,
    });
    setForm(initialForm);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal expense-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>Finans kaydı</p>
            <h2>Yeni Masraf</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat">
            <X size={20} />
          </button>
        </header>
        <form className="expense-form" onSubmit={submit}>
          <label>
            Kategori
            <select value={form.category} onChange={(event) => change('category', event.target.value)}>
              {expenseCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Tutar
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => change('amount', event.target.value)} required />
          </label>
          <label>
            Para birimi
            <select value={form.currency} onChange={(event) => change('currency', event.target.value)}>
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label>
            Tarih
            <input type="date" value={form.expenseDate} onChange={(event) => change('expenseDate', event.target.value)} required />
          </label>
          <label className="span-2">
            Açıklama
            <input value={form.description} onChange={(event) => change('description', event.target.value)} placeholder="Örn. Otopark ücreti" />
          </label>
          <label className="span-2">
            İlgili seyahat
            <select value={form.tripId} onChange={(event) => change('tripId', event.target.value)}>
              <option value="">Seyahat seçilmedi</option>
              {tripOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            Firma / Plaka
            <input value={form.company} onChange={(event) => change('company', event.target.value)} placeholder="Firma veya sağlayıcı" />
          </label>
          <label>
            Araç plakası
            <input value={form.vehiclePlate} onChange={(event) => change('vehiclePlate', event.target.value)} placeholder="Opsiyonel" />
          </label>
          <label className="span-2">
            Şehir / Rota
            <input value={form.city} onChange={(event) => change('city', event.target.value)} placeholder="Şehir veya rota" />
          </label>
          <label className="span-2">
            Not
            <textarea value={form.note} onChange={(event) => change('note', event.target.value)} placeholder="Opsiyonel" />
          </label>
          <div className="modal-actions span-2">
            <button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="primary-button">
              <Save size={17} />
              Masrafı Kaydet
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
