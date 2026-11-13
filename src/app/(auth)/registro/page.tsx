import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Regístrate en ReCome como cliente o establecimiento.",
};

export default function RegisterPage() {
  return (
    <div className="container-page w-full py-12 sm:py-16">
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="eyebrow">Registro</p>
          <h1 className="mt-2 text-2xl sm:text-3xl">Crea tu cuenta</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Elige cómo vas a usar ReCome. El tipo de cuenta define a qué panel
            accedes; podrás cambiar tus datos personales cuando quieras.
          </p>

          <div className="mt-6">
            <RegisterForm />
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
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
