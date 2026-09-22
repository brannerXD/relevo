import type { Metadata } from "next";
import { Contacto, Legal } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Términos de uso · Relevo",
  description: "Qué hace Relevo, qué no hace, y bajo qué condiciones se usa.",
};

export default function Terminos() {
  return (
    <Legal titulo="Términos de uso" actualizado="22 de septiembre de 2026">
      <p>
        Estas son las reglas de usar Relevo. Son cortas porque Relevo hace una sola
        cosa.
      </p>

      <h2>1. Qué es Relevo</h2>
      <p>
        Una herramienta que lee fotos de sus papeles médicos —fórmulas, órdenes,
        autorizaciones, carnés— y le arma un plan del mes con fechas: qué se le
        vence, qué se le acaba, qué tiene que ir a sacar.
      </p>
      <p>
        <strong>Es un prototipo</strong>, hecho para el reto #AIForImpact de NAUFest
        2026. Puede cambiar, puede fallar y puede dejar de estar disponible sin
        aviso. Es gratis y se ofrece tal como está.
      </p>

      <h2>2. Lo que Relevo no es</h2>
      <ul>
        <li>
          <strong>No es un médico.</strong> No diagnostica, no recomienda
          tratamientos y no cambia dosis.
        </li>
        <li>
          <strong>No es su EPS</strong> ni habla con ella. No pide citas, no saca
          autorizaciones y no hace ninguna vuelta por usted: le dice cuáles hay que
          hacer.
        </li>
        <li>
          <strong>No es un abogado.</strong> No redacta tutelas ni derechos de
          petición.
        </li>
        <li>
          <strong>No es un archivo oficial.</strong> Guarde siempre sus papeles
          originales.
        </li>
      </ul>

      <h2>3. Relevo se equivoca</h2>
      <p>
        Lee letra de médico sobre papel arrugado. A veces se equivoca en una dosis,
        en una fecha o en un nombre.
      </p>
      <div className="aviso">
        <p style={{ marginBottom: 0 }}>
          Por eso Relevo <strong>siempre le muestra lo que entendió antes de armar
          el plan</strong>, y esa pantalla no se puede saltar. Revísela. Si algo no
          le cuadra, corríjalo ahí o pregúntele a su médico o a su EPS antes de
          actuar. <strong>La decisión final siempre es suya.</strong>
        </p>
      </div>
      <p>
        Cuando Relevo no logra leer algo, se lo dice. Preferimos que le diga{" "}
        <em>no entendí</em> a que le invente una dosis.
      </p>

      <h2>4. Su responsabilidad</h2>
      <ul>
        <li>
          Subir únicamente papeles suyos o de una persona que usted cuida{" "}
          <strong>y que le dio permiso</strong>, o de quien usted es representante.
          Esto está explicado en la{" "}
          <a href="/privacidad">política de tratamiento de datos</a>.
        </li>
        <li>Revisar lo que Relevo entendió antes de confiar en el plan.</li>
        <li>
          No usar Relevo para molestar a otras personas, ni para subir documentos
          que no le corresponden.
        </li>
        <li>No intentar tumbar el servicio ni entrar a los datos de otra persona.</li>
      </ul>

      <h2>5. Su cuenta</h2>
      <p>
        Puede usar Relevo sin cuenta. Si decide guardar una,{" "}
        <strong>la contraseña es suya y solo suya</strong>: no se la pedimos nunca,
        por ningún medio. Si alguien se la pide diciendo que es de Relevo, no es de
        Relevo.
      </p>
      <p>
        Si usa Relevo sin cuenta y borra los datos de su navegador, pierde lo que
        llevaba y no se puede recuperar.
      </p>

      <h2>6. Hasta dónde respondemos</h2>
      <p>
        Relevo es gratuito y está en desarrollo. Hacemos lo posible para que
        funcione bien, pero <strong>no podemos responder por decisiones de salud o
        de dinero que usted tome basándose solo en lo que le muestre Relevo</strong>.
        Para eso está la pantalla de revisión, y para eso está su médico.
      </p>
      <p>
        Tampoco respondemos por caídas, fallas o pérdidas de datos causadas por los
        proveedores de los que depende Relevo.
      </p>

      <h2>7. Suspensión</h2>
      <p>
        Podemos suspender el acceso de quien use Relevo para hacerle daño a otra
        persona o para tumbar el servicio.
      </p>

      <h2>8. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República de Colombia.
      </p>

      <h2>9. Dudas</h2>
      <p>
        <Contacto />
      </p>
    </Legal>
  );
}
