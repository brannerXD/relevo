import Anthropic from "@anthropic-ai/sdk";
import { proveedorClaude } from "./proveedores/claude";
import { proveedorGemini } from "./proveedores/gemini";
import { RespuestaInvalida, SinProveedor, type Proveedor } from "./proveedores/tipos";

export type { Proveedor, Imagen } from "./proveedores/tipos";
export { SinProveedor, RespuestaInvalida } from "./proveedores/tipos";

let memoria: Proveedor | null = null;

/**
 * Elige el motor según la clave que haya configurada.
 *
 * Orden: si hay clave de Anthropic se usa Claude, porque lee mejor la letra
 * manuscrita. Si no, Gemini, que tiene capa gratuita. Con RELEVO_PROVEEDOR se
 * puede forzar uno de los dos, por ejemplo para comparar calidad y costo.
 */
export function proveedor(): Proveedor {
  if (memoria) return memoria;

  const forzado = process.env.RELEVO_PROVEEDOR?.toLowerCase();
  const hayClaude = !!process.env.ANTHROPIC_API_KEY;
  const hayGemini = !!(process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY);

  if (forzado === "claude") {
    if (!hayClaude) throw new Error("RELEVO_PROVEEDOR=claude pero falta ANTHROPIC_API_KEY.");
    memoria = proveedorClaude();
  } else if (forzado === "gemini") {
    if (!hayGemini) throw new Error("RELEVO_PROVEEDOR=gemini pero falta GEMINI_API_KEY.");
    memoria = proveedorGemini();
  } else if (hayClaude) {
    memoria = proveedorClaude();
  } else if (hayGemini) {
    memoria = proveedorGemini();
  } else {
    throw new SinProveedor();
  }

  return memoria;
}

/** Solo para las pruebas: olvida la elección anterior. */
export function olvidarProveedor() {
  memoria = null;
}

export type ErrorTraducido = { mensaje: string; estado: number };

/**
 * Traduce cualquier fallo a algo que la persona pueda leer, y deja el detalle
 * técnico en la consola del servidor para que el equipo lo vea.
 */
export function traducirError(error: unknown, contexto: string): ErrorTraducido {
  console.error(`[relevo:${contexto}]`, error);

  if (error instanceof SinProveedor) {
    return { mensaje: error.message, estado: 500 };
  }
  if (error instanceof RespuestaInvalida) {
    return { mensaje: "La lectura salió mal. Intente de nuevo.", estado: 502 };
  }

  // Claude: clases tipadas del SDK.
  if (error instanceof Anthropic.AuthenticationError) {
    return { mensaje: "La clave de Claude no es válida.", estado: 401 };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return {
      mensaje: "Hay muchas fotos a la vez. Intente de nuevo en un momento.",
      estado: 429,
    };
  }
  if (error instanceof Anthropic.BadRequestError) {
    // El detalle viene en inglés y en jerga del SDK. Queda en el log de arriba;
    // a la persona no se le enseña. "procesar" además está prohibida en la voz.
    return { mensaje: "No se pudo leer ese archivo. Intente con otra foto.", estado: 400 };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { mensaje: "No hubo conexión con el servidor.", estado: 503 };
  }
  if (error instanceof Anthropic.APIError) {
    return {
      mensaje: `Algo falló del lado del servidor (error ${error.status}).`,
      estado: error.status ?? 500,
    };
  }

  // Gemini: el SDK de Google lanza ApiError con status numérico.
  const g = error as { status?: number; message?: string; name?: string };
  if (typeof g?.status === "number") {
    if (g.status === 401 || g.status === 403) {
      return { mensaje: "La clave de Gemini no es válida.", estado: 401 };
    }
    if (g.status === 429) {
      return {
        mensaje: "Se acabó la cuota gratuita de Gemini por ahora. Espere un rato.",
        estado: 429,
      };
    }
    // 503 sale seguido en la capa gratuita: el modelo está congestionado. No es
    // culpa de la foto ni de la persona, y se arregla solo esperando.
    if (g.status === 503) {
      return {
        mensaje: "Hay mucha gente usando esto ahora mismo. Intente en un minuto.",
        estado: 503,
      };
    }
    // 404 = el nombre del modelo ya no existe. Google los retira sin avisar y
    // le cierra los viejos a las cuentas nuevas. La persona no puede hacer
    // nada; quien mantiene esto sí, y el detalle quedó arriba en el log.
    if (g.status === 404) {
      return {
        mensaje: "Relevo no está bien configurado. Avísele a quien se lo instaló.",
        estado: 503,
      };
    }
    return { mensaje: `Algo falló (error ${g.status}).`, estado: g.status };
  }

  return { mensaje: "Algo falló y no sabemos qué.", estado: 500 };
}
