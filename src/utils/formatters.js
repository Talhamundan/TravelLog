// Para, tarih ve süre gösterimleri için küçük format yardımcıları.
export const formatCurrency = (amount = 0, currency = 'TRY') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(amount) || 0);

export const formatKm = (value = 0) => `${new Intl.NumberFormat('tr-TR').format(Number(value) || 0)} km`;

export const formatDate = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
};

export const minutesToDuration = (minutes) => {
  const total = Number(minutes) || 0;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (!hours) return `${mins} dk`;
  if (!mins) return `${hours} sa`;
  return `${hours} sa ${mins} dk`;
};

export const monthName = (monthIndex) =>
  new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(new Date(2024, monthIndex, 1));
