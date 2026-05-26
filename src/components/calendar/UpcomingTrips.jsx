import { Edit3, Eye, Plus } from 'lucide-react';
import { eventMeta, transportColors } from '../../utils/calendarHelpers';
import { formatDate } from '../../utils/formatters';

export default function UpcomingTrips({ events, onDetail, onEdit, onNewTrip }) {
  return (
    <section className="panel upcoming-panel">
      <div className="panel-heading">
        <div>
          <h2>Yaklaşan Seyahatler</h2>
          <span>Planlanan rotaları hızlıca kontrol edin.</span>
        </div>
        <button className="secondary-button compact" type="button" onClick={onNewTrip}>
          <Plus size={16} />
          Yeni
        </button>
      </div>
      <div className="upcoming-list">
        {events.length ? (
          events.map((event) => {
            const meta = eventMeta(event.trip);
            return (
              <article className="upcoming-row" key={event.id}>
                <span className="transport-badge" style={{ '--badge-color': transportColors[event.transportType] || transportColors.Diğer }}>
                  {event.transportType?.slice(0, 1) || 'S'}
                </span>
                <div>
                  <strong>{event.route}</strong>
                  <small>{formatDate(event.date)} · {event.time || '-'} · {meta.provider}</small>
                </div>
                <span>{meta.duration}</span>
                <span>{meta.km}</span>
                <span>{meta.cost}</span>
                <div className="action-pair">
                  <button type="button" onClick={() => onDetail(event.trip)} aria-label="Detay">
                    <Eye size={16} />
                  </button>
                  <button type="button" onClick={() => onEdit(event.trip)} aria-label="Düzenle">
                    <Edit3 size={16} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-mini">Yaklaşan seyahat yok.</div>
        )}
      </div>
    </section>
  );
}
