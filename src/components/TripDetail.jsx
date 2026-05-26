// Seyahat detaylarını ve harita görselini modal olarak sunar.
import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, formatKm, minutesToDuration } from '../utils/formatters';
import { routeLabel } from '../utils/location';
import TripMap from './TripMap';
import { tripProviderLabel } from '../utils/tripDisplay';
import Modal from './ui/Modal';
import { normalizeTrip } from '../utils/tripNormalizers';

export default function TripDetail({ trip, onClose, onEdit, onDelete }) {
  const normalizedTrip = normalizeTrip(trip);
  const isVehicleTrip = normalizedTrip.transportType === 'Araç';

  return (
    <Modal open title={routeLabel(normalizedTrip)} subtitle={`${normalizedTrip.fromLabel} → ${normalizedTrip.toLabel}`} className="trip-detail-modal" onClose={onClose}>
        <div className="button-row detail-actions">
          <button className="secondary-button" onClick={() => onEdit(normalizedTrip)}>
            <Pencil size={17} />
            Düzenle
          </button>
          <button className="ghost-button danger-text" onClick={() => onDelete(normalizedTrip)}>
            <Trash2 size={17} />
            Sil
          </button>
        </div>
        <TripMap trip={normalizedTrip} theme="light" />
        <div className="detail-grid">
          <Detail label="Tarih" value={formatDate(normalizedTrip.date)} />
          <Detail label="Saat" value={normalizedTrip.departureTime || normalizedTrip.time || '-'} />
          <Detail label="Ulaşım" value={normalizedTrip.transportType} />
          <Detail label={normalizedTrip.transportType === 'Araç' ? 'Araç / plaka' : 'Firma'} value={tripProviderLabel(normalizedTrip)} />
          <Detail label="Mesafe" value={normalizedTrip.distanceKm > 0 ? formatKm(normalizedTrip.distanceKm) : 'Eksik'} />
          <Detail label="Süre" value={normalizedTrip.durationMinutes > 0 ? minutesToDuration(normalizedTrip.durationMinutes) : '-'} />
          <Detail label="Toplam masraf" value={formatCurrency(normalizedTrip.totalCost, normalizedTrip.currency)} />
          <Detail label="Km başı maliyet" value={normalizedTrip.distanceKm > 0 ? formatCurrency(normalizedTrip.costPerKm, normalizedTrip.currency) : 'Eksik'} />
          <Detail label="PNR / Bilet no" value={normalizedTrip.pnr || normalizedTrip.ticketNo || '-'} />
          <Detail label="Ara duraklar" value={normalizedTrip.stops.join(', ') || '-'} />
        </div>
        {isVehicleTrip && (
          <div className="detail-grid vehicle-breakdown">
            <Detail label="Araç" value={normalizedTrip.vehicleName || '-'} />
            <Detail label="Plaka" value={normalizedTrip.vehiclePlate || normalizedTrip.plate || '-'} />
            <Detail label="Yakıt türü" value={normalizedTrip.fuelType || '-'} />
            <Detail label="Yakıt" value={formatCurrency(normalizedTrip.fuelCost, normalizedTrip.currency)} />
            <Detail label="Yol / otoyol" value={formatCurrency(normalizedTrip.roadCost, normalizedTrip.currency)} />
            <Detail label="Köprü" value={formatCurrency(normalizedTrip.bridgeCost, normalizedTrip.currency)} />
            <Detail label="Otopark" value={formatCurrency(normalizedTrip.parkingCost, normalizedTrip.currency)} />
            <Detail label="Diğer" value={formatCurrency(normalizedTrip.otherCost, normalizedTrip.currency)} />
          </div>
        )}
        {!isVehicleTrip && (
          <div className="detail-grid vehicle-breakdown">
            <Detail label="Bilet no" value={normalizedTrip.ticketNo || '-'} />
            <Detail label="Koltuk" value={normalizedTrip.seatNo || '-'} />
            <Detail label="Peron / Gate" value={normalizedTrip.platformNo || normalizedTrip.gateNo || '-'} />
            <Detail label="Uçuş / Tren no" value={normalizedTrip.flightNo || normalizedTrip.trainNo || '-'} />
            <Detail label="Terminal / Vagon" value={normalizedTrip.terminal || normalizedTrip.wagonNo || '-'} />
            <Detail label="Bagaj" value={normalizedTrip.baggageInfo || '-'} />
          </div>
        )}
        <div className="notes-block">
          <strong>Güzergah notu</strong>
          <p>{normalizedTrip.routeNote || '-'}</p>
          <strong>Notlar</strong>
          <p>{normalizedTrip.notes || '-'}</p>
        </div>
    </Modal>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
