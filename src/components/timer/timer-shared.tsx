"use client";

import { formatMinutes } from "@/lib/format";

export type TimerClientOption = {
  id: number;
  name: string;
};

export type TimerProjectOption = {
  id: number;
  client_id: number;
  client_name: string;
  name: string;
  status: "active" | "completed";
};

export type TodayEntryRow = {
  id: number;
  entry_date: string;
  client_id: number;
  project_id: number | null;
  minutes: number;
  description: string;
  billable: number;
  client_name: string;
  project_name: string | null;
};

export type EditDraft = {
  selection: string;
  hours: string;
  description: string;
  billable: boolean;
};

export function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function minutesToHours(minutes: number) {
  return (minutes / 60).toFixed(2).replace(".", ",");
}

export function splitSelection(value: string) {
  const [clientId, projectId] = value.split("|");
  return {
    clientId: Number(clientId),
    projectId: projectId ? Number(projectId) : null
  };
}

export function entrySelection(entry: TodayEntryRow) {
  return `${entry.client_id}|${entry.project_id ?? ""}`;
}

type ProjectSelectProps = {
  clients: TimerClientOption[];
  projects: TimerProjectOption[];
  value: string;
  onChange: (value: string) => void;
};

export function ProjectSelect({ clients, projects, value, onChange }: ProjectSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full min-w-0 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      required
    >
      {clients.map((client) => (
        <optgroup key={client.id} label={client.name}>
          <option value={`${client.id}|`}>Sem projeto</option>
          {projects
            .filter((project) => project.client_id === client.id)
            .map((project) => (
              <option key={project.id} value={`${client.id}|${project.id}`}>
                {project.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

export function TodayTotalBadge({ minutes }: { minutes: number }) {
  return (
    <span className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
      {formatMinutes(minutes)} hoje
    </span>
  );
}
