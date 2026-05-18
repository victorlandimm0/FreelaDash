import { z } from "zod";

const optionalEmail = z
  .string()
  .trim()
  .email("Email inválido")
  .or(z.literal(""))
  .optional()
  .transform((value) => value || null);

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().email("Email inválido").toLowerCase(),
  password: z.string().min(6, "Use pelo menos 6 caracteres")
});

export const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").toLowerCase(),
  password: z.string().min(1, "Informe a senha")
});

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente"),
  email: optionalEmail,
  hourlyRateCents: z.coerce.number().int().min(0, "Valor/hora inválido")
});

export const projectSchema = z.object({
  clientId: z.coerce.number().int().positive("Selecione um cliente"),
  name: z.string().trim().min(2, "Informe o nome do projeto"),
  status: z.enum(["active", "completed"]),
  hourlyRateCents: z.coerce.number().int().min(0).nullable().optional()
});

export const timeEntrySchema = z.object({
  clientId: z.coerce.number().int().positive("Selecione um cliente"),
  projectId: z.coerce.number().int().positive().nullable().optional(),
  entryDate: dateString,
  minutes: z.coerce.number().int().min(1, "Informe o tempo").max(1440, "Limite diário excedido"),
  description: z.string().trim().min(2, "Descreva o trabalho").max(500),
  billable: z.coerce.boolean().default(true)
});

export const invoiceCreateSchema = z
  .object({
    clientId: z.coerce.number().int().positive("Selecione um cliente"),
    projectId: z.coerce.number().int().positive().nullable().optional(),
    periodStart: dateString,
    periodEnd: dateString
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    message: "A data final deve ser posterior à inicial",
    path: ["periodEnd"]
  });

export const invoiceStatusSchema = z.object({
  status: z.enum(["draft", "sent", "paid"])
});
