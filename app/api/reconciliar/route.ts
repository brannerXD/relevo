import { NextResponse } from "next/server";
import { z } from "zod";
import { Documento } from "@/lib/tipos";
import { proyectar } from "@/lib/proyeccion";
import { proveedor, traducirError } from "@/lib/proveedor";
import { conReloj, guardia, Rechazado } from "@/lib/guardia";

export const runtime = "nodejs";
// Estaba en 120 y era mentira: el plan gratuito de Vercel corta a los 60 y
// devuelve un 504 pelado. Cortamos nosotros a los 50 con un mensaje decente.
export const maxDuration = 60;

const Entrada = z.object({ documentos: z.array(Documento) });

/**
 * PASO 3 (reconciliar) + PASO 4 (proyectar, en TypeScript) + PASO 5 (acciones).
 *
 * El orden importa: primero calculamos las fechas con aritmética exacta y
 * DESPUÉS se las damos al modelo. Así el modelo razona sobre relaciones entre
 * documentos, que es lo que sabe hacer, y no sobre restas de fechas, que es
 * justamente lo que hace mal. Esa división es el argumento del producto.
 */
export async function POST(req: Request) {
  try {
    // Aquí solo viaja texto ya extraído: 1 MB sobra. Y el ritmo es más
    // estrecho porque armar el plan es la llamada cara de las dos.
    await guardia(req, { topeMB: 1, porMinuto: 10 });
  } catch (e) {
    if (e instanceof Rechazado) {
      return NextResponse.json({ error: e.message }, { status: e.estado });
    }
    const { mensaje, estado } = traducirError(e, "guardia:reconciliar");
    return NextResponse.json({ error: mensaje }, { status: estado });
  }

  let entrada: z.infer<typeof Entrada>;
  try {
    entrada = Entrada.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Documentos inválidos" }, { status: 400 });
  }

  const utiles = entrada.documentos.filter((d) => d.legible);
  if (utiles.length === 0) {
    return NextResponse.json(
      { error: "No hay ningún documento que se pueda leer todavía." },
      { status: 400 },
    );
  }

  const proyecciones = proyectar(utiles);
  const hoy = new Date().toISOString().slice(0, 10);

  try {
    const plan = await conReloj(
      proveedor().armarPlan(utiles, proyecciones, hoy),
      50,
      "Armar el plan se demoró demasiado. Intente de nuevo en un momento.",
    );
    return NextResponse.json({ ...plan, proyecciones });
  } catch (error) {
    if (error instanceof Rechazado) {
      return NextResponse.json({ error: error.message }, { status: error.estado });
    }
    const { mensaje, estado } = traducirError(error, "reconciliar");
    return NextResponse.json({ error: mensaje }, { status: estado });
  }
}
