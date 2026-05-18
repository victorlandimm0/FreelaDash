import {
  TimerManager,
  type TimerClientOption,
  type TimerProjectOption,
  type TodayEntryRow
} from "@/components/timer-manager";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toDateInputValue } from "@/lib/format";
import { toPlainRows } from "@/lib/rows";

export default async function TimerPage() {
  const user = await requireUser();
  const today = toDateInputValue();

  const clients = db
    .prepare("SELECT id, name FROM clients WHERE user_id = ? ORDER BY name ASC")
    .all(user.id) as TimerClientOption[];

  const projects = db
    .prepare(
      `
      SELECT
        projects.id,
        projects.client_id,
        projects.name,
        projects.status,
        clients.name AS client_name
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      WHERE projects.user_id = ?
      ORDER BY clients.name ASC, projects.name ASC
    `
    )
    .all(user.id) as TimerProjectOption[];

  const entries = db
    .prepare(
      `
      SELECT
        time_entries.id,
        time_entries.entry_date,
        time_entries.client_id,
        time_entries.project_id,
        time_entries.minutes,
        time_entries.description,
        time_entries.billable,
        clients.name AS client_name,
        projects.name AS project_name
      FROM time_entries
      JOIN clients ON clients.id = time_entries.client_id
      LEFT JOIN projects ON projects.id = time_entries.project_id
      WHERE time_entries.user_id = ?
        AND time_entries.entry_date = ?
      ORDER BY time_entries.id DESC
    `
    )
    .all(user.id, today) as TodayEntryRow[];

  return <TimerManager clients={toPlainRows(clients)} projects={toPlainRows(projects)} entries={toPlainRows(entries)} />;
}
