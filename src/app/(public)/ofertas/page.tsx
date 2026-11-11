import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { ComingSoon } from "@/components/public/coming-soon";

export const metadata: Metadata = {
  title: "Ofertas",
  description:
    "Catálogo de excedentes de alimentos con descuento en Cusco.",
};

export default function OffersPage() {
  return (
    <ComingSoon
      icon={ShoppingBag}
      badge="Catálogo en preparación"
      title="Todavía no hay ofertas publicadas"
      description="El catálogo se habilitará cuando los primeros comercios de Cusco estén aprobados y publiquen sus excedentes. Si tienes un negocio, puedes registrarlo desde ahora."
      primaryHref="/registro"
      primaryLabel="Registrar mi negocio"
      secondaryHref="/"
      secondaryLabel="Volver al inicio"
    />
  );
}
