export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

export function formatCents(value: number | null | undefined) {
  return brl.format((value ?? 0) / 100);
}

export function parseBrlToCents(value: string | number) {
  if (typeof value === "number") {
    return Math.round(value * 100);
  }

  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return Math.round(Number(normalized || 0) * 100);
}

export function formatDate(date: string | Date) {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return shortDate.format(value);
}

export function formatMinutes(minutes: number | null | undefined) {
  const total = minutes ?? 0;
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export function toDateInputValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}
