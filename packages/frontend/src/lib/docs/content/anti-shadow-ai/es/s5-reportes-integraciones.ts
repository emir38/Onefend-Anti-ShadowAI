import type { DocSection } from '../../../types';

export const seccionReportesIntegraciones: DocSection = {
  title: 'Reportes e Integraciones',
  chapters: [
    // ─── Manual 16: Integraciones ─────────────────────────────────────────────
    {
      slug: 'integraciones',
      title: 'Integraciones externas',
      description: 'Cómo conectar Onefend con herramientas de comunicación y sistemas SIEM.',
      blocks: [
        {
          type: 'h2',
          id: 'integraciones-disponibles',
          text: 'Integraciones disponibles',
        },
        {
          type: 'p',
          text: 'Onefend puede enviar alertas y notificaciones a herramientas externas cuando se detectan eventos relevantes. Esto permite que su equipo de seguridad sea notificado en los canales que ya usa, sin necesidad de monitorear el panel constantemente.',
        },
        {
          type: 'table',
          headers: ['Integración', 'Tipo', 'Para qué sirve'],
          rows: [
            ['Slack', 'Notificaciones', 'Recibir alertas de eventos de alto riesgo en un canal de Slack.'],
            ['Microsoft Teams', 'Notificaciones', 'Mismo uso que Slack, para organizaciones que usan Teams como herramienta principal.'],
            ['SIEM / Syslog', 'Log forwarding', 'Enviar todos los eventos de Onefend a su sistema SIEM (Splunk, QRadar, etc.) en formato Syslog.'],
            ['Email', 'Alertas', 'Recibir reportes periódicos y alertas críticas por email.'],
          ],
        },
        {
          type: 'h2',
          id: 'configurar-slack',
          text: 'Configurar la integración con Slack',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acceda a Configuración → Integraciones → Slack',
              description: 'En el panel de administración, vaya a la sección de Integraciones.',
            },
            {
              title: 'Autorice la aplicación en su workspace de Slack',
              description: 'Haga clic en "Conectar con Slack". Se abrirá una ventana del workspace de Slack para autorizar la aplicación de Onefend.',
            },
            {
              title: 'Seleccione el canal de destino',
              description: 'Elija el canal de Slack donde se enviarán las alertas. Se recomienda usar un canal dedicado a seguridad.',
            },
            {
              title: 'Configure el umbral de alertas',
              description: 'Defina a partir de qué nivel de riesgo (HIGH, MEDIUM) se enviarán notificaciones. Las notificaciones por cada evento LOW suelen generar un volumen contraproducente.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'configurar-siem',
          text: 'Configurar la integración con SIEM / Syslog',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acceda a Configuración → Integraciones → SIEM',
              description: 'Seleccione la integración Syslog/SIEM.',
            },
            {
              title: 'Ingrese el endpoint de su SIEM',
              description: 'Proporcione la dirección IP o hostname, el puerto y el protocolo (UDP o TCP) de su colector de syslog.',
            },
            {
              title: 'Seleccione el formato',
              description: 'Elija el formato de los mensajes: CEF (Common Event Format) o formato Syslog estándar (RFC 5424).',
            },
            {
              title: 'Pruebe la conexión',
              description: 'Use el botón "Probar conexión" para verificar que Onefend puede alcanzar su colector antes de guardar la configuración.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'El SIEM recibe metadatos, no contenido',
          text: 'Los eventos enviados al SIEM contienen metadatos del evento (usuario, aplicación, tipo de dato detectado, acción tomada, nivel de riesgo, timestamp) pero no el contenido de las conversaciones.',
        },
        {
          type: 'h2',
          id: 'desconectar',
          text: 'Desconectar una integración',
        },
        {
          type: 'p',
          text: 'Puede desconectar cualquier integración activa desde la misma sección de Integraciones. Al desconectarse, Onefend deja de enviar eventos a ese destino de forma inmediata. La configuración no se elimina y puede reconectarse en el futuro.',
        },
      ],
    },

    // ─── Manual 17: Webhooks ──────────────────────────────────────────────────
    {
      slug: 'webhooks',
      title: 'Webhooks',
      description: 'Cómo configurar webhooks para enviar eventos a sistemas propios.',
      blocks: [
        {
          type: 'h2',
          id: 'que-son-webhooks',
          text: '¿Qué son los webhooks de Onefend?',
        },
        {
          type: 'p',
          text: 'Los webhooks permiten que Onefend envíe notificaciones automáticas a cualquier sistema externo de su elección en tiempo real, a medida que se generan eventos en la plataforma. A diferencia de las integraciones preconstruidas (Slack, Teams), los webhooks son flexibles y pueden conectarse con cualquier sistema que tenga un endpoint HTTP.',
        },
        {
          type: 'p',
          text: 'Algunos casos de uso habituales: enviar eventos a un sistema interno de gestión de incidentes, disparar flujos de automatización en n8n o Zapier, o alimentar un dashboard personalizado de la organización.',
        },
        {
          type: 'h2',
          id: 'crear-webhook',
          text: 'Cómo crear un webhook',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acceda a Configuración → Webhooks → Nuevo Webhook',
              description: 'En el panel de administración, navegue a la sección Webhooks.',
            },
            {
              title: 'Ingrese la URL de destino',
              description: 'Proporcione el endpoint HTTPS de su sistema que recibirá los eventos. Onefend requiere HTTPS para todos los webhooks.',
            },
            {
              title: 'Seleccione los eventos que activarán el webhook',
              description: 'Puede suscribirse a tipos específicos de eventos: solo bloqueos, solo eventos de alto riesgo, todos los eventos, etc.',
            },
            {
              title: 'Configure el secreto de validación (recomendado)',
              description: 'Ingrese una clave secreta que Onefend incluirá en cada solicitud. Su sistema puede usar esta clave para verificar que el mensaje proviene de Onefend. Ver sección "Validación de webhooks" más abajo.',
            },
            {
              title: 'Pruebe y active',
              description: 'Use el botón "Enviar evento de prueba" para verificar que su endpoint recibe y procesa correctamente el mensaje antes de activar el webhook.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'estructura-payload',
          text: 'Estructura del payload',
        },
        {
          type: 'p',
          text: 'Cada evento enviado por webhook incluye los siguientes campos:',
        },
        {
          type: 'list',
          items: [
            'event_id: identificador único del evento.',
            'timestamp: fecha y hora del evento en formato ISO 8601 (UTC).',
            'tenant_id: identificador de su organización.',
            'user_email: email del usuario que generó el evento.',
            'application: nombre de la plataforma de IA involucrada.',
            'risk_level: HIGH, MEDIUM o LOW.',
            'action_taken: BLOCK, WARN, LOG o ALLOW.',
            'data_types_detected: lista de categorías de dato detectadas en el evento.',
          ],
        },
        {
          type: 'h2',
          id: 'validacion',
          text: 'Validación de webhooks',
        },
        {
          type: 'p',
          text: 'Si configuró un secreto de validación al crear el webhook, Onefend incluirá en cada solicitud un encabezado de firma. Su sistema puede usar esta firma para verificar que el mensaje proviene genuinamente de la plataforma y no ha sido alterado en tránsito. Consulte la documentación técnica de su plataforma de destino para implementar esta verificación.',
        },
        {
          type: 'h2',
          id: 'reintentos',
          text: 'Política de reintentos',
        },
        {
          type: 'p',
          text: 'Si su endpoint no responde o devuelve un error, Onefend reintentará el envío automáticamente con un intervalo creciente. Si luego de varios reintentos el endpoint sigue sin responder, el evento se marca como fallido y queda registrado en el log del webhook para su revisión.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Revise el log de entregas de su webhook',
          text: 'Desde Configuración → Webhooks → detalle del webhook, puede ver el historial de entregas: qué eventos se enviaron, cuáles tuvieron éxito y cuáles fallaron. Útil para diagnosticar problemas de conectividad con su endpoint.',
        },
      ],
    },

    // ─── Manual 18: Generación de reportes ────────────────────────────────────
    {
      slug: 'generacion-reportes',
      title: 'Reportes',
      description: 'Cómo generar, programar y exportar reportes de actividad.',
      blocks: [
        {
          type: 'h2',
          id: 'tipos-reporte',
          text: 'Tipos de reporte disponibles',
        },
        {
          type: 'p',
          text: 'El módulo de Reportes de Onefend permite generar documentos consolidados con la actividad de la plataforma para un período determinado. Los reportes están diseñados para ser compartidos con distintos perfiles: desde directivos que necesitan un resumen ejecutivo hasta auditores que requieren el detalle de operación.',
        },
        {
          type: 'table',
          headers: ['Tipo de reporte', 'Para quién', 'Contenido'],
          rows: [
            ['Resumen ejecutivo', 'Dirección, CISO', 'KPIs de actividad: volumen de eventos, tendencias, aplicaciones más usadas, usuarios con mayor actividad.'],
            ['Actividad por usuario', 'Recursos Humanos, área legal', 'Detalle de eventos por usuario individual en el período.'],
            ['Actividad por aplicación', 'IT, seguridad', 'Distribución del uso por herramienta de IA, eventos por aplicación.'],
            ['Eventos de alto riesgo', 'Equipo de seguridad', 'Solo los eventos clasificados como HIGH con resumen de tipos de dato involucrados.'],
            ['Inventario de aplicaciones', 'IT', 'Lista de todas las aplicaciones detectadas con su estado y puntaje de riesgo.'],
          ],
        },
        {
          type: 'h2',
          id: 'generar-reporte',
          text: 'Cómo generar un reporte',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acceda a Reportes → Nuevo Reporte',
              description: 'En el panel, navegue a la sección Reportes.',
            },
            {
              title: 'Seleccione el tipo de reporte',
              description: 'Elija entre los tipos de reporte disponibles según el destinatario y el propósito.',
            },
            {
              title: 'Defina el período',
              description: 'Seleccione el rango de fechas que debe cubrir el reporte.',
            },
            {
              title: 'Aplique filtros adicionales (opcional)',
              description: 'Puede acotar el reporte a usuarios específicos, grupos o aplicaciones.',
            },
            {
              title: 'Genere y descargue',
              description: 'Haga clic en "Generar". El reporte se prepara y puede descargarse en PDF o CSV.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'programar-reporte',
          text: 'Programar reportes periódicos',
        },
        {
          type: 'p',
          text: 'Puede configurar que un reporte se genere y envíe automáticamente por email a los destinatarios que defina, con la frecuencia que necesite: semanal, mensual o personalizada. Los reportes programados se configuran desde Reportes → Programados → Nuevo Reporte Programado.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Reporte ejecutivo mensual automatizado',
          text: 'Para simplificar la comunicación con dirección, configure un reporte de tipo "Resumen ejecutivo" que se envíe automáticamente el primer día hábil de cada mes con los datos del mes anterior.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Los reportes reflejan los datos disponibles al momento de la generación',
          text: 'Si genera un reporte y luego vencen y se eliminan datos por la política de retención, las generaciones futuras del mismo reporte para un período anterior no incluirán esos datos. Exporte y guarde los reportes que necesite conservar.',
        },
      ],
    },

    // ─── Manual 19: Dashboards y visualización ────────────────────────────────
    {
      slug: 'dashboards-visualizacion',
      title: 'Dashboards',
      description: 'Cómo usar y configurar los dashboards de monitoreo en tiempo real.',
      blocks: [
        {
          type: 'h2',
          id: 'que-es-dashboard',
          text: 'El panel de dashboards',
        },
        {
          type: 'p',
          text: 'Los dashboards de Onefend ofrecen una vista consolidada y visual de la actividad de la plataforma en tiempo real. Están diseñados para el monitoreo operativo continuo y para tener una lectura rápida del estado de seguridad de la organización.',
        },
        {
          type: 'h2',
          id: 'widgets-disponibles',
          text: 'Widgets disponibles',
        },
        {
          type: 'table',
          headers: ['Widget', 'Qué muestra'],
          rows: [
            ['Eventos por nivel de riesgo', 'Distribución de eventos HIGH / MEDIUM / LOW en el período seleccionado.'],
            ['Aplicaciones más usadas', 'Las plataformas de IA con mayor volumen de actividad en su organización.'],
            ['Usuarios más activos', 'Los usuarios que generaron más eventos en el período.'],
            ['Tendencia de actividad', 'Línea de tiempo con el volumen total de eventos por día.'],
            ['Acciones tomadas', 'Proporción de eventos por acción: BLOCK, WARN, LOG, ALLOW.'],
            ['Dispositivos activos', 'Número de extensiones activas y sincronizadas en el momento.'],
          ],
        },
        {
          type: 'h2',
          id: 'personalizar-dashboard',
          text: 'Personalizar el dashboard',
        },
        {
          type: 'p',
          text: 'Puede reorganizar los widgets del dashboard para priorizar la información que más le interesa. Haga clic en "Editar dashboard" para acceder al modo de personalización, donde puede arrastrar, redimensionar y ocultar widgets.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Los cambios en el dashboard son por usuario',
          text: 'La personalización del dashboard es individual: cada usuario del panel puede tener su propia configuración de widgets sin afectar la vista de otros.',
        },
        {
          type: 'h2',
          id: 'rango-tiempo',
          text: 'Selector de rango de tiempo',
        },
        {
          type: 'p',
          text: 'El selector de rango en la parte superior del dashboard aplica a todos los widgets simultáneamente. Puede ver la actividad de las últimas 24 horas, los últimos 7 días, los últimos 30 días o definir un rango personalizado.',
        },
        {
          type: 'h2',
          id: 'compartir-dashboard',
          text: 'Compartir el dashboard',
        },
        {
          type: 'p',
          text: 'Puede generar un enlace de solo lectura del estado actual del dashboard para compartirlo con personas que no tienen acceso al panel (por ejemplo, directivos que no son usuarios de Onefend). El enlace expira en 24 horas por razones de seguridad.',
        },
        {
          type: 'h2',
          id: 'acceso-viewer',
          text: 'Acceso de usuarios Viewer',
        },
        {
          type: 'p',
          text: 'Los usuarios con rol VIEWER tienen acceso directo al módulo de Dashboards. Es la única sección del panel a la que pueden acceder. Esto permite que ejecutivos o auditores externos con acceso limitado tengan visibilidad de alto nivel sin acceder a datos operativos detallados.',
        },
      ],
    },

    // ─── Manual 20: Analytics y métricas avanzadas ────────────────────────────
    {
      slug: 'analytics-metricas-avanzadas',
      title: 'Analytics avanzados',
      description: 'Métricas de uso, tendencias y herramientas de análisis profundo.',
      blocks: [
        {
          type: 'h2',
          id: 'que-es-analytics',
          text: 'El módulo de Analytics',
        },
        {
          type: 'p',
          text: 'El módulo de Analytics complementa el dashboard con análisis más profundos y herramientas para identificar tendencias, patrones de comportamiento y situaciones que podrían no ser evidentes en el monitoreo operativo diario.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Acceso disponible para ADMIN y ANALYST',
          text: 'El módulo de Analytics está disponible para usuarios con rol ADMIN y ANALYST. Los usuarios VIEWER tienen acceso solo a los dashboards básicos.',
        },
        {
          type: 'h2',
          id: 'metricas-disponibles',
          text: 'Métricas disponibles',
        },
        {
          type: 'table',
          headers: ['Métrica', 'Para qué sirve'],
          rows: [
            ['Tasa de eventos por usuario', 'Identificar usuarios con volúmenes de actividad inusuales respecto al promedio de la organización.'],
            ['Distribución por aplicación', 'Entender qué herramientas de IA predominan en el uso corporativo.'],
            ['Evolución temporal de riesgo', 'Ver si el nivel de riesgo de la actividad aumenta o disminuye con el tiempo.'],
            ['Efectividad de políticas', 'Ver cuántos eventos cada política está generando y si la acción tomada es la esperada.'],
            ['Cobertura de dispositivos', 'Porcentaje de dispositivos activos respecto a los usuarios registrados.'],
          ],
        },
        {
          type: 'h2',
          id: 'deteccion-anomalias',
          text: 'Detección de comportamientos atípicos',
        },
        {
          type: 'p',
          text: 'Onefend analiza los patrones de actividad de su organización e identifica comportamientos que se desvían del promedio habitual. Cuando detecta una anomalía — por ejemplo, un usuario que de repente multiplica su actividad o accede a una herramienta que nunca había usado — genera una alerta en el módulo de Analytics para que el equipo de seguridad pueda investigarla.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Las alertas de anomalías son orientativas',
          text: 'Una alerta de comportamiento atípico no implica necesariamente un incidente de seguridad. Puede tener causas legítimas: un proyecto nuevo, un cambio de área o el uso de una herramienta autorizada pero poco común. El equipo de seguridad determina si el comportamiento requiere atención.',
        },
        {
          type: 'h2',
          id: 'exportar-analytics',
          text: 'Exportar datos de analytics',
        },
        {
          type: 'p',
          text: 'Los datos de analytics pueden exportarse en formato CSV para su procesamiento en herramientas externas de análisis (hojas de cálculo, herramientas de BI, etc.). La exportación incluye los datos agregados del período seleccionado, no eventos individuales.',
        },
        {
          type: 'h2',
          id: 'uso-recomendado',
          text: 'Uso recomendado del módulo',
        },
        {
          type: 'list',
          items: [
            'Revisión semanal de métricas clave para detectar tendencias antes de que se conviertan en problemas.',
            'Análisis mensual de la efectividad de las políticas: ¿están generando los bloqueos y advertencias esperados?',
            'Revisión de la cobertura de dispositivos: ¿todos los usuarios tienen la extensión activa?',
            'Identificación de aplicaciones emergentes: ¿hay nuevas herramientas de IA que sus empleados están probando?',
          ],
        },
      ],
    },
  ],
};
