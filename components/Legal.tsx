import Link from "next/link";
import type { ReactNode } from "react";
import { CORREO_CONTACTO } from "@/lib/legal";

/**
 * El canal de contacto. Mientras no haya correo definido lo decimos en la
 * página en vez de inventar uno: una dirección falsa en una política de datos
 * es peor que no tener ninguna, porque aparenta un canal que no existe.
 */
export function Contacto() {
  if (!CORREO_CONTACTO) {
    return <span>Todavía no hay un correo de contacto publicado.</span>;
  }
  return (
    <span>
      Escríbanos a{" "}
      <a href={`mailto:${CORREO_CONTACTO}`}>{CORREO_CONTACTO}</a> y le respondemos.
    </span>
  );
}

/**
 * Marco común de las páginas legales.
 *
 * Se leen en un celular y las lee gente que no es abogada, así que el texto va
 * ancho cómodo, grande, y con los títulos visibles. Una política que no se
 * puede leer no informa a nadie, y una política que no informa no sirve — ni
 * legal ni éticamente.
 */
export function Legal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="text-[16px] text-barro-oscuro underline underline-offset-4">
        ← Volver a Relevo
      </Link>

      <h1 className="mt-6 font-titulo text-3xl leading-tight">{titulo}</h1>
      <p className="mt-2 text-[15px] text-tinta-suave">
        Última actualización: {actualizado}
      </p>

      <div className="legal mt-8">{children}</div>

      <hr className="my-10 border-arena-borde" />

      <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[16px]">
        <Link href="/privacidad" className="text-barro-oscuro underline underline-offset-4">
          Privacidad
        </Link>
        <Link href="/terminos" className="text-barro-oscuro underline underline-offset-4">
          Términos de uso
        </Link>
        <Link href="/" className="text-tinta-suave underline underline-offset-4">
          Inicio
        </Link>
      </nav>
    </main>
  );
}

/** Pie discreto para enlazar lo legal desde las pantallas normales. */
export function PieLegal({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[15px] text-tinta-suave ${className}`}>
      <Link href="/privacidad" className="underline underline-offset-4">
        Privacidad
      </Link>
      {" · "}
      <Link href="/terminos" className="underline underline-offset-4">
        Términos
      </Link>
    </p>
  );
}
