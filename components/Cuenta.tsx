"use client";

import { useState } from "react";
import { Buho } from "./Buho";
import { conGoogle, entrar, guardarCuenta, type Cuenta } from "@/lib/cuenta";

type Modo = "guardar" | "entrar";

/** Se enciende cuando el proveedor de Google ya quedó configurado en Supabase. */
const googleListo = process.env.NEXT_PUBLIC_GOOGLE_LISTO === "1";

type Props = {
  cuenta: Cuenta | null;
  /** true cuando hay documentos sin respaldar: cambia el texto del encabezado. */
  tieneTrabajo: boolean;
  onListo: () => void;
  onVolver: () => void;
};

export function PantallaCuenta({ cuenta, tieneTrabajo, onListo, onVolver }: Props) {
  const [modo, setModo] = useState<Modo>("guardar");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const guardando = modo === "guardar";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);

    if (!correo.trim() || clave.length < 6) {
      setError("Escriba su correo y una contraseña de al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    const r = guardando
      ? await guardarCuenta(correo.trim(), clave)
      : await entrar(correo.trim(), clave);
    setCargando(false);

    if (!r.ok) {
      setError(r.mensaje);
      return;
    }

    if (r.confirmar) {
      // No la echamos de la pantalla: necesita leer que hay un correo esperándola.
      setAviso(
        `Listo. Le mandamos un correo a ${correo.trim()} para confirmar que es suyo. Ábralo cuando pueda — mientras tanto puede seguir usando Relevo normal.`,
      );
      setClave("");
      return;
    }

    onListo();
  }

  async function google() {
    setError(null);
    setCargando(true);
    const r = await conGoogle();
    setCargando(false);
    // Si sale bien, el navegador se va a Google y vuelve solo.
    if (!r.ok) setError(r.mensaje);
  }

  return (
    <div className="pantalla mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
      <button
        onClick={onVolver}
        className="self-start text-[16px] text-tinta-suave"
      >
        ← Volver
      </button>

      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <Buho animo="reposo" size={88} />
        <h1 className="font-titulo text-3xl">
          {guardando ? "Guarde su cuenta" : "Entre a su cuenta"}
        </h1>
        <p className="text-[17px] leading-relaxed text-tinta-suave">
          {guardando
            ? tieneTrabajo
              ? "Para que no pierda lo que ya organizó si cambia de teléfono o borra el navegador. Todo lo que lleva hecho se queda con usted."
              : "Así lo suyo la acompaña aunque cambie de teléfono."
            : "Si ya tenía cuenta, entre y recupere sus papeles."}
        </p>
      </div>

      {/*
        Escondido hasta que el proveedor esté configurado en Supabase. Un botón
        que siempre falla es peor que no tenerlo, sobre todo en una demostración.
        Se enciende con NEXT_PUBLIC_GOOGLE_LISTO=1 en .env.local.
      */}
      <div className={googleListo ? "" : "hidden"}>
      <button
        onClick={google}
        disabled={cargando}
        className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-arena-borde bg-white px-6 py-4 text-[17px] font-semibold transition active:scale-[0.98] disabled:opacity-50"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l-.1.3 6.5 5 .5.1c4.1-3.8 6.6-9.4 6.6-15.7z"/>
          <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3
           .1-6.7 5.2-.1.3C7.9 41 15.3 46 24 46z"/>
          <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-.3l-6.8-5.3-.2.1C2.9 17.3 2 20.5 2 24s.9 6.7 2.5 9.9l7-5.5z"/>
          <path fill="#EA4335" d="M24 10.4c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.2 29.9 2 24 2 15.3 2 7.9 7 4.5 14.1l7 5.5c1.8-5.3 6.7-9.2 12.5-9.2z"/>
        </svg>
        Continuar con Google
      </button>

      <div className="my-6 flex items-center gap-3 text-[15px] text-tinta-suave">
        <span className="h-px flex-1 bg-arena-borde" />o con su correo
        <span className="h-px flex-1 bg-arena-borde" />
      </div>
      </div>

      {!googleListo && <div className="mt-7" />}

      <form onSubmit={enviar} className="flex flex-col gap-4">
        <label className="block">
          <span className="text-[15px] text-tinta-suave">Correo</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="sucorreo@ejemplo.com"
            className="mt-1 w-full rounded-xl border border-arena-borde bg-white px-4 py-3 text-[17px] focus:border-barro focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[15px] text-tinta-suave">Contraseña</span>
          <div className="relative mt-1">
            <input
              type={verClave ? "text" : "password"}
              autoComplete={guardando ? "new-password" : "current-password"}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Al menos 6 caracteres"
              className="w-full rounded-xl border border-arena-borde bg-white px-4 py-3 pr-20 text-[17px] focus:border-barro focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setVerClave((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 text-[15px] text-barro-oscuro"
            >
              {verClave ? "Ocultar" : "Ver"}
            </button>
          </div>
        </label>

        {error && (
          <p className="rounded-xl border border-urgente bg-urgente/5 px-4 py-3 text-[16px] text-urgente">
            {error}
          </p>
        )}
        {aviso && (
          <div className="rounded-xl border border-tranquilo bg-tranquilo/10 px-4 py-3">
            <p className="text-[16px] text-tranquilo">{aviso}</p>
            <button
              type="button"
              onClick={onListo}
              className="mt-3 text-[16px] font-semibold text-tranquilo underline underline-offset-4"
            >
              Seguir con mis papeles
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded-xl bg-barro px-6 py-4 text-lg font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {cargando ? "Un momento…" : guardando ? "Guardar mi cuenta" : "Entrar"}
        </button>
      </form>

      <button
        onClick={() => {
          setModo(guardando ? "entrar" : "guardar");
          setError(null);
          setAviso(null);
        }}
        className="mt-5 text-center text-[16px] text-barro-oscuro underline underline-offset-4"
      >
        {guardando ? "Ya tengo cuenta, quiero entrar" : "No tengo cuenta, quiero crear una"}
      </button>

      {cuenta?.anonima && guardando && (
        <p className="mt-6 text-center text-[15px] leading-relaxed text-tinta-suave">
          Sus papeles no se van a ningún lado: se quedan en la misma cuenta,
          solo que ahora con su correo.
        </p>
      )}
    </div>
  );
}
