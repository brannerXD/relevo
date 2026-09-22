import { GoogleGenAI } from "@google/genai";
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
 * Los mismos prompts que Claude, con dos diferencias de trato:
 *
 * 1. Le repetimos en el prompt que responda JSON. El esquema declarado ayuda,
 *    pero no siempre se respeta, y la instrucción explícita cuesta nada.
 * 2. Validamos con Zod de nuestro lado. Si el modelo se sale del esquema nos
 *    enteramos aquí y no tres pantallas después.
 */
const EXIGIR_JSON =
  "\n\nResponde ÚNICAMENTE con un objeto JSON válido que cumpla el esquema. Sin explicaciones, sin texto antes ni después, sin bloques de código.";

/** Gemini a veces envuelve el JSON en ```json … ``` aunque se le pida que no. */
function desenvolver(texto: string): string {
  const limpio = texto.trim();
  const cerca = limpio.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return cerca ? cerca[1] : limpio;
}

/**
 * La capa gratuita devuelve 503 («high demand») con una frecuencia que no es
 * anecdótica: midiendo, 5 de cada 8 llamadas. Casi siempre pasa al segundo
 * intento, así que reintentar aquí evita que la usuaria vea un error por algo
 * que se resuelve solo en dos segundos.
 *
 * Solo se reintenta lo que tiene sentido reintentar: 503 y 429 son transitorios;
 * un 400 o un 401 van a fallar igual las tres veces.
 */
async function conReintento<T>(hacer: () => Promise<T>, intentos = 3): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i < intentos; i++) {
    try {
      return await hacer();
    } catch (e) {
      ultimo = e;
      const estado = (e as { status?: number })?.status;
      if (estado !== 503 && estado !== 429) throw e;
      if (i === intentos - 1) break;
      // 1 s y luego 3 s. Cabe de sobra en el presupuesto de 50 s de la ruta.
      await new Promise((r) => setTimeout(r, i === 0 ? 1000 : 3000));
    }
  }
  throw ultimo;
}

function interpretar<T extends z.ZodType>(esquema: T, texto: string | undefined): z.infer<T> {
  if (!texto) throw new RespuestaInvalida("Gemini", "respuesta vacía");
  const crudo = desenvolver(texto);

  let json: unknown;
  try {
    json = JSON.parse(crudo);
  } catch {
    throw new RespuestaInvalida("Gemini", `no es JSON: ${crudo.slice(0, 160)}`);
  }

  const resultado = esquema.safeParse(json);
  if (!resultado.success) {
    const fallos = resultado.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "raíz"}: ${i.message}`)
      .join("; ");
    throw new RespuestaInvalida("Gemini", fallos);
  }
  return resultado.data;
}

export function proveedorGemini(): Proveedor {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  // Flash es el que tiene capa gratuita y ve imágenes. Se puede cambiar por
  // variable de entorno si Google mueve los nombres o los límites.
  //
  // Ojo: gemini-2.5-flash devuelve 404 en cuentas nuevas — Google lo cerró a
  // usuarios nuevos y responde "no longer available to new users". No es un
  // problema de la llave; la llave autentica bien y el error igual es 404.
  const modelo = process.env.GEMINI_MODELO ?? "gemini-3.6-flash";

  return {
    nombre: "Gemini",
    modelo,

    async leerDocumento({ data, mediaType }: Imagen) {
      const respuesta = await conReintento(() =>
        ai.models.generateContent({
          model: modelo,
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: mediaType, data } },
                { text: INSTRUCCION_LEER + EXIGIR_JSON },
              ],
            },
          ],
          config: {
            systemInstruction: SISTEMA_LEER,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(Documento),
            temperature: 0,
          },
        }),
      );

      return interpretar(Documento, respuesta.text);
    },

    async armarPlan(documentos, proyecciones: Proyeccion[], hoy: string) {
      const respuesta = await conReintento(() =>
        ai.models.generateContent({
          model: modelo,
          contents: [
            {
              role: "user",
              parts: [
                { text: instruccionReconciliar(documentos, proyecciones, hoy) + EXIGIR_JSON },
              ],
            },
          ],
          config: {
            systemInstruction: SISTEMA_RECONCILIAR,
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(Plan),
            temperature: 0.2,
          },
        }),
      );

      return interpretar(Plan, respuesta.text);
    },
  };
}
