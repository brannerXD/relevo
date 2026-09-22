import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { Documento, Plan } from "../tipos";
import type { Proyeccion } from "../tipos";
import {
  SISTEMA_LEER,
  SISTEMA_RECONCILIAR,
  INSTRUCCION_LEER,
  instruccionReconciliar,
} from "../prompts";
import { RespuestaInvalida, type Imagen, type Proveedor } from "./tipos";

const MEDIA_VALIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaValido = (typeof MEDIA_VALIDOS)[number];

export function proveedorClaude(): Proveedor {
  const client = new Anthropic();
  const modelo = process.env.CLAUDE_MODELO ?? "claude-opus-5";

  return {
    nombre: "Claude",
    modelo,

    async leerDocumento({ data, mediaType }: Imagen) {
      if (!MEDIA_VALIDOS.includes(mediaType as MediaValido)) {
        throw new Error(`Formato no soportado: ${mediaType}`);
      }

      const respuesta = await client.beta.messages.parse({
        model: modelo,
        max_tokens: 16000,
        betas: ["structured-outputs-2025-11-13"],
        system: SISTEMA_LEER,
        output_format: betaZodOutputFormat(Documento),
        // Extraer campos de una foto no necesita razonamiento profundo, y aquí
        // la latencia se siente: la usuaria mira la barra de progreso.
        output_config: { effort: "medium" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType as MediaValido,
                  data,
                },
              },
              { type: "text", text: INSTRUCCION_LEER },
            ],
          },
        ],
      });

      if (!respuesta.parsed_output) {
        throw new RespuestaInvalida("Claude", "no devolvió un documento");
      }
      return respuesta.parsed_output;
    },

    async armarPlan(documentos, proyecciones: Proyeccion[], hoy: string) {
      const respuesta = await client.beta.messages.parse({
        model: modelo,
        max_tokens: 16000,
        betas: ["structured-outputs-2025-11-13"],
        system: SISTEMA_RECONCILIAR,
        output_format: betaZodOutputFormat(Plan),
        // Cruzar seis papeles entre sí sí es razonamiento: una sola llamada
        // por bolsa, así que aquí sí pagamos esfuerzo alto.
        output_config: { effort: "high" },
        messages: [
          {
            role: "user",
            content: instruccionReconciliar(documentos, proyecciones, hoy),
          },
        ],
      });

      if (!respuesta.parsed_output) {
        throw new RespuestaInvalida("Claude", "no devolvió un plan");
      }
      return respuesta.parsed_output;
    },
  };
}
