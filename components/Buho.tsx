"use client";

import Image from "next/image";

/**
 * El búho — la mascota de Relevo.
 *
 * Cuatro poses, generadas en una sola hoja para que no cambie de forma entre
 * pantallas. El de la lupa es además el logo.
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
  | "alerta"; // hay algo urgente

const POSE: Record<Animo, { archivo: string; alt: string }> = {
  reposo: { archivo: "saluda", alt: "" },
  leyendo: { archivo: "lee", alt: "" },
  pensando: { archivo: "compara", alt: "" },
  listo: { archivo: "listo", alt: "" },
  alerta: { archivo: "compara", alt: "" },
};

export function Buho({
  animo = "reposo",
  size = 128,
  prioridad = false,
}: {
  animo?: Animo;
  size?: number;
  /** true en la primera pantalla, para que no parpadee al cargar. */
  prioridad?: boolean;
}) {
  const pose = POSE[animo];

  return (
    <span className={`buho buho--${animo}`} style={{ width: size, height: size }}>
      <Image
        src={`/buho/buho-${pose.archivo}.png`}
        alt={pose.alt}
        width={size}
        height={size}
        priority={prioridad}
        aria-hidden="true"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
