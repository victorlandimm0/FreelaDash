import { ClientsManager, type ClientProjectRow, type ClientRow } from "@/components/clients-manager";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toPlainRows } from "@/lib/rows";

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = db
    .prepare(
      `
      SELECT
        clients.*,
        (
          SELECT COUNT(*)
          FROM projects
          WHERE projects.client_id = clients.id
            AND projects.status = 'active'
        ) AS active_projects,
        (
          SELECT COALESCE(SUM(time_entries.minutes), 0)
          FROM time_entries
          WHERE time_entries.client_id = clients.id
        ) AS total_minutes,
        (
          SELECT COALESCE(SUM(ROUND((time_entries.minutes / 60.0) * COALESCE(projects.hourly_rate_cents, clients.hourly_rate_cents))), 0)
          FROM time_entries
          LEFT JOIN projects ON projects.id = time_entries.project_id
          WHERE time_entries.client_id = clients.id
            AND time_entries.billable = 1
        ) AS total_cents
      FROM clients
      WHERE clients.user_id = ?
      ORDER BY clients.name ASC
    `
    )
    .all(user.id) as ClientRow[];

  const projects = db
    .prepare(
      `
      SELECT
        projects.id,
        projects.client_id,
        projects.name,
        projects.status,
        projects.hourly_rate_cents,
        (
          SELECT COALESCE(SUM(time_entries.minutes), 0)
          FROM time_entries
          WHERE time_entries.project_id = projects.id
        ) AS total_minutes,
        (
          SELECT COALESCE(SUM(ROUND((time_entries.minutes / 60.0) * COALESCE(projects.hourly_rate_cents, clients.hourly_rate_cents))), 0)
          FROM time_entries
          WHERE time_entries.project_id = projects.id
            AND time_entries.billable = 1
        ) AS total_cents
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.user_id = ?
      ORDER BY projects.status ASC, projects.name ASC
    `
    )
    .all(user.id) as ClientProjectRow[];

  return <ClientsManager clients={toPlainRows(clients)} projects={toPlainRows(projects)} />;
}
