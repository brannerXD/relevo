import { createClient } from "@supabase/supabase-js";

/**
 * Guardia de las rutas que gastan plata.
 *
 * En local daba igual. Publicado no: una URL abierta con una clave de IA
 * detrás es una invitación a que un desconocido le queme la cuota con `curl`,
 * y uno se entera cuando deja de funcionar — que siempre es el peor momento.
 *
 * Tres capas, de más barata a más cara:
 *
 *   1. Tamaño del cuerpo. Se mira el encabezado antes de leer nada.
 *   2. Ritmo por usuario y por IP. En memoria.
 *   3. Sesión válida de Supabase. Esta cuesta una llamada de red, así que va
 *      de último: no tiene sentido validar el token de una petición que ya
 *      sabemos que es demasiado grande.
 *
 * Exigir sesión no le pide nada a la persona: la aplicación ya le abre una
 * sesión anónima al entrar. Lo que bloquea es a quien llega por fuera de la
 * aplicación, que es justo de quien nos queremos cuidar.
 */

export class Rechazado extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "Rechazado";
  }
}

// ── 1. Tamaño ──────────────────────────────────────────────────────────────

export function exigirTamano(req: Request, topeMB: number) {
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > topeMB * 1024 * 1024) {
    throw new Rechazado(413, "Esa foto pesa demasiado. Tome otra más sencilla.");
  }
}

// ── 2. Ritmo ───────────────────────────────────────────────────────────────

/**
 * Contador en memoria. En serverless cada instancia tiene el suyo y se
 * reinicia al dormirse, así que no es una muralla: es un freno. La muralla
 * real es el paso 3, porque para pedir cien veces hay que tener cien sesiones
 * y Supabase también limita cuántas se crean por hora desde una misma IP.
 */
const visitas = new Map<string, number[]>();

function ritmo(llave: string, tope: number, ventanaSeg: number) {
  const ahora = Date.now();
  const desde = ahora - ventanaSeg * 1000;
  const previas = (visitas.get(llave) ?? []).filter((t) => t > desde);

  if (previas.length >= tope) {
    throw new Rechazado(429, "Va muy rápido. Espere un momento y vuelva a intentar.");
  }

  previas.push(ahora);
  visitas.set(llave, previas);

  // Barrido perezoso para que el mapa no crezca sin fin en una instancia larga.
  if (visitas.size > 5000) {
    for (const [k, v] of visitas) if (v.every((t) => t <= desde)) visitas.delete(k);
  }
}

function ip(req: Request): string {
  const cabecera = req.headers.get("x-forwarded-for") ?? "";
  return cabecera.split(",")[0].trim() || "desconocida";
}

// ── 3. Sesión ──────────────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sin nube configurada no hay a quién validar: se deja pasar y se avisa. */
export const guardiaActiva = Boolean(url && anon);

async function exigirSesion(req: Request): Promise<string> {
  const cabecera = req.headers.get("authorization") ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";

  if (!token) {
    throw new Rechazado(401, "Abra Relevo de nuevo para continuar.");
  }

  const sb = createClient(url!, anon!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);

  if (error || !data.user) {
    throw new Rechazado(401, "Su sesión se venció. Abra Relevo de nuevo.");
  }
  return data.user.id;
}

// ── Todo junto ─────────────────────────────────────────────────────────────

type Opciones = {
  /** Tope del cuerpo en megabytes. */
  topeMB: number;
  /** Peticiones permitidas por minuto, por usuario. */
  porMinuto: number;
};

/**
 * Corre las tres capas. Devuelve el id de la persona para poder registrarlo.
 * Lanza `Rechazado` con el estado y el mensaje ya en español.
 */
export async function guardia(req: Request, { topeMB, porMinuto }: Opciones): Promise<string | null> {
  exigirTamano(req, topeMB);

  // La IP se limita siempre, incluso sin nube: es la única defensa que queda
  // si alguien despliega esto sin configurar Supabase.
  ritmo(`ip:${ip(req)}`, porMinuto * 3, 60);

  if (!guardiaActiva) {
    console.warn("[relevo] sin Supabase configurado: las rutas quedan sin sesión exigida.");
    return null;
  }

  const usuario = await exigirSesion(req);
  ritmo(`u:${usuario}`, porMinuto, 60);
  return usuario;
}

// ── Reloj ──────────────────────────────────────────────────────────────────

/**
 * Vercel corta las funciones a los 60 s en el plan gratuito y lo que devuelve
 * es un 504 sin explicación. Preferimos cortar nosotros un poco antes y
 * decirle a la persona algo que entienda.
 */
export function conReloj<T>(promesa: Promise<T>, segundos: number, mensaje: string): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<never>((_, rechazar) =>
      setTimeout(() => rechazar(new Rechazado(504, mensaje)), segundos * 1000),
    ),
  ]);
}
