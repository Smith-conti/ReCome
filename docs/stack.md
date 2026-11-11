# Stack de ReCome

Versiones instaladas y verificadas en la Fase 1.

| Paquete | Versión | Uso |
|---|---|---|
| next | 16.4.6 | Framework (App Router) |
| react / react-dom | 19.3.0 | UI |
| typescript | 5.x | Tipado |
| tailwindcss | 4.3.3 | Estilos (configuración CSS-first) |
| shadcn (CLI) | 4.23.0 | Componentes base |
| @base-ui/react | 1.9.x | Primitivas de los componentes shadcn |
| lucide-react | 1.72.x | Iconos |
| @supabase/supabase-js | 2.119.x | Cliente Supabase |
| @supabase/ssr | 0.12.x | Sesión SSR con cookies |
| zod | 4.6.x | Validación de datos (Fase 2+) |

## Convenciones de esta versión

- **Next.js 16** usa `src/proxy.ts` (la convención `middleware.ts` está obsoleta). El archivo exporta `proxy` y `config.matcher`.
- **Tailwind CSS 4** se configura desde `src/app/globals.css` (`@import`, `@theme inline`), sin `tailwind.config.js`.
- **shadcn 4** instala componentes basados en Base UI (`@base-ui/react`). Para enlaces con apariencia de botón se usa `buttonVariants()` + `next/link`; para superponer un elemento se usa la prop `render`.
- Los tipos de rutas de Next 16 (`LayoutProps`, `PageProps`) se generan en `.next/types`.

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # ESLint
npx tsc --noEmit # verificación de tipos
```

## Variables de entorno

Ver `.env.example`. Sin credenciales de Supabase la aplicación funciona en modo público; la capa de sesión queda inactiva hasta configurarlas.
