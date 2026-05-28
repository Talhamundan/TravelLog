// Detay rapor sayfası tüm grafik setini gösterir.
import Charts from '../components/Charts';
import EmptyState from '../components/EmptyState';
import { buildReports } from '../utils/analytics';
import { formatCurrency, formatKm } from '../utils/formatters';
import { getTransportColor, transportTypes } from '../constants/transport';

export default function ReportsPage({ trips, onNewTrip, onSeed }) {
  const reports = buildReports(trips);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>Raporlar</h1>
          <p>Aylık, yıllık, firma, ulaşım türü ve rota bazlı grafikler.</p>
        </div>
      </section>
      {trips.length ? (
        <>
          <Charts trips={trips} />
          <ReportSection title="Yıllık özet" rows={reports.yearly} />
          <ReportSection title="Aylık özet" rows={reports.monthly} />
          <ReportSection title="Firma bazlı özet" rows={reports.companies} />
          <ReportSection title="Ulaşım türü bazlı özet" rows={reports.transports} transportRows />
          <ReportSection title="Rota bazlı özet" rows={reports.routes} />
          <ReportSection title="Araç seyahati maliyet analizi" rows={reports.vehicleCosts} showVehicleCosts />
        </>
      ) : (
        <EmptyState onPrimary={onNewTrip} onSeed={onSeed} />
      )}
    </div>
  );
}

function ReportSection({ title, rows, showVehicleCosts = false, transportRows = false }) {
  return (
    <section className="panel report-section">
      <h2>{title}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Seyahat</th>
              <th>Km</th>
              <th>Masraf</th>
              <th>Km başı</th>
              {showVehicleCosts && <th>Yakıt</th>}
              {showVehicleCosts && <th>Yol/Köprü/Otopark</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>
                  {transportRows && transportTypes.includes(row.name) ? (
                    <span className="transport-pill" style={{ '--transport-color': getTransportColor(row.name) }}>{row.name}</span>
                  ) : row.name}
                </td>
                <td>{row.count}</td>
                <td>{formatKm(row.km)}</td>
                <td>{formatCurrency(row.cost)}</td>
                <td>{formatCurrency(row.averageCostPerKm)}</td>
                {showVehicleCosts && <td>{formatCurrency(row.fuelCost)}</td>}
                {showVehicleCosts && <td>{formatCurrency(row.roadCost + row.bridgeCost + row.parkingCost)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
