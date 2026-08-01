import type { DocSection } from '../../../types';

export const seccionMonitoreoAuditoria: DocSection = {
  title: 'Monitoramento e Auditoria',
  chapters: [
    // ─── Manual 09: Monitoreo de eventos ──────────────────────────────────────
    {
      slug: 'monitoramento-eventos',
      title: 'Monitoramento de eventos',
      description: 'Como utilizar o painel de eventos para supervisionar a atividade em tempo real.',
      blocks: [
        {
          type: 'h2',
          id: 'painel-eventos',
          text: 'O painel de eventos',
        },
        {
          type: 'p',
          text: 'O painel de Eventos é a visão central de operações do Onefend. Ele exibe em tempo real todas as interações que a extensão registrou nos dispositivos de sua organização. A partir daqui, você pode supervisionar a atividade, investigar situações específicas e exportar dados para análise externa.',
        },
        {
          type: 'h2',
          id: 'filtros-disponiveis',
          text: 'Filtros disponíveis',
        },
        {
          type: 'table',
          headers: ['Filtro', 'Opções'],
          rows: [
            ['Usuário', 'Buscar por nome ou e-mail para ver a atividade de uma pessoa específica.'],
            ['Aplicativo', 'Filtrar por plataforma de IA (ChatGPT, Claude, Gemini, etc.).'],
            ['Nível de risco', 'HIGH, MEDIUM, LOW.'],
            ['Ação tomada', 'BLOCK, WARN, LOG, ALLOW.'],
            ['Intervalo de datas', 'Consultas de até 90 dias em uma única pesquisa.'],
            ['Tipo de dado detectado', 'Filtrar pela categoria de dados que acionou o evento.'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Combine filtros para investigações específicas',
          text: 'Para investigar o comportamento de um usuário específico em um determinado período, combine o filtro Usuário com um intervalo de datas delimitado. Você pode exportar o resultado filtrado como CSV diretamente da visualização.',
        },
        {
          type: 'h2',
          id: 'detalhe-evento',
          text: 'Detalhes de um evento',
        },
        {
          type: 'p',
          text: 'Ao clicar em qualquer evento da lista, o painel de detalhes é aberto com as seguintes informações:',
        },
        {
          type: 'list',
          items: [
            'Usuário que gerou o evento e dispositivo a partir do qual operou.',
            'Plataforma de IA envolvida.',
            'Data e hora do evento.',
            'Tipo de dado detectado e nível de risco atribuído.',
            'Ação tomada pela plataforma (BLOCK, WARN, LOG, ALLOW).',
            'Política que gerou a ação.',
            'Evidência ocultada: fragmento do conteúdo com os dados sensíveis redigidos.',
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'As evidências estão sempre ocultadas',
          text: 'O painel nunca mostra o conteúdo original em texto simples. O que é mostrado é uma versão na qual os dados confidenciais detectados foram substituídos por marcadores (redação). Isso protege a privacidade do usuário e está em conformidade com o princípio de exposição mínima de dados.',
        },
        {
          type: 'h2',
          id: 'exportar-eventos',
          text: 'Exportar eventos',
        },
        {
          type: 'p',
          text: 'O botão "Exportar CSV" no cabeçalho do painel gera um arquivo com todos os eventos visíveis de acordo com os filtros ativos no momento. Os campos exportados incluem todos os metadados do evento, mas não o conteúdo das conversas.',
        },
        {
          type: 'h2',
          id: 'acesso-funcao',
          text: 'Acesso ao painel de acordo com a função',
        },
        {
          type: 'table',
          headers: ['Função', 'Acesso a eventos'],
          rows: [
            ['ADMIN', 'Todos os eventos de todos os usuários.'],
            ['ANALYST', 'Todos os eventos de todos os usuários.'],
            ['VIEWER', 'Não tem acesso ao painel de eventos individuais. Apenas vê os painéis globais (dashboards).'],
            ['USER', 'Pode visualizar apenas os próprios eventos a partir do próprio perfil.'],
          ],
        },
      ],
    },

    // ─── Manual 10: Análisis de conversaciones ─────────────────────────────────
    {
      slug: 'analise-conversas',
      title: 'Análise de conversas',
      description: 'Como revisar profundamente as interações com as ferramentas de IA.',
      blocks: [
        {
          type: 'h2',
          id: 'o-que-e-analise',
          text: 'O que é a análise de conversas?',
        },
        {
          type: 'p',
          text: 'O módulo Análise de Conversas permite que você revise detalhadamente as interações que geraram eventos na plataforma. Ao contrário do painel de eventos — que mostra uma lista de incidentes — , este módulo agrupa eventos por sessão de conversa e fornece todo o contexto de cada interação.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Apenas conversas com eventos são analisadas',
          text: 'O Onefend não captura ou armazena sessões inteiras. Ele só armazena fragmentos de textos que envolverem deteções de dados restritivos sensíveis acionando interatividades sistêmicas.',
        },
        {
          type: 'h2',
          id: 'acessar-conversas',
          text: 'Como acessar as análises',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acesse o Painel base de Eventos.',
              description: 'Busque o evento em análise focado via log de listagem geral da auditoria base.',
            },
            {
              title: 'Inspecione a conversação ativa',
              description: 'Interações gravadas exibirão botão focado ("Ver conversas").',
            },
            {
              title: 'Revisão redacional e confidencial contínua da análise',
              description: 'Painéis restritos expõem dados ocultos evidenciando marcadores operantes nos blocos confidenciais capturados nos fluxos base.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'dados-disponiveis',
          text: 'Informações detalhadas focadas ativas no detalhamento da base analítica',
        },
        {
          type: 'list',
          items: [
            'Ferramenta pública ativa focado no processo (Ex.: chatgpt web focado base).',
            'Usuários de origem logado identificando IPs e dispositivos locais mapeados originais via matriz e extensões.',
            'Métricas cronológicas: Tempo temporal integrado da seção temporal base conectada operante contínua restritiva no painel interativo.',
            'Classificação sensível tipificando o bloqueio acionado e base de alertas processados.',
            'Tabela gerencial exibindo ações contínuas processando os eventos em cada bloco submetido ativamente no fluxo base.',
            'Risco focado consolidado na matriz das comunicações processadas logadas de forma interativa restrita operativa geral logada focando interatividade.',
          ],
        },
        {
          type: 'h2',
          id: 'marcar-revisar',
          text: 'Sinalização orientativa focada para resoluções em interatividades e verificações logadas do fluxo.',
        },
        {
          type: 'p',
          text: 'Sistemas integrados ativam opções processando status orientadores "Aprovados", "Sob avaliação de fluxo" ou "Submetido" visando categorizações gerenciais rastreando operatividade para avaliadores base do sistema.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Restritivas acessivas aos executivos não integrados.',
          text: 'Visão processadas focando nos módulos analógicos funcionam baseados unicamente focando nos Analistas de rotina base focada operante no sistema (ANALYST e originários originais administradores ADMIN do fluxo base).',
        },
      ],
    },

    // ─── Manual 11: Auditoría y compliance ────────────────────────────────────
    {
      slug: 'auditoria-conformidade',
      title: 'Auditoria e Compliance',
      description: 'Estruturação geral macro focada nas configurações, relatórios originais de resoluções de fluxo e conformidades da plataforma integrada logística.',
      blocks: [
        {
          type: 'h2',
          id: 'logs-admin',
          text: 'Estruturas operacionais base orgânica e logs focadas nas operações administrativas gerais mapeadas contínuas',
        },
        {
          type: 'p',
          text: 'Rastreios operam mapeando todas atitudes focadas geradas por controles integrados base via painéis por administradores processando dados operando tráfegos de inserções base gerando bloqueios ou mapeios contínuos.',
        },
        {
          type: 'p',
          text: 'Registros restritivos contínuos são fixos focado integrando bases lógicas processadas mantidas na auditoria, bloqueando remoções originadas por gerentes isolados via base de log do console original do armazenamento base configurável do painel administrativo logado.',
        },
        {
          type: 'table',
          headers: ['Logs Operativos Base Identificados pelo Console Administrativo Nativo', 'Tratativas operantes integradas'],
          rows: [
            ['Hierarquia e Grupos Configurados Local.', 'Administração mapeada base de criação focando perfis.'],
            ['Tabelamento via política estruturada.', 'Avaliação na edição global focado no bloqueio ou liberação focado nativa nas configurações gerais pontuais operadas pelo admin ativado.'],
            ['Alterações de matriz nativa', 'Manipulando domínios (White list) temporalidades integradas (Fuso horário) locais e logísticos.',],
            ['Monitoramento em aplicativos estruturados na web ativa interligados focado no rastreio da empresa orgânica', 'Exclusão integrada baseada focando em liberação e mapeio bloqueador isoladamente operada focado base no mapeamento.'],
            ['Investigação confidencial restrita analítica ativa no painel mapeada', 'Rastreio nas consultas originais base logísticas focando acesso operado nos textos de auditoria processados via painel do console dashboard focado gerando a inspeção gerada integrando o painel OneFend console ativado de forma originária processando o foco no admin logado interativo operante ativo na matriz.'],
          ],
        },
        {
          type: 'h2',
          id: 'acesso-auditoria',
          text: 'Como chegar nas tratativas auditadas local base orientativas.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Rota de Auditoria pelo menu base principal ativo configurado logado do portal.',
              description: 'Requer privilégio de Admin para liberar estrutura de interface ativa logada gerencial no sistema.',
            },
            {
              title: 'Configura o filtro gerador',
              description: 'Permissividade por nome de gerenciador foco interativo gerando filtros por atuação logada na ferramenta nativa originária processando rastreio temporal estruturado focado de avaliações alocadas no período focado configurando dados de interações alocadas pelo painel ativo central base na plataforma.',
            },
            {
              title: 'Exporte operante matriz isolado nativo ativo.',
              description: 'Gere extrações orgânicas estruturadas focados em CSV para tratamento logístico base externamente configurado em ferramentas e planilhas dinâmicas isoladamente alocadas nativamente por analistas externos e originários focado isolado do console base OneFend admin portal log operante central.',
            },
          ],
        },
      ],
    },

    // ─── Manual 13: Logs del sistema y diagnóstico ────────────────────────────
    {
      slug: 'logs-diagnosticos',
      title: 'Ações contínuas, Diálogos do log original, matriz e diagnósticos do servidor e extensões integradas locais focadas em logs.',
      description: 'Orientativa base direcionando focado a tratativas focado no contato em caso base original integrando de forma suportada e processando avaliações em sistema focado originais locais configuráveis no portal integrado processado nativo log.',
      blocks: [
        {
          type: 'h2',
          id: 'proposito',
          text: 'Funcionalismo ativo na estrutura focando logs logísticos gerados pela central sistêmica.',
        },
        {
          type: 'p',
          text: 'Tais ferramentas alocam tratativas técnicas não logadas do cenário administrativo focado no ambiente e configurado originais do processo. Ele avalia quedas temporais nativas de conexões, fluxos e bugs originais rastreando extensões locais não lidas nativamente pelo banco logado focado ativado originário processando requisições com atrasos logísticos orgânicos. Fatores exclusivamente originados pelo sistema original técnico.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Perfis de exclusão originadas locais focado integrando bases analíticas técnicas operadas apenas ao ADMIN focando na estrutura do portal.',
          text: 'Logs e métricas focados da inteligência em códigos são privativos focado de administração processando dados.',
        },
        {
          type: 'h2',
          id: 'indices-log',
          text: 'Níveis de tratamento paramétrico rastreando dados',
        },
        {
          type: 'table',
          headers: ['Tipificação', 'Mapeamento Geral base logado operacional original.'],
          rows: [
            ['INFO', 'O normal diário focando em tráfego alocado nativo ativo sem perdas estruturais operando.'],
            ['WARN', 'Notificações exigindo atenções perante retardamentos operados temporais base nativo e contínuo no fluxo.'],
            ['ERROR', 'O sistema opera perdas. Interrupções ou problemas que limitem conexões impedindo monitoria contínua forçam o sistema nativo ativado a criar exclusões de processamento alocando registros baseadas focado em perdas lidas.'],
          ],
        },
        {
          type: 'h2',
          id: 'troubleshoot',
          text: 'Suporte Focado Operacional Isolado por Dicas.',
        },
        {
          type: 'table',
          headers: ['Sintomas Logicos Rastreados Ativos e Identificados Base', 'Processamento sugerido para contenção base nativa alocada logada processada.'],
          rows: [
            ['Dispositivos "Desconectados" por horas processando perdas estruturais e operacionais nativas alocadas e contínuas logadas', 'Identifique e comunique focando originariamente nas extensões interligadas se o originário está conectado na rede base do computador original ativo focado na internet local. Processar novo escopo focando na rede é viável via tokens sistêmicos originais operantes base no log global nativa.'],
            ['Eventos não geram listas e somem na leitura do servidor original focado painel analítico', 'Processamentos não logados. Vá as configs e rastreie status local via Dispositivos interligados processando verificação logocêntrica e avaliações gerais locais processando os painéis base originais nativamente gerados do console focado via verificação orgânica focado log.'],
          ],
        },
      ],
    },
  ],
};
