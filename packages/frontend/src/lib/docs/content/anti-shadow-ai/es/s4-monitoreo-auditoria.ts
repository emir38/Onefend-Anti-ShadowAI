import type { DocSection } from '../../../types';

export const seccionMonitoreoAuditoria: DocSection = {
  title: 'Monitoreo y Auditoría',
  chapters: [
    // ─── Manual 09: Monitoreo de eventos ──────────────────────────────────────
    {
      slug: 'monitoreo-eventos',
      title: 'Monitoreo de eventos',
      description: 'Cómo usar el panel de eventos para supervisar la actividad en tiempo real.',
      blocks: [
        {
          type: 'h2',
          id: 'panel-eventos',
          text: 'El panel de eventos',
        },
        {
          type: 'p',
          text: 'El panel de Eventos es la vista central de operaciones de Onefend. Muestra en tiempo real todas las interacciones que la extensión ha registrado en los dispositivos de su organización. Desde aquí puede supervisar la actividad, investigar situaciones específicas y exportar datos para análisis externo.',
        },
        {
          type: 'h2',
          id: 'filtros-disponibles',
          text: 'Filtros disponibles',
        },
        {
          type: 'table',
          headers: ['Filtro', 'Opciones'],
          rows: [
            ['Usuario', 'Buscar por nombre o email para ver la actividad de una persona específica.'],
            ['Aplicación', 'Filtrar por plataforma de IA (ChatGPT, Claude, Gemini, etc.).'],
            ['Nivel de riesgo', 'HIGH, MEDIUM, LOW.'],
            ['Acción tomada', 'BLOCK, WARN, LOG, ALLOW.'],
            ['Rango de fechas', 'Consultas de hasta 90 días en una sola búsqueda.'],
            ['Tipo de dato detectado', 'Filtrar por la categoría de dato que activó el evento.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Combine filtros para investigaciones específicas',
          text: 'Para investigar el comportamiento de un usuario específico en un período determinado, combine el filtro de Usuario con un rango de fechas acotado. Puede exportar el resultado filtrado como CSV directamente desde la vista.',
        },
        {
          type: 'h2',
          id: 'detalle-evento',
          text: 'Detalle de un evento',
        },
        {
          type: 'p',
          text: 'Al hacer clic en cualquier evento de la lista, se abre el panel de detalle con la siguiente información:',
        },
        {
          type: 'list',
          items: [
            'Usuario que generó el evento y dispositivo desde el que operó.',
            'Aplicación de IA involucrada.',
            'Fecha y hora del evento.',
            'Tipo de dato detectado y nivel de riesgo asignado.',
            'Acción que tomó la plataforma (BLOCK, WARN, LOG, ALLOW).',
            'Política que generó la acción.',
            'Evidencia redactada: fragmento del contenido con los datos sensibles ocultados.',
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'La evidencia siempre está redactada',
          text: 'El panel nunca muestra el contenido original en texto plano. Lo que se muestra es una versión donde los datos sensibles detectados han sido reemplazados por marcadores. Esto protege la privacidad del usuario y cumple con el principio de mínima exposición de datos.',
        },
        {
          type: 'h2',
          id: 'exportar-eventos',
          text: 'Exportar eventos',
        },
        {
          type: 'p',
          text: 'El botón "Exportar CSV" en la cabecera del panel genera un archivo con todos los eventos visibles según los filtros activos en ese momento. Los campos exportados incluyen todos los metadatos del evento pero no el contenido de las conversaciones.',
        },
        {
          type: 'h2',
          id: 'acceso-por-rol',
          text: 'Acceso al panel según el rol',
        },
        {
          type: 'table',
          headers: ['Rol', 'Acceso a eventos'],
          rows: [
            ['ADMIN', 'Todos los eventos de todos los usuarios.'],
            ['ANALYST', 'Todos los eventos de todos los usuarios.'],
            ['VIEWER', 'No tiene acceso al panel de eventos individuales. Solo ve dashboards.'],
            ['USER', 'Solo puede ver sus propios eventos desde su perfil.'],
          ],
        },
      ],
    },

    // ─── Manual 10: Análisis de conversaciones ─────────────────────────────────
    {
      slug: 'analisis-conversaciones',
      title: 'Análisis de conversaciones',
      description: 'Cómo revisar en profundidad las interacciones con herramientas de IA.',
      blocks: [
        {
          type: 'h2',
          id: 'que-es-analisis',
          text: '¿Qué es el análisis de conversaciones?',
        },
        {
          type: 'p',
          text: 'El módulo de Análisis de Conversaciones permite revisar en detalle las interacciones que generaron eventos en la plataforma. A diferencia del panel de eventos — que muestra una lista de incidentes — este módulo agrupa los eventos por sesión de conversación y permite ver el contexto completo de cada interacción.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Solo se analizan conversaciones con eventos',
          text: 'Onefend no captura ni almacena conversaciones completas. Solo se registra evidencia de los intercambios que generaron un evento (detección de dato sensible). Las conversaciones sin detecciones no se almacenan.',
        },
        {
          type: 'h2',
          id: 'acceder-conversaciones',
          text: 'Cómo acceder al análisis',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Abra el panel de Eventos',
              description: 'Localice el evento que desea investigar en la lista de eventos.',
            },
            {
              title: 'Haga clic en "Ver conversación"',
              description: 'En el detalle del evento, encontrará el botón "Ver conversación" si el evento forma parte de una sesión registrada.',
            },
            {
              title: 'Revise la evidencia redactada',
              description: 'El visor de conversación muestra el fragmento de intercambio con los datos sensibles reemplazados por marcadores. Los tipos de dato detectados aparecen destacados.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'datos-disponibles',
          text: 'Información disponible en el análisis',
        },
        {
          type: 'list',
          items: [
            'Plataforma de IA utilizada en la conversación.',
            'Usuario y dispositivo involucrado.',
            'Fecha, hora y duración aproximada de la sesión.',
            'Tipos de datos detectados a lo largo de la conversación.',
            'Acciones tomadas por la plataforma en cada fragmento.',
            'Nivel de riesgo consolidado de la conversación.',
          ],
        },
        {
          type: 'h2',
          id: 'marcar-revisar',
          text: 'Marcar conversaciones para seguimiento',
        },
        {
          type: 'p',
          text: 'Puede marcar una conversación como "Revisada", "En seguimiento" o "Escalada" para gestionar su flujo de trabajo de investigación. El estado de una conversación es visible para todos los usuarios con acceso al módulo de análisis.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Acceso restringido a Analyst y Admin',
          text: 'El módulo de Análisis de Conversaciones está disponible solo para roles ADMIN y ANALYST. Los usuarios con rol VIEWER o USER no tienen acceso.',
        },
      ],
    },

    // ─── Manual 11: Auditoría y compliance ────────────────────────────────────
    {
      slug: 'auditoria-compliance',
      title: 'Auditoría y compliance',
      description: 'Los registros de auditoría administrativa y su uso para procesos de revisión y cumplimiento.',
      blocks: [
        {
          type: 'h2',
          id: 'logs-auditoria',
          text: 'Los logs de auditoría administrativa',
        },
        {
          type: 'p',
          text: 'Los logs de auditoría registran todas las acciones realizadas por los administradores dentro del panel de Onefend: creación y modificación de políticas, cambios en usuarios y roles, ajustes de configuración global, y acceso al módulo de análisis de conversaciones.',
        },
        {
          type: 'p',
          text: 'Estos registros son inmutables: ningún administrador puede editarlos ni eliminarlos. Quedan guardados por el período de retención configurado (por defecto, 90 días) y pueden exportarse en cualquier momento.',
        },
        {
          type: 'table',
          headers: ['Tipo de acción auditada', 'Ejemplos'],
          rows: [
            ['Gestión de usuarios', 'Creación, modificación, desactivación y eliminación de usuarios.'],
            ['Cambios en políticas DLP', 'Creación, edición, activación y desactivación de políticas.'],
            ['Cambios en configuración global', 'Modificación de retención de datos, whitelist, zona horaria.'],
            ['Gestión de aplicaciones', 'Cambio de estado de aplicaciones (aprobar, bloquear, etc.).'],
            ['Acceso a datos sensibles', 'Apertura del módulo de análisis de conversaciones.'],
            ['Gestión de integraciones', 'Configuración y desconexión de integraciones externas.'],
          ],
        },
        {
          type: 'h2',
          id: 'acceder-auditoria',
          text: 'Cómo acceder a los logs de auditoría',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acceda a Auditoría en el menú principal',
              description: 'Solo los usuarios con rol ADMIN pueden acceder a los logs de auditoría.',
            },
            {
              title: 'Aplique filtros si es necesario',
              description: 'Puede filtrar por administrador que realizó la acción, tipo de acción y rango de fechas.',
            },
            {
              title: 'Exporte si necesita',
              description: 'Use el botón "Exportar" para descargar los logs filtrados en CSV o JSON para procesamiento externo.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'uso-en-auditorias',
          text: 'Uso de los logs en procesos de revisión',
        },
        {
          type: 'p',
          text: 'Los logs de auditoría son una herramienta útil para demostrar que la plataforma está siendo administrada de forma controlada y trazable. En procesos de revisión interna o con auditores externos, puede exportar los logs del período relevante y acompañarlos con los eventos de conversación exportados desde el panel de Eventos.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Los logs de auditoría no reemplazan a su equipo legal',
          text: 'Onefend provee los registros técnicos de actividad. Cómo utilizarlos en el contexto de un proceso regulatorio específico es una decisión que corresponde al equipo legal y de cumplimiento de su organización.',
        },
      ],
    },

    // ─── Manual 13: Logs del sistema y diagnóstico ────────────────────────────
    {
      slug: 'logs-sistema-diagnostico',
      title: 'Logs del sistema y diagnóstico',
      description: 'Cómo interpretar los logs del sistema y reportar problemas al soporte.',
      blocks: [
        {
          type: 'h2',
          id: 'para-que-sirven',
          text: '¿Para qué sirven los logs del sistema?',
        },
        {
          type: 'p',
          text: 'Los logs del sistema registran el estado técnico de la plataforma: conexiones de dispositivos, errores de sincronización, fallos en el procesamiento de eventos y advertencias de operación. A diferencia de los logs de auditoría (que registran acciones de administradores), los logs del sistema son de naturaleza técnica y están orientados a diagnóstico.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Solo ADMIN tiene acceso a los logs del sistema',
          text: 'Los logs del sistema contienen información técnica interna de la operación de la plataforma. El acceso está restringido al rol de Administrador.',
        },
        {
          type: 'h2',
          id: 'niveles-log',
          text: 'Niveles de log',
        },
        {
          type: 'table',
          headers: ['Nivel', 'Significado'],
          rows: [
            ['INFO', 'Eventos normales de operación: conexión de dispositivos, sincronización exitosa, eventos procesados.'],
            ['WARN', 'Situaciones que ameritan atención pero no impiden el funcionamiento: latencia elevada, reintentos de sincronización.'],
            ['ERROR', 'Errores que afectan la operación: dispositivos que no pueden conectarse, eventos no procesados correctamente.'],
          ],
        },
        {
          type: 'h2',
          id: 'problemas-frecuentes',
          text: 'Problemas frecuentes y qué hacer',
        },
        {
          type: 'table',
          headers: ['Síntoma observado', 'Acción recomendada'],
          rows: [
            ['Un dispositivo aparece como "Sin conexión" por más de 24 horas.', 'Verifique con el usuario que la extensión está instalada y activa. Si tiene el navegador cerrado, el dispositivo no puede sincronizarse.'],
            ['Los eventos de un usuario dejan de aparecer.', 'Verifique el estado del dispositivo en Configuración → Dispositivos. Puede ser necesario regenerar el token de instalación.'],
            ['Una política nueva no parece estar aplicándose en un dispositivo.', 'Fuerce una sincronización desde el panel y espere el próximo ciclo. Si persiste, verifique que el usuario pertenezca al grupo al que está asignada la política.'],
          ],
        },
        {
          type: 'h2',
          id: 'contactar-soporte',
          text: 'Cómo reportar un problema a soporte',
        },
        {
          type: 'p',
          text: 'Si un problema persiste luego de seguir los pasos de diagnóstico, puede contactar al equipo de soporte de Onefend con la siguiente información para agilizar la resolución:',
        },
        {
          type: 'list',
          items: [
            'Descripción del problema y desde cuándo ocurre.',
            'El usuario o dispositivo afectado (nombre y email).',
            'Captura del estado del dispositivo en el panel (sección Dispositivos).',
            'Exportación de los logs del sistema del período relevante (Auditoría → Logs del Sistema → Exportar).',
            'Cualquier mensaje de error visible en la interfaz.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Canal de soporte',
          text: 'Puede contactar al equipo de soporte técnico de Onefend a través del portal de soporte o por el canal de comunicación que le fue indicado durante el proceso de alta de su organización.',
        },
      ],
    },
  ],
};
