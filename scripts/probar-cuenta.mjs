/**
 * Prueba de vinculación de cuenta.
 *
 * Lo que verifica: una usuaria anónima que ya guardó papeles, al crear su
 * cuenta, NO los pierde. El id del usuario tiene que ser el mismo antes y
 * después; si cambiara, sus documentos quedarían huérfanos.
 *
 *   npm run probar:cuenta
 */
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://dcxiyhmotkhufvexrxyn.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_ilzKpG8K7BzogyUEDa79ww_bnDDelXC";

const correo = `prueba-${Date.now()}@example.com`;
const clave = "unaClaveDePrueba123";

const json = async (r) => {
  const t = await r.text();
  return t ? JSON.parse(t) : null;
};

// 1. Entra anónima.
const anon = await json(
  await fetch(`${URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: "{}",
  }),
);
const token = anon.access_token;
const idAntes = anon.user.id;
console.log(`1. sesión anónima: ${idAntes}`);

const api = async (ruta, opts = {}) =>
  fetch(`${URL}/rest/v1/${ruta}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...opts.headers,
    },
  });

// 2. Guarda un papel, como haría antes de registrarse.
const doc = await json(
  await api("documentos", {
    method: "POST",
    body: JSON.stringify({ tipo: "formula", entidad: "EPS Sura", confianza: 0.9 }),
  }),
);
console.log(`2. guarda un documento: ${doc?.[0]?.id ? "ok" : "FALLÓ"}`);

// 3. Convierte la sesión anónima en cuenta con correo.
const upd = await fetch(`${URL}/auth/v1/user`, {
  method: "PUT",
  headers: { apikey: KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email: correo, password: clave }),
});
const cuerpo = await json(upd);
console.log(`3. vincula correo → ${upd.status}`);
const idDespues = cuerpo?.id ?? cuerpo?.user?.id;
console.log(`   id después:  ${idDespues}`);
console.log(`   correo pendiente de confirmar: ${cuerpo?.new_email ?? "(ninguno)"}`);

// 4. ¿Sus papeles siguen ahí?
const sigue = await json(await api("documentos?select=id,entidad"));
console.log(`4. documentos que ve tras vincular: ${sigue?.length ?? 0}`);

// Limpieza antes de juzgar, para no dejar basura si sale mal.
if (doc?.[0]?.id) await api(`documentos?id=eq.${doc[0].id}`, { method: "DELETE" });

// El correo de confirmación pasa por el SMTP incluido de Supabase, que en el
// plan gratuito manda ~2 por hora. Un 429 no es un fallo del código: es el
// límite. Para probar con varias personas hace falta SMTP propio (Resend,
// SendGrid) configurado en Authentication → Emails.
if (upd.status === 429) {
  console.log(
    "\nLÍMITE DE CORREOS DE SUPABASE (429).\n" +
      "El código no se pudo verificar en esta corrida. Espere una hora o\n" +
      "configure un SMTP propio. Ojo: ese mismo límite aplica a las usuarias.",
  );
  process.exit(0);
}

const ok = idAntes === idDespues && sigue?.length === 1 && Boolean(cuerpo?.new_email);
console.log(
  `\n${ok ? "VINCULACIÓN CORRECTA — no se pierde nada" : "FALLA — la usuaria perdería sus papeles"}`,
);
process.exit(ok ? 0 : 1);
