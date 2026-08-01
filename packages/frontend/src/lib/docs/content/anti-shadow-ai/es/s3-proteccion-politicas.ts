import type { DocSection } from '../../../types';

export const seccionProteccionPoliticas: DocSection = {
  title: 'Protección y Políticas',
  chapters: [
    // ─── Manual 05: Configuración de políticas DLP ────────────────────────────
    {
      slug: 'configuracion-politicas-dlp',
      title: 'Políticas DLP',
      description: 'Cómo crear y gestionar políticas de prevención de pérdida de datos.',
      blocks: [
        {
          type: 'h2',
          id: 'que-es-dlp',
          text: '¿Qué es una política DLP?',
        },
        {
          type: 'p',
          text: 'Una política DLP (Data Loss Prevention) define qué acción tomará la plataforma cuando detecte un patrón de dato sensible en el contenido que un usuario intenta enviar a una herramienta de IA. Cada política se aplica a uno o varios grupos de usuarios y puede estar orientada a una aplicación específica o a todas las aplicaciones monitoreadas.',
        },
        {
          type: 'h2',
          id: 'acciones-disponibles',
          text: 'Acciones disponibles',
        },
        {
          type: 'table',
          headers: ['Acción', 'Qué hace', 'Lo que percibe el usuario'],
          rows: [
            ['BLOCK', 'Impide que el contenido se envíe.', 'Ve un aviso que le indica que el contenido fue bloqueado y el motivo.'],
            ['WARN', 'Muestra una advertencia pero permite al usuario decidir si continuar.', 'Ve una advertencia con el tipo de dato detectado. Puede elegir proceder o cancelar.'],
            ['LOG', 'Registra el evento sin intervenir en el envío.', 'No percibe ningún cambio. El evento queda registrado en el panel.'],
            ['ALLOW', 'Permite el envío explícitamente, sin registrar.', 'No percibe ningún cambio. Útil para excepciones aprobadas.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Empiece con LOG, luego avance',
          text: 'Para organizaciones que están comenzando con Onefend, se recomienda configurar primero las políticas en modo LOG durante una o dos semanas. Esto permite entender el volumen y tipo de eventos antes de activar intervenciones más restrictivas.',
        },
        {
          type: 'h2',
          id: 'crear-politica',
          text: 'Cómo crear una política',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acceda a Políticas DLP → Nueva Política',
              description: 'En el panel de administración, navegue a la sección Políticas DLP y haga clic en "Nueva Política".',
            },
            {
              title: 'Seleccione el tipo de dato a proteger',
              description: 'Elija qué categoría de dato activa la política: datos personales (PII), credenciales, información financiera, código fuente, datos de salud, entre otras.',
            },
            {
              title: 'Defina la acción',
              description: 'Seleccione qué debe hacer el sistema cuando detecte ese tipo de dato: BLOCK, WARN, LOG o ALLOW.',
            },
            {
              title: 'Seleccione la aplicación o alcance',
              description: 'Puede aplicar la política a todas las aplicaciones monitoreadas o a una aplicación específica (por ejemplo, solo ChatGPT).',
            },
            {
              title: 'Asigne la política a grupos',
              description: 'Seleccione los grupos de usuarios a los que aplicará esta política. Un usuario hereda todas las políticas de los grupos a los que pertenece.',
            },
            {
              title: 'Guarde y active',
              description: 'Una vez guardada, la política se sincroniza con los dispositivos del grupo. Los cambios pueden tardar hasta el próximo ciclo de sincronización en estar activos en cada dispositivo.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'precedencia',
          text: 'Precedencia entre políticas',
        },
        {
          type: 'p',
          text: 'Cuando un usuario pertenece a múltiples grupos con políticas distintas que aplican sobre el mismo tipo de dato y la misma aplicación, el sistema aplica la política más restrictiva. El orden de restricción es: BLOCK > WARN > LOG > ALLOW.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Las políticas más específicas tienen prioridad',
          text: 'Una política configurada para una aplicación específica tiene prioridad sobre una política general que aplica a todas las aplicaciones. Esto permite crear excepciones puntuales sin afectar la configuración global.',
        },
        {
          type: 'h2',
          id: 'editar-desactivar',
          text: 'Editar y desactivar políticas',
        },
        {
          type: 'p',
          text: 'Puede modificar o desactivar una política existente en cualquier momento desde la lista de Políticas DLP. Las políticas desactivadas se conservan en el sistema y pueden volver a activarse. Las políticas eliminadas no pueden recuperarse.',
        },
      ],
    },

    // ─── Manual 06: Gestión de aplicaciones ───────────────────────────────────
    {
      slug: 'gestion-aplicaciones',
      title: 'Gestión de aplicaciones',
      description: 'Cómo administrar el catálogo de aplicaciones de IA detectadas en su organización.',
      blocks: [
        {
          type: 'h2',
          id: 'catalogo-aplicaciones',
          text: 'El catálogo de aplicaciones',
        },
        {
          type: 'p',
          text: 'Onefend mantiene un catálogo de todas las herramientas de IA que han sido utilizadas por su organización. Este catálogo se actualiza automáticamente a medida que la extensión detecta nuevas plataformas a las que acceden sus empleados.',
        },
        {
          type: 'p',
          text: 'Cada aplicación en el catálogo tiene un puntaje de riesgo y un estado de gestión que determina cómo la plataforma la trata.',
        },
        {
          type: 'h2',
          id: 'estado-aplicaciones',
          text: 'Estados de una aplicación',
        },
        {
          type: 'table',
          headers: ['Estado', 'Significado'],
          rows: [
            ['Sin clasificar', 'Aplicación detectada automáticamente que aún no ha sido revisada por el administrador.'],
            ['Aprobada', 'La organización permite su uso. Las políticas DLP aplican normalmente.'],
            ['En observación', 'El uso está permitido pero cada acceso genera un evento LOG para revisión.'],
            ['Bloqueada', 'La extensión impide el acceso a esta aplicación para todos los grupos donde la política de bloqueo esté activa.'],
          ],
        },
        {
          type: 'h2',
          id: 'agregar-aplicacion',
          text: 'Agregar una aplicación manualmente',
        },
        {
          type: 'p',
          text: 'Además de la detección automática, puede agregar manualmente herramientas de IA al catálogo para configurarlas antes de que sus empleados las usen:',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Vaya a Aplicaciones → Nueva Aplicación',
              description: 'Acceda a la sección Aplicaciones en el panel y haga clic en "Nueva Aplicación".',
            },
            {
              title: 'Ingrese la URL de la herramienta',
              description: 'Ingrese el dominio principal de la herramienta de IA a agregar (por ejemplo: gemini.google.com).',
            },
            {
              title: 'Asigne nombre, categoría y puntaje de riesgo',
              description: 'Complete la información descriptiva de la aplicación para facilitar su identificación en reportes y listas de eventos.',
            },
            {
              title: 'Defina el estado inicial',
              description: 'Seleccione si la aplicación comienza como Aprobada, En observación o Bloqueada.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'puntaje-riesgo',
          text: 'Puntaje de riesgo de las aplicaciones',
        },
        {
          type: 'p',
          text: 'Cada aplicación tiene un puntaje de riesgo del 1 al 10. Onefend asigna un puntaje inicial basado en el tipo de plataforma, su política de privacidad pública y sus condiciones de uso. El administrador puede ajustar este puntaje según los criterios de su organización.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'El puntaje de riesgo es referencial',
          text: 'El puntaje de riesgo no bloquea ni permite automáticamente el uso de una aplicación. Es un indicador informativo que ayuda a priorizar la revisión y a filtrar en reportes y dashboards.',
        },
      ],
    },

    // ─── Manual 07: Patrones de detección ─────────────────────────────────────
    {
      slug: 'patrones-deteccion',
      title: 'Patrones de detección',
      description: 'Qué tipos de datos detecta Onefend y cómo configurar patrones personalizados.',
      blocks: [
        {
          type: 'h2',
          id: 'patrones-integrados',
          text: 'Patrones integrados de Onefend',
        },
        {
          type: 'p',
          text: 'Onefend incluye un conjunto de patrones de detección predefinidos organizados por categoría. Estos patrones se usan para identificar datos sensibles en el contenido que los usuarios envían a herramientas de IA externas.',
        },
        {
          type: 'table',
          headers: ['Categoría', 'Ejemplos de datos detectados'],
          rows: [
            ['Datos personales (PII)', 'Nombres, apellidos, DNI, número de pasaporte, fecha de nacimiento, dirección postal.'],
            ['Información de contacto', 'Emails corporativos, números de teléfono, direcciones IP.'],
            ['Información financiera', 'Números de tarjeta de crédito/débito, IBN/CBU, CVC.'],
            ['Credenciales y secretos', 'Contraseñas, claves de API, tokens de autenticación, cadenas de conexión.'],
            ['Código fuente e infraestructura', 'Fragmentos de código con credenciales embebidas, configuraciones de entornos.'],
            ['Datos de salud', 'Diagnósticos, números de historia clínica, medicamentos recetados.'],
          ],
        },
        {
          type: 'h2',
          id: 'patrones-personalizados',
          text: 'Patrones personalizados',
        },
        {
          type: 'p',
          text: 'Además de los patrones integrados, puede crear patrones propios adaptados a las necesidades específicas de su organización. Por ejemplo, detectar números de cliente internos, códigos de proyecto bajo acuerdo de confidencialidad o identificadores de expedientes.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Vaya a Políticas → Patrones → Nuevo Patrón',
              description: 'Acceda a la sección Patrones en el panel y cree un nuevo patrón personalizado.',
            },
            {
              title: 'Defina el nombre y la descripción',
              description: 'Asigne un nombre descriptivo que facilite identificar el patrón en la lista de políticas y en los eventos.',
            },
            {
              title: 'Configure el criterio de detección',
              description: 'Puede usar palabras clave, frases exactas o, para casos más complejos, expresiones regulares. El panel incluye un campo de prueba para verificar que el patrón detecta lo que se espera antes de activarlo.',
            },
            {
              title: 'Defina el modo de intervención',
              description: 'Seleccione si el patrón genera un bloqueo, una advertencia o solo un registro cuando es detectado.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Pruebe siempre antes de activar',
          text: 'Use el campo de prueba del editor de patrones para verificar que el patrón detecta los casos que espera y no genera falsos positivos con contenido habitual de sus empleados.',
        },
        {
          type: 'h2',
          id: 'modos-intervencion',
          text: 'Modos de intervención por patrón',
        },
        {
          type: 'p',
          text: 'Cada patrón puede configurarse en modo de bloqueo o en modo de observación. En modo de observación, la extensión registra los eventos que coinciden con el patrón pero no interviene en el flujo del usuario. En modo de bloqueo, el envío se interrumpe.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Los patrones personalizados se combinan con las políticas DLP',
          text: 'Un patrón personalizado solo tiene efecto cuando está asociado a una política DLP activa. Sin una política que lo referencie, el patrón existe en el sistema pero no se aplica.',
        },
      ],
    },

    // ─── Manual 08: Clasificación de riesgo ───────────────────────────────────
    {
      slug: 'clasificacion-riesgo',
      title: 'Clasificación de riesgo',
      description: 'Cómo interpreta y gestiona los puntajes de riesgo en eventos y aplicaciones.',
      blocks: [
        {
          type: 'h2',
          id: 'que-es-riesgo',
          text: 'El sistema de clasificación de riesgo',
        },
        {
          type: 'p',
          text: 'Onefend asigna un nivel de riesgo a cada evento registrado. Este nivel indica la sensibilidad potencial del contenido involucrado y ayuda a priorizar la revisión de incidentes en el panel de auditoría.',
        },
        {
          type: 'table',
          headers: ['Nivel', 'Descripción', 'Ejemplos típicos'],
          rows: [
            ['HIGH', 'Contenido con datos críticos que requieren atención inmediata.', 'Credenciales, datos financieros completos, información de salud, volúmenes altos de PII.'],
            ['MEDIUM', 'Contenido con datos potencialmente sensibles que ameritan revisión.', 'Email corporativo individual, nombre completo, número de teléfono.'],
            ['LOW', 'Actividad normal sin datos sensibles identificados.', 'Consultas genéricas, resúmenes de texto sin información personal.'],
          ],
        },
        {
          type: 'h2',
          id: 'uso-del-riesgo',
          text: 'Para qué sirve el nivel de riesgo',
        },
        {
          type: 'list',
          items: [
            'Filtrar eventos en el panel de auditoría para priorizar la revisión.',
            'Configurar alertas que se disparen solo cuando el riesgo supera un umbral definido.',
            'Generar reportes segmentados por nivel de riesgo para presentar a directivos.',
            'Identificar usuarios o aplicaciones con mayor concentración de eventos de alto riesgo.',
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'El nivel de riesgo es informativo',
          text: 'El nivel de riesgo no determina automáticamente si un evento se bloquea o permite. Esa decisión la toman las políticas DLP. El nivel de riesgo es un indicador que ayuda al administrador a interpretar los eventos.',
        },
        {
          type: 'h2',
          id: 'ajustar-riesgo',
          text: 'Ajustar el puntaje de riesgo de aplicaciones',
        },
        {
          type: 'p',
          text: 'El puntaje de riesgo asignado a cada aplicación del catálogo puede modificarse por el administrador. Si su organización considera que una herramienta es de mayor o menor riesgo que el valor predeterminado, puede ajustarlo desde la ficha de la aplicación en Aplicaciones → detalle de la aplicación.',
        },
      ],
    },

    // ─── Manual 14: Configuración global ──────────────────────────────────────
    {
      slug: 'configuracion-global',
      title: 'Configuración global',
      description: 'Parámetros generales de la organización: retención, whitelist, zona horaria y más.',
      blocks: [
        {
          type: 'h2',
          id: 'parametros-organizacion',
          text: 'Parámetros de la organización',
        },
        {
          type: 'p',
          text: 'La sección Configuración Global contiene los parámetros que afectan a toda la organización. Solo los administradores pueden modificarlos. Los cambios en esta sección tienen efecto inmediato sobre el comportamiento de la plataforma.',
        },
        {
          type: 'h2',
          id: 'retencion-datos',
          text: 'Retención de datos',
        },
        {
          type: 'p',
          text: 'Define por cuánto tiempo la plataforma conserva los diferentes tipos de registros antes de eliminarlos automáticamente:',
        },
        {
          type: 'table',
          headers: ['Tipo de dato', 'Retención por defecto', 'Configurable'],
          rows: [
            ['Eventos de conversación', '30 días', 'Sí'],
            ['Logs de auditoría administrativa', '90 días', 'Sí'],
            ['Datos de dispositivos', 'Mientras el dispositivo esté activo', 'No'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Los datos eliminados no se pueden recuperar',
          text: 'Una vez que un registro supera el período de retención, se elimina de forma permanente. Si necesita conservar eventos específicos por más tiempo, expórtelos antes de que venzan.',
        },
        {
          type: 'h2',
          id: 'whitelist-dominos',
          text: 'Lista de dominios en whitelist',
        },
        {
          type: 'p',
          text: 'La whitelist de dominios permite indicarle a la extensión que ciertos dominios no deben ser monitoreados. Esto es útil para herramientas internas que el equipo utiliza y que no deben generar eventos en el panel.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Use la whitelist con criterio',
          text: 'Agregar un dominio a la whitelist significa que ninguna actividad en ese sitio será registrada ni analizada. Hágalo solo con herramientas internas de confianza, no con plataformas de IA externas.',
        },
        {
          type: 'h2',
          id: 'zona-horaria',
          text: 'Zona horaria y configuración regional',
        },
        {
          type: 'p',
          text: 'La zona horaria afecta la visualización de los timestamps en eventos, logs y reportes. Se recomienda configurarla con la zona horaria principal de operación de la organización. Si la organización opera en múltiples zonas horarias, los eventos se muestran en la configurada aquí pero los datos se almacenan en UTC.',
        },
        {
          type: 'h2',
          id: 'sincronizacion-intervalo',
          text: 'Intervalo de sincronización',
        },
        {
          type: 'p',
          text: 'Define con qué frecuencia las extensiones instaladas en los dispositivos se conectan al backend para recibir actualizaciones de políticas y configuración. Un intervalo más corto garantiza que los cambios llegan antes a los dispositivos, pero genera más tráfico de red. El valor por defecto es adecuado para la mayoría de las organizaciones.',
        },
      ],
    },

    // ─── Manual 15: Gestión de políticas ──────────────────────────────────────
    {
      slug: 'gestion-politicas',
      title: 'Gestión de políticas avanzada',
      description: 'Organización, priorización y estrategia de políticas para entornos complejos.',
      blocks: [
        {
          type: 'h2',
          id: 'vision-general-politicas',
          text: 'Visión general del sistema de políticas',
        },
        {
          type: 'p',
          text: 'El sistema de políticas de Onefend es flexible y está diseñado para adaptarse a organizaciones de cualquier tamaño y complejidad. Puede tener desde una sola política global hasta decenas de políticas específicas por grupo, por aplicación y por tipo de dato.',
        },
        {
          type: 'h2',
          id: 'estrategia-politicas',
          text: 'Estrategia recomendada de configuración',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Defina una política base global',
              description: 'Cree una política en modo LOG que aplique a todos los usuarios y todas las aplicaciones. Esto genera visibilidad sin interrumpir el trabajo desde el primer día.',
            },
            {
              title: 'Identifique los grupos de mayor riesgo',
              description: 'Analice los eventos registrados en las primeras semanas para identificar qué grupos de usuarios o qué aplicaciones concentran más actividad sensible.',
            },
            {
              title: 'Agregue políticas específicas por grupo',
              description: 'Para los grupos de mayor riesgo (finanzas, legal, RRHH), configure políticas más restrictivas (WARN o BLOCK) para los tipos de dato más críticos.',
            },
            {
              title: 'Refine de forma iterativa',
              description: 'Revise periódicamente el volumen de eventos y ajuste las políticas según los resultados. Active el modo BLOCK solo cuando tenga confianza en que no generará falsos positivos significativos.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'prioridad-resolucion',
          text: 'Resolución de conflictos entre políticas',
        },
        {
          type: 'p',
          text: 'Cuando múltiples políticas aplican sobre el mismo evento (mismo usuario, misma aplicación, mismo tipo de dato), el sistema resuelve el conflicto de la siguiente manera:',
        },
        {
          type: 'list',
          items: [
            'Se aplica la acción más restrictiva entre todas las políticas que aplican.',
            'Las políticas específicas a una aplicación tienen mayor prioridad que las políticas globales.',
            'Las políticas asignadas directamente al usuario tienen mayor prioridad que las heredadas por grupo.',
          ],
        },
        {
          type: 'h2',
          id: 'politicas-emergencia',
          text: 'Políticas de emergencia',
        },
        {
          type: 'p',
          text: 'Ante una situación crítica (incidente de seguridad, filtración sospechosa), puede crear una política de bloqueo de emergencia que aplique de forma inmediata a todos los usuarios de un grupo. Combine esto con una sincronización forzada de dispositivos para el efecto más rápido posible.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Las políticas de bloqueo masivo afectan la productividad',
          text: 'Un bloqueo total de todas las herramientas de IA para toda la organización interrumpe el flujo de trabajo de los empleados. Reserve esta acción para situaciones que realmente lo justifiquen y comuníquela a los equipos afectados.',
        },
      ],
    },
  ],
};
