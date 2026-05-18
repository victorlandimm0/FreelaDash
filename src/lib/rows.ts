export function toPlainRows<T extends object>(rows: T[]) {
  return rows.map((row) => ({ ...row })) as T[];
}
