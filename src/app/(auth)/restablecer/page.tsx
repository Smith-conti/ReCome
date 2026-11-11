import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { buttonVariants } from "@/components/ui/button";
import { getSessionProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  description: "Define una nueva contraseña para tu cuenta de ReCome.",
};

export default function ResetPasswordPage() {
  return (
    <div className="container-page w-full py-12 sm:py-16">
      <Suspense fallback={<ResetSkeleton />}>
        <ResetContent />
      </Suspense>
    </div>
  );
}

async function ResetContent() {
  const profile = await getSessionProfile();

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="eyebrow">Seguridad</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">
          {profile ? "Crea tu nueva contraseña" : "Enlace no válido"}
        </h1>

        {profile ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sesión de{" "}
              <span className="font-medium text-foreground">
                {profile.email}
              </span>
              . Al guardar, entrarás directamente a tu panel.
            </p>
            <div className="mt-6">
              <ResetPasswordForm />
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Este enlace expiró o ya se usó. Solicita uno nuevo para
              restablecer tu contraseña.
            </p>
            <Link
              href="/recuperar"
              className={buttonVariants({ className: "mt-6 h-10 w-full" })}
            >
              Solicitar otro enlace
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ResetSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="h-72 animate-pulse rounded-3xl border border-border bg-card/60" />
    </div>
  );
}
