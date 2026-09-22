import type { DocumentoEnBolsa, Plan } from "./tipos";
import { sumarDias, fechaBonita } from "./proyeccion";

/**
 * MODO DEMOSTRACIÓN.
 *
 * Datos de ejemplo para que la aplicación se pueda mostrar sin subir
 * documentos de salud reales de nadie y sin gastar llamadas a la API.
 *
 * Las fechas son relativas a hoy para que el ejemplo nunca se vea vencido.
 * Reemplace estos datos por los de sus entrevistas (anonimizados) cuando
 * los tenga.
 */

const hoy = new Date().toISOString().slice(0, 10);

export const DOCUMENTOS_EJEMPLO: DocumentoEnBolsa[] = [
  {
    id: "demo-1",
    miniatura: "",
    confirmado: true,
    tipo: "formula",
    legible: true,
    motivo_ilegible: null,
    paciente: "Ana Rosa M.",
    entidad: "EPS Sura",
    fecha_expedicion: sumarDias(hoy, -18),
    fecha_vencimiento: sumarDias(hoy, 12),
    numero: "F-88214",
    medicamentos: [
      {
        nombre: "Losartán",
        concentracion: "50 mg",
        dosis_dia: 2,
        cantidad: 60,
        presentacion: "tableta",
      },
      {
        nombre: "Metformina",
        concentracion: "850 mg",
        dosis_dia: 2,
        cantidad: 40,
        presentacion: "tableta",
      },
    ],
    servicios: [],
    confianza: 0.88,
    notas: null,
  },
  {
    id: "demo-2",
    miniatura: "",
    confirmado: true,
    tipo: "orden",
    legible: true,
    motivo_ilegible: null,
    paciente: "Ana Rosa M.",
    entidad: "IPS Manrique",
    fecha_expedicion: sumarDias(hoy, -10),
    fecha_vencimiento: sumarDias(hoy, 20),
    numero: "4471",
    medicamentos: [],
    servicios: [
      { descripcion: "Creatinina en suero", codigo_cups: "903895" },
      { descripcion: "Control por medicina interna", codigo_cups: "890301" },
    ],
    confianza: 0.81,
    notas: null,
  },
  {
    id: "demo-3",
    miniatura: "",
    confirmado: true,
    tipo: "caja",
    legible: true,
    motivo_ilegible: null,
    paciente: null,
    entidad: null,
    fecha_expedicion: null,
    fecha_vencimiento: null,
    numero: null,
    medicamentos: [
      {
        nombre: "Losartán",
        concentracion: "50 mg",
        // Conflicto sembrado a propósito: la caja dice 1 al día, la fórmula 2.
        dosis_dia: 1,
        cantidad: 30,
        presentacion: "tableta",
      },
    ],
    servicios: [],
    confianza: 0.72,
    notas: "La caja dice una dosis distinta a la de la fórmula.",
  },
  {
    id: "demo-4",
    miniatura: "",
    confirmado: true,
    tipo: "ilegible",
    legible: false,
    motivo_ilegible: "Quedó muy oscura y no se ven las fechas. Intente con más luz.",
    paciente: null,
    entidad: null,
    fecha_expedicion: null,
    fecha_vencimiento: null,
    numero: null,
    medicamentos: [],
    servicios: [],
    confianza: 0.1,
    notas: null,
  },
];

/**
 * Plan de ejemplo, coherente con los documentos de arriba.
 *
 * Existe para que el modo demostración recorra las tres pantallas sin gastar
 * una llamada a la API y sin exigir una clave. Cuando hay clave y fotos
 * reales, este plan no se usa: lo arma /api/reconciliar.
 */
export const PLAN_EJEMPLO: Plan = {
  conflictos: [
    {
      descripcion:
        "La fórmula dice losartán 2 veces al día, pero la caja dice 1 vez al día. Pregúntele al médico cuál es la correcta antes de seguir.",
      gravedad: "alta",
      documentos: [0, 2],
    },
    {
      descripcion:
        "La fórmula se le vence el mismo día que se le acaban las pastillas del losartán. Si espera hasta ese día, se queda sin remedio.",
      gravedad: "media",
      documentos: [0],
    },
  ],
  acciones: [
    {
      titulo: "Reclamar la metformina",
      detalle: `Se le acabó hace dos días, el ${fechaBonita(sumarDias(hoy, -2))}. La fórmula todavía está vigente, así que puede ir por ella de una.`,
      fecha_limite: hoy,
      urgencia: "urgente",
      lugar: "Farmacia de la EPS Sura",
      llevar: ["La fórmula F-88214", "El carné", "La cédula de ella"],
    },
    {
      titulo: "Renovar la fórmula del losartán",
      detalle: `Se le vence el ${fechaBonita(sumarDias(hoy, 12))} y ese mismo día se le acaban las pastillas. Pida la cita de renovación esta semana, no la última.`,
      fecha_limite: sumarDias(hoy, 12),
      urgencia: "pronto",
      lugar: "Línea de la EPS o la app",
      llevar: ["La fórmula vencida", "El carné"],
    },
    {
      titulo: "Sacar la cita de medicina interna",
      detalle: `La orden 4471 se vence el ${fechaBonita(sumarDias(hoy, 20))}. Si se vence hay que volver a pedirla desde el principio.`,
      fecha_limite: sumarDias(hoy, 20),
      urgencia: "pronto",
      lugar: "IPS Manrique",
      llevar: ["La orden 4471", "El carné"],
    },
    {
      titulo: "Hacerle el examen de creatinina",
      detalle:
        "Va en la misma orden. Tiene que ir en ayunas y los resultados los piden en la cita de control.",
      fecha_limite: sumarDias(hoy, 18),
      urgencia: "tranquilo",
      lugar: "Laboratorio de la IPS Manrique",
      llevar: ["La orden 4471", "El carné"],
    },
  ],
};
