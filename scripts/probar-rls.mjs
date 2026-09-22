/**
 * Prueba de aislamiento: dos usuarios anónimos distintos no pueden verse
 * los papeles entre sí. Si esto falla, la app no puede tocar datos de salud.
 */
const URL = "https://dcxiyhmotkhufvexrxyn.supabase.co";
const KEY = "sb_publishable_ilzKpG8K7BzogyUEDa79ww_bnDDelXC";

const entrar = async () => {
  const r = await fetch(`${URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: "{}",
  });
  const j = await r.json();
  return { token: j.access_token, uid: j.user?.id };
};

const api = (token) => async (ruta, opts = {}) => {
  const r = await fetch(`${URL}/rest/v1/${ruta}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...opts.headers,
    },
  });
  const texto = await r.text();
  return { status: r.status, cuerpo: texto ? JSON.parse(texto) : null };
};

const a = await entrar();
const b = await entrar();
console.log(`usuario A: ${a.uid}`);
console.log(`usuario B: ${b.uid}\n`);

const A = api(a.token), B = api(b.token);

// A guarda una fórmula con un medicamento.
const doc = await A("documentos", {
  method: "POST",
  body: JSON.stringify({ tipo: "formula", entidad: "EPS Sura", paciente: "Ana Rosa M.", confianza: 0.9 }),
});
console.log(`A inserta documento → ${doc.status}`);
const docId = doc.cuerpo?.[0]?.id;

const med = await A("medicamentos", {
  method: "POST",
  body: JSON.stringify({ documento_id: docId, nombre: "Losartán", dosis_dia: 2, cantidad: 60 }),
});
console.log(`A inserta medicamento → ${med.status}`);

// A ve lo suyo.
const verA = await A("documentos?select=id,entidad");
console.log(`A ve ${verA.cuerpo?.length ?? 0} documento(s)`);

// B no debería ver nada.
const verB = await B("documentos?select=id,entidad");
console.log(`B ve ${verB.cuerpo?.length ?? 0} documento(s)`);

// B tampoco los medicamentos de A.
const medB = await B("medicamentos?select=id,nombre");
console.log(`B ve ${medB.cuerpo?.length ?? 0} medicamento(s)`);

// B intenta escribir en el documento de A.
const robo = await B(`documentos?id=eq.${docId}`, {
  method: "PATCH",
  body: JSON.stringify({ entidad: "HACKEADO" }),
});
console.log(`B intenta modificar el documento de A → ${robo.status}, afectó ${robo.cuerpo?.length ?? 0}`);

// Anónimo sin sesión.
const sin = await fetch(`${URL}/rest/v1/documentos?select=id`, { headers: { apikey: KEY } });
const sinCuerpo = await sin.json();
console.log(`Sin iniciar sesión ve ${Array.isArray(sinCuerpo) ? sinCuerpo.length : "error"} documento(s)`);

const ok =
  verA.cuerpo?.length === 1 &&
  verB.cuerpo?.length === 0 &&
  medB.cuerpo?.length === 0 &&
  (robo.cuerpo?.length ?? 0) === 0 &&
  (!Array.isArray(sinCuerpo) || sinCuerpo.length === 0);

console.log(`\n${ok ? "AISLAMIENTO CORRECTO" : "FALLA DE AISLAMIENTO — NO USAR"}`);

// Limpieza.
await A(`documentos?id=eq.${docId}`, { method: "DELETE" });
