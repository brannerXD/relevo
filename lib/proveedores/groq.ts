import { z } from "zod";
import { Documento, Plan } from "../tipos";
import type { Proyeccion } from "../tipos";
import {
  SISTEMA_LEER,
  SISTEMA_RECONCILIAR,
  INSTRUCCION_LEER,
  instruccionReconciliar,
} from "../prompts";
import { RespuestaInvalida, type Imagen, type Proveedor } from "./tipos";

/**
 * Groq.
 *
 * Está aquí como RESPALDO, no como motor principal, y la razón es honesta:
 * sirve modelos abiertos que leen letra manuscrita peor que Gemini o Claude.
 * Lo que sí tiene es una capa gratuita con límites claros y una velocidad muy
 * alta, así que cuando el principal está congestionado, Groq contesta.
 *
 * Su API es compatible con la de OpenAI, así que no hace falta una
 * dependencia más: basta con fetch.
 *
 * DOS COSAS QUE VAN A DOLER SI NO SE SABEN:
 *
 * 1. El nombre del modelo caduca. Ya nos pasó con gemini-2.5-flash, que un día
 *    empezó a dar 404 en cuentas nuevas. Si Groq deja de responder, pruebe
 *    primero otro nombre con GROQ_MODELO antes de sospechar de la clave.
 *
 * 2. El límite de la capa gratuita es por TOKENS POR MINUTO, y una imagen
 *    gasta muchos. Alcanza para una demostración y para unas pocas personas;
 *    no alcanza para producción.
 */

const EXIGIR_JSON =
  "\n\nResponde ÚNICAMENTE con un objeto JSON válido que cumpla el esquema. Sin explicaciones, sin texto antes ni después, sin bloques de código.";

const URL = "https://api.groq.com/openai/v1/chat/completions";

/** Un error con `status` para que la cadena sepa si vale la pena pasar al siguiente. */
class ErrorGroq extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorGroq";
  }
}

function desenvolver(texto: string): string {
  const limpio = texto.trim();
  const cerca = limpio.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return cerca ? cerca[1] : limpio;
}

function interpretar<T extends z.ZodType>(esquema: T, texto: string | undefined): z.infer<T> {
  if (!texto) throw new RespuestaInvalida("Groq", "respuesta vacía");
  let json: unknown;
  try {
    json = JSON.parse(desenvolver(texto));
  } catch {
    throw new RespuestaInvalida("Groq", `no es JSON: ${desenvolver(texto).slice(0, 160)}`);
  }
  const r = esquema.safeParse(json);
  if (!r.success) {
    const fallos = r.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "raíz"}: ${i.message}`)
      .join("; ");
    throw new RespuestaInvalida("Groq", fallos);
  }
  return r.data;
}

export function proveedorGroq(): Proveedor {
  const apiKey = process.env.GROQ_API_KEY;
  const modelo = process.env.GROQ_MODELO ?? "meta-llama/llama-4-scout-17b-16e-instruct";

  async function pedir(mensajes: unknown[], temperatura: number): Promise<string> {
    let res: Response;
    try {
      res = await fetch(URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelo,
          messages: mensajes,
          temperature: temperatura,
          // Groq acepta modo JSON pero no el esquema completo, así que el
          // esquema va en el prompt y la validación de verdad la hace Zod.
          response_format: { type: "json_object" },
        }),
      });
    } catch (e) {
      throw new ErrorGroq(503, `No hubo conexión con Groq: ${String(e)}`);
    }

    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new ErrorGroq(res.status, `Groq respondió ${res.status}: ${detalle.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? "";
  }

  return {
    nombre: "Groq",
    modelo,

    async leerDocumento({ data, mediaType }: Imagen) {
      const texto = await pedir(
        [
          { role: "system", content: SISTEMA_LEER },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${data}` } },
              {
                type: "text",
                text:
                  INSTRUCCION_LEER +
                  `\n\nEsquema exacto:\n${JSON.stringify(z.toJSONSchema(Documento))}` +
                  EXIGIR_JSON,
              },
            ],
          },
        ],
        0,
      );
      return interpretar(Documento, texto);
    },

    async armarPlan(documentos, proyecciones: Proyeccion[], hoy: string) {
      const texto = await pedir(
        [
          { role: "system", content: SISTEMA_RECONCILIAR },
          {
            role: "user",
            content:
              instruccionReconciliar(documentos, proyecciones, hoy) +
              `\n\nEsquema exacto:\n${JSON.stringify(z.toJSONSchema(Plan))}` +
              EXIGIR_JSON,
          },
        ],
        0.2,
      );
      return interpretar(Plan, texto);
    },
  };
}
