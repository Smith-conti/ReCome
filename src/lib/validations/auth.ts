import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .min(1, "Ingresa tu correo.")
  .max(254, "El correo es demasiado largo.")
  .pipe(z.email("Ingresa un correo válido."))
  .transform((value) => value.toLowerCase());

const fullNameField = z
  .string()
  .trim()
  .min(2, "Escribe tu nombre completo.")
  .max(120, "El nombre no puede superar 120 caracteres.");

const phoneField = z
  .string()
  .trim()
  .max(30, "El teléfono no puede superar 30 caracteres.")
  .refine(
    (value) => value === "" || /^[0-9+()\-\s]{6,30}$/.test(value),
    "Ingresa un teléfono válido (solo números, espacios, +, - y paréntesis).",
  );

const passwordField = z
  .string()
  .min(8, "Usa al menos 8 caracteres.")
  .max(72, "La contraseña no puede superar 72 caracteres.")
  .regex(/[A-Za-z]/, "Incluye al menos una letra.")
  .regex(/[0-9]/, "Incluye al menos un número.");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Ingresa tu contraseña."),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    phone: phoneField,
    role: z.enum(["CLIENT", "BUSINESS"], {
      error: "Elige el tipo de cuenta.",
    }),
    password: passwordField,
    confirmPassword: z.string().min(1, "Repite la contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export const updateProfileSchema = z.object({
  fullName: fullNameField,
  phone: phoneField,
});

export const requestPasswordResetSchema = z.object({
  email: emailField,
});

export const updatePasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, "Repite la contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
