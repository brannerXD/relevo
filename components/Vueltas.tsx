"use client";

import { useState } from "react";
import type { Plan } from "@/lib/tipos";
import { fechaBonita, mesActual, diasHasta } from "@/lib/proyeccion";
import { Buho } from "./Buho";
import { PieLegal } from "./Legal";

const COLOR = {
  urgente: { punto: "bg-urgente", borde: "border-urgente", texto: "text-urgente" },
  pronto: { punto: "bg-pronto", borde: "border-pronto", texto: "text-pronto-texto" },
  tranquilo: { punto: "bg-tranquilo", borde: "border-arena-borde", texto: "text-tranquilo" },
} as const;

type Props = {
  plan: Plan;
  onEmpezarDeNuevo: () => void;
  /** Vueltas que ya estaban marcadas de una sesión anterior. */
  yaHechas?: number[];
  onMarcar?: (orden: number, hecha: boolean) => void;
  /** Si sigue anónima, aquí sí vale la pena ofrecerle guardar la cuenta. */
  cuentaAnonima?: boolean;
  onGuardarCuenta?: () => void;
};

/** PANTALLA 3 — «Sus vueltas de octubre». */
export function Vueltas({
  plan,
  onEmpezarDeNuevo,
  yaHechas = [],
  onMarcar,
  cuentaAnonima = false,
  onGuardarCuenta,
}: Props) {
  const [hechas, setHechas] = useState<Set<number>>(() => new Set(yaHechas));

  const alternar = (i: number) => {
    const quedaHecha = !hechas.has(i);
    setHechas((prev) => {
      const s = new Set(prev);
      quedaHecha ? s.add(i) : s.delete(i);
      return s;
    });
    onMarcar?.(i, quedaHecha);
  };

  const pendientes = plan.acciones.length - hechas.size;
  const hayUrgente = plan.acciones.some(
    (a, i) => a.urgencia === "urgente" && !hechas.has(i),
  );

  return (
    <div className="pantalla mx-auto max-w-md px-5 py-8">
      <header className="flex items-start gap-3">
        <span className="-mt-3 shrink-0">
          <Buho
            animo={pendientes === 0 ? "celebra" : hayUrgente ? "alerta" : "reposo"}
            size={54}
          />
        </span>
        <div className="mt-1">
          <h1 className="font-titulo text-3xl">
            Sus vueltas de {mesActual()}
          </h1>
          <p className="text-tinta-suave">
            {pendientes === 0
              ? "Ya no le queda ninguna. Descanse."
              : `Le ${pendientes === 1 ? "queda" : "quedan"} ${pendientes}.`}
          </p>
        </div>
      </header>

      {plan.conflictos.length > 0 && (
        <section className="mt-6 rounded-2xl border border-urgente bg-urgente/5 p-4">
          <h2 className="font-titulo text-xl text-urgente">Ojo con esto</h2>
          <ul className="mt-2 space-y-2">
            {plan.conflictos.map((c, i) => (
              <li key={i} className="text-[16px]">
                {c.descripcion}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="mt-6 space-y-3">
        {plan.acciones.map((a, i) => {
          const c = COLOR[a.urgencia];
          const hecha = hechas.has(i);
          const dias = a.fecha_limite ? diasHasta(a.fecha_limite) : null;

          return (
            <li
              key={i}
              style={{ animationDelay: `${i * 80}ms` }}
              className={`aparece rounded-2xl border bg-white p-4 transition-all duration-300 ${c.borde} ${
                hecha ? "scale-[0.98] opacity-45" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${c.punto}`} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-titulo text-xl leading-snug ${
                      hecha ? "line-through" : ""
                    }`}
                  >
                    {a.titulo}
                  </p>

                  {a.fecha_limite && (
                    <p className={`mt-0.5 text-[16px] font-semibold ${c.texto}`}>
                      {fechaBonita(a.fecha_limite)}
                      {dias !== null && dias >= 0 && dias <= 7 && (
                        <span className="font-normal">
                          {" "}
                          · {dias === 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`}
                        </span>
                      )}
                    </p>
                  )}

                  <p className="mt-1 text-[16px] text-tinta-suave">{a.detalle}</p>

                  {a.lugar && (
                    <p className="mt-2 text-[16px]">
                      <span className="text-tinta-suave">Dónde: </span>
                      {a.lugar}
                    </p>
                  )}

                  {a.llevar.length > 0 && (
                    <p className="mt-1 text-[16px]">
                      <span className="text-tinta-suave">Lleve: </span>
                      {a.llevar.join(", ")}
                    </p>
                  )}

                  <button
                    onClick={() => alternar(i)}
                    className="mt-3 rounded-lg border border-arena-borde px-4 py-2 text-[16px] text-tinta-suave"
                  >
                    {hecha ? "No, todavía no" : "Ya la hice"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/*
        El momento correcto para pedirle la cuenta: acaba de ver su plan, ya
        tiene algo que perder. Antes habría sido un peaje; aquí es un favor.
      */}
      {cuentaAnonima && onGuardarCuenta && (
        <div className="aparece mt-8 rounded-2xl border border-monte bg-monte/5 p-5">
          <p className="font-titulo text-xl text-monte">No pierda esto</p>
          <p className="mt-1 text-[16px] text-tinta-suave">
            Guarde su cuenta y su plan la acompaña aunque cambie de teléfono o
            se le borre el navegador. Toma menos de un minuto.
          </p>
          <button
            onClick={onGuardarCuenta}
            className="mt-4 w-full rounded-xl bg-monte px-6 py-3.5 text-[17px] font-semibold text-white transition active:scale-[0.98]"
          >
            Guardar mi cuenta
          </button>
        </div>
      )}

      <button
        onClick={onEmpezarDeNuevo}
        className="mt-6 w-full rounded-xl border border-arena-borde px-6 py-3 text-tinta-suave"
      >
        Empezar con otros papeles
      </button>

      <p className="mt-6 text-center text-sm leading-relaxed text-tinta-suave">
        Relevo no reemplaza a su médico ni a su EPS. Si algo no le cuadra,
        pregunte antes de actuar.
      </p>

      <PieLegal className="mt-4" />
    </div>
  );
}
