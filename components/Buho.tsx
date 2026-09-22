"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * El búho — la mascota de Relevo.
 *
 * Poses generadas en una sola hoja para que no cambie de forma entre
 * pantallas. El de la lupa es además el logo.
 *
 * El movimiento va en DOS capas, y esa es la diferencia entre un muñeco y un
 * animalito: la capa de afuera flota lento, siempre; la de adentro hace lo que
 * pide el ánimo. Dos ritmos distintos que se suman nunca caen en el mismo
 * punto, así que el ciclo no se nota. Con una sola animación se ve el loop a
 * los diez segundos y deja de estar vivo.
 *
 * Reglas que se respetan aquí:
 * - No habla ni se presenta. No dice que es una IA. Solo acompaña.
 * - Todo el movimiento se apaga con prefers-reduced-motion.
 */

export type Animo =
  | "reposo" // esperando
  | "leyendo" // mirando un papel con la lupa
  | "pensando" // comparando dos papeles
  | "listo" // terminó bien
  | "alerta" // hay algo urgente
  | "confundido" // no logró entender un papel
  | "celebra" // no queda ninguna vuelta
  | "espera"; // trabajando, tómese su tiempo

const POSE: Record<Animo, string> = {
  reposo: "saluda",
  leyendo: "lee",
  pensando: "compara",
  listo: "listo",
  alerta: "alerta",
  confundido: "confundido",
  celebra: "celebra",
  espera: "espera",
};

export function Buho({
  animo = "reposo",
  size = 128,
  prioridad = false,
  interactivo = true,
  sombra = false,
}: {
  animo?: Animo;
  size?: number;
  /** true en la primera pantalla, para que no parpadee al cargar. */
  prioridad?: boolean;
  /** Reacciona al toque. Se apaga donde el búho es solo un adorno pequeño. */
  interactivo?: boolean;
  /** Sombrita en el piso. Solo donde el búho es grande y está solo. */
  sombra?: boolean;
}) {
  const [tocado, setTocado] = useState(false);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (reloj.current) clearTimeout(reloj.current); }, []);

  function saludar() {
    if (!interactivo || tocado) return;
    setTocado(true);
    reloj.current = setTimeout(() => setTocado(false), 700);
  }

  return (
    <span
      className={`buho ${sombra ? "buho--con-sombra" : ""} ${tocado ? "buho--tocado" : ""}`}
      style={{ width: size, height: size }}
      onPointerDown={saludar}
      // Es un adorno: no entra al recorrido del teclado ni lo anuncia el lector
      // de pantalla. Tocarlo es un gusto, no una función.
      aria-hidden="true"
    >
      <span className={`buho__cuerpo buho--${animo}`}>
        <Image
          src={`/buho/buho-${POSE[animo]}.png`}
          alt=""
          width={size}
          height={size}
          priority={prioridad}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </span>
    </span>
  );
}
