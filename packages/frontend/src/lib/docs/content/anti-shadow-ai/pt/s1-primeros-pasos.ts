import type { DocSection } from '../../../types';

export const seccionPrimerosPasos: DocSection = {
  title: 'Primeiros Passos',
  chapters: [
    // ─── Manual 01: Visão geral da plataforma ──────────────────────────────────
    {
      slug: 'visao-geral-plataforma',
      title: 'Introdução ao Onefend',
      description: 'O que é o Onefend, qual problema ele resolve e como ele se encaixa na sua organização.',
      blocks: [
        {
          type: 'h2',
          id: 'o-que-e-onefend',
          text: 'O que é o Onefend?',
        },
        {
          type: 'p',
          text: 'Onefend é uma plataforma de governança e segurança para o uso de inteligência artificial no ambiente corporativo. Sua principal função é fornecer visibilidade e controle sobre como os funcionários da sua organização usam ferramentas externas de IA — como ChatGPT, Claude, Gemini ou Perplexity — a partir de seus dispositivos de trabalho.',
        },
        {
          type: 'h2',
          id: 'o-problema',
          text: 'O problema que ele resolve',
        },
        {
          type: 'p',
          text: 'Quando os funcionários usam ferramentas externas de IA sem supervisão, a organização perde a visibilidade sobre quais informações saem dos seus sistemas. Contratos, dados de clientes, código-fonte, credenciais e estratégias internas podem ser enviados para plataformas externas sem o conhecimento da equipe de segurança. Esse fenômeno é conhecido como Shadow AI.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Shadow AI e Shadow SaaS',
          text: 'O Shadow AI ocorre quando os funcionários adotam ferramentas de IA externas sem a aprovação corporativa. O Shadow SaaS é o fenômeno mais amplo do uso de qualquer aplicativo não autorizado. O Onefend aborda ambos a partir de uma única plataforma.',
        },
        {
          type: 'h2',
          id: 'como-funciona',
          text: 'Como o Onefend funciona',
        },
        {
          type: 'p',
          text: 'A plataforma opera por meio de três componentes que trabalham juntos:',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Extensão de navegador',
              description: 'Um agente leve instalado no Chrome ou Edge que analisa o conteúdo que o usuário digita antes de enviá-lo para qualquer plataforma de IA. Ele opera em segundo plano sem modificar a experiência do usuário.',
            },
            {
              title: 'Motor de análise',
              description: 'Ele avalia o conteúdo em tempo real para detectar padrões de dados sensíveis: informações pessoais, credenciais, dados financeiros, código proprietário e muito mais. Aplica a política definida por sua organização para cada caso.',
            },
            {
              title: 'Painel de administração',
              description: 'O portal da web a partir do qual os administradores configuram políticas, gerenciam usuários e aplicativos, monitoram eventos em tempo real e geram relatórios de atividade.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'para-quem',
          text: 'Para quem é essa plataforma?',
        },
        {
          type: 'table',
          headers: ['Função', 'O que fazem no Onefend'],
          rows: [
            ['Administrador', 'Configura a plataforma, gerencia usuários, define políticas e analisa relatórios.'],
            ['Analista de segurança', 'Monitora eventos, investiga incidentes e consulta o histórico de conversas.'],
            ['Viewer (Espectador)', 'Consulta painéis e relatórios sem a capacidade de modificar as configurações.'],
            ['Usuário final', 'Trabalha normalmente; Onefend age de forma invisível. Eles só percebem quando uma política exige sua atenção.'],
          ],
        },
        {
          type: 'h2',
          id: 'beneficios-principais',
          text: 'Benefícios principais',
        },
        {
          type: 'list',
          items: [
            'Visibilidade completa sobre quais ferramentas de IA a sua empresa usa e quem as usa.',
            'Controle granular por usuário, grupo ou por toda a organização.',
            'Detecção de dados sensíveis antes de saírem dos seus sistemas.',
            'Registro imutável de eventos para auditoria interna e relatórios.',
            'Implementação sem alterações na infraestrutura existente.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Compatibilidade com sua infraestrutura atual',
          text: 'Onefend não requer modificar sua rede, seus servidores ou suas ferramentas atuais. A extensão do navegador é suficiente para a maioria dos cenários.',
        },
      ],
    },

    // ─── Manual 02: Access and Initial Configuration ────────────────────────────
    {
      slug: 'acesso-configuracao-inicial',
      title: 'Acesso e Configuração Inicial',
      description: 'Como acessar o painel, configurar sua conta e registrar os primeiros dispositivos.',
      blocks: [
        {
          type: 'h2',
          id: 'primeiro-acesso',
          text: 'Primeiro acesso ao painel',
        },
        {
          type: 'p',
          text: 'A equipe do Onefend fornecerá as credenciais de acesso ao portal de administração durante o processo de integração. Com essas credenciais, o administrador designado acessa o painel pela primeira vez e configura a organização.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Entre no portal',
              description: 'Acesse com seu e-mail corporativo e a senha fornecida. Se a sua organização tiver habilitado o logon único (SSO), você pode usá-lo.',
            },
            {
              title: 'Configurar a autenticação de dois fatores (MFA)',
              description: 'No primeiro login, o sistema solicitará que você configure a autenticação de dois fatores por meio de um aplicativo autenticador (TOTP). Esta etapa é obrigatória para contas com funções de Administrador.',
            },
            {
              title: 'Revise as configurações da sua organização',
              description: 'Verifique se o nome, o domínio e o fuso horário da sua organização estão corretos. Esses dados afetam a forma como os eventos e os relatórios são exibidos.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Guarde suas credenciais',
          text: 'As credenciais de administrador concedem acesso total às configurações da plataforma e aos registros de atividades de toda a organização. Não as compartilhe e certifique-se de ativar o MFA logo no primeiro acesso.',
        },
        {
          type: 'h2',
          id: 'token-instalacao',
          text: 'Geração de token de instalação',
        },
        {
          type: 'p',
          text: 'Para que a extensão de navegador de um usuário seja vinculada à sua organização, ela precisa de um token de instalação. Esse token é exclusivo por organização e é gerado no painel de administração.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acesse Configurações → Dispositivos',
              description: 'No menu lateral do painel, acesse a seção de Dispositivos.',
            },
            {
              title: 'Gere um novo token',
              description: 'Clique em "Novo Token de Instalação". Você pode criar tokens com prazo de validade para um controle maior.',
            },
            {
              title: 'Distribua o token aos seus usuários',
              description: 'Compartilhe o token com segurança para os usuários que instalarão a extensão. O token será utilizado após a instalação.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'instalacao-extensao',
          text: 'Instalação da Extensão',
        },
        {
          type: 'p',
          text: 'Quando o usuário tem o token, o processo de instalação é o seguinte:',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Instale a extensão a partir da Chrome Web Store',
              description: 'Pesquise "Onefend" na Chrome Web Store ou acesse o link fornecido pelo seu administrador. Clique em "Adicionar ao Chrome".',
            },
            {
              title: 'Digite o token de instalação',
              description: 'Ao abrir a extensão pela primeira vez, o sistema solicitará o token fornecido por seu administrador. Digite-o e confirme.',
            },
            {
              title: 'Verificação automática',
              description: 'A extensão se conecta e registra o dispositivo. Em questão de segundos, o dispositivo aparece no painel do administrador como ativo.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Implantação em massa',
          text: 'Para organizações que precisam instalar a extensão em muitos dispositivos simultaneamente, o Onefend oferece a configuração via GPO para Windows e via MDM para macOS. Acesse o suporte para baixar esses scripts.',
        },
        {
          type: 'h2',
          id: 'verificar-instalacao',
          text: 'Verifique se está tudo funcionando',
        },
        {
          type: 'p',
          text: 'Verifique o bom funcionamento após seguir as diretrizes utilizando os seguintes meios:',
        },
        {
          type: 'list',
          items: [
            'O dispositivo aparece em Configuração → Dispositivos com o status "Ativo".',
            'O ícone de extensão no navegador exibe um indicador verde.',
            'Quando você acessa uma plataforma de IA monitorada, o evento aparece no painel de Eventos ao vivo.',
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'O usuário não percebe a extensão em uso normal',
          text: 'A menos que uma política exija intervenção alertando e instruindo que o usuário deve abortar o processamento do texto, este usuário jamais sentirá alterações.',
        },
      ],
    },
  ],
};
