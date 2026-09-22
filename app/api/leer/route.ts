import { NextResponse } from "next/server";
import { proveedor, traducirError } from "@/lib/proveedor";
import { conReloj, guardia, Rechazado } from "@/lib/guardia";

export const runtime = "nodejs";
// Vercel corta a los 60 s en el plan gratuito. Pedir más no lo alarga: solo
// hace que el corte llegue sin aviso. Cortamos nosotros antes, en conReloj.
export const maxDuration = 60;

const MEDIA_VALIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** PASOS 1 y 2 del flujo: clasificar el documento y extraer sus campos. */
export async function POST(req: Request) {
  try {
    // Una foto comprimida a 1600 px pesa cientos de kB; 8 MB en base64 deja
    // margen de sobra y corta de una vez cualquier cuerpo absurdo.
    await guardia(req, { topeMB: 8, porMinuto: 25 });
  } catch (e) {
    if (e instanceof Rechazado) {
      return NextResponse.json({ error: e.message }, { status: e.estado });
    }
    const { mensaje, estado } = traducirError(e, "guardia:leer");
    return NextResponse.json({ error: mensaje }, { status: estado });
  }

  let cuerpo: { data?: string; media_type?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { data, media_type } = cuerpo;
  if (!data || !media_type) {
    return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
  }
  if (!MEDIA_VALIDOS.includes(media_type)) {
    return NextResponse.json(
      { error: `Formato no soportado: ${media_type}` },
      { status: 400 },
    );
  }

  try {
    const documento = await conReloj(
      proveedor().leerDocumento({ data, mediaType: media_type }),
      50,
      "La lectura se demoró demasiado. Intente con una foto más clara.",
    );
    return NextResponse.json(documento);
  } catch (error) {
    if (error instanceof Rechazado) {
      return NextResponse.json({ error: error.message }, { status: error.estado });
    }
    const { mensaje, estado } = traducirError(error, "leer");
    return NextResponse.json({ error: mensaje }, { status: estado });
  }
}
