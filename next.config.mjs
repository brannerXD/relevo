/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sin banderas experimentales a propósito.
  //
  // Antes había aquí un serverActions.bodySizeLimit que no servía para nada:
  // esta aplicación no usa Server Actions, sino route handlers, y ese límite
  // no los gobierna. Las fotos ya se comprimen en el navegador a 1600 px de
  // lado antes de subirse, así que los cuerpos quedan chicos de por sí.
};

export default nextConfig;
