import { InvoicesManager, type InvoiceRow } from "@/components/invoices-manager";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toPlainRows } from "@/lib/rows";

type ClientOption = {
  id: number;
  name: string;
};

type ProjectOption = {
  id: number;
  client_id: number;
  name: string;
  status: "active" | "completed";
};

export default async function InvoicesPage() {
  const user = await requireUser();
  const clients = db.prepare("SELECT id, name FROM clients WHERE user_id = ? ORDER BY name ASC").all(user.id) as ClientOption[];
  const projects = db
    .prepare("SELECT id, client_id, name, status FROM projects WHERE user_id = ? ORDER BY name ASC")
    .all(user.id) as ProjectOption[];
  const invoices = db
    .prepare(
      `
      SELECT
        invoices.*,
        clients.name AS client_name,
        clients.email AS client_email,
        projects.name AS project_name
      FROM invoices
      JOIN clients ON clients.id = invoices.client_id
      LEFT JOIN projects ON projects.id = invoices.project_id
      WHERE invoices.user_id = ?
      ORDER BY invoices.created_at DESC, invoices.id DESC
    `
    )
    .all(user.id) as InvoiceRow[];

  return <InvoicesManager clients={toPlainRows(clients)} projects={toPlainRows(projects)} invoices={toPlainRows(invoices)} />;
}
