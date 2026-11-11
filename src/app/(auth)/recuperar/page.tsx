import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Solicita un enlace para restablecer tu contraseña de ReCome.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="container-page w-full py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="eyebrow">Recuperación</p>
          <h1 className="mt-2 text-2xl sm:text-3xl">Restablece tu contraseña</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Escribe el correo con el que te registraste y te enviaremos un
            enlace para crear una contraseña nueva.
          </p>

          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Recordaste tu contraseña?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
