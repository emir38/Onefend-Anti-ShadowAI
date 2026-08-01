import type { DocSection } from '../../../types';

export const seccionUsuariosAccesos: DocSection = {
  title: 'Usuarios y Accesos',
  chapters: [
    // ─── Manual 03: Gestión de usuarios ──────────────────────────────────────
    {
      slug: 'gestion-usuarios',
      title: 'Gestión de usuarios',
      description: 'Cómo agregar, modificar y desactivar usuarios en la plataforma.',
      blocks: [
        {
          type: 'h2',
          id: 'usuarios-en-onefend',
          text: 'Usuarios en Onefend',
        },
        {
          type: 'p',
          text: 'Cada persona que interactúa con la plataforma — ya sea como administrador, analista o usuario final protegido — tiene un perfil de usuario en Onefend. Desde el panel, el administrador gestiona el ciclo de vida completo de todos los usuarios de la organización.',
        },
        {
          type: 'h2',
          id: 'agregar-usuarios',
          text: 'Cómo agregar usuarios',
        },
        {
          type: 'p',
          text: 'Hay tres formas de incorporar usuarios a la plataforma:',
        },
        {
          type: 'table',
          headers: ['Método', 'Cuándo usarlo'],
          rows: [
            ['Invitación por email', 'Para incorporar usuarios de forma individual. El usuario recibe un email con un enlace de activación.'],
            ['Importación en lote (CSV)', 'Para incorporar múltiples usuarios a la vez. Se carga un archivo con nombre, email y rol asignado.'],
            ['Sincronización con directorio (SSO)', 'Para organizaciones con Azure AD, Google Workspace u otro proveedor de identidad. Los usuarios se sincronizan automáticamente.'],
          ],
        },
        {
          type: 'h2',
          id: 'invitacion-individual',
          text: 'Invitación individual',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Vaya a Usuarios → Nuevo Usuario',
              description: 'En el panel de administración, acceda a la sección Usuarios y haga clic en "Nuevo Usuario".',
            },
            {
              title: 'Complete los datos del usuario',
              description: 'Ingrese el email corporativo, el nombre completo y seleccione el rol que tendrá en la plataforma.',
            },
            {
              title: 'Asigne el usuario a grupos (opcional)',
              description: 'Puede asignarlo a uno o varios grupos en este paso. Los grupos definen qué políticas se aplican sobre el usuario.',
            },
            {
              title: 'Envíe la invitación',
              description: 'El usuario recibe un email con un enlace de activación. Tiene 48 horas para activar su cuenta. Puede reenviar la invitación desde la lista de usuarios si el plazo vence.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'grupos',
          text: 'Gestión de grupos',
        },
        {
          type: 'p',
          text: 'Los grupos permiten aplicar políticas de seguridad a conjuntos de usuarios de forma eficiente. En lugar de configurar una política usuario por usuario, se define a nivel de grupo y todos sus integrantes la heredan automáticamente.',
        },
        {
          type: 'list',
          items: [
            'Un usuario puede pertenecer a múltiples grupos simultáneamente.',
            'Si un usuario pertenece a grupos con políticas distintas para el mismo patrón, se aplica la más restrictiva.',
            'Los grupos pueden crearse desde Usuarios → Grupos → Nuevo Grupo.',
          ],
        },
        {
          type: 'h2',
          id: 'desactivar-usuarios',
          text: 'Desactivar y eliminar usuarios',
        },
        {
          type: 'p',
          text: 'Cuando un empleado abandona la organización o cambia de rol, es importante gestionar su acceso de inmediato:',
        },
        {
          type: 'table',
          headers: ['Acción', 'Efecto'],
          rows: [
            ['Desactivar', 'El usuario pierde acceso al panel y la extensión deja de funcionar en su dispositivo. Sus registros históricos se conservan.'],
            ['Eliminar', 'Elimina el perfil del usuario. Sus registros históricos se conservan por el período de retención configurado.'],
            ['Revocar dispositivo', 'Desvincula la extensión de un dispositivo específico sin afectar la cuenta del usuario.'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Revoque el acceso ante bajas inmediatas',
          text: 'Se recomienda desactivar al usuario desde el panel en el mismo día en que se procesa una baja laboral. La extensión deja de estar activa en su dispositivo tan pronto como el usuario es desactivado.',
        },
      ],
    },

    // ─── Manual 04: Roles y permisos ──────────────────────────────────────────
    {
      slug: 'roles-permisos',
      title: 'Roles y permisos',
      description: 'Los cuatro roles de la plataforma y qué puede hacer cada uno.',
      blocks: [
        {
          type: 'h2',
          id: 'sistema-roles',
          text: 'El sistema de roles de Onefend',
        },
        {
          type: 'p',
          text: 'Onefend utiliza un sistema de control de acceso basado en roles (RBAC). Cada usuario tiene asignado exactamente un rol, que determina a qué secciones del panel puede acceder y qué acciones puede realizar. Los roles no son acumulables.',
        },
        {
          type: 'h2',
          id: 'roles-disponibles',
          text: 'Roles disponibles',
        },
        {
          type: 'table',
          headers: ['Rol', 'Perfil típico', 'Nivel de acceso'],
          rows: [
            ['ADMIN', 'Responsable de IT o CISO', 'Acceso total: configuración, usuarios, políticas, reportes y auditoría.'],
            ['ANALYST', 'Analista de seguridad', 'Lectura y análisis: puede ver eventos, conversaciones y reportes, pero no modificar la configuración.'],
            ['VIEWER', 'Ejecutivo o auditor externo', 'Solo lectura de dashboards y reportes. No accede a eventos individuales ni configuración.'],
            ['USER', 'Empleado protegido', 'Solo accede al portal de documentación. No tiene acceso al panel de administración.'],
          ],
        },
        {
          type: 'h2',
          id: 'detalle-admin',
          text: 'Administrador (ADMIN)',
        },
        {
          type: 'p',
          text: 'El Administrador es el rol con mayor nivel de privilegio en la plataforma. Es el único que puede modificar la configuración de la organización, crear y eliminar usuarios, definir políticas y acceder a los logs de auditoría administrativa.',
        },
        {
          type: 'list',
          items: [
            'Gestión completa de usuarios, grupos y roles.',
            'Creación, edición y eliminación de políticas DLP.',
            'Configuración de integraciones (Slack, Teams, webhooks, SIEM).',
            'Acceso a todos los eventos, conversaciones y logs del sistema.',
            'Generación y programación de reportes.',
            'Configuración de la retención de datos y parámetros globales de la organización.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Principio de mínimo privilegio',
          text: 'Se recomienda asignar el rol de Administrador solo a las personas que realmente necesitan modificar la configuración de la plataforma. Para tareas de revisión y monitoreo, el rol de Analista es suficiente.',
        },
        {
          type: 'h2',
          id: 'detalle-analyst',
          text: 'Analista (ANALYST)',
        },
        {
          type: 'p',
          text: 'El Analista puede revisar toda la actividad de la organización pero no puede realizar cambios en la configuración. Es el rol ideal para equipos de seguridad que monitorean eventos sin necesidad de administrar la plataforma.',
        },
        {
          type: 'list',
          items: [
            'Ver y filtrar todos los eventos de conversación.',
            'Acceder al detalle de conversaciones para investigación de incidentes.',
            'Consultar logs de sistema (nivel informativo).',
            'Ver reportes y dashboards.',
            'Exportar eventos y datos para análisis externo.',
          ],
        },
        {
          type: 'h2',
          id: 'detalle-viewer',
          text: 'Viewer (VIEWER)',
        },
        {
          type: 'p',
          text: 'El Viewer tiene acceso de solo lectura a dashboards y reportes. No puede ver eventos individuales ni el detalle de conversaciones. Es útil para ejecutivos o auditores que necesitan visibilidad de alto nivel sin acceder a datos operativos.',
        },
        {
          type: 'h2',
          id: 'cambiar-rol',
          text: 'Cómo cambiar el rol de un usuario',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Vaya a Usuarios',
              description: 'En el panel de administración, acceda a la sección Usuarios.',
            },
            {
              title: 'Seleccione el usuario',
              description: 'Haga clic en el nombre del usuario que desea modificar para abrir su perfil.',
            },
            {
              title: 'Cambie el rol',
              description: 'En el campo Rol, seleccione el nuevo rol del menú desplegable y guarde los cambios. El cambio tiene efecto inmediato.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'El rol USER no tiene acceso al panel',
          text: 'Los empleados con rol USER solo ven el portal de documentación cuando acceden con sus credenciales. No tienen acceso al panel de administración, eventos ni reportes.',
        },
      ],
    },

    // ─── Manual 12: Sincronización de extensiones ─────────────────────────────
    {
      slug: 'sincronizacion-extensiones',
      title: 'Sincronización de extensiones',
      description: 'Cómo funciona la sincronización de políticas en los dispositivos y cómo verificar su estado.',
      blocks: [
        {
          type: 'h2',
          id: 'sincronizacion',
          text: '¿Qué es la sincronización?',
        },
        {
          type: 'p',
          text: 'Cada vez que un administrador crea o modifica una política, la actualización debe llegar a los dispositivos donde la extensión está instalada. Este proceso es automático y se denomina sincronización. Sin sincronización, los dispositivos seguirían aplicando la versión anterior de las políticas.',
        },
        {
          type: 'h2',
          id: 'como-sincroniza',
          text: 'Cómo funciona la sincronización automática',
        },
        {
          type: 'p',
          text: 'La extensión se conecta periódicamente al backend de Onefend para verificar si hay actualizaciones de políticas, lista de aplicaciones o configuración. El intervalo de sincronización está configurado en el panel global de la organización y es ajustable por el administrador.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Sincronización en tiempo real vs. periódica',
          text: 'Cuando se realiza un cambio crítico de política (por ejemplo, un bloqueo de emergencia), el administrador puede forzar una sincronización inmediata desde el panel sin esperar al próximo ciclo automático.',
        },
        {
          type: 'h2',
          id: 'estado-dispositivos',
          text: 'Ver el estado de sincronización por dispositivo',
        },
        {
          type: 'p',
          text: 'Desde Configuración → Dispositivos, puede ver el estado de cada extensión instalada en su organización:',
        },
        {
          type: 'table',
          headers: ['Estado', 'Significado'],
          rows: [
            ['Activo', 'El dispositivo está sincronizado y aplicando las políticas vigentes.'],
            ['Sin conexión', 'El dispositivo no se ha comunicado con el backend en el período esperado. El usuario puede estar offline o haber desinstalado la extensión.'],
            ['Desactualizado', 'El dispositivo está en línea pero no ha recibido las últimas políticas. Puede deberse a un problema temporal de conectividad.'],
            ['Revocado', 'El administrador revocó manualmente el token de este dispositivo. La extensión está inactiva.'],
          ],
        },
        {
          type: 'h2',
          id: 'forzar-sincronizacion',
          text: 'Forzar sincronización manualmente',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acceda a Configuración → Dispositivos',
              description: 'Localice el dispositivo con estado Desactualizado o Sin conexión.',
            },
            {
              title: 'Use "Solicitar sincronización"',
              description: 'Haga clic en el menú de opciones del dispositivo y seleccione "Solicitar sincronización". El backend enviará una señal al dispositivo para que actualice su configuración en la próxima conexión.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'problemas-comunes',
          text: 'Problemas comunes y cómo resolverlos',
        },
        {
          type: 'table',
          headers: ['Síntoma', 'Causa probable', 'Acción sugerida'],
          rows: [
            ['Dispositivo en estado "Sin conexión" por más de 24h', 'El usuario desinstalió la extensión o el equipo lleva tiempo apagado.', 'Confirme con el usuario que la extensión está instalada. Si corresponde, genere un nuevo token de instalación.'],
            ['Dispositivo en estado "Desactualizado" persistente', 'Problema de conectividad con el backend.', 'Pida al usuario que verifique su conexión a internet y que reinicie el navegador. Si el problema persiste, contáctenos.'],
            ['El dispositivo figura activo pero las políticas no se aplican', 'La política puede estar asignada a un grupo al que el usuario no pertenece.', 'Verifique la asignación de grupos del usuario y la configuración de la política.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: '¿El usuario reinstalió la extensión?',
          text: 'Si un usuario reinstala la extensión, necesitará volver a ingresar el token de instalación. Puede usar el mismo token si sigue vigente, o generar uno nuevo desde Configuración → Dispositivos → Nuevo Token.',
        },
      ],
    },
  ],
};
