"use client";

import { useState } from "react";
import { Buho, type Animo } from "./Buho";

type Paso = {
  animo: Animo;
  titulo: string;
  cuerpo: string;
};

const PASOS: Paso[] = [
  {
    animo: "reposo",
    titulo: "¿Qué es Relevo?",
    cuerpo:
      "Cuidar a alguien también es cargar una bolsa de papeles: fórmulas, órdenes, autorizaciones. Relevo la convierte en un plan del mes.",
  },
  {
    animo: "leyendo",
    titulo: "Usted le toma fotos",
    cuerpo:
      "Vacía la bolsa sobre la mesa y le toma una foto a cada papel. No tiene que escribir nada ni llenar formularios. Nosotros leemos, aunque estén a mano.",
  },
  {
    animo: "pensando",
    titulo: "Nosotros los comparamos",
    cuerpo:
      "Miramos todos los papeles juntos: qué medicamento se está acabando, qué fórmula se vence, qué autorización le falta. Eso es lo que nadie alcanza a revisar de noche en la cocina.",
  },
  {
    // Va antes del final a propósito: hay que decirlo, pero no se termina una
    // presentación con una advertencia. Se termina con lo que la persona gana.
    animo: "alerta",
    titulo: "Lo que no hacemos",
    cuerpo:
      "A veces nos equivocamos leyendo un papel. Por eso le mostramos siempre lo que entendimos, antes de armar nada.",
  },
  {
    animo: "celebra",
    titulo: "Y le queda el plan",
    cuerpo:
      "Qué hacer, qué día, dónde y qué llevar. Usted revisa todo antes de que aparezca, y decide. Nosotros solo le ahorramos las vueltas de más.",
  },
];

export function Guia({ onListo }: { onListo: () => void }) {
  const [i, setI] = useState(0);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;

  return (
    // El botón va anclado abajo y el contenido se desplaza. En un teléfono de
    // 360x640 —el más común entre nuestras usuarias— el último paso no cabe, y
    // un botón que hay que ir a buscar es un botón que no existe.
    <div className="pantalla mx-auto flex h-dvh max-w-md flex-col px-6 pt-6">
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto py-2 text-center">
        <div key={i} className="aparece">
          {/* key: fuerza el remontaje para que las poses de una sola pasada
              (celebra, alerta) se vuelvan a disparar al cambiar de paso. */}
          <Buho key={i} animo={paso.animo} size={112} sombra />
        </div>

        <h1 key={`t${i}`} className="aparece mt-6 font-titulo text-3xl">
          {paso.titulo}
        </h1>

        <p key={`c${i}`} className="aparece mt-3 text-[17px] leading-relaxed text-tinta-suave">
          {paso.cuerpo}
        </p>

        {/*
          La lista va aquí, en el paso de los límites, y no en el último. Antes
          estaba al final y repetía lo mismo dos veces; además terminar la
          presentación con una advertencia deja mal sabor. Se termina con lo
          que la persona gana.
        */}
        {paso.animo === "alerta" && (
          <div className="aparece mt-8 w-full rounded-2xl border border-arena-borde bg-white p-5 text-left">
            <p className="font-titulo text-lg">Lo que Relevo no hace</p>
            <ul className="mt-2 space-y-1 text-[16px] text-tinta-suave">
              <li>· No dice qué enfermedad tiene nadie.</li>
              <li>· No cambia dosis ni recomienda tratamientos.</li>
              <li>· No reemplaza a su médico ni a su EPS.</li>
              <li>· No guarda nada sin su permiso.</li>
            </ul>
          </div>
        )}
      </div>

      <div className="shrink-0 pb-6 pt-4">
        <div className="mb-4 flex justify-center gap-2" aria-hidden="true">
          {PASOS.map((_, n) => (
            <span
              key={n}
              className={`h-2 rounded-full transition-all duration-300 ${
                n === i ? "w-6 bg-barro" : "w-2 bg-arena-borde"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => (ultimo ? onListo() : setI(i + 1))}
          className="w-full rounded-xl bg-barro-boton px-6 py-4 text-lg font-semibold text-white transition active:scale-[0.98]"
        >
          {ultimo ? "Entendido, empecemos" : "Siga"}
        </button>

        {!ultimo && (
          <button
            onClick={onListo}
            className="mt-2 w-full py-2 text-[16px] text-tinta-suave"
          >
            Saltar
          </button>
        )}
      </div>
    </div>
  );
}
