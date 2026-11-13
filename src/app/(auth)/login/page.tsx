import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { FormAlert } from "@/components/auth/fields";
import { safeInternalPath } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Acceso a tu cuenta de ReCome.",
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <div className="container-page w-full py-12 sm:py-16">
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  const next = safeInternalPath(params?.next);
  const linkExpired = params?.error === "enlace";

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="eyebrow">Acceso</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">Ingresa a ReCome</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Gestiona tus reservas o administra tu establecimiento. Si venías de
          una página privada, volverás a ella al ingresar.
        </p>

        {linkExpired ? (
          <div className="mt-4">
            <FormAlert tone="error">
              El enlace expiró o ya se usó. Ingresa con tu contraseña o solicita
              uno nuevo.
            </FormAlert>
          </div>
        ) : null}

        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Crear una cuenta
        </Link>
      </p>
    </div>
  );
}

function AuthCardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="h-80 animate-pulse rounded-3xl border border-border bg-card/60" />
    </div>
  );
}
