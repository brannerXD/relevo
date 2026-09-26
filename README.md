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

### El modelo importa más que el proveedor

La capa gratuita de Gemini **no tiene un límite: tiene uno por modelo**
(`GenerateRequestsPerDayPerProjectPerModel`). Y la diferencia entre modelos es
absurda. Números del panel de la propia cuenta
(`aistudio.google.com/rate-limit`), no de la documentación:

| Modelo | RPM | **RPD** | Lectura de la fórmula de prueba |
|---|---|---|---|
| **gemini-3.5-flash-lite** | 15 | **500** | correcta, **2.4 s** |
| gemini-3.1-flash-lite | 15 | 500 | (no probado) |
| gemini-3.6-flash | 5 | **20** | correcta, 12–17 s |
| 3.5 / 3.7 / 3.8 Flash, 2.5 Flash | 5 | 20 | — |

Arrancamos con `gemini-3.6-flash` y **20 peticiones al día**. Como cada sesión
gasta al menos dos —una por foto más una para el plan—, el techo real eran
**diez documentos diarios entre todo el mundo**: no alcanzaba ni para probar
con tres personas.

`flash-lite` da **veinticinco veces** esa cuota, el triple de ritmo, es cinco
veces más rápido y extrajo exactamente lo mismo. Por eso es el predeterminado.

**La lección, que costó una tarde:** cuando una capa gratuita se queda corta,
mire primero si hay otro modelo del mismo proveedor antes de salir a buscar
otro proveedor. La cuota es por modelo.

Aun así los motores van **en cadena**: 500 al día es cómodo, no infinito.

### Tres motores, una interfaz, en fila

Relevo no depende de un proveedor. Con varias claves puestas, los prueba en
orden hasta que uno responda (`lib/proveedores/cadena.ts`):

| Orden | Motor | Clave | Por qué ahí |
|---|---|---|---|
| 1 | **Claude** | `ANTHROPIC_API_KEY` | El que mejor lee letra a mano. Requiere saldo. |
| 2 | **Gemini** | `GEMINI_API_KEY` | Flash Lite: 500 al día, rápido y gratis. |
| 3 | **Groq** | `GROQ_API_KEY` | Respaldo: ~1.000 al día y muy rápido, pero el más flojo leyendo. |

Groq va de último **a propósito**. Que conteste él es mejor que un error, pero
peor que los otros dos: no es un empate. Y va como red de seguridad porque su
cuota diaria es unas cincuenta veces la de Gemini.

Lo que hace caer al siguiente motor: 429, 503, 5xx, fallos de red, claves
inválidas, y respuestas que no cumplen el esquema. Lo que **no**: un 400 por
una imagen corrupta, que va a fallar igual en todos.

**Por qué esto es seguro en una aplicación de salud:** el esquema es todo
nullable y la pantalla de revisión es obligatoria. Un modelo flojo devuelve
vacíos, no inventos, y la persona lo ve antes de que entre al plan. Si algún
día se quita esa pantalla, la cadena deja de ser segura.

Verificado con una clave de Claude inválida a propósito:

```
[relevo:leer] Claude no pudo (401). Pasando al siguiente.
[relevo:leer] respondió el respaldo Gemini (gemini-3.6-flash)
```

`RELEVO_PROVEEDOR=gemini` fuerza uno solo y apaga la cadena, que es como se
comparan calidad y costo sobre las mismas fotos.

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

## El búho

Ocho poses en `public/buho/`: `saluda`, `lee`, `compara`, `listo`, `alerta`,
`confundido`, `celebra`, `espera`. Generadas contra las originales como
referencia para que sea el mismo personaje y no cambie de forma entre
pantallas.

**El movimiento va en dos capas**, y ahí está toda la diferencia entre un
muñeco y un animalito:

- `.buho` flota lento, siempre, con el mismo ciclo.
- `.buho__cuerpo` hace lo que pide el ánimo, con otra duración.

Las duraciones son números feos a propósito (4.5s, 2.6s, 6.7s). Si fueran
múltiplos entre sí volverían a coincidir y se le vería el bucle a los diez
segundos. Como no coinciden, el movimiento no se repite a la vista.

Detalles que valen más de lo que cuestan:

- **Sombrita en el piso** (`sombra`) donde el búho es grande. Sin ella no
  flota: levita.
- **Reacciona al toque.** No hace nada útil y por eso vale: la usuaria
  descubre que responde, y algo que responde se siente menos como un
  formulario.
- **La pantalla de espera cambia sola.** La lectura puede pasar de veinte
  segundos; el búho alterna de pose y el texto va rotando. No acelera nada,
  pero una pantalla quieta ese rato se siente colgada y la gente recarga.
- **`alerta` tiembla una vez y después solo vigila.** Un temblor en bucle no
  es urgencia, es ansiedad, y esta gente ya tiene.

Todo se apaga con `prefers-reduced-motion`.

### El ícono de pestaña

Solo la cara, sin fondo (`lib/marca.ts`). A 16 píxeles un búho de cuerpo
entero es una mancha: la cabeza queda del tamaño de una arveja y los ojos, que
son lo único reconocible, desaparecen. Recortado a la cara, los ojos ocupan
media pestaña.

