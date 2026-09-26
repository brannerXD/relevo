import type { Documento, Plan, Proyeccion } from "../tipos";

export type Imagen = { data: string; mediaType: string };

/**
 * Lo único que la aplicación le pide a un motor de IA.
 *
 * Existe para que Relevo no dependa de un proveedor. Hoy funciona con Claude
 * o con Gemini según la clave que haya configurada; mañana podría ser otro.
 */
export interface Proveedor {
  /** Nombre legible, para mostrarlo en los mensajes de error y en la terminal. */
  readonly nombre: string;
  readonly modelo: string;

  /** Pasos 1 y 2: clasificar el documento y extraer sus campos. */
  leerDocumento(imagen: Imagen): Promise<Documento>;

  /** Pasos 3 y 5: cruzar los documentos y redactar las vueltas. */
  armarPlan(
    documentos: Documento[],
    proyecciones: Proyeccion[],
    hoy: string,
  ): Promise<Plan>;
}

export class SinProveedor extends Error {
  constructor() {
    super(
      "No hay ninguna clave configurada. Ponga ANTHROPIC_API_KEY, GEMINI_API_KEY o GROQ_API_KEY en .env.local y reinicie el servidor.",
    );
    this.name = "SinProveedor";
  }
}

export class RespuestaInvalida extends Error {
  constructor(proveedor: string, detalle: string) {
    super(`${proveedor} devolvió algo que no se pudo interpretar: ${detalle}`);
    this.name = "RespuestaInvalida";
  }
}
