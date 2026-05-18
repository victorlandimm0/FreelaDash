const invalidDurationMessage =
  "Formato inválido. Use horas inteiras (2), decimal (1.5 ou 1,5) ou HH:MM (1:30).";

export type DurationParseResult =
  | { ok: true; minutes: number }
  | { ok: false; error: string };

export function parseDurationToMinutes(value: string): DurationParseResult {
  const input = value.trim();

  if (!input) {
    return { ok: false, error: "Informe a duração em horas ou no formato HH:MM." };
  }

  if (input.includes(":")) {
    const match = input.match(/^(\d+):([0-5]\d)$/);

    if (!match) {
      return {
        ok: false,
        error: "No formato HH:MM, use minutos entre 00 e 59. Ex: 1:30 ou 0:45."
      };
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const totalMinutes = hours * 60 + minutes;

    return validateTotalMinutes(totalMinutes);
  }

  if (!/^\d+(?:[.,]\d+)?$/.test(input)) {
    return { ok: false, error: invalidDurationMessage };
  }

  const decimalHours = Number(input.replace(",", "."));

  if (!Number.isFinite(decimalHours)) {
    return { ok: false, error: invalidDurationMessage };
  }

  return validateTotalMinutes(Math.round(decimalHours * 60));
}

function validateTotalMinutes(minutes: number): DurationParseResult {
  if (minutes < 1) {
    return { ok: false, error: "Informe pelo menos 1 minuto." };
  }

  if (minutes > 1440) {
    return { ok: false, error: "Informe no máximo 24 horas em um único registro." };
  }

  return { ok: true, minutes };
}
