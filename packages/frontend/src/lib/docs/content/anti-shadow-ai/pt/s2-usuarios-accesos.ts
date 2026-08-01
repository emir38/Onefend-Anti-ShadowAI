import type { DocSection } from '../../../types';

export const seccionUsuariosAccesos: DocSection = {
  title: 'Usuários e Acessos',
  chapters: [
    // ─── Manual 03: Gestão de usuários ──────────────────────────────────────
    {
      slug: 'gestao-usuarios',
      title: 'Gestão de usuários',
      description: 'Como adicionar, modificar e desativar usuários na plataforma.',
      blocks: [
        {
          type: 'h2',
          id: 'usuarios-no-onefend',
          text: 'Usuários no Onefend',
        },
        {
          type: 'p',
          text: 'Toda pessoa que interage com a plataforma — seja como administrador, analista ou usuário final protegido — tem um perfil de usuário no Onefend. Pelo painel, o administrador gerencia todo o ciclo de vida de todos os usuários da organização.',
        },
        {
          type: 'h2',
          id: 'adicionar-usuarios',
          text: 'Como adicionar usuários',
        },
        {
          type: 'p',
          text: 'Existem três maneiras de adicionar usuários à plataforma:',
        },
        {
          type: 'table',
          headers: ['Método', 'Quando usar'],
          rows: [
            ['Convite por e-mail', 'Para adicionar usuários individualmente. O usuário recebe um e-mail com um link de ativação.'],
            ['Importação em lote (CSV)', 'Para adicionar vários usuários de uma vez. Você carrega um arquivo com nome, e-mail e função atribuída.'],
            ['Sincronização de diretório (SSO)', 'Para organizações com o Azure AD, o Google Workspace ou outro provedor de identidade. Os usuários são sincronizados automaticamente.'],
          ],
        },
        {
          type: 'h2',
          id: 'convite-individual',
          text: 'Convite individual',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Acesse Usuários → Novo Usuário',
              description: 'No painel de administração, acesse a seção Usuários e clique em "Novo Usuário".',
            },
            {
              title: 'Preencha os dados do usuário',
              description: 'Insira o e-mail corporativo, o nome completo e selecione a função que ele terá na plataforma.',
            },
            {
              title: 'Atribua o usuário a grupos (opcional)',
              description: 'Você pode atribuí-lo a um ou mais grupos nesta etapa. Os grupos definem quais políticas são aplicadas ao usuário.',
            },
            {
              title: 'Envie o convite',
              description: 'O usuário recebe um e-mail com um link de ativação. Eles têm 48 horas para ativar sua conta. Você pode reenviar o convite a partir da lista de usuários se o prazo se esgotar.',
            },
          ],
        },
        {
          type: 'h2',
          id: 'grupos',
          text: 'Gestão de grupos',
        },
        {
          type: 'p',
          text: 'Os grupos permitem aplicar políticas de segurança a conjuntos de usuários de forma eficiente. Em vez de configurar uma política usuário por usuário, ela é definida no nível do grupo e todos os seus membros a herdam automaticamente.',
        },
        {
          type: 'list',
          items: [
            'Um usuário pode pertencer a vários grupos simultaneamente.',
            'Se um usuário pertencer a grupos com políticas diferentes para o mesmo padrão, a política mais restritiva será aplicada.',
            'Grupos podem ser criados a partir de Usuários → Grupos → Novo Grupo.',
          ],
        },
        {
          type: 'h2',
          id: 'desativar-usuarios',
          text: 'Desativar e excluir usuários',
        },
        {
          type: 'p',
          text: 'Quando um funcionário deixa a organização ou muda de função, é importante gerenciar o acesso dele de forma imediata:',
        },
        {
          type: 'table',
          headers: ['Ação', 'Efeito'],
          rows: [
            ['Desativar', 'O usuário perde o acesso ao painel e a extensão para de funcionar em seu dispositivo. Seus registros históricos são preservados.'],
            ['Excluir', 'Exclui o perfil do usuário. Seus históricos são preservados pelo período de retenção configurado.'],
            ['Revogar dispositivo', 'Desvincula a extensão de um dispositivo específico sem afetar a conta do usuário.'],
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Revogue o acesso para saídas imediatas',
          text: 'É recomendável desativar o usuário a partir do painel no mesmo dia em que o desligamento for processado. A extensão deixa de estar ativa no dispositivo assim que o usuário é desativado.',
        },
      ],
    },

    // ─── Manual 04: Funções e permissões ──────────────────────────────────────────
    {
      slug: 'funcoes-permissoes',
      title: 'Funções e permissões',
      description: 'As quatro funções da plataforma e o que cada uma pode fazer.',
      blocks: [
        {
          type: 'h2',
          id: 'sistema-funcoes',
          text: 'O sistema de funções da Onefend',
        },
        {
          type: 'p',
          text: 'A Onefend usa um sistema de controle de acesso baseado em funções (RBAC). A cada usuário é atribuída exatamente uma função, que determina quais seções do painel ele pode acessar e as ações que pode realizar. Funções não são cumulativas.',
        },
        {
          type: 'h2',
          id: 'funcoes-disponiveis',
          text: 'Funções disponíveis',
        },
        {
          type: 'table',
          headers: ['Função', 'Perfil típico', 'Nível de acesso'],
          rows: [
            ['ADMIN', 'Gerente de TI ou CISO', 'Acesso total: configurações, usuários, políticas, relatórios e auditoria.'],
            ['ANALYST', 'Analista de segurança', 'Leitura e análise: pode ver eventos, conversas e relatórios, mas não pode modificar as configurações do sistema.'],
            ['VIEWER', 'Executivo ou auditor', 'Acesso de leitura para painéis e relatórios. Não acessa eventos individuais nem configurações.'],
            ['USER', 'Funcionário protegido', 'Só acessa o portal de documentação. Não tem acesso ao painel de administração.'],
          ],
        },
        {
          type: 'h2',
          id: 'detalhe-admin',
          text: 'Administrador (ADMIN)',
        },
        {
          type: 'p',
          text: 'Ao Administrador (ADMIN) é atribuída a configuração com o nível mais alto de privilégios. Esta é a única equipe apta a gerar e excluir as funcionalidades inerentes, bem como lidar com as diretrizes.',
        },
        {
          type: 'list',
          items: [
            'Gestão de equipes operacionais a partir das bases completas para os fluxos.',
            'Construção de funções integradas por fluxos DLP.',
            'Integração de Teams, SIEM ou slack.',
            'Gerenciamento dos usuários a partir das conexões totais.',
            'Estrutura global via processamento em lotes gerando dados constantes.',
            'Configurações sistêmicas limitadoras.',
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Princípio do menor privilégio',
          text: 'Recomenda-se atribuir a função Administrador apenas às pessoas que precisam modificar a configuração da plataforma. O analista atende com excelência os fins diários.',
        },
        {
          type: 'h2',
          id: 'detalhe-analyst',
          text: 'Analista (ANALYST)',
        },
        {
          type: 'p',
          text: 'O analista rastreia as análises, vislumbrando o cenário e compreendendo incidentes operantes sem, no entanto, manipular elementos organizacionais ou interagir sistemicamente configurando cenários. Otimizado a monitoramento em vez das integrações.',
        },
        {
          type: 'list',
          items: [
            'Filtro dos dados.',
            'Pesquisas de cenários focados na documentação.',
            'Efetividade no fluxo via relatórios.',
            'Exportações com integrações por APIs.'
          ],
        },
        {
          type: 'h2',
          id: 'detalhe-viewer',
          text: 'Viewer (VISUALIZADOR)',
        },
        {
          type: 'p',
          text: 'Dedicado aos executivos que interagem em panoramas organizacionais por processos genéricos a fim de avaliar desempenho, tendo visão resumitiva e macro focado com fins operacionais macro de avaliação de KPI sem acesso aos pormenores sensíveis.',
        },
        {
          type: 'h2',
          id: 'mudar-perfil',
          text: 'Metodologias direcionadas aos fluxos',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Prossiga via interface base.',
              description: 'Busque a integração local pelo acesso direto operacional de fluxos.',
            },
            {
              title: 'Mapeie seu usuário',
              description: 'Insira de forma manual via buscas pontuais.',
            },
            {
              title: 'Mude por salvamento.',
              description: 'Efetue a submissão logo em seguida. As interações mudam automaticamente.'
            },
          ],
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'A visão estrita dos usuários na plataforma',
          text: 'As integrações locais definem o acesso focado. Usuários finais acessam o portal informativo, contudo painéis gerenciais e estatísticas estão banidos por fins conceituais sistêmicos.',
        },
      ],
    },

    // ─── Manual 12: Extension synchronization ─────────────────────────────
    {
      slug: 'sincronizacao-extensoes',
      title: 'Sincronização de Extensões',
      description: 'Métodos referentes à sincronização e monitoramento de atualizações em dispositivos organizacionais alocados.',
      blocks: [
        {
          type: 'h2',
          id: 'bases-iniciais',
          text: 'Panorama sistêmico',
        },
        {
          type: 'p',
          text: 'Quando atualizamos lógicas via portais base as requisições atualizam dispositivos de monitoramento de modo ininterrupto mantendo sempre a integração sistêmica local visando adequação legal.',
        },
        {
          type: 'h2',
          id: 'funcionamento',
          text: 'Estruturação base automatizada',
        },
        {
          type: 'p',
          text: 'Interações frequentes processadas perante as requisições geram consistência com a verificação de atualizações pautados na plataforma global da infraestrutura operacional em períodos pré selecionados e ajustados via perfil global.',
        },
        {
          type: 'callout',
          variant: 'info',
          title: 'Integrações temporais',
          text: 'Bloqueios sistêmicos forçam os tráfegos localmente exigindo forçadas sistêmicas a partir do administrador agilizando os processos para não depender de ciclos rotineiros de atualizações manuais no painel.',
        },
        {
          type: 'h2',
          id: 'status-tecnico',
          text: 'Dispositivos pelo detalhe',
        },
        {
          type: 'p',
          text: 'Métricas gerais configuradas globalmente pelos menus:',
        },
        {
          type: 'table',
          headers: ['Condição', 'Aplicações pautadas'],
          rows: [
            ['Ativo', 'Alinhado à estrutura original funcional.'],
            ['Offline', 'Intervenção bloqueada, tráfego inativo ou extensões processadas erroneamente nos painéis.'],
            ['Desatualizado', 'Dispositivo não se adequou por latências nas conexões internas de infraestrutura externa processadas.'],
            ['Revogado', 'Integração isolada operante restrita pelo administrador no sistema de origem base de monitoramento ativo do dispositivo e suas rotinas e rotas processadas no fluxo total localizado localmente nos logs do sistema globalizado da estrutura OneFend base operacional global externa.']
          ],
        },
        {
          type: 'h2',
          id: 'forcar',
          text: 'Bases manuais sistêmicas',
        },
        {
          type: 'steps',
          steps: [
            {
              title: 'Estruture via portal de Dispositivos base.',
              description: 'Concenre a leitura de extensões com atrasos integrados.'
            },
            {
              title: 'Concenre bases.',
              description: 'Efetue a requisição por submissão. Respostas integrarão a fila da comunicação assíncrona gerando a atualização posterior imediata aos tráfegos nas extensões ativas operando silenciosamente.'
            },
          ],
        },
        {
          type: 'h2',
          id: 'problematicas',
          text: 'Correções via intervenções',
        },
        {
          type: 'table',
          headers: ['Diagnóstico Operante Original Base', 'Processo Sistêmico Focado Local', 'Aplicações Operacionais Globais Sugeridas Originalmente'],
          rows: [
            ['Mais de um dia sem conexão processada no log original da estrutura no painel ativo global processando local de dados ativos em tela', 'Ausência ou restrição por extensões que podem ter sido removidas pelo usuário manualmente. Redes inativadas.', 'Processo iterativo via contato com os colaboradores de origem restrita gerando dados. Fornecer bases isoladas por tráfego ativo gerando tráfego funcional focado gerando as integrações por fluxos do token funcional alocado ativo em conta. '],
            ['Status Desatualizado', 'Intervenções externas de rede bloqueando envios da estrutura aos acessos e protocolos', 'Contato para liberar interrupção ou restrições sistêmicas focadas nas conexões. Acesse painel para rever e alinhar ao sistema corporativo contatando o administrador de suporte original local processando as intervenções do sistema gerado globalizado nos logs do portal ativo web admin dashboard panel login de origem'],
            ['Inativo mesmo ativo', 'Sistemas desconexos, políticas conflitantes restritas a equipes ou falta destas.', 'Correção via painéis revisando logs originais locais e alocando usuários da forma processada de modo estruturado pela plataforma de fluxos do painel administrativo por usuário'],
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Remoção via extensões locais?',
          text: 'As solicitações ativas via tokens garantem que o sistema operatório será reatrelado reatribuindo as lógicas integrativas globalmente para fluxos sistêmicos.',
        },
      ],
    },
  ],
};
