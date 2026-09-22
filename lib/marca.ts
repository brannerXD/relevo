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
 * La CARA del búho, sin fondo.
 *
 * Solo la cara, y por una razón: en una pestaña el ícono se ve a 16 píxeles.
 * A ese tamaño un búho de cuerpo entero es una mancha — la cabeza queda del
 * tamaño de una arveja y los ojos, que son lo único reconocible, desaparecen.
 * Recortado a la cara, los ojos ocupan media pestaña y se sabe qué es.
 *
 * Sin fondo, además, para que se vea igual de bien en una pestaña clara que
 * en una oscura.
 */
export function caraSVG(lado = 512, fondo?: string): string {
  const cx = lado / 2;
  const cy = lado / 2;
  const escala = ((lado / 96) * 0.92).toFixed(4);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}" role="img" aria-label="Relevo">
  ${fondo ? `<rect width="${lado}" height="${lado}" fill="${fondo}"/>` : ""}
  <g transform="translate(${cx} ${cy}) scale(${escala}) translate(-48 -48)">
    <path d="M22 30 L27 9 L41 26 Z" fill="${COLORES.barroOscuro}"/>
    <path d="M74 30 L69 9 L55 26 Z" fill="${COLORES.barroOscuro}"/>
    <ellipse cx="48" cy="50" rx="35" ry="33" fill="${COLORES.barro}"/>
    <circle cx="34" cy="45" r="15" fill="${COLORES.arena}"/>
    <circle cx="62" cy="45" r="15" fill="${COLORES.arena}"/>
    <circle cx="34" cy="45" r="7" fill="#3B2A22"/>
    <circle cx="62" cy="45" r="7" fill="#3B2A22"/>
    <circle cx="36.4" cy="42.4" r="2.3" fill="${COLORES.arena}"/>
    <circle cx="64.4" cy="42.4" r="2.3" fill="${COLORES.arena}"/>
    <path d="M48 54 L42 65 L54 65 Z" fill="${COLORES.pronto}"/>
    <circle cx="34" cy="45" r="19" fill="none" stroke="${COLORES.monte}" stroke-width="5.5"/>
  </g>
</svg>`;
}

/**
 * Se mantiene el nombre viejo para no romper a quien lo importe, pero ahora
 * devuelve la cara. El ícono con fondo solo lo necesita el maskable de
 * Android, y ese se pide explícitamente.
 */
export const iconoSVG = caraSVG;
