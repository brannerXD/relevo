import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Latido: mantiene despierto el proyecto de Supabase.
 *
 * Esto existe por una falla que casi nos cuesta la entrega y que no se ve en
 * ninguna prueba local.
 *
 * Supabase PAUSA los proyectos gratuitos tras unos días sin actividad en la
 * base. Cuando eso pasa, Relevo no se degrada: se MUERE. Sin Supabase no hay
 * sesión anónima, y sin sesión el guardia rechaza todas las peticiones. La
 * página abre, el búho se mueve, y nada funciona.
 *
 * Lo vivimos: doce días sin tocarlo y el host dejó de resolver
 * (ENOTFOUND). Despertarlo tomó 75 segundos, y durante ese rato la API
 * devolvía "Bad Gateway". Si eso pasa cuando el jurado abre el enlace, no hay
 * segunda oportunidad: ven una aplicación rota y siguen con la siguiente.
 *
 * Una consulta diaria cuenta como actividad y evita la pausa. Es la línea de
 * código más aburrida del proyecto y probablemente la más importante.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET() {
  if (!url || !anon) {
    return NextResponse.json({ ok: false, motivo: "sin configurar" }, { status: 503 });
  }

  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });

    // Una consulta trivial. Las políticas RLS la dejan en cero filas para
    // quien no tiene sesión, que es justo lo que queremos: toca la base sin
    // poder leer nada de nadie.
    const { error } = await sb.from("documentos").select("id", { head: true, count: "exact" });

    if (error) {
      console.error("[relevo:latido] la base respondió con error:", error.message);
      return NextResponse.json({ ok: false, motivo: error.message }, { status: 503 });
    }

    return NextResponse.json({ ok: true, cuando: new Date().toISOString() });
  } catch (e) {
    console.error("[relevo:latido] no se pudo alcanzar la base:", e);
    return NextResponse.json({ ok: false, motivo: String(e) }, { status: 503 });
  }
}
