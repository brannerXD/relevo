/**
 * La marca, en un solo lugar.
 *
 * La mascota de las pantallas son cuatro PNG (public/buho/), generados en una
 * sola hoja para que el búho no cambie de forma entre pantallas. Pero un
 * favicon necesita vector: nítido a 16 px y de 1 KB. Esa versión vive aquí.
 */

export const COLORES = {
  barro: "#C2663E",
  barroOscuro: "#9C4E2E",
  barroSuave: "#E8C4AC",
  monte: "#2F5D50",
  arena: "#FAF6F1",
  tinta: "#2B2420",
  urgente: "#B3402F",
  pronto: "#C98A2E",
  tranquilo: "#4F7A6A",
} as const;

/**
 * El búho, reducido a lo que sobrevive a 16 píxeles: cuerpo, dos ojos
 * grandes, pico y el aro de la lupa. Sin mango, sin alas, sin plumas — a ese
 * tamaño todo eso es ruido.
 */
export function iconoSVG(lado = 512): string {
  const cx = lado / 2;
  const cy = lado / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}" role="img" aria-label="Relevo">
  <rect width="${lado}" height="${lado}" fill="${COLORES.arena}"/>
  <g transform="translate(${cx} ${cy}) scale(${((lado / 96) * 0.78).toFixed(4)}) translate(-48 -52)">
    <path d="M26 33 L31 17 L40 30 Z" fill="${COLORES.barroOscuro}"/>
    <path d="M70 33 L65 17 L56 30 Z" fill="${COLORES.barroOscuro}"/>
    <ellipse cx="48" cy="55" rx="29" ry="30" fill="${COLORES.barro}"/>
    <circle cx="36" cy="49" r="12" fill="${COLORES.arena}"/>
    <circle cx="36" cy="49" r="5.6" fill="#3B2A22"/>
    <circle cx="60" cy="49" r="12" fill="${COLORES.arena}"/>
    <circle cx="60" cy="49" r="5.6" fill="#3B2A22"/>
    <path d="M48 57 L43 66 L53 66 Z" fill="${COLORES.pronto}"/>
    <path d="M38 83 L38 90 M58 83 L58 90" stroke="${COLORES.pronto}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="36" cy="49" r="15.5" fill="none" stroke="${COLORES.monte}" stroke-width="5"/>
  </g>
</svg>`;
}
