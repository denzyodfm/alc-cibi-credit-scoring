export function money(value: unknown) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

export function pct(value: unknown) {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

export function dateText(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(value));
}
