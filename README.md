# Relevo

> Tú con lo importante. Nosotros con los papeles.

MVP para el Challenge **#AIForImpact** de NAUFest 2026 (Junior Achievement Américas + HP).

Cuidar a una persona dependiente en Colombia implica un segundo trabajo no
pagado: administrar papeles. Relevo convierte la bolsa de documentos médicos
en un plan del mes.

## Arrancar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sin clave la aplicación abre igual y el botón **«Ver un ejemplo»** funciona:
carga documentos de muestra y recorre las tres pantallas. Lo que no funciona
sin clave es subir fotos reales.

### Dos motores, una interfaz

Relevo no depende de un proveedor. Ponga **una** de las dos claves en
`.env.local`:

| Motor | Clave | Cuándo |
|---|---|---|
| **Claude** | `ANTHROPIC_API_KEY` | Lee mejor la letra manuscrita. Requiere saldo. |
| **Gemini** | `GEMINI_API_KEY` | Tiene capa gratuita con visión. |

Con las dos configuradas usa Claude. `RELEVO_PROVEEDOR=gemini` fuerza el otro,
que es como se comparan calidad y costo sobre las mismas fotos.

Una combinación que estira el presupuesto: Gemini gratis para las decenas de
pruebas de extracción mientras se afina el prompt, y Claude para la
reconciliación, que es donde se nota la calidad del razonamiento.

### Probar la lectura desde la terminal

```bash
npm run probar -- pruebas/formula.jpg
npm run probar -- pruebas/
```

Golpea las mismas rutas que la interfaz, así que prueba el camino real y
además imprime el cruce de documentos y el plan. Necesita `npm run dev`
corriendo en otra terminal.

**No ponga en `pruebas/` documentos de salud de personas reales sin su
consentimiento.** La carpeta está en el `.gitignore`, pero eso protege el
repositorio, no a la persona.

## Las tres pantallas

| | Componente | Qué hace |
|---|---|---|
| 1 | `components/Bolsa.tsx` | Captura múltiple con la cámara. Cero formularios. |
| 2 | `components/Revision.tsx` | «Revise lo que entendí». Control humano obligatorio. |
| 3 | `components/Vueltas.tsx` | «Sus vueltas de octubre». El plan del mes. |

## Dónde está la IA y dónde no

Esto es el argumento del producto, y está reflejado en la arquitectura:

| Paso | Dónde vive | IA |
|---|---|---|
| 1. Clasificar el documento | `api/leer` | **Sí** |
| 2. Extraer los campos | `api/leer` | **Sí** |
| 3. Cruzar los documentos entre sí | `api/reconciliar` | **Sí** — aquí está el valor |
| 4. Proyectar fechas | `lib/proyeccion.ts` | **No.** Es aritmética. |
| 5. Redactar las acciones | `api/reconciliar` | Sí |

El paso 4 es deliberadamente TypeScript puro. Los modelos de lenguaje son
peores que una resta para hacer restas. Calculamos las fechas primero y se
las entregamos ya hechas al modelo, que entonces solo razona sobre relaciones.

**En una frase:** la IA no hace el cálculo, hace posible el cálculo. Sin ella
los datos nunca entran al sistema, porque nadie va a teclear cuarenta campos.

## Notas de implementación

- **Adaptador de proveedor:** `lib/proveedor.ts` elige el motor según la clave
  disponible; `lib/proveedores/` tiene una implementación por motor. Las rutas
  no saben con cuál están hablando.
- **Modelos:** `claude-opus-5` y `gemini-3.6-flash` por defecto, ambos
  cambiables por variable de entorno. En Claude, extracción con
  `effort: "medium"` porque la latencia se siente, y reconciliación con
  `effort: "high"` porque es el paso que de verdad requiere razonar.
- **Gemini necesita más cuidado con el JSON:** se le declara el esquema, se le
  repite en el prompt que responda solo JSON, se le quitan los bloques de
  código si igual los pone, y se valida con el mismo Zod. Si se sale del
  esquema nos enteramos ahí y no tres pantallas después.
- **Google retira modelos sin avisar.** `gemini-2.5-flash` devuelve **404** en
  cuentas nuevas: «no longer available to new users». El error *parece* de
  llave pero no lo es — la llave autentica bien y el 404 igual sale. Si un día
  deja de leer, pruebe primero el nombre del modelo antes de sospechar de la
  clave; se cambia con `GEMINI_MODELO` sin tocar código.
- **Las llaves nuevas de Google ya no empiezan por `AIzaSy`,** sino por `AQ.`
  y son más largas. Una llave con formato «raro» no está mala.
- **El 503 es normal en la capa gratuita** («high demand»). Se reintenta y
  pasa. Está traducido en `traducirError` para que no se vea como una falla.
