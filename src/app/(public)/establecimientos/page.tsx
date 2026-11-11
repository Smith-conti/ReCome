import type { Metadata } from "next";
import { Store } from "lucide-react";
import { ComingSoon } from "@/components/public/coming-soon";

export const metadata: Metadata = {
  title: "Establecimientos",
  description:
    "Directorio de panaderías, cafeterías, restaurantes y otros comercios de Cusco que forman parte de ReCome.",
};

export default function BusinessesPage() {
  return (
    <ComingSoon
      icon={Store}
      badge="Directorio en preparación"
      title="Estamos sumando los primeros comercios"
      description="Aquí encontrarás el directorio de establecimientos de Cusco que ofrecen excedentes de alimentos. El registro de comercios ya está disponible."
      primaryHref="/registro"
      primaryLabel="Registrar mi negocio"
      secondaryHref="/"
      secondaryLabel="Volver al inicio"
    />
  );
}
