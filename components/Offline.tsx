"use client";

import { useEffect } from "react";

/**
 * Enciende el service worker.
 *
 * No pinta nada. Va en el layout para que corra una vez por sesión.
 *
 * En desarrollo se queda quieto a propósito: un service worker sirviendo
 * archivos viejos mientras uno programa es una tarde perdida buscando un bug
 * que no existe.
 */
export function Offline() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => {
        // Que falle no puede tumbar la aplicación: solo se queda sin modo
        // sin señal. La usuaria no tiene por qué enterarse.
        console.error("[relevo] no se pudo registrar el service worker:", e);
      });
    };

    // Después de cargar, para no competir por ancho de banda con la pantalla
    // que la usuaria está esperando ver.
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);

  return null;
}
