"use client";

import { useEffect, useState } from "react";
import { Bolsa } from "@/components/Bolsa";
import { Guia } from "@/components/Guia";
import { Revision } from "@/components/Revision";
import { Vueltas } from "@/components/Vueltas";
import { DOCUMENTOS_EJEMPLO, PLAN_EJEMPLO } from "@/lib/demo";
import type { Documento, DocumentoEnBolsa, Plan } from "@/lib/tipos";
import { PantallaCuenta } from "@/components/Cuenta";
import { alCambiarCuenta, cuentaActual, salir, type Cuenta } from "@/lib/cuenta";
import { encabezados } from "@/lib/supabase";
import {
  borrarDocumento,
  confirmarDocumento,
  guardarDocumento,
  guardarPlan,
  limpiarTodo,
  marcarAccion,
  recuperar,
} from "@/lib/almacen";

type Pantalla = "guia" | "bolsa" | "revision" | "vueltas" | "cuenta";

const YA_VIO_GUIA = "relevo:vio-guia";
const ES_EJEMPLO = "relevo:es-ejemplo";

const MAX_LADO = 1600; // Suficiente para leer letra de médico, sin subir 8 MB.

export default function Page() {
  const [pantalla, setPantalla] = useState<Pantalla>("bolsa");
  const [documentos, setDocumentos] = useState<DocumentoEnBolsa[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [armando, setArmando] = useState(false);
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  /** En modo demostración no llamamos a la API: ni clave, ni costo, ni fallos. */
  const [esEjemplo, setEsEjemplo] = useState(false);
  /** Id del plan guardado, para poder marcar las vueltas como hechas. */
  const [planId, setPlanId] = useState<string | null>(null);
  const [hechasGuardadas, setHechasGuardadas] = useState<number[]>([]);
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  /** De dónde se entró a la pantalla de cuenta, para saber a dónde volver. */
  const [volverA, setVolverA] = useState<Pantalla>("bolsa");

  // La sesión: quién es, y avisar si cambia (entrar, salir, vincular Google).
  useEffect(() => {
    cuentaActual().then(setCuenta);
    return alCambiarCuenta(setCuenta);
  }, []);

  // Al abrir: la guía si es la primera vez, y lo que hubiera quedado a medias.
  useEffect(() => {
    let vioGuia = true;
    try {
      vioGuia = Boolean(localStorage.getItem(YA_VIO_GUIA));
    } catch {
      // Navegador con almacenamiento bloqueado: no pasa nada, no mostramos guía.
    }

    (async () => {
      const antes = await recuperar();

      if (antes?.documentos.length) {
        // Lo que estaba a medias sigue ahí. Nadie pierde el trabajo de ayer.
        try {
          // Si lo guardado venía del ejemplo, la banda tiene que volver:
          // nadie debe confundir datos de muestra con los suyos.
          if (localStorage.getItem(ES_EJEMPLO)) setEsEjemplo(true);
        } catch {}
        setDocumentos(antes.documentos);
        if (antes.plan) {
          setPlan(antes.plan);
          setPlanId(antes.planId);
          setHechasGuardadas(antes.hechas);
          setPantalla("vueltas");
        } else {
          setPantalla("revision");
        }
        return;
      }

      if (!vioGuia) setPantalla("guia");
    })();
  }, []);

  function abrirCuenta() {
    setVolverA(pantalla);
    setPantalla("cuenta");
  }

  async function cerrarSesion() {
    await salir();
    setDocumentos([]);
    setPlan(null);
    setPlanId(null);
    setHechasGuardadas([]);
    setEsEjemplo(false);
    setPantalla("bolsa");
  }

  function cerrarGuia() {
    try {
      localStorage.setItem(YA_VIO_GUIA, "1");
    } catch {}
    setPantalla("bolsa");
  }

  async function subirFotos(archivos: File[]) {
    setError(null);
    setEsEjemplo(false);
    setLeyendo(true);
    setProgreso({ hechas: 0, total: archivos.length });

    const preparadas = await Promise.all(archivos.map(comprimir));
    // Una sola vez para todas las fotos: el token es el mismo.
    const cabeceras = await encabezados();

    // En paralelo: la usuaria está esperando y cada foto es independiente.
    const resultados = await Promise.all(
      preparadas.map(async (img) => {
        try {
          const res = await fetch("/api/leer", {
            method: "POST",
            headers: cabeceras,
            body: JSON.stringify({ data: img.base64, media_type: img.mediaType }),
          });
          const json = await res.json();
          setProgreso((p) => ({ ...p, hechas: p.hechas + 1 }));
          if (!res.ok) return { error: json.error as string, img };
          return { doc: json as Documento, img };
        } catch {
          setProgreso((p) => ({ ...p, hechas: p.hechas + 1 }));
          return { error: "No hubo conexión.", img };
        }
      }),
    );

    const nuevos: DocumentoEnBolsa[] = resultados.map((r, i) => {
      if ("doc" in r && r.doc) {
        return {
          ...r.doc,
          id: `${Date.now()}-${i}`,
          miniatura: r.img.dataUrl,
          confirmado: false,
        };
      }
      return {
        id: `${Date.now()}-${i}`,
        miniatura: r.img.dataUrl,
        confirmado: false,
        tipo: "ilegible",
        legible: false,
        motivo_ilegible: ("error" in r && r.error) || "No pudimos leer esta foto.",
        paciente: null,
        entidad: null,
        fecha_expedicion: null,
        fecha_vencimiento: null,
        numero: null,
        medicamentos: [],
        servicios: [],
        confianza: 0,
        notas: null,
      };
    });

    // Guardar apenas se leen, no al final: si cierra la pestaña ahora mismo,
    // el trabajo ya está a salvo. El id de la nube reemplaza al temporal.
    const guardados = await Promise.all(
      nuevos.map(async (d) => {
        const idNube = await guardarDocumento(d);
        return idNube ? { ...d, id: idNube } : d;
      }),
    );

    setDocumentos((prev) => [...prev, ...guardados]);
    setLeyendo(false);
    setPantalla("revision");
  }

  async function armarPlan() {
    setArmando(true);
    setError(null);

    if (esEjemplo) {
      // Una pausa corta para que se sienta el trabajo, no para simularlo.
      await new Promise((r) => setTimeout(r, 900));
      setPlan(PLAN_EJEMPLO);
      setPlanId(await guardarPlan(PLAN_EJEMPLO));
      setHechasGuardadas([]);
      setPantalla("vueltas");
      setArmando(false);
      return;
    }

    // Lo que ella corrigió en la pantalla anterior manda sobre lo que leyó la IA.
    await Promise.all(
      documentos.map(({ id, miniatura, confirmado, ...doc }) =>
        confirmarDocumento(id, doc),
      ),
    );

    try {
      const res = await fetch("/api/reconciliar", {
        method: "POST",
        headers: await encabezados(),
        body: JSON.stringify({
          documentos: documentos.map(({ id, miniatura, confirmado, ...doc }) => doc),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "No pudimos armar el plan.");
        return;
      }
      const nuevoPlan = json as Plan;
      setPlan(nuevoPlan);
      setPlanId(await guardarPlan(nuevoPlan));
      setHechasGuardadas([]);
      setPantalla("vueltas");
    } catch {
      setError("No hubo conexión con el servidor.");
    } finally {
      setArmando(false);
    }
  }

  async function verEjemplo() {
    setEsEjemplo(true);
    try {
      localStorage.setItem(ES_EJEMPLO, "1");
    } catch {}
    setPantalla("revision");
    // El ejemplo también se guarda: así el recorrido completo —incluido
    // volver al día siguiente y encontrarlo— se puede probar sin clave de IA.
    const guardados = await Promise.all(
      DOCUMENTOS_EJEMPLO.map(async (d) => {
        const idNube = await guardarDocumento(d);
        return idNube ? { ...d, id: idNube } : d;
      }),
    );
    setDocumentos(guardados);
  }

  async function empezarDeNuevo() {
    setDocumentos([]);
    setPlan(null);
    setPlanId(null);
    setHechasGuardadas([]);
    setPantalla("bolsa");
    setEsEjemplo(false);
    try {
      localStorage.removeItem(ES_EJEMPLO);
    } catch {}
    await limpiarTodo();
  }

  return (
    <main className="min-h-dvh">
      {esEjemplo && pantalla !== "bolsa" && (
        <p className="bg-monte py-2 text-center text-sm font-semibold tracking-wide text-white">
          Modo demostración · datos de ejemplo
        </p>
      )}

      {error && (
        <div className="mx-auto mt-4 max-w-md rounded-xl border border-urgente bg-urgente/5 px-4 py-3 text-[16px] text-urgente">
          {error}
        </div>
      )}

      {pantalla === "cuenta" && (
        <PantallaCuenta
          cuenta={cuenta}
          tieneTrabajo={documentos.length > 0}
          onListo={() => setPantalla(volverA === "cuenta" ? "bolsa" : volverA)}
          onVolver={() => setPantalla(volverA === "cuenta" ? "bolsa" : volverA)}
        />
      )}

      {pantalla === "guia" && <Guia onListo={cerrarGuia} />}

      {pantalla === "bolsa" && (
        <Bolsa
          onFotos={subirFotos}
          onEjemplo={verEjemplo}
          onGuia={() => setPantalla("guia")}
          cuenta={cuenta}
          onCuenta={abrirCuenta}
          onSalir={cerrarSesion}
          leyendo={leyendo}
          progreso={progreso}
        />
      )}

      {pantalla === "revision" && (
        <Revision
          documentos={documentos}
          armando={armando}
          onCambiar={(id, cambios) =>
            setDocumentos((prev) =>
              prev.map((d) => (d.id === id ? { ...d, ...cambios } : d)),
            )
          }
          onQuitar={(id) => {
            setDocumentos((prev) => prev.filter((d) => d.id !== id));
            borrarDocumento(id);
          }}
          onListo={armarPlan}
        />
      )}

      {pantalla === "vueltas" && plan && (
        <Vueltas
          key={planId ?? "sin-guardar"}
          plan={plan}
          yaHechas={hechasGuardadas}
          onMarcar={(orden, hecha) => {
            if (planId) marcarAccion(planId, orden, hecha);
          }}
          onEmpezarDeNuevo={empezarDeNuevo}
          cuentaAnonima={cuenta?.anonima ?? false}
          onGuardarCuenta={abrirCuenta}
        />
      )}
    </main>
  );
}

type Preparada = { base64: string; mediaType: string; dataUrl: string };

/** Redimensiona en el navegador: menos datos, menos espera, menos costo. */
function comprimir(archivo: File): Promise<Preparada> {
  return new Promise((resolve) => {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const dataUrl = String(lector.result);
          resolve({
            base64: dataUrl.split(",")[1] ?? "",
            mediaType: archivo.type || "image/jpeg",
            dataUrl,
          });
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({
          base64: dataUrl.split(",")[1] ?? "",
          mediaType: "image/jpeg",
          dataUrl,
        });
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}
