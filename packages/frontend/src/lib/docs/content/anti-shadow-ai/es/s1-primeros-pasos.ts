import type { DocSection } from '../../../types';

export const seccionPrimerosPasos: DocSection = {
  title: 'Primeros Pasos',
  chapters: [
    // ─── Manual 01: Resumen de la plataforma ──────────────────────────────────
    {
      slug: 'resumen-plataforma',
      title: 'Introducción a Onefend',
      description: 'Qué es Onefend, qué problema resuelve y cómo encaja en su organización.',
      blocks: [
        {
          type: 'h2',
          id: 'que-es-onefend',
          text: '¿Qué es Onefend?',
        },
        {
          type: 'p',
          text: 'Onefend es una plataforma de gobernanza y seguridad para el uso de inteligencia artificial en el entorno corporativo. Su función principal es dar visibilidad y control sobre cómo los empleados de su organización utilizan herramientas de IA externas — como ChatGPT, Claude, Gemini o Perplexity — desde sus dispositivos de trabajo.',
        },
        {
          type: 'h2',
          id: 'el-problema',
          text: 'El problema que resuelve',
        },
        {
          type: 'p',
          text: 'Cuando los empleados utilizan herramientas de IA externas sin supervisión, la organización pierde visibilidad sobre qué información sale de sus sistemas. Contratos, datos de clientes, código fuente, credenciales y estrategias internas pueden ser enviados a plataformas externas sin que nadie en el equipo de seguridad lo sepa. Este fenómeno se conoce como Shadow AI.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Shadow AI y Shadow SaaS',
          text: 'El Shadow AI ocurre cuando los empleados adoptan herramientas de IA externas sin aprobación corporativa. El Shadow SaaS es el fenómeno más amplio de uso de cualquier aplicación no autorizada. Onefend aborda ambos desde una misma plataforma.',
        },
        {
          type: 'h2',
          id: 'como-funciona',
          text: 'Cómo funciona Onefend',
        },
        {
          type: 'p',
          text: 'La plataforma opera a través de tres componentes que trabajan en conjunto:',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Extensión del navegador',
              description: 'Un agente ligero instalado en Chrome o Edge que analiza el contenido que el usuario escribe antes de enviarlo a cualquier plataforma de IA. Opera en segundo plano sin modificar la experiencia del usuario.',
            },
            {
              title: 'Motor de análisis',
              description: 'Evalúa el contenido en tiempo real para detectar patrones de datos sensibles: información personal, credenciales, datos financieros, código propietario y más. Aplica la política definida por su organización para cada caso.',
            },
            {
              title: 'Panel de administración',
              description: 'El portal web desde el que los administradores configuran políticas, gestionan usuarios y aplicaciones, supervisan eventos en tiempo real y generan reportes de actividad.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'para-quien',
          text: '¿Para quién es esta plataforma?',
        },
        {
          type: 'table',
          headers: ['Rol', 'Qué hace en Onefend'],
          rows: [
            ['Administrador', 'Configura la plataforma, gestiona usuarios, define políticas y revisa reportes.'],
            ['Analista de seguridad', 'Monitorea eventos, investiga incidentes y consulta el historial de conversaciones.'],
            ['Viewer', 'Consulta dashboards y reportes sin capacidad de modificar la configuración.'],
            ['Usuario final', 'Trabaja normalmente; Onefend actúa en segundo plano. Solo lo nota cuando una política requiere su atención.'],
          ],
        },
        {
          type: 'h2',
          id: 'beneficios',
          text: 'Beneficios principales',
        },
        {
          type: 'list',
          items: [
            'Visibilidad completa sobre qué herramientas de IA usa su empresa y quién las usa.',
            'Control granular por usuario, grupo o toda la organización.',
            'Detección de datos sensibles antes de que salgan de sus sistemas.',
            'Registro inmutable de eventos para auditoría interna y reportes.',
            'Implementación sin cambios en la infraestructura existente.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Compatibilidad con su stack actual',
          text: 'Onefend no requiere modificar su red, sus servidores ni sus herramientas actuales. La extensión del navegador es suficiente para la mayoría de los escenarios de uso.',
        },
      ],
    },

    // ─── Manual 02: Acceso y configuración inicial ────────────────────────────
    {
      slug: 'acceso-configuracion-inicial',
      title: 'Acceso y configuración inicial',
      description: 'Cómo acceder al panel, configurar su cuenta y registrar los primeros dispositivos.',
      blocks: [
        {
          type: 'h2',
          id: 'primer-acceso',
          text: 'Primer acceso al panel',
        },
        {
          type: 'p',
          text: 'El equipo de Onefend le proveerá las credenciales de acceso al portal de administración durante el proceso de alta. Con esas credenciales, el administrador designado accede al panel por primera vez y configura la organización.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Ingrese al portal',
              description: 'Acceda con su email corporativo y la contraseña provista. Si su organización tiene habilitado el inicio de sesión único (SSO), puede usarlo directamente.',
            },
            {
              title: 'Configure la autenticación de dos factores (MFA)',
              description: 'Al primer ingreso, el sistema le pedirá que configure la autenticación de dos factores mediante una aplicación de autenticación (TOTP). Este paso es obligatorio para cuentas con rol de Administrador.',
            },
            {
              title: 'Revise la configuración de su organización',
              description: 'Verifique que el nombre, el dominio y la zona horaria de su organización sean correctos. Estos datos afectan la presentación de eventos y reportes.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Custodie sus credenciales',
          text: 'Las credenciales de administrador otorgan acceso completo a la configuración de la plataforma y a los registros de actividad de toda la organización. No las comparta y asegúrese de activar MFA en el primer ingreso.',
        },
        {
          type: 'h2',
          id: 'token-enrollment',
          text: 'Generación del token de instalación',
        },
        {
          type: 'p',
          text: 'Para que la extensión del navegador de un usuario quede vinculada a su organización, necesita un token de instalación. Este token es único por organización y se genera desde el panel de administración.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Vaya a Configuración → Dispositivos',
              description: 'En el menú lateral del panel, acceda a la sección de Dispositivos.',
            },
            {
              title: 'Genere un nuevo token',
              description: 'Haga clic en "Nuevo Token de Instalación". Puede crear tokens con fecha de vencimiento para mayor control.',
            },
            {
              title: 'Distribuya el token a sus usuarios',
              description: 'Comparta el token de forma segura con los usuarios que deban instalar la extensión. Cada usuario lo ingresará en la extensión al primer uso.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'instalacion-extension',
          text: 'Instalación de la extensión',
        },
        {
          type: 'p',
          text: 'Una vez que el usuario tiene el token, el proceso de instalación es el siguiente:',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Instale la extensión desde Chrome Web Store',
              description: 'Busque "Onefend" en la Chrome Web Store o acceda al enlace que le provea su administrador. Haga clic en "Agregar a Chrome".',
            },
            {
              title: 'Ingrese el token de instalación',
              description: 'Al abrir la extensión por primera vez, el sistema le solicitará el token provisto por su administrador. Ingréselo y confirme.',
            },
            {
              title: 'Verificación automática',
              description: 'La extensión se conecta al backend y registra el dispositivo. En cuestión de segundos, el dispositivo aparece en el panel del administrador como activo.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Despliegue masivo',
          text: 'Para organizaciones que necesitan instalar la extensión en muchos dispositivos a la vez, Onefend ofrece configuración mediante Group Policy (GPO) para Windows y perfiles MDM para macOS. Contacte al equipo de soporte para obtener los archivos de configuración correspondientes.',
        },
        {
          type: 'h2',
          id: 'verificar-instalacion',
          text: 'Verificar que todo funciona',
        },
        {
          type: 'p',
          text: 'Una vez que la extensión esté instalada y el token configurado, puede confirmar que todo está operativo de las siguientes maneras:',
        },
        {
          type: 'list',
          items: [
            'El dispositivo aparece en Configuración → Dispositivos con estado "Activo".',
            'El ícono de la extensión en el navegador muestra un indicador verde.',
            'Al acceder a una plataforma de IA monitoreada, el evento aparece en el panel de Eventos en tiempo real.',
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'El usuario no percibe la extensión en uso normal',
          text: 'Salvo cuando una política activa requiere mostrar una advertencia o bloquear una acción, el usuario final no percibe ningún cambio en su experiencia de uso de las herramientas de IA.',
        },
      ],
    },
  ],
};
