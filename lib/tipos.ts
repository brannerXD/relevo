import { z } from "zod";

/**
 * Todo es nullable a propósito.
 * Preferimos que el modelo diga "no sé" a que invente una dosis.
 * En un producto de salud, un null es un dato; un invento es un riesgo.
 */

export const Medicamento = z.object({
  nombre: z.string().nullable(),
  concentracion: z.string().nullable(),
  /** Cuántas unidades al día. Si dice "1 cada 12 horas" son 2. */
  dosis_dia: z.number().nullable(),
  /** Cuántas unidades entregan en total. */
  cantidad: z.number().nullable(),
  presentacion: z.string().nullable(),
});
export type Medicamento = z.infer<typeof Medicamento>;

export const Servicio = z.object({
  descripcion: z.string().nullable(),
  codigo_cups: z.string().nullable(),
});
export type Servicio = z.infer<typeof Servicio>;

export const TipoDocumento = z.enum([
  "formula",
  "orden",
  "autorizacion",
  "carne",
  "resultado",
  "caja",
  "otro",
  "ilegible",
]);
export type TipoDocumento = z.infer<typeof TipoDocumento>;

export const Documento = z.object({
  tipo: TipoDocumento,
  legible: z.boolean(),
  /** Por qué no se pudo leer, en palabras que la persona entienda. */
  motivo_ilegible: z.string().nullable(),
  paciente: z.string().nullable(),
  entidad: z.string().nullable(),
  fecha_expedicion: z.string().nullable(),
  fecha_vencimiento: z.string().nullable(),
  numero: z.string().nullable(),
  medicamentos: z.array(Medicamento),
  servicios: z.array(Servicio),
  confianza: z.number(),
  notas: z.string().nullable(),
});
export type Documento = z.infer<typeof Documento>;

/** Un documento ya guardado en el estado de la app. */
export type DocumentoEnBolsa = Documento & {
  id: string;
  miniatura: string;
  confirmado: boolean;
};

export const Conflicto = z.object({
  descripcion: z.string(),
  gravedad: z.enum(["alta", "media", "baja"]),
  /** Índices de los documentos implicados, en el orden en que se enviaron. */
  documentos: z.array(z.number()),
});
export type Conflicto = z.infer<typeof Conflicto>;

export const Accion = z.object({
  titulo: z.string(),
  detalle: z.string(),
  fecha_limite: z.string().nullable(),
  urgencia: z.enum(["urgente", "pronto", "tranquilo"]),
  lugar: z.string().nullable(),
  llevar: z.array(z.string()),
});
export type Accion = z.infer<typeof Accion>;

export const Plan = z.object({
  conflictos: z.array(Conflicto),
  acciones: z.array(Accion),
});
export type Plan = z.infer<typeof Plan>;

/** Resultado del paso 4, que es aritmética en TypeScript y no IA. */
export type Proyeccion = {
  etiqueta: string;
  fecha: string;
  clase: "agotamiento" | "vencimiento";
};
