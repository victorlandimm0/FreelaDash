import "server-only";

import { db } from "@/lib/db";

export type InvoiceEntry = {
  id: number;
  entry_date: string;
  minutes: number;
  description: string;
  project_name: string | null;
  hourly_rate_cents: number;
  amount_cents: number;
};

export type InvoiceTotals = {
  entries: InvoiceEntry[];
  totalMinutes: number;
  totalCents: number;
};

type RawInvoiceEntry = {
  id: number;
  entry_date: string;
  minutes: number;
  description: string;
  project_name: string | null;
  client_hourly_rate_cents: number;
};

export function calculateInvoiceTotals(
  userId: number,
  clientId: number,
  periodStart: string,
  periodEnd: string,
  projectId?: number | null
): InvoiceTotals {
  const rows = db
    .prepare(
      `
      SELECT
        time_entries.id,
        time_entries.entry_date,
        time_entries.minutes,
        time_entries.description,
        projects.name AS project_name,
        clients.hourly_rate_cents AS client_hourly_rate_cents
      FROM time_entries
      JOIN clients ON clients.id = time_entries.client_id
      LEFT JOIN projects ON projects.id = time_entries.project_id
      WHERE time_entries.user_id = ?
        AND time_entries.client_id = ?
        AND (? IS NULL OR time_entries.project_id = ?)
        AND time_entries.billable = 1
        AND time_entries.entry_date BETWEEN ? AND ?
      ORDER BY time_entries.entry_date ASC, time_entries.id ASC
    `
    )
    .all(userId, clientId, projectId ?? null, projectId ?? null, periodStart, periodEnd) as RawInvoiceEntry[];

  const entries = rows.map((row) => {
    const amount = Math.round((row.minutes / 60) * row.client_hourly_rate_cents);

    return {
      id: row.id,
      entry_date: row.entry_date,
      minutes: row.minutes,
      description: row.description,
      project_name: row.project_name,
      hourly_rate_cents: row.client_hourly_rate_cents,
      amount_cents: amount
    };
  });

  return {
    entries,
    totalMinutes: entries.reduce((total, entry) => total + entry.minutes, 0),
    totalCents: entries.reduce((total, entry) => total + entry.amount_cents, 0)
  };
}

export function invoiceNumber(clientId: number, periodStart: string) {
  const compactPeriod = periodStart.slice(0, 7).replace("-", "");
  const suffix = Date.now().toString().slice(-5);
  return `FD-${compactPeriod}-${clientId}-${suffix}`;
}
