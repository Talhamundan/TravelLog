// Seyahat detaylarını ve harita görselini modal olarak sunar.
import { Pencil, Trash2, X } from 'lucide-react';
import { formatCurrency, formatDate, formatKm, minutesToDuration } from '../utils/formatters';
import { routeLabel } from '../utils/location';
import TripMap from './TripMap';

export default function TripDetail({ trip, onClose, onEdit, onDelete }) {
  const isVehicleTrip = trip.transportType === 'Araç';

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <header>
          <div>
            <h2>{trip.title}</h2>
            <p>
              {routeLabel(trip)}
            </p>
          </div>
          <button className="icon-button" title="Kapat" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div className="button-row detail-actions">
          <button className="secondary-button" onClick={() => onEdit(trip)}>
            <Pencil size={17} />
            Düzenle
          </button>
          <button className="ghost-button danger-text" onClick={() => onDelete(trip)}>
            <Trash2 size={17} />
            Sil
          </button>
        </div>
        <TripMap trip={trip} />
        <div className="detail-grid">
          <Detail label="Tarih" value={formatDate(trip.date)} />
          <Detail label="Ulaşım" value={trip.transportType} />
          <Detail label="Firma" value={trip.company || '-'} />
          <Detail label="Mesafe" value={formatKm(trip.distanceKm)} />
          <Detail label="Süre" value={minutesToDuration(trip.durationMinutes)} />
          <Detail label="Toplam masraf" value={formatCurrency(trip.totalCost, trip.currency)} />
          <Detail label="Km başı maliyet" value={formatCurrency(trip.costPerKm, trip.currency)} />
          <Detail label="PNR / Bilet no" value={trip.pnr || '-'} />
          <Detail label="Ara duraklar" value={Array.isArray(trip.stops) ? trip.stops.join(', ') || '-' : trip.stops || '-'} />
        </div>
        {isVehicleTrip && (
          <div className="detail-grid vehicle-breakdown">
            <Detail label="Araç" value={trip.vehicleName || '-'} />
            <Detail label="Plaka" value={trip.plate || '-'} />
            <Detail label="Yakıt türü" value={trip.fuelType || '-'} />
            <Detail label="Yakıt" value={formatCurrency(trip.fuelCost, trip.currency)} />
            <Detail label="Yol / otoyol" value={formatCurrency(trip.roadCost, trip.currency)} />
            <Detail label="Köprü" value={formatCurrency(trip.bridgeCost, trip.currency)} />
            <Detail label="Otopark" value={formatCurrency(trip.parkingCost, trip.currency)} />
            <Detail label="Diğer" value={formatCurrency(trip.otherCost, trip.currency)} />
          </div>
        )}
        {!isVehicleTrip && (
          <div className="detail-grid vehicle-breakdown">
            <Detail label="Bilet no" value={trip.ticketNo || '-'} />
            <Detail label="Koltuk" value={trip.seatNo || '-'} />
            <Detail label="Peron / Gate" value={trip.platformNo || trip.gateNo || '-'} />
            <Detail label="Uçuş / Tren no" value={trip.flightNo || trip.trainNo || '-'} />
            <Detail label="Terminal / Vagon" value={trip.terminal || trip.wagonNo || '-'} />
            <Detail label="Bagaj" value={trip.baggageInfo || '-'} />
          </div>
        )}
        <div className="notes-block">
          <strong>Güzergah notu</strong>
          <p>{trip.routeNote || '-'}</p>
          <strong>Notlar</strong>
          <p>{trip.notes || '-'}</p>
        </div>
      </section>
    </div>
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