Sin fondo para que se vea igual en una pestaña clara que en una oscura. La
única versión con fondo es la del ícono *maskable* de Android, que se pide con
`/icono?fondo=1` — ahí el sistema recorta a un círculo y un PNG transparente
deja un hueco.

## Accesibilidad

No es un adorno en esta aplicación: la usuaria tiene 54 años y la usa de noche,
cansada. Auditado midiendo en el DOM, no a ojo.

**Contraste.** Dos tokens no pasaban y se corrigieron:

| | Antes | Ahora |
|---|---|---|
| Fecha de la vuelta (`pronto` sobre blanco) | **2.93** | **5.00** |
| Botón principal (blanco sobre `barro`) | **3.99** | **5.23** |

El de la fecha era el peor: no alcanzaba ni el mínimo de texto grande, y es el
dato más importante de la pantalla.

`--color-barro` y `--color-pronto` **se quedan igual** para lo decorativo —el
puntico de color, la barra de progreso, el borde—, donde el mínimo es 3 y sí lo
cumplen. Para texto y para fondo de botón van `--color-pronto-texto` y
`--color-barro-boton`. Separar el token de texto del decorativo evita tener que
escoger entre accesibilidad y marca.

Medición: **37 textos en el plan, cero fallas.** Ojo al medir — un fondo con 5 %
de opacidad **no** es ese color; hay que componer el alfa contra lo que tiene
debajo. Sin eso salen fallas donde no las hay.

**Objetivos de toque.** El ✕ de quitar un documento medía 31 px de ancho y es
una acción que borra: difícil de acertar a propósito y fácil de darle sin
querer. Ahora 44×44, como los enlaces del pie.

Los enlaces «términos de uso» y «política de datos» de la pantalla de cuenta se
dejan como están: van **dentro de una frase** y WCAG 2.5.8 exceptúa los enlaces
en línea. Agrandarlos rompería el párrafo.

**Foco de teclado.** No había ninguna regla: quedaba el anillo por defecto de
Chrome, de menos de un píxel. Ahora 3 px en verde monte con separación, con
`:focus-visible` para que salga con Tab y no cada vez que se toca con el dedo.

**Lo que ya estaba bien:** `lang="es-CO"`, ningún campo sin etiqueta, ninguna
imagen sin `alt`, jerarquía de encabezados correcta, sin desborde horizontal a
375 px, y todo el movimiento se apaga con `prefers-reduced-motion`.

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

## Lo legal

`/privacidad` y `/terminos`. No son relleno: Relevo mueve **datos de salud**,
que en Colombia son dato sensible (Ley 1581 de 2012), y casi siempre son de un
tercero — la mamá, el papá — que no es quien abre la aplicación.

Tres cosas que la política dice de frente y que suelen omitirse:

- **Las fotos salen del país.** Van a Google para que las lea, y quedan
  guardadas en Supabase. Eso es transferencia internacional y hay que
  declararlo, no esconderlo.
- **La cadena de consentimiento.** Quien sube los papeles declara que tiene
  permiso de la persona dueña de esos datos. No lo podemos verificar; por eso
  se dice explícitamente en vez de asumirlo.
- **Se nombra la IA.** En la interfaz no se nombra nunca, por decisión de
  producto. En la política **sí**, porque ahí manda la transparencia legal y no
  la voz de marca.

El aviso de aceptación está en la pantalla de cuenta, que es el momento en que
la usuaria entrega un correo. Enterrarlo en un pie de página sería cumplir la
forma y no el fondo.

**El correo de contacto** está en `lib/legal.ts` y es el canal por el que una
persona ejerce los derechos de la Ley 1581. **Hay que revisar ese buzón.** Si
nadie lo lee, esos derechos son papel mojado y la política no cumple.

Esto está escrito para ser honesto y útil, no para ser blindado. Si Relevo deja
de ser un prototipo, que lo revise un abogado.

## Contraseñas

El mínimo es **8 caracteres**, y está en dos sitios que tienen que coincidir:
Supabase (Authentication → Sign In / Providers → Email) y `MINIMO_CLAVE` en
`components/Cuenta.tsx`. Si el de la interfaz fuera menor, la usuaria escribiría
algo que la pantalla acepta y el servidor rechaza.

Al **entrar** no se exige el mínimo: quien creó su cuenta cuando el mínimo era 6
sigue pudiendo entrar. Cambiar la regla no puede dejar a alguien por fuera de lo
suyo.

La protección contra contraseñas filtradas (HaveIBeenPwned) **solo existe en el
plan Pro** de Supabase, así que el aviso de seguridad sobre eso va a seguir
apareciendo mientras el proyecto esté en el plan gratuito.

## Lo que falta

- Recordatorios por WhatsApp.
- Paso 6: tamiz de beneficios (Ley 2456 de 2025, Colombia Mayor, copagos).
- SMTP propio: el incluido de Supabase manda ~2 correos por hora.
- Google como forma de entrar (falta aceptar la política de Google).