- **Salida estructurada:** `client.beta.messages.parse` + `betaZodOutputFormat`
  con el beta `structured-outputs-2025-11-13`. En el SDK 0.71.x los structured
  outputs viven en la ruta beta y `output_format` va en la raíz de la petición,
  no dentro de `output_config`.
- **Zod 4 es obligatorio.** El helper del SDK usa `z.toJSONSchema`, que no
  existe en Zod 3. Con Zod 3 el build falla.
- **Todo el esquema es nullable** a propósito (`lib/tipos.ts`). Preferimos que
  el modelo diga «no sé» a que invente una dosis. En salud, un `null` es un
  dato; un invento es un riesgo.
- **Las imágenes se comprimen en el navegador** a 1600 px de lado máximo antes
  de subirlas: menos espera, menos datos, menos costo por token.

## La nube: Supabase

El estado ya no vive solo en memoria. Una cuidadora no fotografía los papeles
de una sentada: los va juntando a lo largo de días. Cerrar la pestaña no puede
borrarle el trabajo.

**Qué se guarda:** documentos leídos, sus medicamentos y servicios, el plan del
mes con sus conflictos y acciones, cuáles vueltas ya hizo, y las fotos en un
bucket privado.

**Al abrir la app** se recupera lo último y aterriza donde se quedó: en la
revisión si no había plan, en las vueltas si ya lo tenía.

### Sesión anónima, no acceso abierto

No le pedimos cuenta a nadie. Una señora de 54 años que solo quiere organizar
unos papeles no va a inventarse una contraseña, y obligarla sería perder a la
usuaria antes de empezar.

Pero anónimo **no** es abierto. Cada dispositivo recibe un usuario real de
Supabase y las políticas RLS solo le dejan tocar sus propias filas. Está
verificado, no asumido: dos usuarios distintos, uno inserta, el otro no ve
nada, no puede modificarlo, y sin sesión no se ve nada.

Repita la prueba cuando cambie una política:

```bash
node scripts/probar-rls.mjs
```

**Las alertas del linter de Supabase sobre "Anonymous Access Policies" son
esperadas.** Marcan que hay políticas alcanzables por usuarios anónimos, que es
exactamente el diseño. Cada una filtra por `user_id = auth.uid()`.

**La limitación real, que no es menor:** si la usuaria borra los datos del
navegador o cambia de teléfono, pierde el acceso a lo suyo y no hay forma de
recuperarlo. Supabase permite vincular después una sesión anónima a un correo
o teléfono; eso es lo que habría que hacer antes de que esto sea un producto
de verdad.

## Cuentas

**La cuenta no va delante del producto.** Si lo primero que ve una señora de 54
años es un formulario de registro, se fue. Entra anónima, trabaja, y la cuenta
se le ofrece **cuando ya tiene un plan que perder** — en la pantalla de vueltas,
no en la puerta.

Hay dos entradas: un discreto «Entrar» arriba en el inicio, para quien vuelve
en otro teléfono, y la invitación real después de ver su plan.

### Vincular, no registrar

Cuando una usuaria anónima guarda su cuenta, **no se crea un usuario nuevo**: se
le agrega correo y contraseña al mismo. El `id` no cambia, así que sus
documentos y su plan siguen siendo suyos.

Si el id cambiara, sus papeles quedarían huérfanos. Por eso hay una prueba:

```bash
npm run probar:cuenta
```

Crea una sesión anónima, guarda un documento, vincula el correo y verifica que
el id sea el mismo y que el documento siga ahí.

### Dos límites reales, no teóricos

**El correo de confirmación pasa por el SMTP incluido de Supabase: ~2 por hora
en el plan gratuito.** La prueba de arriba devuelve 429 si lo excede. Para
probar con tres cuidadoras o para el video, hace falta SMTP propio (Resend,
SendGrid) en Authentication → Emails. No es opcional si va a haber usuarias
reales.

**Google no está habilitado todavía.** Falta un paso que requiere a una
persona: aceptar la Política de Datos de Usuario de las APIs de Google en
`console.cloud.google.com/auth/overview/create` (proyecto *My First Project*,
donde ya quedaron llenos el nombre «Relevo», el correo de asistencia y el tipo
de usuario externo). Después:

1. Google Auth Platform → Clientes → crear cliente **Aplicación web**.
2. URI de redireccionamiento autorizado:
   `https://dcxiyhmotkhufvexrxyn.supabase.co/auth/v1/callback`
3. Copiar el *Client ID* y el *Client secret* a Supabase → Authentication →
   Sign In / Providers → Google.
4. Poner `NEXT_PUBLIC_GOOGLE_LISTO=1` en `.env.local`.

