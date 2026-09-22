"use client";

import type { DocumentoEnBolsa } from "@/lib/tipos";
import { fechaBonita } from "@/lib/proyeccion";
import { Buho } from "./Buho";

const NOMBRE_TIPO: Record<string, string> = {
  formula: "Fórmula médica",
  orden: "Orden de servicio",
  autorizacion: "Autorización",
  carne: "Carné",
  resultado: "Resultado de laboratorio",
  caja: "Caja de medicamento",
  otro: "Otro documento",
  ilegible: "No se pudo leer",
};

type Props = {
  documentos: DocumentoEnBolsa[];
  onCambiar: (id: string, cambios: Partial<DocumentoEnBolsa>) => void;
  onQuitar: (id: string) => void;
  onListo: () => void;
  armando: boolean;
};

/**
 * PANTALLA 2 — «Revise lo que entendí».
 *
 * El control humano no es un adorno de la propuesta: es esta pantalla.
 * Nada pasa al plan sin que la persona lo haya visto.
 */
export function Revision({ documentos, onCambiar, onQuitar, onListo, armando }: Props) {
  const dudosos = documentos.filter((d) => d.legible && d.confianza < 0.6).length;
  const ilegibles = documentos.filter((d) => !d.legible).length;

  if (armando) {
    return (
      <div className="pantalla flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <Buho animo="pensando" size={132} />
        <p className="font-titulo text-2xl">Estoy comparando los papeles…</p>
        <p className="max-w-xs text-[16px] text-tinta-suave">
          Mirando cuál se vence primero y qué le falta.
        </p>
      </div>
    );
  }

  return (
    <div className="pantalla mx-auto max-w-md px-5 py-8">
      <header className="flex items-start gap-3">
        {/*
          Cuando algo no se pudo leer, el búho lo admite con la cara. Es más
          honesto que un aviso de error, y baja el susto: no se dañó nada, solo
          no entendió una foto.
        */}
        <span className="-mt-2 shrink-0">
          <Buho animo={ilegibles > 0 ? "confundido" : "pensando"} size={58} />
        </span>
        <div>
          <h1 className="font-titulo text-3xl leading-tight">Revise lo que entendí</h1>
          <p className="mt-1 text-tinta-suave">
            Toque cualquier dato para corregirlo. Usted tiene la última palabra.
          </p>
        </div>
      </header>

      {(dudosos > 0 || ilegibles > 0) && (
        <div className="mt-4 rounded-xl border border-barro bg-barro-suave/30 p-4 text-[16px]">
          {ilegibles > 0 && (
            <p>
              <strong>{ilegibles}</strong>{" "}
              {ilegibles === 1 ? "foto no se pudo leer" : "fotos no se pudieron leer"}.
            </p>
          )}
          {dudosos > 0 && (
            <p className={ilegibles > 0 ? "mt-1" : ""}>
              Marqué en naranja lo que no leí bien. Por favor revíselo.
            </p>
          )}
        </div>
      )}

      <ul className="mt-6 space-y-4">
        {documentos.map((doc, n) => (
          <li
            key={doc.id}
            style={{ animationDelay: `${n * 70}ms` }}
            className={`aparece overflow-hidden rounded-2xl border bg-white ${
              !doc.legible
                ? "border-urgente"
                : doc.confianza < 0.6
                  ? "border-barro"
                  : "border-arena-borde"
            }`}
          >
            <div className="flex items-start gap-3 p-4">
              {doc.miniatura && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doc.miniatura}
                  alt=""
                  className="h-20 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-titulo text-xl">
                  {NOMBRE_TIPO[doc.tipo] ?? "Documento"}
                </p>
                {doc.entidad && (
                  <p className="text-[16px] text-tinta-suave">{doc.entidad}</p>
                )}
                {doc.legible && doc.confianza < 0.6 && (
                  <p className="mt-1 text-sm text-barro-oscuro">
                    No estoy seguro de esta lectura
                  </p>
                )}
              </div>
              <button
                onClick={() => onQuitar(doc.id)}
                aria-label="Quitar este documento"
                // 44x44 mínimo. Antes medía 31 de ancho, y es una acción que
                // borra un papel: difícil de acertar a propósito y fácil de
                // darle sin querer apuntando a otra cosa.
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-tinta-suave"
              >
                ✕
              </button>
            </div>

            {!doc.legible ? (
              <p className="border-t border-arena-borde bg-urgente/5 px-4 py-3 text-[16px] text-urgente">
                {doc.motivo_ilegible ?? "Repita esta foto, por favor."}
              </p>
            ) : (
              <div className="border-t border-arena-borde px-4 py-3">
                {doc.medicamentos.length > 0 && (
                  <ul className="space-y-3">
                    {doc.medicamentos.map((med, i) => (
                      <li key={i}>
                        <Campo
                          etiqueta="Medicamento"
                          valor={med.nombre}
                          onCambio={(v) => {
                            const meds = [...doc.medicamentos];
                            meds[i] = { ...meds[i], nombre: v };
                            onCambiar(doc.id, { medicamentos: meds });
                          }}
                        />
                        <div className="mt-1 flex gap-4 text-[15px] text-tinta-suave">
                          <span>
                            {med.dosis_dia ?? "?"} al día
                          </span>
                          <span>{med.cantidad ?? "?"} en total</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {doc.servicios.map((s, i) => (
                  <p key={i} className="text-[16px]">
                    {s.descripcion}
                    {s.codigo_cups ? ` · ${s.codigo_cups}` : ""}
                  </p>
                ))}

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-tinta-suave">
                  {doc.fecha_expedicion && (
                    <span>Expedida el {fechaBonita(doc.fecha_expedicion)}</span>
                  )}
                  {doc.fecha_vencimiento && (
                    <span>Vence el {fechaBonita(doc.fecha_vencimiento)}</span>
                  )}
                  {doc.numero && <span>N.º {doc.numero}</span>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <button
        onClick={onListo}
        disabled={armando || documentos.every((d) => !d.legible)}
        className="mt-8 w-full rounded-xl bg-monte px-6 py-4 text-lg font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {armando ? "Armando sus vueltas…" : "Está bien, siga"}
      </button>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  onCambio,
}: {
  etiqueta: string;
  valor: string | null;
  onCambio: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-tinta-suave">
        {etiqueta}
      </span>
      <input
        value={valor ?? ""}
        onChange={(e) => onCambio(e.target.value)}
        placeholder="No lo pude leer"
        className="w-full rounded-lg border border-transparent bg-arena px-3 py-2 text-[17px] focus:border-barro focus:outline-none"
      />
    </label>
  );
}
