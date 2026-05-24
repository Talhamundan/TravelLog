// Liste ekranındaki filtrelenmiş seyahatleri CSV olarak dışa aktarır.
export const exportTripsToCsv = (trips) => {
  const headers = ['Tarih', 'Başlık', 'Başlangıç', 'Varış', 'Ulaşım', 'Firma', 'Km', 'Masraf', 'Para Birimi', 'PNR'];
  const rows = trips.map((trip) => [
    trip.date,
    trip.title,
    trip.from,
    trip.to,
    trip.transportType,
    trip.company,
    trip.distanceKm,
    trip.totalCost,
    trip.currency,
    trip.pnr,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `travellog-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
