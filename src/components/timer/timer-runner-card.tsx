"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateInputValue } from "@/lib/format";
import { formatElapsed, type TimerProjectOption } from "./timer-shared";

type TimerRunnerCardProps = {
  projects: TimerProjectOption[];
  onError: (message: string | null) => void;
};

export function TimerRunnerCard({ projects, onError }: TimerRunnerCardProps) {
  const router = useRouter();
  const today = toDateInputValue();
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id.toString() ?? "");
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const selectedProject = projects.find((project) => project.id.toString() === selectedProjectId);

  useEffect(() => {
    if (!startedAt) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [startedAt]);

  function startTimer() {
    if (!selectedProject || !description.trim()) {
      onError("Selecione um projeto e descreva o que está fazendo.");
      return;
    }

    onError(null);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
  }

  async function stopTimer() {
    if (!startedAt || !selectedProject) return;

    setIsSaving(true);
    onError(null);

    const seconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    const response = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedProject.client_id,
        projectId: selectedProject.id,
        entryDate: today,
        minutes: Math.max(1, Math.round(seconds / 60)),
        description,
        billable: true
      })
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      onError(body.error ?? "Não foi possível salvar o timer.");
      setIsSaving(false);
      return;
    }

    setStartedAt(null);
    setElapsedSeconds(0);
    setDescription("");
    setIsSaving(false);
    router.refresh();
  }

  return (
    <Card className="overflow-hidden bg-white">
      <CardHeader className="pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Timer de horas</p>
        <CardTitle className="max-w-xl text-3xl leading-tight sm:text-4xl">Controle o trabalho do dia sem fricção</CardTitle>
        <CardDescription className="max-w-2xl text-base leading-7">
          Selecione o projeto, descreva a tarefa e use o cronômetro para salvar o tempo automaticamente quando terminar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg bg-[#080b18] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Tempo atual</p>
          <p className="mt-3 font-mono text-5xl font-semibold leading-none tracking-normal sm:text-6xl">{formatElapsed(elapsedSeconds)}</p>
          <p className="mt-4 text-sm text-white/60">
            {startedAt ? `Rodando em ${selectedProject?.client_name} · ${selectedProject?.name}` : "Nenhum timer em andamento"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="timerProject">Projeto</Label>
            <select
              id="timerProject"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={Boolean(startedAt) || projects.length === 0}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.client_name} · {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timerDescription">Descrição</Label>
            <Input id="timerDescription" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex: ajustes na landing page" disabled={Boolean(startedAt)} required />
          </div>
        </div>

        {projects.length === 0 && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Crie um projeto ativo em Clientes para usar o cronômetro.</p>}

        <div className="flex flex-wrap items-center gap-3">
          {!startedAt ? (
            <Button onClick={startTimer} disabled={projects.length === 0 || isSaving}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Start
            </Button>
          ) : (
            <Button variant="danger" onClick={stopTimer} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Square className="h-4 w-4" aria-hidden="true" />}
              Stop e salvar
            </Button>
          )}
          <p className="text-sm text-muted-foreground">{startedAt ? "O registro será salvo como faturável." : "Pronto para começar quando você estiver."}</p>
        </div>
      </CardContent>
    </Card>
  );
}
