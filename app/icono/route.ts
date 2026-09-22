import { iconoSVG } from "@/lib/marca";

/**
 * Sirve el ícono generado desde lib/marca.ts.
 *
 * Así no hay un archivo .svg suelto en public/ que haya que acordarse de
 * actualizar cada vez que cambie la marca: hay una sola fuente y esto la lee.
 */
export function GET() {
  return new Response(iconoSVG(512), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
