"use client";

import type { Accion, Documento, DocumentoEnBolsa, Plan } from "./tipos";
import { hayNube, sesion, supabase } from "./supabase";

/**
 * Guardar y recuperar.
 *
 * El problema que resuelve: una cuidadora no fotografía los papeles de una
 * sentada. Los va juntando a lo largo de días. Sin esto, cerrar la pestaña
 * borraba todo el trabajo, que es la forma más rápida de perder a alguien.
 *
 * Todo falla en silencio a propósito: si la nube no está, la app sigue
 * funcionando en memoria. Nunca se le muestra a la usuaria un error de
 * base de datos — eso no es problema suyo.
 */

function avisar(donde: string, error: unknown) {
  console.error(`[relevo:almacen:${donde}]`, error);
}

/** Sube la foto al bucket privado, dentro de la carpeta del usuario. */
export async function guardarFoto(uid: string, id: string, dataUrl: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const ruta = `${uid}/${id}.jpg`;
    const { error } = await supabase()
      .storage.from("papeles")
      .upload(ruta, blob, { contentType: blob.type || "image/jpeg", upsert: true });
    if (error) throw error;
    return ruta;
  } catch (e) {
    avisar("guardarFoto", e);
    return null;
  }
}

/** Guarda un documento leído, con sus medicamentos y servicios. */
export async function guardarDocumento(doc: DocumentoEnBolsa) {
  if (!hayNube) return null;
  const uid = await sesion();
  if (!uid) return null;

  try {
    const sb = supabase();
    const foto_path = doc.miniatura ? await guardarFoto(uid, doc.id, doc.miniatura) : null;

    const { data, error } = await sb
      .from("documentos")
      .insert({
        tipo: doc.tipo,
        legible: doc.legible,
        motivo_ilegible: doc.motivo_ilegible,
        paciente: doc.paciente,
        entidad: doc.entidad,
        fecha_expedicion: doc.fecha_expedicion,
        fecha_vencimiento: doc.fecha_vencimiento,
        numero: doc.numero,
        confianza: doc.confianza,
        notas: doc.notas,
        confirmado: doc.confirmado,
        foto_path,
      })
      .select("id")
      .single();
    if (error) throw error;

    const docId = data.id as string;

    if (doc.medicamentos.length) {
      const { error: e1 } = await sb.from("medicamentos").insert(
        doc.medicamentos.map((m) => ({ documento_id: docId, ...m })),
      );
      if (e1) throw e1;
    }
    if (doc.servicios.length) {
      const { error: e2 } = await sb.from("servicios").insert(
        doc.servicios.map((s) => ({ documento_id: docId, ...s })),
      );
      if (e2) throw e2;
    }
    return docId;
  } catch (e) {
    avisar("guardarDocumento", e);
    return null;
  }
}

/** Actualiza un documento después de que la usuaria lo corrigió. */
export async function confirmarDocumento(docId: string, doc: Documento) {
  if (!hayNube) return;
  try {
    const sb = supabase();
    const { error } = await sb
      .from("documentos")
      .update({
        tipo: doc.tipo,
        paciente: doc.paciente,
        entidad: doc.entidad,
        fecha_expedicion: doc.fecha_expedicion,
        fecha_vencimiento: doc.fecha_vencimiento,
        numero: doc.numero,
        confirmado: true,
      })
      .eq("id", docId);
    if (error) throw error;

    // Los medicamentos se reemplazan: corregir uno a uno no vale la pena.
    await sb.from("medicamentos").delete().eq("documento_id", docId);
    if (doc.medicamentos.length) {
      await sb.from("medicamentos").insert(
        doc.medicamentos.map((m) => ({ documento_id: docId, ...m })),
      );
    }
  } catch (e) {
    avisar("confirmarDocumento", e);
  }
}

export async function borrarDocumento(docId: string) {
  if (!hayNube) return;
  try {
    const { error } = await supabase().from("documentos").delete().eq("id", docId);
    if (error) throw error;
  } catch (e) {
    avisar("borrarDocumento", e);
  }
}

/** Guarda el plan del mes completo. Devuelve el id del plan. */
export async function guardarPlan(plan: Plan) {
  if (!hayNube) return null;
  const uid = await sesion();
  if (!uid) return null;

  try {
    const sb = supabase();
    const { data, error } = await sb.from("planes").insert({}).select("id").single();
    if (error) throw error;
    const planId = data.id as string;

    if (plan.conflictos.length) {
      await sb.from("conflictos").insert(
        plan.conflictos.map((c) => ({
          plan_id: planId,
          descripcion: c.descripcion,
          gravedad: c.gravedad,
        })),
      );
    }
    if (plan.acciones.length) {
      await sb.from("acciones").insert(
        plan.acciones.map((a, i) => ({
          plan_id: planId,
          titulo: a.titulo,
          detalle: a.detalle,
          fecha_limite: a.fecha_limite,
          urgencia: a.urgencia,
          lugar: a.lugar,
          llevar: a.llevar,
          orden: i,
        })),
      );
    }
    return planId;
  } catch (e) {
    avisar("guardarPlan", e);
    return null;
  }
}

