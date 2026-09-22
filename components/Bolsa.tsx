"use client";

import { useEffect, useRef, useState } from "react";
import { Buho, type Animo } from "./Buho";
import type { Cuenta } from "@/lib/cuenta";

/**
 * La espera puede pasar de veinte segundos. Una pantalla que no cambia en ese
 * rato se siente colgada, y la usuaria empieza a tocar botones o a recargar.
 * Así que el búho alterna de pose y el texto va cambiando: no acelera nada,
 * pero deja claro que la cosa sigue andando.
 */
const COMPASES: { animo: Animo; texto: string }[] = [
  { animo: "leyendo", texto: "Puede tardar un momento. La letra de los médicos no es fácil ni para nosotros." },
  { animo: "espera", texto: "Ahí vamos. Mirando fechas, dosis y cantidades." },
  { animo: "pensando", texto: "Casi. Cuadrando lo que dice cada papel." },
];

function useCompas(activo: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!activo) { setI(0); return; }
    const t = setInterval(() => setI((n) => (n + 1) % COMPASES.length), 6500);
    return () => clearInterval(t);
  }, [activo]);
  return COMPASES[i];
}

type Props = {
  onFotos: (archivos: File[]) => void;
  onEjemplo: () => void;
  onGuia: () => void;
  leyendo: boolean;
  progreso: { hechas: number; total: number };
  cuenta: Cuenta | null;
  onCuenta: () => void;
  onSalir: () => void;
};

export function Bolsa({
  onFotos,
  onEjemplo,
  onGuia,
  leyendo,
  progreso,
  cuenta,
  onCuenta,
  onSalir,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const compas = useCompas(leyendo);

  if (leyendo) {
    const pct = progreso.total ? (progreso.hechas / progreso.total) * 100 : 0;
    return (
      <div className="pantalla flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <Buho animo={compas.animo} size={132} sombra />
        <p className="font-titulo text-2xl">Estoy leyendo sus papeles…</p>
        <p className="text-tinta-suave">
          {progreso.hechas} de {progreso.total}
        </p>
        <div className="h-2.5 w-60 overflow-hidden rounded-full bg-arena-borde">
          <div
            className="barra-progreso h-full rounded-full bg-barro"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p key={compas.texto} className="aparece max-w-xs text-[15px] text-tinta-suave">
          {compas.texto}
        </p>
      </div>
    );
  }

  return (
    <div className="pantalla mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-6 py-10">
      {/*
        Discreto a propósito. Quien vuelve en otro teléfono necesita esto;
        quien llega por primera vez no debería ni notarlo.
      */}
      <div className="absolute right-5 top-5 text-right">
        {cuenta && !cuenta.anonima ? (
          <details className="group">
            <summary className="cursor-pointer list-none text-[15px] text-tinta-suave">
              {cuenta.correo?.split("@")[0] ?? "Mi cuenta"} ▾
            </summary>
            <button
              onClick={onSalir}
              className="mt-2 rounded-lg border border-arena-borde bg-white px-4 py-2 text-[15px] text-tinta-suave"
            >
              Cerrar sesión
            </button>
          </details>
        ) : (
          <button onClick={onCuenta} className="text-[15px] text-tinta-suave">
            Entrar
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <Buho animo="reposo" size={104} prioridad sombra />
        <h1 className="font-titulo text-4xl">Relevo</h1>
        <p className="text-tinta-suave">
          Tú con lo importante. Nosotros con los papeles.
        </p>
      </div>

      <div className="aparece rounded-2xl border border-arena-borde bg-white p-6">
        <h2 className="font-titulo text-2xl">Vacíe la bolsa</h2>
        <p className="mt-2 text-tinta-suave">
          Tómele una foto a cada papel: fórmulas, órdenes, autorizaciones, el
          carné. No tiene que escribir nada.
        </p>

        <input
          ref={input}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            const archivos = Array.from(e.target.files ?? []);
            if (archivos.length) onFotos(archivos);
            e.target.value = "";
          }}
        />

        <button
          onClick={() => input.current?.click()}
          className="mt-5 w-full rounded-xl bg-barro-boton px-6 py-4 text-lg font-semibold text-white transition hover:brightness-105 active:scale-[0.98]"
        >
          Tomar las fotos
        </button>

        <button
          onClick={onEjemplo}
          className="mt-3 w-full rounded-xl border border-arena-borde px-6 py-3 text-base text-tinta-suave transition hover:bg-arena active:scale-[0.98]"
        >
          Ver un ejemplo
        </button>
      </div>

      <button
        onClick={onGuia}
        className="text-center text-[16px] text-barro-oscuro underline underline-offset-4"
      >
        ¿Qué es Relevo y cómo funciona?
      </button>

      <p className="text-center text-sm leading-relaxed text-tinta-suave">
        Relevo no diagnostica ni cambia tratamientos. Solo le organiza los
        papeles y le dice qué vueltas le faltan.
      </p>
    </div>
  );
}
