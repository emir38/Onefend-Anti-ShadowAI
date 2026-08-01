import type { DocSection } from '../../../types';

export const seccionReportesIntegraciones: DocSection = {
  title: 'Relatórios e Integrações',
  chapters: [
    // ─── Manual 16: Integraciones ─────────────────────────────────────────────
    {
      slug: 'integracoes',
      title: 'Integrações externas',
      description: 'Como conectar a Onefend localmente a fluxos corporativos SIEM e comunicativos mapeados operantes integrados nativamente.',
      blocks: [
        {
          type: 'h2',
          id: 'disponiveis',
          text: 'Integrações gerais ativas',
        },
        {
          type: 'p',
          text: 'A Onefend possibilita notificar administradores base redirecionando ocorrências sistêmicas rastreadas logadas a aplicativos externos integrados gerando comodidade sem necessitar vigilâncias estritas logadas conectadas no console principal base na interface de dashboard logado do web app operativo focado.',
        },
        {
          type: 'table',
          headers: ['Módulo Integrado Local', 'Formatos mapeados originários', 'Resolutividade Sistêmica Interativa Ativa'],
          rows: [
            ['Slack', 'Avisos Sistêmicos Originais', 'Reporte direto gerando eventos originários de riscos críticos e operantes diretamente focando no canal de notificações.'],
            ['MS Teams', 'Avisos Focados na Comunicação e Colaboração', 'Fluxos rastreando restrições logísticas operantes nos departamentos via comunicação.'],
            ['Acesso SIEM', 'Direcionamentos em massa por logs (Forwarder integrado remoto focado base)', 'Fluxo estruturando o QRadar originário, Splunk e agregadores por logs de eventos base mapeados logados.'],
            ['Correio Web Original E-mail', 'Mapeamento focado local sistêmico de reporte logístico', 'Rotina automática alocando dados base cíclicos temporais processando envios focando caixas mapeadas focadas interligadas logadas base nativas'],
          ],
        },
        {
          type: 'h2',
          id: 'configuracao-slack',
          text: 'Roteamento via ferramentas de equipes corporativas (Web APIs Integradas Logadas Focado)',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Rota via Menu Central focado na interface base local web aplicativo',
              description: 'Opere a inclusão estrutural no console por Integrações focado logísticas no admin base.',
            },
            {
              title: 'Integrações e validações do token temporário base focado login',
              description: 'Aceite as liberações do portal focado da aplicação validando as origens dos tráfegos operantes logados.',
            },
            {
              title: 'Canal base original',
              description: 'Determine a matriz que rastreará focado via sistema nativo a listagem gerando visualização e reporte aos administradores base interativos logados das empresas originais processando os painéis focado nas aplicações de trabalho diário mapeadas local.',
            },
            {
              title: 'Trave focos por Risco (Grau avaliativo configurado)',
              description: 'Avisos devem se restringir aos altos danos sistêmicos (HIGH). Logs contínuos diários afetam fluxos e reduzem atenções globais focado operando volume base.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'siem-configuracoes',
          text: 'Matrizes via SIEM',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acesse seu servidor e liberação local.',
              description: 'Alinhe a estrutura syslog na rede operativa focando nos painéis gerais da integração.',
            },
            {
              title: 'IP, Hosts e Config Requerida',
              description: 'Estabeleça a saída por UDP/TCP configurada focado local processada.',
            },
            {
              title: 'Parametrização base nativa (Extensões configuráveis gerando formatos)',
              description: 'Utiliza esquemas de conversão nativo processando bases RFC ou CEF.',
            },
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Proteção de privacidade em tráfegos sistêmicos web focado integrados.',
          text: 'Encaminhamentos processam estritamente logs gerenciais (usuário original via terminal gerado base operativo na infra, datas de requisições de processo nativo e tipo de restrição alocado gerando reporte), nunca retransmitindo os blocos de textos avaliados confidencialmente base gerando exclusividade técnica via matriz de segurança configurada mapeada logísticamente na auditoria.',
        },
      ],
    },

    // ─── Manual 17: Webhooks ──────────────────────────────────────────────────
    {
      slug: 'webhooks',
      title: 'Tráfego local integrado Webhooks Focado Interligado Automático Operante',
      description: 'Estruturação base conectando saídas com serviços nativos do corporativo base mapeado processado gerencial logado ativo originando interatividades baseadas logadas nas APIs rastreáveis alocadas base local',
      blocks: [
        {
          type: 'h2',
          id: 'webhook-funcionalismo',
          text: 'Matriz Base Racional Operatória nativo',
        },
        {
          type: 'p',
          text: 'Roteamentos web operados nas requisições da plataforma geram contatos via conexões HTTP transferindo alertas diretamente baseados aos portais organizacionais originais ou outras nuvens gerando processamento de terceiros base (Interligando Zapier). Diferenciando integrações mapeadas ativas fechadas nas configurações originais base do console focado via portal web admin.',
        },
        {
          type: 'h2',
          id: 'processo-nativo-alocado',
          text: 'Submissão de links e estrutura geral operativa de conexão ativa logada no tráfego.',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acesse roteador estruturado em Configurações Gerais focado Webhook do menu.',
              description: 'Aponte o link estrutural original de redirecionamento focado alçado.',
            },
            {
              title: 'Endereço logado nas conexões operantes geradas logísticas nativas de tráfego (HTTPS apenas)',
              description: 'Indique origens configuráveis via HTTPS. Sistemas sem bloqueios geram restrições forçadas negadas.',
            },
            {
              title: 'Alocação por gatilhos focado na interligação de alertas logados interativos.',
              description: 'Defina ações como restrições focadas, aprovações, ou análises base processando fluxo.',
            },
            {
              title: 'Autenticações configuráveis.',
              description: 'Chaves ativas certificam envios do lado Onefend configurado ativado, impedindo intervenções falsificadas e spams de outros provedores na rota mapeada comunicativa focado originariamente ativados de base local geral processada da nuvem gerando estabilidade focada via segurança local e interligações focadas operativas gerando restrição base.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'conteudo-base-gerado',
          text: 'Detalhes rastreados e remetidos no corpo mapeado estruturado logísticamente nas bases alocadas originais focadas nas chamadas POST.',
        },
        {
          type: 'p',
          text: 'Bases retornam dados cruciais (sem revelações confidenciais estruturais focado) de formato nativo interativo JSON logado.',
        },
        {
          type: 'list',
          items: [
            'ID base contínuo focado iterativo.',
            'Crono Temporalidade alocada (ISO UTC).',
            'Perfil originador da submissão processada gerando a identificação pontual base.',
            'Tipologias focadas detectadas mapeadas ativadas interativamente no ciclo e risco referencial associado operante.'
          ],
        },
        {
          type: 'h2',
          id: 'erros-redes-conectoras',
          text: 'Conexões Interrompidas no Fluxo Processado Logado Original Operativo.',
        },
        {
          type: 'p',
          text: 'Quedas no receptor forçarão lógicas reativas e cíclicas gerando tentativas espaçadas. Abortamentos logísticos focados encerram requisições não respondidas gerando registro estruturado focado no portal logado administrador dashboard original da OneFend processando avisos no terminal mapeado interativamente no registro do usuário gerencial base log.',
        },
      ],
    },

    // ─── Manual 18: Generación de reportes ────────────────────────────────────
    {
      slug: 'emissao-relatorios',
      title: 'Emissões base focado em relatórios documentados sistêmicos originais ativados base.',
      description: 'Como compilar estatísticas gerando avaliativos configurados corporativos em formatos exportáveis focando a organização macro focada nativamente nos acessos locais interativos do administrador.',
      blocks: [
        {
          type: 'h2',
          id: 'modelagem-base',
          text: 'Direcionais Sistêmicos focados nos resultados logados operacionais e operantes',
        },
        {
          type: 'p',
          text: 'Os módulos documentam atividades focando consolidação. Elaborados sob perfil de acesso direcionam dados executivos aos CEOs mapeados nativos e matrizes rastreando detalhes para o CISO logado gerador do sistema focando na otimização central de métricas.',
        },
        {
          type: 'table',
          headers: ['Formatação base ativa', 'Auditório alvo configurado base focado alocadas', 'Métricas interligadas ativas'],
          rows: [
            ['Dados Executivos (Top Level)', 'Diretorias de Alto Risco / CISO', 'Resumos analíticos mapeando fluxos e desvios pontuais globais originais. Gráficos de riscos acionados globalmente.'],
            ['Por usuário originário mapeado', 'RH e Auditores corporativos em monitoria', 'Mapeamento focado local do analista por requisição base de envios.'],
            ['Por App base integrada no sistema restritivo ativado nativo alocado base', 'Gestores de riscos sistêmicos de rede', 'Matriz indicando perdas focadas por plataforma original gerando análise.'],
            ['Inventários originários globais interligados nativamente no fluxo macro rastreando aplicações', 'Departamentos em governança corporativa base. CISO.', 'Bases com score operacional dos serviços mapeados.'],
          ],
        },
        {
          type: 'h2',
          id: 'operabilidade',
          text: 'Gerando extrações matriz',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Rota de ação (Menu Relatório -> Configuração base emissor Novo)',
              description: 'Opere configurações iniciais por formatação de estilo de leitura alocada logística operante.',
            },
            {
              title: 'Determinação temporal do mapeamento estrutural processado via registros base',
              description: 'Especifique as escalas da temporalidade de extração logada base focado originais geradas ativamente no console operacional nativo interativo global.',
            },
            {
              title: 'Extrações operantes ativas (Download operando CSV ou matrizes textuais estruturadas operando o PDF gerado interligado na aplicação ativo)',
              description: 'Download base imediato focando as interações no dispositivo de origem nativo que requer. Os mesmos perdem disponibilidade contínua processando os logs rotativos. Emita e arquive operante nativo base nas organizações.',
            },
          ],
        },
      ],
    },

    // ─── Manual 19: Dashboards y visualización ────────────────────────────────
    {
      slug: 'visoes-graficas',
      title: 'Módulo gráfico nativo focado por Painéis Logísticos Avaliativos Estruturais Gerais (Dashboard Operativo).',
      description: 'Painel contínuo configurado local ativo focado via fluxos de interação visualizados nos administradores originais mapeado.',
      blocks: [
        {
          type: 'h2',
          id: 'dash-nativos',
          text: 'Vigilância contínua alocada em telas de alto foco',
        },
        {
          type: 'p',
          text: 'Visão direta aos painéis rastream incidências integradas base mapeadas globalmente e de forma rápida contínua ativando percepções gerenciais das tendências dos processos nos bloqueios focado operacional da base OneFend login console admin web panel dashboard ativo no fluxo sistemático de origem central ativa corporativa global de forma logada ativando operabilidade geral focado localmente e ativando painéis mapeados focando visibilidade visual sistêmica e orgânica focado.',
        },
        {
          type: 'h2',
          id: 'widgets',
          text: 'Painéis restritos organizados focando em módulos configuráveis base',
        },
        {
          type: 'table',
          headers: ['Painel operante', 'O que foca ao gestor alocado e integrado no console admin base original operado via painel mapeado.'],
          rows: [
            ['Avaliativo do Risco Focado Alocado nas Ferramentas Nativas Operantes Mapeadas Sistêmico logado local e orgânico na estrutura e fluxos base', 'Grafismos distribuindo volumes focado nas métricas (High, Med, Low).'],
            ['Uso corporativo ativo local', 'Volumes focados da interação nativa processando aplicativos. Visão de dependência IA original.'],
            ['Tabelamento Focado de Acesso restritivo de uso de equipe orgânica logada ativa operando internamente no terminal original e processado configurado focando nas métricas e volumes focados e operando acesso restrito nas políticas operantes orgânicas do console central ativado base no terminal focado via app', 'Bloqueios originários mapeados ativamente.'],
            ['Extensões base locadas.', 'Mapeamento focado local do ativo da frota de PCs mantidos.'],
          ],
        },
        {
          type: 'h2',
          id: 'flexibilidade',
          text: 'Flexibilidade orgânica focado local sistêmica.',
        },
        {
          type: 'p',
          text: 'Moldes operam logísticas de montagem modular base. O usuário administrador focado estrutura a visão analítica alocada ativando e ocultando áreas focadas sem destruir visões originais dos demais.',
        },
        {
          type: 'h2',
          id: 'viewer',
          text: 'Compartilhamento Viewer logado focado',
        },
        {
          type: 'p',
          text: 'Links temporários enviam visões aos membros base não logados originais focado da equipe operacional focado na estrutura. Cadastros classificados base VIEWER acessam interfaces sem poderes alterativos das parametrizações gerando interatividades estritas focando somente acompanhamentos das incidências rastreáveis originárias macro sem pormenoreizações de acessos em conversas sensíveis logadas confidencialmente operando logs analíticos focado alocado no console nativo.',
        },
      ],
    },

    // ─── Manual 20: Analytics y métricas avanzadas ────────────────────────────
    {
      slug: 'analiticos-macrometricas',
      title: 'Soluções logísticas e de inteligências focadas em avaliativos globais e anomalias sistêmicas (Analytics & Trends)',
      description: 'Métricas gerais estruturando o futuro corporativo nativo processando logs analíticos originais lendo estruturas focado na auditoria ativando interatividades focadas analiticamente base e anomalias base na plataforma base logada contínua.',
      blocks: [
        {
          type: 'h2',
          id: 'panorama-log',
          text: 'Analytics Estruturais Logados Originais Integrativos no Avaliativo de Mapeamento Nativo Corporativo do Console Admin Panel Dashboard Base e ativo',
        },
        {
          type: 'p',
          text: 'Este ambiente compila dados atipificados não fáceis focando rastreios normais do fluxo diário. Tendências anômalas focam nos desvios focando avaliativos originais baseadas focado configuradas pelas plataformas analíticas originárias na base de processamentos sistêmicos analíticos focado em algoritmos orgânicos do OneFend focado gerando análises profundas no console web mapeado.',
        },
        {
          type: 'p',
          text: 'Permissividade exclusiva e direta aos Administradores logados pontualmente com perfis de segurança sistêmico geral e focado logísticas na matriz.',
        },
        {
          type: 'h2',
          id: 'matrizes',
          text: 'Tratativas Operantes Focadas Ativas Interligadas Isoladamente e Integradas Logadas nativas e processadas centralizadas',
        },
        {
          type: 'list',
          items: [
            'Proporção pontual de tráfego focado: Averigua desvios de usuários originários base alocados focando avaliativos nativos acima das normatizações operantes nativas base no ciclo.',
            'Integração alocada de ferramentas focadas: Entender fluxos processando adoções corporativas mapeando softwares de base configurados originais integrativos na escala original de processos.',
            'Tendência operatória do Risco. O volume logado focado restrito cai ou amplia focado no corporativo com as ferramentas nativas geradas interligadas logísticas no tempo base logado operante ativado mapeado sistematicamente processando análise estrutural integrada gerencial original de avaliações focado via IA originais locais.',
          ],
        },
        {
          type: 'h2',
          id: 'anomalias-detect',
          text: 'Analisando desvios estruturais operantes',
        },
        {
          type: 'p',
          text: 'A IA mapeadora levanta situações de quebras focadas originando alertas focado ao administrador na ferramenta isolada base de Analytics estrutural. Exemplos focados integrando base: Adotantes repentinos focando volumes altos de conversações logadas mapeadas operando interações que quebram picos focado nas normatizações das últimas semanas de interatividades logadas sistêmicas ativadas. Esses desvios configuram gatilhos apenas orientativos e não bloqueantes logados focando o estudo e averiguações do administrador ativo base logística central operante e ativado na origem central nativa.',
        },
      ],
    },
  ],
};
