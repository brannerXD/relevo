import type { Documento, Proyeccion } from "./tipos";

/**
 * PASO 4 — Proyección temporal.
 *
 * Esto NO es IA y no debe serlo. Es aritmética de fechas, y los modelos de
 * lenguaje son peores que una resta para hacer restas.
 *
 * El valor de la IA está en los pasos 2 y 3: convertir una foto de una
 * fórmula manuscrita en datos. Una vez hay datos, esto es TypeScript.
 */

const DIA_MS = 86_400_000;

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Date(d.getTime() + dias * DIA_MS).toISOString().slice(0, 10);
}

export function diasHasta(iso: string, desde = new Date()): number {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  const base = new Date(desde.toISOString().slice(0, 10) + "T12:00:00");
  return Math.round((d.getTime() - base.getTime()) / DIA_MS);
}

export function esFechaValida(iso: string | null): iso is string {
  return !!iso && !Number.isNaN(new Date(`${iso}T12:00:00`).getTime());
}

/**
 * Para cada medicamento con cantidad y dosis diaria, calcula en qué fecha
 * se acaba. Para cada papel con vencimiento, lo registra tal cual.
 */
export function proyectar(docs: Documento[]): Proyeccion[] {
  const salida: Proyeccion[] = [];

  for (const doc of docs) {
    if (!doc.legible) continue;

    for (const med of doc.medicamentos) {
      if (!med.nombre || !med.cantidad || !med.dosis_dia || med.dosis_dia <= 0) {
        continue;
      }
      const diasQueDura = Math.floor(med.cantidad / med.dosis_dia);
      const inicio = esFechaValida(doc.fecha_expedicion)
        ? doc.fecha_expedicion
        : new Date().toISOString().slice(0, 10);

      salida.push({
        etiqueta: `${med.nombre}${med.concentracion ? ` ${med.concentracion}` : ""} se acaba`,
        fecha: sumarDias(inicio, diasQueDura),
        clase: "agotamiento",
      });
    }

    if (esFechaValida(doc.fecha_vencimiento)) {
      const que =
        doc.tipo === "formula"
          ? "La fórmula"
          : doc.tipo === "autorizacion"
            ? "La autorización"
            : doc.tipo === "orden"
              ? "La orden"
              : "El documento";
      salida.push({
        etiqueta: `${que}${doc.numero ? ` ${doc.numero}` : ""} se vence`,
        fecha: doc.fecha_vencimiento,
        clase: "vencimiento",
      });
    }
  }

  return salida.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function mesActual(): string {
  return MESES[new Date().getMonth()];
}

/** "3 de octubre" — sin año, porque el plan es del mes. */
export function fechaBonita(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}
