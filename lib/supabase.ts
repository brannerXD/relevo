"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con sesión anónima.
 *
 * No le pedimos cuenta a nadie. Alguien de 54 años que apenas quiere
 * organizar unos papeles no va a inventarse una contraseña, y obligarla
 * sería perder a la persona antes de empezar.
 *
 * Pero anónimo NO significa abierto: cada dispositivo recibe un usuario real
 * de Supabase, y las políticas de la base de datos solo le dejan ver y tocar
 * sus propias filas. Verificado: un usuario no alcanza los papeles de otro.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hayNube = Boolean(url && clave);

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!hayNube) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local",
    );
  }
  if (!cliente) {
    cliente = createClient(url!, clave!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cliente;
}

/**
 * Encabezados para hablar con nuestras propias rutas.
 *
 * Las rutas que gastan plata exigen sesión (ver lib/guardia.ts). Como la
 * aplicación ya abre una sesión anónima al entrar, esto no le pide nada a la
 * persona: solo demuestra que la petición viene de la aplicación y no de
 * alguien golpeando la URL desde afuera.
 */
export async function encabezados(): Promise<Record<string, string>> {
  const base: Record<string, string> = { "Content-Type": "application/json" };
  if (!hayNube) return base;

  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (token) base.Authorization = `Bearer ${token}`;
  } catch {
    // Sin token la ruta responderá 401 con un mensaje legible. No rompemos aquí.
  }
  return base;
}

let entrando: Promise<string | null> | null = null;

/**
 * Devuelve el id del usuario de este dispositivo, creándolo la primera vez.
 * Se llama en cada arranque; la sesión queda guardada en el navegador.
 */
export function sesion(): Promise<string | null> {
  if (!hayNube) return Promise.resolve(null);
  if (entrando) return entrando;

  entrando = (async () => {
    const sb = supabase();
    const { data } = await sb.auth.getSession();
    if (data.session?.user) return data.session.user.id;

    const { data: nueva, error } = await sb.auth.signInAnonymously();
    if (error) {
      console.error("[relevo] no se pudo abrir sesión anónima:", error.message);
      return null;
    }
    return nueva.user?.id ?? null;
  })();

  return entrando;
}
