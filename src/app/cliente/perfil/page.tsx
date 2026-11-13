import type { Metadata } from "next";
import { Suspense } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/auth/profile-form";
import { DashboardBodySkeleton } from "@/components/dashboard/dashboard-skeleton";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireSessionProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Mi perfil",
};

export default function ClienteProfilePage() {
  return (
    <Suspense fallback={<DashboardBodySkeleton />}>
      <ClienteProfileContent />
    </Suspense>
  );
}

async function ClienteProfileContent() {
  const profile = await requireSessionProfile();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Mi perfil</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">Datos de tu cuenta</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Puedes cambiar tu nombre y tu teléfono. El correo y el tipo de cuenta
          solo los administra ReCome.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Correo
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{profile.email}</span>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tipo de cuenta
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <ShieldCheck
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Badge variant="secondary">{ROLE_LABEL[profile.role]}</Badge>
            </p>
          </div>
        </div>

        <ProfileForm fullName={profile.fullName} phone={profile.phone} />
      </div>
    </div>
  );
}
