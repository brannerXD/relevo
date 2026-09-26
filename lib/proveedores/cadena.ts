import type { Documento, Plan, Proyeccion } from "../tipos";
import { RespuestaInvalida, type Imagen, type Proveedor } from "./tipos";

/**
 * Varios motores en fila. Si el primero no puede, entra el siguiente.
 *
 * Esto no es elegancia de arquitectura: es una medición. Contra la capa
 * gratuita de Gemini, 5 corridas seguidas dieron 2 éxitos y 3 fallas — dos por
 * congestión (503) y una por cuota agotada (429). Con esos números, una
 * persona que abra Relevo tiene más probabilidad de ver un error que su plan.
 *
 * Qué SÍ hace caer al siguiente motor:
 *   - 429 / 503 / 5xx / red: el motor no está disponible ahora mismo.
 *   - 401 / 403: esa clave está mal. El motor sirve, la configuración no.
 *   - Respuesta que no cumple el esquema: otro modelo puede acertar donde
 *     este se salió del formato.
 *
 * Qué NO: un 400 por una imagen corrupta va a fallar igual en todos, y
 * reintentarlo tres veces solo hace esperar más a quien ya está esperando.
 *
 * Ojo con la calidad. Los motores NO son equivalentes leyendo letra a mano, y
 * el de respaldo suele ser el más flojo. Eso aquí se tolera porque el esquema
 * es todo nullable y la pantalla de revisión es obligatoria: un modelo que no
 * entiende devuelve vacíos, no inventos, y la persona lo ve antes de que entre
 * al plan. Si algún día se quita esa pantalla, esta cadena deja de ser segura.
 */

function esTransitorio(e: unknown): boolean {
  if (e instanceof RespuestaInvalida) return true;

  const estado = (e as { status?: number })?.status;
  if (typeof estado === "number") {
    if (estado === 429 || estado === 401 || estado === 403) return true;
    return estado >= 500;
  }

  // Fallos de red: sin status, pero con pinta de conexión.
  const msg = String((e as { message?: string })?.message ?? e).toLowerCase();
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econn")
  );
}

async function intentar<T>(
  proveedores: Proveedor[],
  paso: string,
  hacer: (p: Proveedor) => Promise<T>,
): Promise<T> {
  let ultimo: unknown;

  for (let i = 0; i < proveedores.length; i++) {
    const p = proveedores[i];
    try {
      const r = await hacer(p);
      if (i > 0) {
        // Que quede en el log: si el principal se cayó, el equipo tiene que
        // enterarse aunque la persona no haya visto ningún error.
        console.warn(
          `[relevo:${paso}] respondió el respaldo ${p.nombre} (${p.modelo}); los ${i} anteriores fallaron.`,
        );
      }
      return r;
    } catch (e) {
      ultimo = e;
      if (!esTransitorio(e) || i === proveedores.length - 1) throw e;
      console.warn(
        `[relevo:${paso}] ${p.nombre} no pudo (${(e as { status?: number })?.status ?? "sin estado"}). Pasando al siguiente.`,
      );
    }
  }

  throw ultimo;
}

/** Envuelve varios motores en uno solo que los prueba en orden. */
export function enCadena(proveedores: Proveedor[]): Proveedor {
  if (proveedores.length === 0) throw new Error("enCadena sin proveedores.");
  if (proveedores.length === 1) return proveedores[0];

  const principal = proveedores[0];

  return {
    nombre: proveedores.map((p) => p.nombre).join(" → "),
    modelo: principal.modelo,

    leerDocumento(imagen: Imagen): Promise<Documento> {
      return intentar(proveedores, "leer", (p) => p.leerDocumento(imagen));
    },

    armarPlan(documentos: Documento[], proyecciones: Proyeccion[], hoy: string): Promise<Plan> {
      return intentar(proveedores, "reconciliar", (p) =>
        p.armarPlan(documentos, proyecciones, hoy),
      );
    },
  };
}