Hasta el paso 4 **el botón de Google no se muestra**: un botón que siempre
falla es peor que no tenerlo, sobre todo en una demostración.

En modo prueba, Google solo deja entrar a los correos que se agreguen como
usuarios de prueba. Suficiente para el challenge; para producción hay que pasar
por verificación.

### Ajustes que quedaron encendidos en Supabase

- **Anonymous sign-ins** — para que se pueda entrar sin cuenta.
- **Manual linking** — sin esto, vincular Google a una sesión anónima falla.
- **Confirm email** — se dejó encendido a propósito. La usuaria sigue
  trabajando mientras tanto; el correo se confirma cuando abra el enlace.

## Si deja de cargar en local

Síntoma: la página da 500, o carga pero ningún botón responde. En los logs
aparece `ENOENT ... .next\server\app\page.js` o los chunks dan 404.

No es el código: es la caché de compilación de Next, que en Windows se corrompe
con cierta facilidad. Se arregla siempre igual:

```bash
npm run dev:limpio
```

**La causa más común es correr `npm run build` con `npm run dev` abierto.** Los
dos escriben en `.next` y se pisan. Para verificar tipos sin tocar la caché:

```bash
npx tsc --noEmit
```

## Límites declarados

Están en el prompt, en la interfaz y en la propuesta. No son decorativos:

- No diagnostica.
- No recomienda tratamientos ni cambia dosis.
- No redacta tutelas ni derechos de petición.
- Nada llega al plan sin pasar por la pantalla de confirmación.

## Voz

- **Usted**, nunca tú.
- Español de Medellín: «vueltas», «sacar la autorización», «se le venció».
- Prohibidas: gestionar, tramitar, optimizar, procesar, plataforma, sistema.
- **La IA no se nombra en la interfaz.** Es el motor, no el mensaje.

## Publicar

### Las rutas están cerradas

`/api/leer` y `/api/reconciliar` gastan plata en cada llamada. Publicadas sin
puerta, cualquiera con la URL le quema la cuota con `curl` — y uno se entera
cuando deja de funcionar, que por ley de Murphy es cuando el jurado la prueba.

`lib/guardia.ts` pone tres capas, de más barata a más cara:

1. **Tamaño del cuerpo**, mirando el encabezado antes de leer nada.
2. **Ritmo** por usuario y por IP, en memoria.
3. **Sesión válida de Supabase.**

Exigir sesión no le pide nada a la usuaria: la aplicación ya le abre una
anónima al entrar. Lo que bloquea es a quien llega por fuera de la aplicación.

Verificado: sin token da 401, con token inventado da 401, y `npm run probar`
—que se abre su propia sesión anónima— pasa normal.

El contador de ritmo vive en memoria, así que en serverless cada instancia
tiene el suyo. Es un freno, no una muralla; la muralla es el paso 3.

### Los 60 segundos de Vercel

El plan gratuito corta las funciones a los 60 s y devuelve un 504 pelado.
Antes pedíamos `maxDuration = 120`, que no alargaba nada: solo hacía que el
corte llegara sin aviso. Ahora las dos rutas cortan solas a los 50 s con un
mensaje que se entiende.

### Se instala sin tienda

`public/sw.js` es lo que hace que Chrome en Android ofrezca «Instalar». Sin
service worker no lo ofrece, y «se comparte por WhatsApp y se instala» deja de
ser cierto.

**Nunca guarda las rutas `/api/`.** Ahí viajan fotos de documentos de salud y
el plan de una persona; eso no se queda escondido en una caché del teléfono
que nadie sabe vaciar.

En desarrollo está apagado a propósito (`components/Offline.tsx`): un service
worker sirviendo archivos viejos mientras uno programa es una tarde perdida
buscando un bug que no existe.

Íconos: PNG de 192 y 512 más uno *maskable* con el búho al 68 %, porque
Android recorta a un círculo y si no le comería las patas.

### Lo que hay que hacer una sola vez

1. Repositorio en GitHub y conectarlo a Vercel.
2. En Vercel, las variables: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `GEMINI_API_KEY`. Las dos primeras son
   publicables; **la de Gemini no**, y por eso nunca va al repositorio.
3. En Supabase → Authentication → **URL Configuration**, agregar el dominio de
   producción a *Site URL* y *Redirect URLs*. **Si no se hace, los correos de
   confirmación llegan apuntando a `localhost` y nadie puede confirmar su
   cuenta.** Se olvida siempre.

## Lo que falta

- Recordatorios por WhatsApp.
- Paso 6: tamiz de beneficios (Ley 2456 de 2025, Colombia Mayor, copagos).
- SMTP propio: el incluido de Supabase manda ~2 correos por hora.
- Google como forma de entrar (falta aceptar la política de Google).
