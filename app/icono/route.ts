import { caraSVG } from "@/lib/marca";

/**
 * Sirve el ícono generado desde lib/marca.ts.
 *
 * Así no hay un archivo .svg suelto en public/ que haya que acordarse de
 * actualizar cada vez que cambie la marca: hay una sola fuente y esto la lee.
 *
 * `?fondo=1` devuelve la versión con fondo de marca, que es la única que
 * necesita el ícono maskable de Android — ahí el sistema recorta a un círculo
 * y un PNG transparente le deja un hueco.
 */
export async function GET(req: Request) {
  const conFondo = new URL(req.url).searchParams.get("fondo") === "1";

  return new Response(caraSVG(512, conFondo ? "#FAF6F1" : undefined), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