/** Marca una vuelta como hecha o pendiente. */
export async function marcarAccion(planId: string, orden: number, hecha: boolean) {
  if (!hayNube) return;
  try {
    const { error } = await supabase()
      .from("acciones")
      .update({ hecha })
      .eq("plan_id", planId)
      .eq("orden", orden);
    if (error) throw error;
  } catch (e) {
    avisar("marcarAccion", e);
  }
}

export type Recuperado = {
  documentos: DocumentoEnBolsa[];
  plan: Plan | null;
  planId: string | null;
  hechas: number[];
};

/** Al abrir la app: recupera lo último que había, si había algo. */
export async function recuperar(): Promise<Recuperado | null> {
  if (!hayNube) return null;
  const uid = await sesion();
  if (!uid) return null;

  try {
    const sb = supabase();

    const { data: docs, error } = await sb
      .from("documentos")
      .select("*, medicamentos(*), servicios(*)")
      .order("creado", { ascending: true });
    if (error) throw error;
    if (!docs?.length) return null;

    const documentos: DocumentoEnBolsa[] = await Promise.all(
      docs.map(async (d) => ({
        id: d.id,
        miniatura: d.foto_path ? await urlFirmada(d.foto_path) : "",
        confirmado: d.confirmado,
        tipo: d.tipo,
        legible: d.legible,
        motivo_ilegible: d.motivo_ilegible,
        paciente: d.paciente,
        entidad: d.entidad,
        fecha_expedicion: d.fecha_expedicion,
        fecha_vencimiento: d.fecha_vencimiento,
        numero: d.numero,
        confianza: d.confianza ?? 0,
        notas: d.notas,
        medicamentos: (d.medicamentos ?? []).map((m: Record<string, unknown>) => ({
          nombre: (m.nombre as string) ?? null,
          concentracion: (m.concentracion as string) ?? null,
          dosis_dia: (m.dosis_dia as number) ?? null,
          cantidad: (m.cantidad as number) ?? null,
          presentacion: (m.presentacion as string) ?? null,
        })),
        servicios: (d.servicios ?? []).map((s: Record<string, unknown>) => ({
          descripcion: (s.descripcion as string) ?? null,
          codigo_cups: (s.codigo_cups as string) ?? null,
        })),
      })),
    );

    const { data: planes } = await sb
      .from("planes")
      .select("id, conflictos(*), acciones(*)")
      .order("creado", { ascending: false })
      .limit(1);

    const p = planes?.[0];
    if (!p) return { documentos, plan: null, planId: null, hechas: [] };

    const acciones = [...(p.acciones ?? [])].sort(
      (a: Record<string, number>, b: Record<string, number>) => a.orden - b.orden,
    );

    return {
      documentos,
      planId: p.id,
      hechas: acciones.flatMap((a: Record<string, unknown>, i: number) =>
        a.hecha ? [i] : [],
      ),
      plan: {
        conflictos: (p.conflictos ?? []).map((c: Record<string, unknown>) => ({
          descripcion: c.descripcion as string,
          gravedad: c.gravedad as "alta" | "media" | "baja",
          documentos: [],
        })),
        acciones: acciones.map((a: Record<string, unknown>) => ({
          titulo: a.titulo as string,
          detalle: (a.detalle as string) ?? "",
          fecha_limite: (a.fecha_limite as string) ?? null,
          urgencia: a.urgencia as Accion["urgencia"],
          lugar: (a.lugar as string) ?? null,
          llevar: (a.llevar as string[]) ?? [],
        })),
      },
    };
  } catch (e) {
    avisar("recuperar", e);
    return null;
  }
}

/** Las fotos son privadas: se sirven con un enlace temporal. */
async function urlFirmada(ruta: string): Promise<string> {
  try {
    const { data } = await supabase().storage.from("papeles").createSignedUrl(ruta, 3600);
    return data?.signedUrl ?? "";
  } catch {
    return "";
  }
}

/**
 * Empezar de cero: borra todo lo de este usuario, incluidas las fotos.
 *
 * Borrar solo las filas dejaría las imágenes huérfanas en el bucket, y son
 * fotos de documentos de salud. Si la app promete que no guarda nada sin
 * permiso, "empezar de nuevo" tiene que borrar de verdad.
 */
export async function limpiarTodo() {
  if (!hayNube) return;
  const uid = await sesion();
  if (!uid) return;
  try {
    const sb = supabase();

    const { data: fotos } = await sb.storage.from("papeles").list(uid);
    if (fotos?.length) {
      await sb.storage.from("papeles").remove(fotos.map((f) => `${uid}/${f.name}`));
    }

    await sb.from("documentos").delete().eq("user_id", uid);
    await sb.from("planes").delete().eq("user_id", uid);
  } catch (e) {
    avisar("limpiarTodo", e);
  }
}
