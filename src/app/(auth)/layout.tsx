import Link from "next/link";
import { SiteLogo } from "@/components/layout/site-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hero-surface flex min-h-dvh flex-col">
      <header className="border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between">
          <SiteLogo />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Volver al inicio
          </Link>
        </div>
      </header>
      <main id="contenido" className="flex flex-1 items-center">
        {children}
      </main>
    </div>
  );
}
