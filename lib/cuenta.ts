"use client";

import type { User } from "@supabase/supabase-js";
import { hayNube, supabase } from "./supabase";

/**
 * Cuentas.
 *
 * La decisión de diseño está aquí y no es menor: la cuenta NO va delante del
 * producto. La persona entra anónima, trabaja, y solo cuando ya tiene un plan
 * que perder se le ofrece guardarlo.
 *
 * Por eso lo normal no es "registrarse", sino VINCULAR: el usuario anónimo que
 * ya existe se convierte en uno con correo, y todo lo que guardó sigue siendo
 * suyo porque el id no cambia. Registrarse desde cero solo pasa si alguien
 * llega sin nada.
 */

export type Cuenta = {
  id: string;
  correo: string | null;
  anonima: boolean;
};

function aCuenta(u: User | null): Cuenta | null {
  if (!u) return null;
  return {
    id: u.id,
    correo: u.email ?? null,
    anonima: Boolean(u.is_anonymous),
  };
}

export async function cuentaActual(): Promise<Cuenta | null> {
  if (!hayNube) return null;
  const { data } = await supabase().auth.getUser();
  return aCuenta(data.user);
}

/** Avisa cuando la sesión cambia (entrar, salir, vincular). */
export function alCambiarCuenta(fn: (c: Cuenta | null) => void) {
  if (!hayNube) return () => {};
  const { data } = supabase().auth.onAuthStateChange((_evento, sesion) => {
    fn(aCuenta(sesion?.user ?? null));
  });
  return () => data.subscription.unsubscribe();
}

export type Resultado =
  | { ok: true; confirmar?: boolean }
  | { ok: false; mensaje: string };

/**
 * Guarda la cuenta conservando todo lo que ya hizo.
 *
 * Si la sesión actual es anónima le agregamos correo y contraseña al MISMO
 * usuario: el id no cambia, así que sus documentos y su plan siguen ahí. Si no
 * es anónima, es un registro normal.
 */
export async function guardarCuenta(correo: string, clave: string): Promise<Resultado> {
  if (!hayNube) return { ok: false, mensaje: "La nube no está configurada." };
  const sb = supabase();

  try {
    const { data } = await sb.auth.getUser();

    if (data.user?.is_anonymous) {
      const { error } = await sb.auth.updateUser({ email: correo, password: clave });
      if (error) return { ok: false, mensaje: traducir(error.message) };
      // Sigue trabajando con su sesión de siempre; el correo se confirma
      // cuando abra el enlace. No la bloqueamos entre tanto.
      return { ok: true, confirmar: true };
    }

    const { data: nuevo, error } = await sb.auth.signUp({ email: correo, password: clave });
    if (error) return { ok: false, mensaje: traducir(error.message) };
    // Sin sesión de vuelta significa que Supabase espera confirmación.
    return { ok: true, confirmar: !nuevo.session };
  } catch (e) {
    return { ok: false, mensaje: traducir(String(e)) };
  }
}

export async function entrar(correo: string, clave: string): Promise<Resultado> {
  if (!hayNube) return { ok: false, mensaje: "La nube no está configurada." };
  try {
    const { error } = await supabase().auth.signInWithPassword({
      email: correo,
      password: clave,
    });
    if (error) return { ok: false, mensaje: traducir(error.message) };
    return { ok: true };
  } catch (e) {
    return { ok: false, mensaje: traducir(String(e)) };
  }
}

/**
 * Google.
 *
 * Si la sesión es anónima usamos linkIdentity para no perder lo guardado;
 * si no, es un inicio de sesión normal. Las dos llevan al mismo sitio.
 */
export async function conGoogle(): Promise<Resultado> {
  if (!hayNube) return { ok: false, mensaje: "La nube no está configurada." };
  const sb = supabase();
  const redirectTo = `${window.location.origin}/`;

  try {
    const { data } = await sb.auth.getUser();

    if (data.user?.is_anonymous) {
      const { error } = await sb.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      if (error) return { ok: false, mensaje: traducir(error.message) };
      return { ok: true };
    }

    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) return { ok: false, mensaje: traducir(error.message) };
    return { ok: true };
  } catch (e) {
    return { ok: false, mensaje: traducir(String(e)) };
  }
}

/** Salir y volver a una sesión anónima limpia. */
export async function salir() {
  if (!hayNube) return;
  await supabase().auth.signOut();
  try {
    localStorage.removeItem("relevo:es-ejemplo");
  } catch {}
}

/**
 * Los mensajes de Supabase vienen en inglés y en jerga. Aquí se traducen a
 * algo que una persona pueda leer sin saber qué es un "credential".
 */
function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "El correo o la contraseña no coinciden.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ese correo ya tiene una cuenta. Intente iniciar sesión.";
  if (m.includes("email address") && m.includes("invalid"))
    return "Ese correo no parece válido.";
  // Supabase dice el número en inglés ("at least 8 characters"). Lo sacamos
  // del propio mensaje en vez de escribirlo aquí, para que no se desincronice
  // el día que cambie el mínimo en el panel.
  if (m.includes("password") && /\d/.test(m)) {
    const n = m.match(/(\d+)/)?.[1];
    return n
      ? `La contraseña debe tener al menos ${n} caracteres.`
      : "Esa contraseña es muy corta.";
  }
  if (m.includes("password") && (m.includes("weak") || m.includes("easy to guess")))
    return "Esa contraseña es muy fácil de adivinar. Escoja otra.";
  if (m.includes("email not confirmed"))
    return "Le mandamos un correo para confirmar. Ábralo y vuelva.";
  if (m.includes("identity is already linked") || m.includes("already linked"))
    return "Esa cuenta de Google ya está vinculada a otro usuario.";
  // Supabase manda "Unsupported provider: provider is not enabled" cuando el
  // proveedor no está configurado en el panel. Vale la pena distinguirlo: no
  // es culpa de la persona y al equipo le dice exactamente qué falta.
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "El acceso con Google todavía no está habilitado. Use su correo por ahora.";
  if (m.includes("manual linking is disabled"))
    return "Falta habilitar la vinculación de cuentas en el servidor.";
  if (m.includes("rate") || m.includes("too many"))
    return "Demasiados intentos. Espere un momento.";
  if (m.includes("network") || m.includes("fetch"))
    return "No hubo conexión. Revise sus datos.";
  return "No se pudo. Intente de nuevo.";
}
