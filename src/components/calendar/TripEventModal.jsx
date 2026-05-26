import { ArrowRight, CalendarDays, Edit3, MapPin } from 'lucide-react';
import TripMap from '../TripMap';
import { eventMeta, tripTime } from '../../utils/calendarHelpers';
import { formatDate } from '../../utils/formatters';
import { locationLabel, routeLabel } from '../../utils/location';
import Modal from '../ui/Modal';

export default function TripEventModal({ trip, onClose, onEdit, onDetail }) {
  if (!trip) return null;
  const meta = eventMeta(trip);

  return (
    <Modal open title={routeLabel(trip)} subtitle="Takvim detayı" className="event-modal" onClose={onClose}>
        <div className="event-detail-grid">
          <Info label="Başlangıç" value={locationLabel(trip.from) || trip.fromText || trip.from} />
          <Info label="Varış" value={locationLabel(trip.to) || trip.toText || trip.to} />
          <Info label="Ulaşım" value={trip.transportType || '-'} />
          <Info label="Firma / Araç" value={meta.provider} />
          <Info label="Tarih" value={formatDate(trip.date)} />
          <Info label="Saat" value={tripTime(trip) || '-'} />
          <Info label="Süre" value={meta.duration} />
          <Info label="Mesafe" value={meta.km} />
          <Info label="Toplam masraf" value={meta.cost} />
        </div>
        <div className="event-notes">
          <CalendarDays size={17} />
          <span>{trip.notes || 'Bu seyahat için not girilmemiş.'}</span>
        </div>
        <div className="event-map-preview">
          <TripMap trip={trip} theme="light" />
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={() => onEdit(trip)}>
            <Edit3 size={17} />
            Düzenle
          </button>
          <button className="primary-button" type="button" onClick={() => onDetail(trip)}>
            <MapPin size={17} />
            Detay sayfasına git
            <ArrowRight size={16} />
          </button>
        </div>
    </Modal>
  );
}

function Info({ label, value }) {
  return (
    <div className="event-info-card">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}
