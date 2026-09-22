import type { Metadata } from "next";
import { Contacto, Legal } from "@/components/Legal";
import { CORREO_CONTACTO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacidad · Relevo",
  description: "Qué datos guarda Relevo, para qué, y qué puede hacer usted con ellos.",
};

export default function Privacidad() {
  return (
    <Legal titulo="Política de tratamiento de datos" actualizado="22 de septiembre de 2026">
      <p>
        Relevo trabaja con fotos de documentos médicos. En Colombia eso es un{" "}
        <strong>dato sensible</strong>, y casi siempre no es suyo sino de la persona
        que usted cuida. Por eso esta política está escrita para que se entienda,
        no para que nadie la firme sin leerla.
      </p>

      <div className="aviso">
        <p style={{ marginBottom: 0 }}>
          <strong>Relevo es un prototipo.</strong> Se construyó para el reto
          #AIForImpact de NAUFest 2026 y todavía no es un producto terminado. No lo
          use como su único lugar para guardar papeles importantes: conserve los
          originales.
        </p>
      </div>

      <h2>1. Quién responde por sus datos</h2>
      <p>
        El equipo de Relevo es el responsable del tratamiento. <Contacto />
      </p>

      <h2>2. Qué guardamos</h2>
      <ul>
        <li>
          <strong>Las fotos</strong> de los documentos que usted toma.
        </li>
        <li>
          <strong>Lo que se entendió de cada foto:</strong> entidad, fechas,
          medicamentos, dosis, cantidades, servicios autorizados.
        </li>
        <li>
          <strong>El plan del mes</strong> que se arma con eso, y cuáles vueltas
          usted ya marcó como hechas.
        </li>
        <li>
          <strong>Un identificador anónimo</strong> de su dispositivo, que es lo que
          permite devolverle lo suyo cuando vuelve a abrir.
        </li>
        <li>
          <strong>Su correo</strong>, únicamente si usted decide guardar una cuenta.
          No se lo pedimos para empezar a usar Relevo.
        </li>
      </ul>
      <p>
        No le pedimos cédula, ni teléfono, ni dirección, ni datos de pago. Relevo no
        cobra.
      </p>

      <h2>3. Para qué</h2>
      <p>
        Para una sola cosa: leer sus papeles, cruzarlos entre sí y armarle un plan
        del mes con fechas. <strong>No vendemos sus datos, no los compartimos con
        anunciantes, y no los usamos para perfilar a nadie.</strong>
      </p>

      <h2>4. A dónde van sus fotos</h2>
      <p>
        Esto es lo más importante de toda esta página, así que va sin rodeos.
      </p>
      <ul>
        <li>
          <strong>Google.</strong> Para leer un documento, la foto se envía a un
          modelo de inteligencia artificial de Google (Gemini). Google la recibe y
          la lee para devolvernos el texto.
        </li>
        <li>
          <strong>Supabase.</strong> Sus fotos y sus datos quedan guardados en
          servidores de Supabase, en un espacio privado.
        </li>
        <li>
          <strong>Vercel.</strong> La página se sirve desde Vercel.
        </li>
      </ul>
      <p>
        Los tres son proveedores fuera de Colombia, así que{" "}
        <strong>sus datos salen del país</strong>. Al usar Relevo usted autoriza esa
        transferencia internacional. Si eso no le parece, no suba fotos.
      </p>

      <h2>5. Papeles de otra persona</h2>
      <p>
        Casi nadie usa Relevo para sus propios papeles: los usa para los de su mamá,
        su papá, su hijo. Esa persona tiene derechos sobre sus datos de salud aunque
        no sea quien abre la aplicación.
      </p>
      <div className="aviso">
        <p style={{ marginBottom: 0 }}>
          Al subir documentos de otra persona, usted declara que{" "}
          <strong>tiene su permiso</strong>, o que es su representante legal, o que
          esa persona no está en condiciones de darlo y usted responde por su
          cuidado. Nosotros no podemos verificarlo: confiamos en usted, y por eso se
          lo decimos de frente.
        </p>
      </div>

      <h2>6. Cuánto tiempo</h2>
      <p>
        Mientras usted quiera. Dentro de Relevo puede borrar un documento suelto o
        borrar todo, y cuando borra todo{" "}
        <strong>también se borran las fotos guardadas</strong>, no solo el texto.
      </p>
      <p>
        Si usa Relevo sin cuenta y limpia los datos de su navegador o cambia de
        teléfono, pierde el acceso a lo suyo y{" "}
        <strong>no hay forma de devolvérselo</strong>, porque no tenemos ningún otro
        dato para identificarla. Eso es justamente lo que evita guardar una cuenta.
      </p>

      <h2>7. Cómo está protegido</h2>
      <ul>
        <li>
          Todo viaja cifrado entre su teléfono y los servidores.
        </li>
        <li>
          Las fotos quedan en un espacio privado, no en una dirección pública que
          alguien pueda adivinar.
        </li>
        <li>
          La base de datos tiene reglas que limitan cada fila a su dueño. Otra
          persona usando Relevo no alcanza sus documentos, aunque lo intente a
          propósito. Está probado, no asumido.
        </li>
      </ul>
      <p>
        Nada de esto es una garantía absoluta. Ningún servicio puede prometerle eso
        de verdad.
      </p>

      <h2>8. Sus derechos</h2>
      <p>
        La Ley 1581 de 2012 y el Decreto 1377 de 2013 le dan derecho a:
      </p>
      <ul>
        <li>Saber qué datos suyos tenemos y para qué.</li>
        <li>Pedir que los corrijamos si están mal.</li>
        <li>Pedir que los borremos.</li>
        <li>Retirar el permiso que dio.</li>
        <li>
          Quejarse ante la Superintendencia de Industria y Comercio si considera que
          no le cumplimos.
        </li>
      </ul>
      <p>
        Lo de corregir y borrar lo puede hacer usted mismo dentro de Relevo, sin
        pedirle permiso a nadie. Para lo demás, <Contacto />
      </p>
      <p>
        Como los datos de salud son sensibles,{" "}
        <strong>usted no está obligado a autorizar su tratamiento</strong>. Puede
        usar Relevo solo con el botón de ver un ejemplo, sin subir nada real.
      </p>

      <h2>9. Lo que Relevo no hace</h2>
      <ul>
        <li>No diagnostica.</li>
        <li>No recomienda tratamientos ni cambia dosis.</li>
        <li>No reemplaza a su médico ni a su EPS.</li>
        <li>No hace trámites por usted ante ninguna entidad.</li>
      </ul>
      <p>
        Relevo puede equivocarse leyendo un papel. Por eso siempre le muestra lo que
        entendió antes de armar el plan, y por eso{" "}
        <strong>esa pantalla de revisión no se puede saltar</strong>.
      </p>

      <h2>10. Cambios</h2>
      <p>
        Si esta política cambia, cambia la fecha de arriba. Mientras Relevo siga
        siendo un prototipo, puede cambiar seguido.
      </p>

      {!CORREO_CONTACTO && (
        <div className="aviso">
          <p style={{ marginBottom: 0 }}>
            <strong>Nota para el equipo:</strong> falta definir el correo de contacto.
            Sin un canal real, los derechos del punto 8 no se pueden ejercer y esta
            política queda incompleta frente a la Ley 1581.
          </p>
        </div>
      )}
    </Legal>
  );
}
