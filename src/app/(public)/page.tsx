import Link from "next/link";
import {
  ArrowRight,
  CakeSlice,
  Check,
  Clock,
  Coffee,
  Croissant,
  HeartHandshake,
  IceCreamBowl,
  Leaf,
  MapPin,
  QrCode,
  Recycle,
  Salad,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeaturedOffers } from "@/components/public/featured-offers";

const benefits = [
  {
    icon: Wallet,
    title: "Ahorra en tu día a día",
    description:
      "Productos en buen estado con precios reducidos, sin delivery ni intermediarios.",
  },
  {
    icon: Recycle,
    title: "Menos desperdicio",
    description:
      "Cada reserva evita que comida apta para el consumo termine en la basura.",
  },
  {
    icon: HeartHandshake,
    title: "Apoya lo local",
    description:
      "Tu compra sostiene a panaderías, cafeterías y restaurantes de Cusco.",
  },
];

const steps = [
  {
    title: "Encuentra",
    description:
      "Explora las ofertas por categoría y revisa el horario de recojo de cada comercio.",
  },
  {
    title: "Reserva",
    description:
      "Elige la cantidad que necesitas. El stock se descuenta al instante y recibes un código único.",
  },
  {
    title: "Recoge",
    description:
      "Acude al establecimiento dentro del horario indicado, muestra tu código y paga en el local.",
  },
];

const categories = [
  { icon: Croissant, label: "Panadería" },
  { icon: CakeSlice, label: "Pastelería" },
  { icon: Coffee, label: "Cafetería" },
  { icon: IceCreamBowl, label: "Heladería" },
  { icon: UtensilsCrossed, label: "Comida preparada" },
  { icon: Salad, label: "Otros" },
];

const businessPoints = [
  "Publica ofertas con cantidad, precio y horario de recojo en minutos.",
  "Controla el stock disponible y pausa tus ofertas cuando lo necesites.",
  "Confirma entregas con un código único y consulta tu historial.",
  "Recupera parte del valor de los productos que ibas a desechar.",
];

export default function HomePage() {
  return (
    <>
      <section className="hero-surface border-b border-border">
        <div className="container-page grid items-center gap-14 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <Badge variant="secondary" className="h-7 gap-1.5 px-3">
              <MapPin className="size-3.5" aria-hidden="true" />
              Cusco · Objetivo 12.3
            </Badge>

            <h1 className="mt-6 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Salva comida.
              <br />
              Ahorra dinero.
              <br />
              <span className="text-primary">Cuida Cusco.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              ReCome conecta a consumidores con panaderías, cafeterías,
              restaurantes y otros comercios locales que tienen excedentes de
              alimentos. Reserva, recoge y paga en el establecimiento.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/ofertas"
                className={buttonVariants({
                  className: "h-11 px-6 text-base",
                })}
              >
                Explorar ofertas
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="/#comercios"
                className={buttonVariants({
                  variant: "outline",
                  className: "h-11 px-6 text-base",
                })}
              >
                Soy comercio
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" aria-hidden="true" />
                Sin pagos en línea
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" aria-hidden="true" />
                Recojo en el local
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" aria-hidden="true" />
                Código único de recojo
              </li>
            </ul>
          </div>

          <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-sm sm:max-w-md">
            <div className="absolute inset-6 rounded-[3rem] bg-secondary" />
            <div className="absolute inset-0 rounded-[3rem] border border-primary/10" />
            <div className="absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card shadow-xl ring-1 ring-border sm:size-52" />
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Leaf className="size-6" />
              </span>
              <span className="font-heading text-lg font-semibold">ReCome</span>
              <span className="text-xs text-muted-foreground">
                menos desperdicio
              </span>
            </div>

            <span className="absolute left-0 top-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm">
              <Croissant className="size-4 text-primary" />
              Productos del día
            </span>
            <span className="absolute right-0 top-16 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm">
              <Wallet className="size-4 text-primary" />
              Precio reducido
            </span>
            <span className="absolute bottom-12 left-2 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm">
              <Clock className="size-4 text-primary" />
              Recojo programado
            </span>
            <span className="absolute bottom-2 right-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium shadow-sm">
              <QrCode className="size-4 text-primary" />
              Código de recojo
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card/60">
        <div className="container-page flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">
              Cerca de un tercio de los alimentos
            </strong>{" "}
            producidos en el mundo se pierde o desperdicia (FAO).
          </p>
          <p className="text-sm font-medium text-primary">
            ReCome les da una segunda oportunidad.
          </p>
        </div>
      </section>

      <FeaturedOffers />

      <section id="beneficios" className="section-space">
        <div className="container-page">
          <p className="eyebrow">Por qué ReCome</p>
          <h2 className="mt-3 max-w-2xl text-3xl sm:text-4xl">
            Bueno para tu bolsillo, mejor para la ciudad
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-border/80 shadow-none">
                <CardHeader>
                  <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle className="pt-2 text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        className="section-space border-y border-border bg-secondary/50"
      >
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Cómo funciona</p>
            <h2 className="mt-3 text-3xl sm:text-4xl">
              Reservar es tan simple como elegir, confirmar y recoger
            </h2>
          </div>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span className="grid size-10 place-items-center rounded-full bg-primary font-heading text-lg font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="categorias" className="section-space">
        <div className="container-page">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow">Categorías</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">
                Lo que puedes encontrar
              </h2>
            </div>
            <Link
              href="/ofertas"
              className={buttonVariants({ variant: "link", className: "px-0" })}
            >
              Ver catálogo
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-6 text-center"
              >
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="comercios" className="section-space pt-0">
        <div className="container-page">
          <div className="overflow-hidden rounded-3xl bg-primary text-primary-foreground">
            <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_0.9fr] lg:p-16">
              <div>
                <Badge className="h-7 bg-primary-foreground/15 px-3 text-primary-foreground">
                  <Store className="size-3.5" aria-hidden="true" />
                  Para establecimientos
                </Badge>
                <h2 className="mt-5 text-3xl text-primary-foreground sm:text-4xl">
                  Tus excedentes valen. Publícalos en ReCome.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
                  Si tienes una panadería, pastelería, cafetería, heladería o
                  restaurante en Cusco, puedes ofrecer lo que no alcanzaste a
                  vender y recuperar parte de su valor.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/registro"
                    className={buttonVariants({
                      variant: "secondary",
                      className: "h-11 px-6 text-base",
                    })}
                  >
                    Registrar mi negocio
                    <ArrowRight aria-hidden="true" />
                  </Link>
                  <Link
                    href="/#como-funciona"
                    className={buttonVariants({
                      variant: "outline",
                      className:
                        "h-11 border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                    })}
                  >
                    Cómo funciona
                  </Link>
                </div>
              </div>

              <ul className="space-y-4 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 p-6">
                {businessPoints.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-relaxed">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    <span className="text-primary-foreground/90">{point}</span>
                  </li>
                ))}
                <li className="border-t border-primary-foreground/15 pt-4 text-xs text-primary-foreground/70">
                  Cada establecimiento pasa por una revisión antes de publicar
                  ofertas.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
