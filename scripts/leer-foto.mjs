/**
 * Banco de pruebas de la lectura de documentos.
 *
 *   npm run dev                          (en otra terminal)
 *   npm run probar -- pruebas/formula.jpg
 *   npm run probar -- pruebas/            (todas las de la carpeta)
 *
 * Golpea las mismas rutas que usa la interfaz, así que prueba el camino real:
 * lectura de cada foto, cruce entre documentos y armado del plan. Sirve para
 * afinar los prompts sin tener que subir fotos por pantalla cada vez.
 */

import fs from "node:fs";
import path from "node:path";

const TIPOS = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const BASE = process.env.RELEVO_URL ?? "http://localhost:3000";

/**
 * Las rutas exigen sesión desde que se cerraron al público (lib/guardia.ts).
 * El banco de pruebas se abre la suya, anónima, igual que haría el navegador.
 * Si no lo hiciera, probaríamos un camino distinto al real — y el que importa
 * es el real.
 */
async function token() {
  const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
  const leer = (n) => (env.match(new RegExp(`^${n}=(.*)$`, "m"))?.[1] ?? "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || leer("NEXT_PUBLIC_SUPABASE_URL");
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || leer("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !clave) return null;

  const res = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: clave, "Content-Type": "application/json" },
    body: "{}",
  });
  const json = await res.json().catch(() => null);
  if (!json?.access_token) {
    console.error("No se pudo abrir sesión anónima para probar. ¿Está encendida en Supabase?");
    return null;
  }
  return json.access_token;
}

const SESION = await token();

function listar(objetivo) {
  if (!fs.existsSync(objetivo)) {
    console.error(`No existe: ${objetivo}`);
    process.exit(1);
  }
  if (fs.statSync(objetivo).isFile()) return [objetivo];
  return fs
    .readdirSync(objetivo)
    .filter((f) => TIPOS[path.extname(f).toLowerCase()])
    .map((f) => path.join(objetivo, f))
    .sort();
}

async function pedir(ruta, cuerpo) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SESION ? { Authorization: `Bearer ${SESION}` } : {}),
    },
    body: JSON.stringify(cuerpo),
  });
  const json = await res.json().catch(() => ({ error: "respuesta no es JSON" }));
  return { ok: res.ok, json };
}

const objetivo = process.argv[2];
if (!objetivo) {
  console.error("Uso: npm run probar -- <foto.jpg | carpeta/>");
  process.exit(1);
}

// Aviso temprano y claro si el servidor no está arriba.
try {
  await fetch(BASE, { method: "HEAD" });
} catch {
  console.error(`\n  No hay nada escuchando en ${BASE}.\n  Levante el servidor con: npm run dev\n`);
  process.exit(1);
}

const archivos = listar(objetivo);
if (archivos.length === 0) {
  console.error(`No hay imágenes en ${objetivo}`);
  process.exit(1);
}

console.log(`\nLeyendo ${archivos.length} ${archivos.length === 1 ? "foto" : "fotos"} contra ${BASE}\n`);

const documentos = [];

for (const ruta of archivos) {
  const mediaType = TIPOS[path.extname(ruta).toLowerCase()];
  const data = fs.readFileSync(ruta).toString("base64");
  const kb = Math.round(fs.statSync(ruta).size / 1024);

  const inicio = Date.now();
  const { ok, json } = await pedir("/api/leer", { data, media_type: mediaType });
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

  console.log(`── ${path.basename(ruta)}  (${kb} KB, ${segundos}s)`);

  if (!ok) {
    console.log(`   ERROR: ${json.error}\n`);
    continue;
  }

  const doc = json;
  console.log(`   tipo: ${doc.tipo}   confianza: ${doc.confianza}`);

  if (!doc.legible) {
    console.log(`   ILEGIBLE: ${doc.motivo_ilegible}\n`);
    documentos.push(doc);
    continue;
  }

  if (doc.entidad) console.log(`   entidad: ${doc.entidad}`);
  if (doc.paciente) console.log(`   paciente: ${doc.paciente}`);
  if (doc.fecha_expedicion) console.log(`   expedida: ${doc.fecha_expedicion}`);
  if (doc.fecha_vencimiento) console.log(`   vence: ${doc.fecha_vencimiento}`);
  for (const m of doc.medicamentos) {
    console.log(
      `   · ${m.nombre ?? "?"} ${m.concentracion ?? ""} — ${m.dosis_dia ?? "?"}/día, ${m.cantidad ?? "?"} en total`,
    );
  }
  for (const s of doc.servicios) console.log(`   · ${s.descripcion ?? "?"}`);
  console.log("");

  documentos.push(doc);
}

const legibles = documentos.filter((d) => d.legible);
if (legibles.length === 0) {
  console.log("Ninguna foto se pudo leer. No hay plan que armar.\n");
  process.exit(0);
}

console.log("Armando el plan…\n");
const inicio = Date.now();
const { ok, json } = await pedir("/api/reconciliar", { documentos });
const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

if (!ok) {
  console.log(`ERROR: ${json.error}\n`);
  process.exit(1);
}

console.log(`Proyección de fechas (calculada en TypeScript, sin IA):`);
for (const p of json.proyecciones ?? []) console.log(`   ${p.fecha}  ${p.etiqueta}`);

if (json.conflictos?.length) {
  console.log(`\nConflictos encontrados al cruzar los papeles:`);
  for (const c of json.conflictos) console.log(`   [${c.gravedad}] ${c.descripcion}`);
} else {
  console.log(`\nSin conflictos entre los papeles.`);
}

console.log(`\nVueltas del mes:`);
for (const a of json.acciones ?? []) {
  console.log(`   [${a.urgencia}] ${a.titulo}  ${a.fecha_limite ?? ""}`);
  console.log(`      ${a.detalle}`);
  if (a.lugar) console.log(`      dónde: ${a.lugar}`);
  if (a.llevar?.length) console.log(`      lleve: ${a.llevar.join(", ")}`);
}

console.log(`\nPlan armado en ${segundos}s.`);
console.log(`El costo real de la corrida se ve en la consola del proveedor.\n`);
