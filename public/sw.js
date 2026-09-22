/**
 * Service worker de Relevo.
 *
 * Existe por dos razones, y ninguna es técnica:
 *
 *   1. Sin él, Chrome en Android no ofrece «Instalar». Y que se instale sin
 *      pasar por una tienda es media propuesta: se comparte por WhatsApp.
 *   2. La señal en una sala de espera de EPS es mala. Que la aplicación abra
 *      igual, aunque no cargue nada nuevo, es la diferencia entre una
 *      herramienta y una pantalla en blanco.
 *
 * Lo que NUNCA se guarda: las rutas /api/. Ahí van fotos de documentos de
 * salud y planes de una persona. Eso no se queda en el disco del teléfono
 * escondido en una caché que nadie sabe vaciar.
 */

const VERSION = "relevo-v1";
const ESENCIALES = ["/", "/manifest.webmanifest", "/icono-192.png", "/icono-512.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSION)
      // addAll falla entero si un solo archivo falla; preferimos que la
      // instalación siga aunque falte uno.
      .then((c) => Promise.allSettled(ESENCIALES.map((u) => c.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((llaves) =>
        Promise.all(llaves.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // Datos de salud: no se guardan. Ni la lectura ni el plan.
  if (url.pathname.startsWith("/api/")) return;

  // Navegación: primero la red, para que no se quede con una versión vieja.
  // Si no hay señal, se abre lo último que se vio.
  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSION).then((c) => c.put("/", copia));
          return res;
        })
        .catch(() => caches.match("/").then((r) => r ?? Response.error())),
    );
    return;
  }

  // Todo lo demás (fuentes, imágenes, chunks): se sirve de la caché al
  // instante y se refresca por detrás.
  evento.respondWith(
    caches.match(pedido).then((guardado) => {
      const red = fetch(pedido)
        .then((res) => {
          if (res && res.status === 200) {
            const copia = res.clone();
            caches.open(VERSION).then((c) => c.put(pedido, copia));
          }
          return res;
        })
        .catch(() => guardado);
      return guardado || red;
    }),
  );
});
