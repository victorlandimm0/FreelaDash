import { mkdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { scryptSync, randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const databasePath = process.env.SQLITE_PATH ?? path.join(os.tmpdir(), "FreelaDash", "freeladash.db");
const resolvedPath = path.isAbsolute(databasePath)
  ? databasePath
  : path.join(process.cwd(), databasePath);

mkdirSync(path.dirname(resolvedPath), { recursive: true });
rmSync(resolvedPath, { force: true });

const schema = readFileSync(path.join(process.cwd(), "database", "schema.sql"), "utf8");
const db = new DatabaseSync(resolvedPath);
db.exec("PRAGMA foreign_keys = ON;");
db.exec(schema);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const userResult = db
  .prepare("INSERT INTO users (name, email, password_hash, default_hourly_rate_cents) VALUES (?, ?, ?, ?)")
  .run("Ana Freela", "ana@freeladash.dev", hashPassword("123456"), 16000);

const userId = Number(userResult.lastInsertRowid);

const clients = [
  ["Aurora Studio", "financeiro@aurorastudio.dev", 18000],
  ["Café Pixel", "marina@cafepixel.com.br", 14000],
  ["Norte SaaS", "ops@nortesaas.com", 22000]
].map(([name, email, rate]) => {
  const result = db
    .prepare("INSERT INTO clients (user_id, name, email, hourly_rate_cents) VALUES (?, ?, ?, ?)")
    .run(userId, name, email, rate);
  return { id: Number(result.lastInsertRowid), name };
});

const projectSeeds = [
  [clients[0].id, "Landing page institucional", "active", null],
  [clients[0].id, "Identidade do lançamento", "completed", 20000],
  [clients[1].id, "Cardápio digital", "active", 15000],
  [clients[1].id, "Campanha Dia dos Namorados", "active", null],
  [clients[2].id, "Dashboard de métricas", "active", 24000]
];

const projects = projectSeeds.map(([clientId, name, status, rate]) => {
  const result = db
    .prepare("INSERT INTO projects (user_id, client_id, name, status, hourly_rate_cents) VALUES (?, ?, ?, ?, ?)")
    .run(userId, clientId, name, status, rate);
  return { id: Number(result.lastInsertRowid), clientId, name };
});

const descriptions = [
  "Mapeamento de requisitos e próximos passos",
  "Wireframes da tela principal",
  "Ajustes visuais no layout responsivo",
  "Implementação de componentes reutilizáveis",
  "Revisão de textos e microcopy",
  "Integração com formulário de contato",
  "Correções de feedback do cliente",
  "Otimização de performance no mobile",
  "Preparação de relatório semanal",
  "Validação de fluxo de checkout",
  "Refino de estados vazios",
  "Configuração de tracking de eventos",
  "Ajustes finais para publicação",
  "Criação de variações de campanha",
  "Organização de backlog",
  "Revisão de acessibilidade",
  "Teste de navegação em celulares",
  "Documentação de entrega",
  "Análise de métricas do produto",
  "Reunião de alinhamento e planejamento"
];

const entrySeeds = [
  [2, projects[0], 150],
  [4, projects[4], 210],
  [5, projects[2], 90],
  [6, projects[3], 120],
  [8, projects[0], 180],
  [9, projects[1], 240],
  [11, projects[4], 160],
  [12, projects[2], 75],
  [13, projects[0], 135],
  [15, projects[3], 180],
  [16, projects[4], 240],
  [17, projects[1], 110],
  [19, projects[2], 130],
  [20, projects[0], 95],
  [21, projects[4], 210],
  [23, projects[3], 150],
  [24, projects[2], 80],
  [26, projects[0], 200],
  [28, projects[4], 170],
  [29, projects[1], 125]
];

const insertEntry = db.prepare(`
  INSERT INTO time_entries
    (user_id, client_id, project_id, entry_date, minutes, description, billable)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

entrySeeds.forEach(([daysAgo, project, minutes], index) => {
  insertEntry.run(
    userId,
    project.clientId,
    project.id,
    dateDaysAgo(daysAgo),
    minutes,
    descriptions[index],
    index === 14 ? 0 : 1
  );
});

const monthStart = new Date();
monthStart.setDate(1);
const monthStartValue = monthStart.toISOString().slice(0, 10);
const todayValue = new Date().toISOString().slice(0, 10);

const invoiceClient = clients[0];
const rows = db
  .prepare(
    `
    SELECT
      time_entries.minutes,
      clients.hourly_rate_cents AS client_rate
    FROM time_entries
    JOIN clients ON clients.id = time_entries.client_id
    LEFT JOIN projects ON projects.id = time_entries.project_id
    WHERE time_entries.user_id = ?
      AND time_entries.client_id = ?
      AND time_entries.billable = 1
      AND time_entries.entry_date BETWEEN ? AND ?
  `
  )
  .all(userId, invoiceClient.id, monthStartValue, todayValue);

const totalMinutes = rows.reduce((total, row) => total + row.minutes, 0);
const totalCents = rows.reduce((total, row) => total + Math.round((row.minutes / 60) * row.client_rate), 0);

if (totalMinutes > 0) {
  db.prepare(
    "INSERT INTO invoices (user_id, client_id, number, period_start, period_end, total_minutes, total_cents, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(userId, invoiceClient.id, "FD-SEED-001", monthStartValue, todayValue, totalMinutes, totalCents, "sent");
}

db.close();

console.log(`Banco criado em ${resolvedPath}`);
console.log("Login de teste: ana@freeladash.dev / 123456");
console.log("Seed: 3 clientes, 5 projetos e 20 registros de horas.");
