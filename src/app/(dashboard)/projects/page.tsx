import { PageHeader } from "@/components/page-header";
import { ProjectsManager, type ProjectRow } from "@/components/projects-manager";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toPlainRows } from "@/lib/rows";

type ClientOption = {
  id: number;
  name: string;
};

export default async function ProjectsPage() {
  const user = await requireUser();
  const clients = db.prepare("SELECT id, name FROM clients WHERE user_id = ? ORDER BY name ASC").all(user.id) as ClientOption[];
  const projects = db
    .prepare(
      `
      SELECT
        projects.*,
        clients.name AS client_name,
        COALESCE(SUM(time_entries.minutes), 0) AS total_minutes
      FROM projects
      JOIN clients ON clients.id = projects.client_id
      LEFT JOIN time_entries ON time_entries.project_id = projects.id
      WHERE projects.user_id = ?
      GROUP BY projects.id
      ORDER BY projects.status ASC, projects.name ASC
    `
    )
    .all(user.id) as ProjectRow[];

  return (
    <>
      <PageHeader title="Projetos" description="Organize entregas por cliente e marque o que está ativo ou concluído." />
      <ProjectsManager clients={toPlainRows(clients)} projects={toPlainRows(projects)} />
    </>
  );
}
