import * as XLSX from 'xlsx';

export interface OptionEntry {
  value: string;
  description: string;
  allocationTip: string;
}

export interface OptionsTable {
  field: string;
  title: string;
  options: OptionEntry[];
}

export interface ColumnInstruction {
  column: string;
  required: 'Sim' | 'Não' | 'Condicional';
  format: string;
  description: string;
  optionsField?: string;
}

// -------------------------------------------------------------
// LISTAS OFICIAIS DE OPÇÕES PARA ALOCAÇÃO CORRETA
// -------------------------------------------------------------

export const COST_CENTERS_OPTIONS: OptionEntry[] = [
  {
    value: 'Laboratório',
    description: 'Atividades internas de calibração metrológica, ensaios em bancada e testes de instrumentos.',
    allocationTip: 'Alocar insumos metrológicos, gases padrão, manutenção de bancadas, calibração de padrões internos e faturamento de balcão.',
  },
  {
    value: 'Serviço de Campo',
    description: 'Operações e equipes volantes em paradas de fábrica, plataformas, refinarias e indústrias clientes.',
    allocationTip: 'Alocar combustíveis de viagens, diárias técnicas, hospedagens, pedágios e receitas de contratos on-site.',
  },
  {
    value: 'Administrativo',
    description: 'Suporte geral corporativo: diretoria, recursos humanos, financeiro, contábil e jurídico.',
    allocationTip: 'Alocar honorários profissionais, softwares de gestão, licenças, material de expediente e serviços corporativos.',
  },
  {
    value: 'Frota e Logística',
    description: 'Veículos corporativos, transportadoras, fretes de instrumentos e logística de movimentação.',
    allocationTip: 'Alocar manutenção mecânica da frota, IPVA, seguros veiculares e envios/retornos de equipamentos.',
  },
  {
    value: 'Comercial',
    description: 'Vendas, elaboração de propostas técnicas, eventos, marketing e relacionamento com clientes.',
    allocationTip: 'Alocar materiais de marketing, despesas de visitas comerciais e comissões.',
  },
  {
    value: 'Sede e Infraestrutura',
    description: 'Ocupação predial física da sede da COMANINS e utilidades básicas.',
    allocationTip: 'Alocar aluguel, condomínio, energia elétrica, água, internet predial, vigilância e limpeza.',
  },
  {
    value: '[Número do Contrato]',
    description: 'Se o lançamento pertence a um contrato específico de cliente, informe o número do contrato cadastrado (ex: CT-2026/01).',
    allocationTip: 'Permite ao sistema vincular diretamente o custo ou a receita ao DRE específico do contrato do cliente.',
  },
];

export const EXPENSE_CATEGORIES_OPTIONS: OptionEntry[] = [
  {
    value: 'Pessoal',
    description: 'Remuneração da equipe: salários, encargos sociais (INSS, FGTS), 13º salário, férias e rescisões.',
    allocationTip: 'Alocar folha de pagamento técnica e administrativa.',
  },
  {
    value: 'Benefícios',
    description: 'Benefícios concedidos aos colaboradores: Vale Refeição/Alimentação (VR/VA), Vale Transporte (VT), Plano de Saúde e Seguro.',
    allocationTip: 'Alocar faturas de operadoras de benefícios e reembolsos de transporte.',
  },
  {
    value: 'Operação',
    description: 'Materiais de consumo técnico, insumos de calibração, manutenção de bancadas, etiquetas e lacres.',
    allocationTip: 'Custos diretos de bancada e insumos operacionais.',
  },
  {
    value: 'Calibração Externa RBC',
    description: 'Envio de padrões de referência para laboratórios acreditados da Rede Brasileira de Calibração (RBC).',
    allocationTip: 'Serviços externos de calibração obrigatória periódica de padrões.',
  },
  {
    value: 'Frota',
    description: 'Combustível, manutenção preventiva/corretiva dos veículos, troca de pneus, seguro e IPVA.',
    allocationTip: 'Despesas veiculares diretas.',
  },
  {
    value: 'Sede',
    description: 'Aluguel do imóvel, taxa de condomínio, energia elétrica, água, saneamento e IPTU.',
    allocationTip: 'Custos de funcionamento da infraestrutura predial.',
  },
  {
    value: 'Administrativo',
    description: 'Softwares, licenças na nuvem, contabilidade externa, consultoria jurídica e materiais de escritório.',
    allocationTip: 'Despesas de suporte corporativo e gestão.',
  },
  {
    value: 'Comercial & Marketing',
    description: 'Publicidade, campanhas, materiais de divulgação, brindes e despesas de relacionamento.',
    allocationTip: 'Investimentos em prospecção e vendas.',
  },
  {
    value: 'Tributos',
    description: 'Impostos e contribuições federais, estaduais e municipais (DAS, ISS, PIS, COFINS, IRPJ, CSLL).',
    allocationTip: 'Guias e obrigações fiscais.',
  },
  {
    value: 'Financeira',
    description: 'Tarifas de manutenção de conta, tarifas de emissão de boletos, juros bancários e IOF.',
    allocationTip: 'Despesas bancárias e operacionais financeiras.',
  },
];

export const REVENUE_CATEGORIES_OPTIONS: OptionEntry[] = [
  {
    value: 'Serviço',
    description: 'Faturamento de contratos contínuos de calibração, ensaios e manutenção preventiva/corretiva.',
    allocationTip: 'Receita principal de contratos regulares.',
  },
  {
    value: 'Calibração Pontual',
    description: 'Serviços avulsos de calibração sob demanda para clientes sem contrato fixo.',
    allocationTip: 'Receitas de balcão e ordens de serviço pontuais.',
  },
  {
    value: 'Manutenção e Peças',
    description: 'Reparo de instrumentos de medição e fornecimento de componentes sobressalentes.',
    allocationTip: 'Recuperação de válvulas, manômetros, termômetros e sensores.',
  },
  {
    value: 'Locação',
    description: 'Receitas decorrentes do aluguel temporário de instrumentos do acervo metrológico da COMANINS.',
    allocationTip: 'Faturamentos de contratos de locação.',
  },
  {
    value: 'Reembolso',
    description: 'Ressarcimento de despesas de viagem, deslocamento ou taxas pré-aprovadas pelo contratante.',
    allocationTip: 'Faturamento de reembolso contra clientes.',
  },
  {
    value: 'Venda',
    description: 'Venda de instrumentos, acessórios metrológicos ou equipamentos do ativo.',
    allocationTip: 'Comercialização direta de itens.',
  },
  {
    value: 'Financeira',
    description: 'Rendimentos de aplicações financeiras, descontos obtidos e juros de mora recebidos.',
    allocationTip: 'Receitas não operacionais.',
  },
  {
    value: 'Aporte',
    description: 'Aporte de capital ou mútuo realizado pelos sócios da empresa.',
    allocationTip: 'Movimentação societária / capital.',
  },
];

export const PAYMENT_METHODS_OPTIONS: OptionEntry[] = [
  { value: 'Boleto', description: 'Boleto bancário registrado com código de barras.', allocationTip: 'Padrão para faturamento de clientes e boletos de fornecedores.' },
  { value: 'Pix', description: 'Liquidação instantânea via chave Pix ou QR Code.', allocationTip: 'Ideal para pagamentos imediatos e compras pontuais.' },
  { value: 'TED', description: 'Transferência Eletrônica Disponível entre instituições bancárias.', allocationTip: 'Transferências entre contas correntes.' },
  { value: 'Transferência Bancária', description: 'Transferência entre contas de mesma ou diferente titularidade.', allocationTip: 'Movimentações entre contas bancárias.' },
  { value: 'Cartão Corporativo', description: 'Cartão de crédito ou débito corporativo emitido em nome da empresa.', allocationTip: 'Despesas de campo, viagens e assinaturas de serviços.' },
  { value: 'Cartão de Crédito', description: 'Cartão de crédito comercial.', allocationTip: 'Compras a prazo no cartão.' },
  { value: 'Cartão de Débito', description: 'Cartão de débito comercial.', allocationTip: 'Compras à vista no cartão.' },
  { value: 'Dinheiro', description: 'Moeda física / espécie.', allocationTip: 'Despesas miúdas de caixa físico.' },
  { value: 'Depósito', description: 'Depósito bancário identificado em conta corrente.', allocationTip: 'Depósitos em dinheiro ou cheque.' },
  { value: 'Débito em Conta', description: 'Débito automático programado na conta corrente da empresa.', allocationTip: 'Contas de concessionárias (energia, água, internet).' },
];

export const PAYABLE_STATUS_OPTIONS: OptionEntry[] = [
  { value: 'Pendente', description: 'Título em aberto, com vencimento futuro ou aguardando pagamento.', allocationTip: 'Padrão para despesas ainda não quitadas.' },
  { value: 'Pago', description: 'Título já quitado integralmente na data informada.', allocationTip: 'Obrigatório preencher Valor Baixado e Data da Baixa.' },
  { value: 'Atrasado', description: 'Título com data de vencimento expirada e sem registro de pagamento.', allocationTip: 'Usado para contas vencidas pendentes.' },
  { value: 'Cancelado', description: 'Título cancelado ou estornado por motivo comercial ou administrativo.', allocationTip: 'Não gera saída de caixa nem impacta o DRE.' },
];

export const RECEIVABLE_STATUS_OPTIONS: OptionEntry[] = [
  { value: 'Pendente', description: 'Faturamento emitido aguardando recebimento/compensação pelo cliente.', allocationTip: 'Padrão para faturas a vencer.' },
  { value: 'Pago', description: 'Recebimento confirmado e creditado na conta da empresa.', allocationTip: 'Obrigatório preencher Valor Baixado e Data da Baixa.' },
  { value: 'Atrasado', description: 'Fatura vencida sem confirmação de pagamento pelo cliente.', allocationTip: 'Títulos em cobrança.' },
  { value: 'Cancelado', description: 'Fatura cancelada, substituída ou com glosa total aceita.', allocationTip: 'Não gera entrada de caixa nem receita realizada.' },
];

export const CONTRACT_STATUS_OPTIONS: OptionEntry[] = [
  { value: 'Ativo', description: 'Contrato vigente em execução operacional normal.', allocationTip: 'Permite emissão de medições e faturamento regular.' },
  { value: 'Suspenso', description: 'Contrato temporariamente paralisado a pedido do cliente ou por renegociação.', allocationTip: 'Bloqueia novas medições até liberação formal.' },
  { value: 'Encerrado', description: 'Contrato concluído por prazo expirado ou rescisão formal.', allocationTip: 'Histórico preservado para consulta e auditoria.' },
];

export const MEASUREMENT_STATUS_OPTIONS: OptionEntry[] = [
  { value: 'Em Análise', description: 'Boletim de medição emitido e enviado ao fiscal do cliente, aguardando aprovação.', allocationTip: 'Fase inicial de validação técnica.' },
  { value: 'Aprovada', description: 'Medição formalmente aceita pelo cliente, liberada para emissão de Nota Fiscal.', allocationTip: 'Apta para faturamento imediato.' },
  { value: 'Faturada', description: 'Nota Fiscal emitida e título de contas a receber gerado no sistema.', allocationTip: 'Requer preenchimento de Número NF.' },
  { value: 'Cancelada', description: 'Boletim de medição glosado ou cancelado administrativamente.', allocationTip: 'Não gera cobrança.' },
];

export const SERVICE_TYPE_OPTIONS: OptionEntry[] = [
  { value: 'Calibração', description: 'Calibração metrológica rastreada RBC ou interna com emissão de certificado.', allocationTip: 'Serviço padrão de laboratório ou campo.' },
  { value: 'Manutenção', description: 'Serviços de reparo mecânico, elétrico, ajuste e recuperação de instrumentos.', allocationTip: 'Manutenção corretiva/preventiva.' },
  { value: 'Serviço de Campo', description: 'Atendimento técnico in loco em plantas industriais e embarcações.', allocationTip: 'Equipes volantes de campo.' },
  { value: 'Calibração On-Site', description: 'Calibração sem retirada dos instrumentos das instalações do cliente.', allocationTip: 'Paradas industriais.' },
  { value: 'Consultoria Técnica', description: 'Auditorias metrológicas, desenvolvimento de procedimentos e adequação à ISO/IEC 17025.', allocationTip: 'Consultorias especializadas.' },
  { value: 'Treinamento', description: 'Capacitação teórica e prática para operadores e técnicos do cliente.', allocationTip: 'Cursos técnicos.' },
  { value: 'Locação', description: 'Disponibilização temporária de padrões e instrumentos de teste.', allocationTip: 'Locação de equipamentos.' },
];

export const BANK_ACCOUNT_TYPE_OPTIONS: OptionEntry[] = [
  { value: 'Corrente', description: 'Conta Corrente Operacional para recebimentos e pagamentos diários.', allocationTip: 'Conta principal de movimentação bancária.' },
  { value: 'Poupança', description: 'Conta poupança vinculada.', allocationTip: 'Reservas financeiras.' },
  { value: 'Investimento', description: 'Conta de aplicação de liquidez (CDB, DI, Tesouro Direto, etc.).', allocationTip: 'Aplicações financeiras da empresa.' },
  { value: 'Caixa', description: 'Caixa interno físico em espécie (fundo fixo / caixa pequeno).', allocationTip: 'Pequenos pagamentos em dinheiro vivo.' },
];

export const CHART_OF_ACCOUNTS_TYPE_OPTIONS: OptionEntry[] = [
  { value: 'Receita', description: 'Entradas de recursos provenientes de serviços, locações ou vendas.', allocationTip: 'Grupo 1 do Plano de Contas.' },
  { value: 'Custo Direto', description: 'Gastos indispensáveis e diretamente atrelados à execução dos serviços.', allocationTip: 'Grupo 2 do Plano de Contas (mão de obra técnica, materiais, calibração externa RBC).' },
  { value: 'Despesa Indireta', description: 'Gastos de funcionamento e estrutura operacional da empresa.', allocationTip: 'Grupo 3 do Plano de Contas (frota, aluguel, infraestrutura).' },
  { value: 'Despesa Administrativa', description: 'Custos de suporte geral, contabilidade, softwares e diretoria.', allocationTip: 'Grupo 4 do Plano de Contas.' },
  { value: 'Tributos e Taxas', description: 'Impostos sobre faturamento e taxas governamentais.', allocationTip: 'Grupo 5 do Plano de Contas.' },
];

export const LOAN_TYPES_OPTIONS: OptionEntry[] = [
  { value: 'Capital de Giro', description: 'Crédito bancário para fluxo de caixa operacional e capital de giro.', allocationTip: 'Alocar para reforço de liquidez ou antecipação de compras de insumos.' },
  { value: 'Financiamento Veicular', description: 'Aquisição de veículos e utilitários para as equipes volantes.', allocationTip: 'Alocar ao Centro de Custo Frota e Logística.' },
  { value: 'Financiamento de Equipamento', description: 'Crédito Finame/BNDES ou comercial para bancadas metrológicas e padrões RBC.', allocationTip: 'Alocar ao Centro de Custo Laboratório.' },
  { value: 'Mútuo de Sócios', description: 'Aporte de recursos realizado por sócios formalizado via contrato de mútuo.', allocationTip: 'Movimentação com sócios com incidência de IOF.' },
  { value: 'Linha de Crédito', description: 'Limite rotativo bancário ou cheque especial.', allocationTip: 'Operações de curto prazo para cobrir descasamento de caixa.' },
  { value: 'Antecipação de Recebíveis', description: 'Desconto bancário de faturas e duplicatas de clientes.', allocationTip: 'Registrar valor líquido e deságio de antecipação.' },
];

export const CARD_ROLES_OPTIONS: OptionEntry[] = [
  { value: 'Diretoria', description: 'Cartão para representação corporativa, viagens estratégicas e infraestrutura.', allocationTip: 'Uso restrito da direção executiva da COMANINS.' },
  { value: 'Coordenador de Laboratório', description: 'Cartão para compras emergenciais de bancada e insumos técnicos.', allocationTip: 'Alocar custos ao Centro de Custo Laboratório.' },
  { value: 'Coordenador de Campo', description: 'Cartão para despesas de equipes em paradas de fábrica e clientes.', allocationTip: 'Alocar combustíveis, hospedagens e taxas ao Serviço de Campo.' },
  { value: 'Supervisor de Operações', description: 'Despesas logísticas e operacionais de rotina.', allocationTip: 'Alocar conforme a destinação operacional.' },
  { value: 'Engenheiro Residente', description: 'Atendimento contínuo em contratos de grande porte (on-site).', allocationTip: 'Alocar diretamente ao Centro de Custo do Contrato do Cliente.' },
  { value: 'Administrativo', description: 'Assinaturas de software, materiais de expediente e despesas prediais.', allocationTip: 'Alocar ao Centro de Custo Administrativo.' },
];

export const CARD_EXPENSE_CATEGORIES_OPTIONS: OptionEntry[] = [
  { value: 'Combustível', description: 'Abastecimento da frota corporativa ou veículos autorizados em serviço.', allocationTip: 'Exige comprovante fiscal com placa do veículo.' },
  { value: 'Alimentação em Viagem', description: 'Refeições de colaboradores em trânsito ou atendimentos de campo.', allocationTip: 'Conforme teto da política de diárias e viagens.' },
  { value: 'Hospedagem', description: 'Pernoite em hotéis durante paradas técnicas ou contratos distantes da sede.', allocationTip: 'Vincular ao Contrato ou Serviço de Campo.' },
  { value: 'Pedágio e Estacionamento', description: 'Tarifas rodoviárias e estacionamentos em aeroportos/clientes.', allocationTip: 'Alocar junto com a viagem correspondente.' },
  { value: 'Manutenção Veicular', description: 'Reparos rápidos de emergência, borracharia, troca de óleo ou socorro.', allocationTip: 'Alocar à Frota e Logística.' },
  { value: 'Insumo de Campo', description: 'Compra urgente de materiais técnicos (pilhas, cabos, lacres, conectores).', allocationTip: 'Alocar à Operação ou Contrato.' },
  { value: 'Passagem e Transporte', description: 'Passagens aéreas, rodoviárias ou transporte por aplicativo (Uber/99/Táxi).', allocationTip: 'Alocar ao Centro de Custo da viagem.' },
  { value: 'Softwares e Licenças', description: 'Assinaturas mensais de plataformas digitais e serviços na nuvem.', allocationTip: 'Alocar ao Administrativo.' },
  { value: 'Material de Escritório', description: 'Impressões, pastas de certificados, lacres e material de expediente.', allocationTip: 'Alocar ao Administrativo ou Laboratório.' },
];

export const REIMBURSEMENT_TYPES_OPTIONS: OptionEntry[] = [
  { value: 'Reembolso', description: 'Devolução de valores despendidos pelo colaborador em benefício da COMANINS.', allocationTip: 'Exige anexo de nota fiscal ou recibo válido.' },
  { value: 'Adiantamento', description: 'Liberação antecipada de recursos para custeio de viagem ou missão técnica futura.', allocationTip: 'Exige prestação de contas no retorno da viagem.' },
];

export const REIMBURSEMENT_PURPOSES_OPTIONS: OptionEntry[] = [
  { value: 'Hospedagem em Viagem de Campo', description: 'Diárias de hotel ou pousada em atendimento técnico externo.', allocationTip: 'Alocar ao Serviço de Campo ou Contrato.' },
  { value: 'Alimentação Extraordinária', description: 'Alimentação em plantões, viagens e paradas de fábrica.', allocationTip: 'Alocar ao Serviço de Campo ou Contrato.' },
  { value: 'Combustível em Deslocamento', description: 'Ressarcimento de quilometragem rodada em veículo particular a serviço.', allocationTip: 'Alocar à Frota ou Contrato.' },
  { value: 'Pedágio e Estacionamento', description: 'Tarifas de praças de pedágio e estacionamentos pagos.', allocationTip: 'Alocar ao Contrato ou Frota.' },
  { value: 'Transporte Urbano / Aplicativo', description: 'Deslocamentos urbanos essenciais em tarefas externas.', allocationTip: 'Alocar ao Administrativo ou Campo.' },
  { value: 'Insumo Emergencial de Parada', description: 'Compra de material metrológico ou consumível urgente aprovada pela gerência.', allocationTip: 'Alocar à Operação ou Contrato.' },
  { value: 'Exame Ocupacional Externo', description: 'Exames periódicos, admissionais ou complementares de saúde do trabalho.', allocationTip: 'Alocar a Recursos Humanos / Programas de Saúde.' },
  { value: 'Treinamento e Capacitação', description: 'Inscrições em cursos de metrologia, normas ISO/IEC ou segurança do trabalho.', allocationTip: 'Alocar a Recursos Humanos / Operação.' },
];

export const TAX_TYPES_OPTIONS: OptionEntry[] = [
  { value: 'DAS - Simples Nacional', description: 'Guia única mensal de arrecadação do Simples Nacional.', allocationTip: 'Alocar ao Centro de Custo Administrativo.' },
  { value: 'ISS Retido', description: 'Imposto Sobre Serviços retido na fonte pelo cliente tomador.', allocationTip: 'Alocar ao Contrato correspondente à Nota Fiscal emitida.' },
  { value: 'INSS Retido', description: 'Retenção previdenciária de 11% ou sobre cessão de mão de obra.', allocationTip: 'Alocar ao Contrato do Cliente ou Administrativo.' },
  { value: 'IRRF s/ Folha de Pagamento', description: 'Imposto de Renda Retido na Fonte sobre salários de colaboradores.', allocationTip: 'Alocar ao Administrativo / Folha de Pagamento.' },
  { value: 'IRRF s/ Serviços PJ', description: 'Imposto de Renda Retido na Fonte de 1,5% sobre serviços de terceiros PJ.', allocationTip: 'Alocar ao Centro de Custo tomador do serviço.' },
  { value: 'CRF 4,65% (PIS/COFINS/CSLL)', description: 'Retenção federal unificada de 4,65% em notas fiscais de serviços.', allocationTip: 'Alocar ao Contrato do Cliente tomador.' },
  { value: 'PIS sobre Faturamento', description: 'Programa de Integração Social.', allocationTip: 'Alocar ao Administrativo.' },
  { value: 'COFINS sobre Faturamento', description: 'Contribuição para o Financiamento da Seguridade Social.', allocationTip: 'Alocar ao Administrativo.' },
  { value: 'Taxa de Alvará e Funcionamento', description: 'Taxas anuais municipais de localização, sanitária e bombeiros.', allocationTip: 'Alocar a Sede e Infraestrutura.' },
  { value: 'IPTU', description: 'Imposto Predial e Territorial Urbano da sede operacional.', allocationTip: 'Alocar a Sede e Infraestrutura.' },
];

export const ASSET_LIFE_OPTIONS: OptionEntry[] = [
  { value: 'Padrão Metrológico RBC (120 meses)', description: 'Padrão de referência de calibração metrológica. Vida útil estimada de 10 anos.', allocationTip: 'Centro de Custo: Laboratório. Depreciação contábil de 10% a.a.' },
  { value: 'Bancada Metrológica (60 meses)', description: 'Bancadas de ensaio de pressão, temperatura, elétrica e vazão. Vida útil de 5 anos.', allocationTip: 'Centro de Custo: Laboratório. Depreciação contábil de 20% a.a.' },
  { value: 'Veículo Utilitário Frota (60 meses)', description: 'Veículos de atendimento técnico externo. Vida útil de 5 anos.', allocationTip: 'Centro de Custo: Frota e Logística. Depreciação contábil de 20% a.a.' },
  { value: 'Equipamento de Informática / TI (36 meses)', description: 'Notebooks, servidores, computadores e monitores. Vida útil de 3 anos.', allocationTip: 'Centro de Custo: Administrativo. Depreciação contábil de 33,3% a.a.' },
  { value: 'Instrumentos Portáteis de Campo (24 meses)', description: 'Bombas comparadoras manuais, multímetros e maletas de campo. Vida útil de 2 anos.', allocationTip: 'Centro de Custo: Serviço de Campo. Depreciação contábil de 50% a.a.' },
  { value: 'Mobiliário e Infraestrutura Sede (120 meses)', description: 'Mesas, armários antichama, climatização e infraestrutura predial. Vida útil de 10 anos.', allocationTip: 'Centro de Custo: Sede e Infraestrutura. Depreciação contábil de 10% a.a.' },
];

export const YES_NO_OPTIONS: OptionEntry[] = [
  { value: 'Sim', description: 'Afirmativo. Executa a ação ou confirma a condição descrita.', allocationTip: 'Para ativos: cria automaticamente a conta a pagar correspondente.' },
  { value: 'Não', description: 'Negativo. Não executa ação adicional.', allocationTip: 'Para ativos: o ativo é registrado sem gerar duplicidade de conta a pagar.' },
];

// -------------------------------------------------------------
// METADADOS E INSTRUÇÕES COLUNA POR COLUNA POR ENTIDADE
// -------------------------------------------------------------

export interface EntitySpreadsheetDefinition {
  entity: string;
  label: string;
  sheetName: string;
  templateFileName: string;
  headers: string[];
  sampleRows: Record<string, any>[];
  optionsTables: OptionsTable[];
  columnInstructions: ColumnInstruction[];
}

export const ENTITY_DEFINITIONS: Record<string, EntitySpreadsheetDefinition> = {
  payables: {
    entity: 'payables',
    label: 'Contas a Pagar',
    sheetName: 'Contas a Pagar',
    templateFileName: 'MODELO_CONTAS_A_PAGAR_COMANINS',
    headers: [
      'Descrição',
      'Valor',
      'Data Competência',
      'Vencimento',
      'Categoria',
      'Centro de Custo',
      'Fornecedor',
      'CPF/CNPJ',
      'Documento/NF',
      'Forma de Pagamento',
      'Conta Bancária',
      'Contrato',
      'Parcelas',
      'Status',
      'Valor Baixado',
      'Data da Baixa',
      'Observações',
    ],
    sampleRows: [
      {
        'Descrição': 'Calibração Externa de Padrões RBC - Manômetros e Sensores',
        'Valor': 1850.00,
        'Data Competência': '01/10/2026',
        'Vencimento': '25/10/2026',
        'Categoria': 'Calibração Externa RBC',
        'Centro de Custo': 'Laboratório',
        'Fornecedor': 'Laboratório Metrológico Nacional Acreditado Ltda',
        'CPF/CNPJ': '12.345.678/0001-90',
        'Documento/NF': 'NF-9842',
        'Forma de Pagamento': 'Boleto',
        'Conta Bancária': 'Banco do Brasil - Ag. 1234 Conta 56789-0',
        'Contrato': 'CT-2026/01',
        'Parcelas': 1,
        'Status': 'Pendente',
        'Valor Baixado': '',
        'Data da Baixa': '',
        'Observações': 'Calibração periódica anual obrigatória de padrões de bancada.',
      },
      {
        'Descrição': 'Abastecimento Frota Técnico Campo - Veículo ABC-1234',
        'Valor': 320.50,
        'Data Competência': '05/10/2026',
        'Vencimento': '05/10/2026',
        'Categoria': 'Frota',
        'Centro de Custo': 'Serviço de Campo',
        'Fornecedor': 'Posto Petrobras Rodovia das Indústrias',
        'CPF/CNPJ': '98.765.432/0001-11',
        'Documento/NF': 'NFCe-54321',
        'Forma de Pagamento': 'Cartão Corporativo',
        'Conta Bancária': 'Itaú - Ag. 4321 Conta 98765-4',
        'Contrato': 'CT-PETROBRAS-01',
        'Parcelas': 1,
        'Status': 'Pago',
        'Valor Baixado': 320.50,
        'Data da Baixa': '05/10/2026',
        'Observações': 'Deslocamento da equipe técnica para calibração on-site.',
      },
    ],
    optionsTables: [
      { field: 'Categoria', title: 'Categorias de Despesa Válidas', options: EXPENSE_CATEGORIES_OPTIONS },
      { field: 'Centro de Custo', title: 'Centros de Custo Válidos', options: COST_CENTERS_OPTIONS },
      { field: 'Forma de Pagamento', title: 'Formas de Pagamento Aceitas', options: PAYMENT_METHODS_OPTIONS },
      { field: 'Status', title: 'Status do Lançamento Permitidos', options: PAYABLE_STATUS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Descrição', required: 'Sim', format: 'Texto livre', description: 'Descrição clara e objetiva do serviço prestado ou produto adquirido.' },
      { column: 'Valor', required: 'Sim', format: 'Número ou R$ (ex: 1500,00)', description: 'Valor total original do título a pagar.' },
      { column: 'Data Competência', required: 'Sim', format: 'DD/MM/AAAA ou AAAA-MM-DD', description: 'Data em que o serviço foi prestado ou a despesa foi contratada.' },
      { column: 'Vencimento', required: 'Sim', format: 'DD/MM/AAAA ou AAAA-MM-DD', description: 'Data limite para pagamento do título sem juros.' },
      { column: 'Categoria', required: 'Sim', format: 'Opção da lista', description: 'Grupo contábil de despesa. Use exatamente uma das opções da aba "Opções de Alocação".' },
      { column: 'Centro de Custo', required: 'Sim', format: 'Opção da lista ou Código Contrato', description: 'Setor ou contrato responsável pelo custo. Use uma opção da aba "Opções de Alocação" ou o número do contrato.' },
      { column: 'Fornecedor', required: 'Não', format: 'Nome ou Razão Social', description: 'Nome do fornecedor, credor ou prestador de serviço.' },
      { column: 'CPF/CNPJ', required: 'Não', format: 'Documento formatado ou números', description: 'Identificação fiscal do fornecedor.' },
      { column: 'Documento/NF', required: 'Não', format: 'Texto (ex: NF-1234)', description: 'Número da Nota Fiscal, boleto, recibo ou fatura.' },
      { column: 'Forma de Pagamento', required: 'Não', format: 'Opção da lista', description: 'Meio de liquidação previsto. Veja opções na aba "Opções de Alocação".' },
      { column: 'Conta Bancária', required: 'Não', format: 'Nome da conta cadastrada', description: 'Conta de saída dos recursos (deve coincidir com conta cadastrada).' },
      { column: 'Contrato', required: 'Não', format: 'Número do Contrato', description: 'Número do contrato ao qual a despesa pertence, se houver vínculo direto.' },
      { column: 'Parcelas', required: 'Não', format: 'Número inteiro (padrão 1)', description: 'Quantidade de parcelas da compra.' },
      { column: 'Status', required: 'Não', format: 'Pendente | Pago | Atrasado | Cancelado', description: 'Status inicial. Padrão: "Pendente". Se "Pago", preencha Valor Baixado e Data da Baixa.' },
      { column: 'Valor Baixado', required: 'Condicional', format: 'Número (ex: 1500,00)', description: 'Obrigatório quando Status for "Pago" ou quando houver quitação parcial.' },
      { column: 'Data da Baixa', required: 'Condicional', format: 'DD/MM/AAAA', description: 'Obrigatório quando Status for "Pago" ou houver Valor Baixado.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Anotações internas, justificativas ou detalhes da transação.' },
    ],
  },

  receivables: {
    entity: 'receivables',
    label: 'Contas a Receber',
    sheetName: 'Contas a Receber',
    templateFileName: 'MODELO_CONTAS_A_RECEBER_COMANINS',
    headers: [
      'Descrição',
      'Valor Líquido',
      'Valor Bruto',
      'Retenções',
      'Data Competência',
      'Vencimento',
      'Categoria',
      'Centro de Custo',
      'Cliente',
      'CPF/CNPJ',
      'Documento/NF',
      'Contrato',
      'Cliente Contrato',
      'Forma de Pagamento',
      'Conta Bancária',
      'Status',
      'Valor Baixado',
      'Data da Baixa',
      'Observações',
    ],
    sampleRows: [
      {
        'Descrição': 'Faturamento Medição 09/2026 - Calibração de Válvulas e Manômetros',
        'Valor Líquido': 14250.00,
        'Valor Bruto': 15000.00,
        'Retenções': 750.00,
        'Data Competência': '30/09/2026',
        'Vencimento': '30/10/2026',
        'Categoria': 'Serviço',
        'Centro de Custo': 'Serviço de Campo',
        'Cliente': 'Petrobras S.A. - Polo Gaslub',
        'CPF/CNPJ': '33.000.167/0001-01',
        'Documento/NF': 'NFS-e 2026/0894',
        'Contrato': 'CT-PETROBRAS-01',
        'Cliente Contrato': 'Petrobras S.A.',
        'Forma de Pagamento': 'Boleto',
        'Conta Bancária': 'Banco do Brasil - Ag. 1234 Conta 56789-0',
        'Status': 'Pendente',
        'Valor Baixado': '',
        'Data da Baixa': '',
        'Observações': 'Medição mensal aprovada conforme boletim técnico BM-09.',
      },
      {
        'Descrição': 'Calibração Balcão - Termômetros Digitais e Manômetros',
        'Valor Líquido': 2400.00,
        'Valor Bruto': 2400.00,
        'Retenções': 0.00,
        'Data Competência': '02/10/2026',
        'Vencimento': '02/10/2026',
        'Categoria': 'Calibração Pontual',
        'Centro de Custo': 'Laboratório',
        'Cliente': 'Indústria Química Fluminense Ltda',
        'CPF/CNPJ': '11.222.333/0001-44',
        'Documento/NF': 'NF-10452',
        'Contrato': '',
        'Cliente Contrato': '',
        'Forma de Pagamento': 'Pix',
        'Conta Bancária': 'Itaú - Ag. 4321 Conta 98765-4',
        'Status': 'Pago',
        'Valor Baixado': 2400.00,
        'Data da Baixa': '02/10/2026',
        'Observações': 'Serviço de bancada retirado pelo cliente com quitação imediata.',
      },
    ],
    optionsTables: [
      { field: 'Categoria', title: 'Categorias de Receita Válidas', options: REVENUE_CATEGORIES_OPTIONS },
      { field: 'Centro de Custo', title: 'Centros de Custo de Destino', options: COST_CENTERS_OPTIONS },
      { field: 'Forma de Pagamento', title: 'Formas de Recebimento Aceitas', options: PAYMENT_METHODS_OPTIONS },
      { field: 'Status', title: 'Status do Título a Receber', options: RECEIVABLE_STATUS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Descrição', required: 'Sim', format: 'Texto livre', description: 'Descrição do serviço ou faturamento realizado.' },
      { column: 'Valor Líquido', required: 'Sim', format: 'Número ou R$', description: 'Valor a receber líquido de retenções fiscais.' },
      { column: 'Valor Bruto', required: 'Não', format: 'Número ou R$', description: 'Valor total da Nota Fiscal antes dos tributos retidos.' },
      { column: 'Retenções', required: 'Não', format: 'Número ou R$', description: 'Soma dos impostos retidos na fonte (ISS, IRRF, CSLL, PIS, COFINS).' },
      { column: 'Data Competência', required: 'Sim', format: 'DD/MM/AAAA ou AAAA-MM-DD', description: 'Data do fato gerador / prestação do serviço.' },
      { column: 'Vencimento', required: 'Sim', format: 'DD/MM/AAAA ou AAAA-MM-DD', description: 'Data prevista para pagamento pelo cliente.' },
      { column: 'Categoria', required: 'Sim', format: 'Opção da lista', description: 'Tipo de receita. Veja opções válidas na aba "Opções de Alocação".' },
      { column: 'Centro de Custo', required: 'Sim', format: 'Opção da lista ou Contrato', description: 'Centro gerador da receita. Veja opções na aba "Opções de Alocação".' },
      { column: 'Cliente', required: 'Não', format: 'Nome / Razão Social', description: 'Nome do cliente faturado.' },
      { column: 'CPF/CNPJ', required: 'Não', format: 'Documento fiscal', description: 'CNPJ ou CPF do cliente.' },
      { column: 'Documento/NF', required: 'Não', format: 'Texto (ex: NFS-e 1234)', description: 'Número do documento fiscal ou fatura emitida.' },
      { column: 'Contrato', required: 'Não', format: 'Número do Contrato', description: 'Número do contrato vinculado cadastrado no sistema.' },
      { column: 'Cliente Contrato', required: 'Não', format: 'Nome do Cliente', description: 'Razão social cadastrada no contrato.' },
      { column: 'Forma de Pagamento', required: 'Não', format: 'Opção da lista', description: 'Meio de liquidação previsto (Boleto, Pix, TED, Depósito).' },
      { column: 'Conta Bancária', required: 'Não', format: 'Nome da conta cadastrada', description: 'Conta bancária da COMANINS onde o valor será creditado.' },
      { column: 'Status', required: 'Não', format: 'Pendente | Pago | Atrasado | Cancelado', description: 'Status inicial. Padrão: "Pendente".' },
      { column: 'Valor Baixado', required: 'Condicional', format: 'Número ou R$', description: 'Obrigatório se Status for "Pago" ou houver quitação.' },
      { column: 'Data da Baixa', required: 'Condicional', format: 'DD/MM/AAAA', description: 'Obrigatório se Status for "Pago" ou houver Valor Baixado.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Detalhes adicionais do faturamento.' },
    ],
  },

  contracts: {
    entity: 'contracts',
    label: 'Contratos',
    sheetName: 'Contratos',
    templateFileName: 'MODELO_CONTRATOS_FINANCEIROS_COMANINS',
    headers: [
      'Cliente',
      'Número do Contrato',
      'Descrição',
      'Valor Global',
      'Data Inicial',
      'Data Final',
      'Status',
      'Centro de Custo',
    ],
    sampleRows: [
      {
        'Cliente': 'Petrobras S.A. - Polo Gaslub',
        'Número do Contrato': 'CT-PETROBRAS-01',
        'Descrição': 'Contrato Anual de Calibração On-Site de Instrumentos de Pressão e Temperatura',
        'Valor Global': 180000.00,
        'Data Inicial': '01/01/2026',
        'Data Final': '31/12/2026',
        'Status': 'Ativo',
        'Centro de Custo': 'Serviço de Campo',
      },
      {
        'Cliente': 'Termelétrica Rio Bravo Energia S.A.',
        'Número do Contrato': 'CT-2026/045',
        'Descrição': 'Manutenção e Calibração de Válvulas de Segurança PSV e Transmissores',
        'Valor Global': 95000.00,
        'Data Inicial': '01/03/2026',
        'Data Final': '28/02/2027',
        'Status': 'Ativo',
        'Centro de Custo': 'Laboratório',
      },
    ],
    optionsTables: [
      { field: 'Status', title: 'Status do Contrato', options: CONTRACT_STATUS_OPTIONS },
      { field: 'Centro de Custo', title: 'Centros de Custo de Alocação', options: COST_CENTERS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Cliente', required: 'Sim', format: 'Nome / Razão Social', description: 'Nome do cliente contratante (deve preferencialmente coincidir com cliente cadastrado).' },
      { column: 'Número do Contrato', required: 'Sim', format: 'Código único', description: 'Identificador único do contrato (ex: CT-2026/01). Chave anti-duplicidade.' },
      { column: 'Descrição', required: 'Não', format: 'Texto explicativo', description: 'Objeto contratual detalhado.' },
      { column: 'Valor Global', required: 'Sim', format: 'Número ou R$', description: 'Valor total contratado em reais.' },
      { column: 'Data Inicial', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data de início da vigência contratual.' },
      { column: 'Data Final', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data de término da vigência (deve ser posterior à inicial).' },
      { column: 'Status', required: 'Sim', format: 'Ativo | Suspenso | Encerrado', description: 'Status operacional do contrato.' },
      { column: 'Centro de Custo', required: 'Não', format: 'Opção da lista', description: 'Centro de custo padrão para rateio das despesas e receitas deste contrato.' },
    ],
  },

  measurements: {
    entity: 'measurements',
    label: 'Medições',
    sheetName: 'Medições',
    templateFileName: 'MODELO_MEDICOES_FINANCEIRAS_COMANINS',
    headers: [
      'Número do Contrato',
      'Cliente',
      'Período',
      'Tipo de Serviço',
      'Valor',
      'Status',
      'Data de Envio',
      'Número NF',
    ],
    sampleRows: [
      {
        'Número do Contrato': 'CT-PETROBRAS-01',
        'Cliente': 'Petrobras S.A. - Polo Gaslub',
        'Período': '09/2026',
        'Tipo de Serviço': 'Calibração On-Site',
        'Valor': 15000.00,
        'Status': 'Aprovada',
        'Data de Envio': '30/09/2026',
        'Número NF': 'NFS-e 2026/0894',
      },
      {
        'Número do Contrato': 'CT-2026/045',
        'Cliente': 'Termelétrica Rio Bravo Energia S.A.',
        'Período': '10/2026',
        'Tipo de Serviço': 'Manutenção',
        'Valor': 7800.00,
        'Status': 'Em Análise',
        'Data de Envio': '05/10/2026',
        'Número NF': '',
      },
    ],
    optionsTables: [
      { field: 'Tipo de Serviço', title: 'Tipos de Serviço Aceitos', options: SERVICE_TYPE_OPTIONS },
      { field: 'Status', title: 'Status da Medição Permitidos', options: MEASUREMENT_STATUS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Número do Contrato', required: 'Sim', format: 'Código de contrato cadastrado', description: 'Número do contrato ativo ao qual esta medição pertence.' },
      { column: 'Cliente', required: 'Sim', format: 'Razão Social', description: 'Nome do cliente tomador do serviço.' },
      { column: 'Período', required: 'Sim', format: 'MM/AAAA ou Texto', description: 'Mês/Ano de competência dos serviços medidos (ex: 09/2026 ou Setembro/2026).' },
      { column: 'Tipo de Serviço', required: 'Sim', format: 'Opção da lista', description: 'Tipo do serviço executado. Veja opções na aba "Opções de Alocação".' },
      { column: 'Valor', required: 'Sim', format: 'Número ou R$', description: 'Valor total medido no período.' },
      { column: 'Status', required: 'Sim', format: 'Em Análise | Aprovada | Faturada | Cancelada', description: 'Situação atual da aprovação do boletim de medição.' },
      { column: 'Data de Envio', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data em que o boletim foi transmitido para análise do cliente.' },
      { column: 'Número NF', required: 'Condicional', format: 'Texto (ex: NF-1234)', description: 'Obrigatório quando a medição já estiver Faturada.' },
    ],
  },

  bankAccounts: {
    entity: 'bankAccounts',
    label: 'Contas Bancárias',
    sheetName: 'Contas Bancárias',
    templateFileName: 'MODELO_CONTAS_BANCARIAS_COMANINS',
    headers: [
      'Banco',
      'Agência',
      'Conta',
      'Tipo',
      'Saldo Inicial',
    ],
    sampleRows: [
      {
        'Banco': 'Banco do Brasil',
        'Agência': '1234-5',
        'Conta': '56789-0',
        'Tipo': 'Corrente',
        'Saldo Inicial': 50000.00,
      },
      {
        'Banco': 'Itaú Unibanco',
        'Agência': '4321',
        'Conta': '98765-4',
        'Tipo': 'Corrente',
        'Saldo Inicial': 25000.00,
      },
      {
        'Banco': 'Caixa Interno Sede',
        'Agência': '0001',
        'Conta': 'CAIXA-01',
        'Tipo': 'Caixa',
        'Saldo Inicial': 1500.00,
      },
    ],
    optionsTables: [
      { field: 'Tipo', title: 'Tipos de Conta Permitidos', options: BANK_ACCOUNT_TYPE_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Banco', required: 'Sim', format: 'Nome do Banco', description: 'Nome oficial da instituição financeira (ex: Banco do Brasil, Itaú, Bradesco, Santander, Sicoob, Inter).' },
      { column: 'Agência', required: 'Não', format: 'Texto com dígito', description: 'Número da agência bancária (ex: 1234-5).' },
      { column: 'Conta', required: 'Sim', format: 'Texto com dígito', description: 'Número da conta com dígito verificador (ex: 56789-0).' },
      { column: 'Tipo', required: 'Sim', format: 'Corrente | Poupança | Investimento | Caixa', description: 'Classificação da conta.' },
      { column: 'Saldo Inicial', required: 'Não', format: 'Número ou R$', description: 'Saldo financeiro inicial no momento da implantação/abertura no sistema.' },
    ],
  },

  categories: {
    entity: 'categories',
    label: 'Plano de Contas',
    sheetName: 'Plano de Contas',
    templateFileName: 'MODELO_PLANO_DE_CONTAS_COMANINS',
    headers: [
      'Código',
      'Nome',
      'Tipo',
      'Status',
    ],
    sampleRows: [
      { 'Código': '1.01', 'Nome': 'Faturamento de Contratos de Calibração', 'Tipo': 'Receita', 'Status': 'Ativo' },
      { 'Código': '1.02', 'Nome': 'Receitas de Serviços de Manutenção e Reparo', 'Tipo': 'Receita', 'Status': 'Ativo' },
      { 'Código': '2.01', 'Nome': 'Mão de Obra Técnica Direta e Encargos', 'Tipo': 'Custo Direto', 'Status': 'Ativo' },
      { 'Código': '2.02', 'Nome': 'Calibração Externa de Padrões RBC', 'Tipo': 'Custo Direto', 'Status': 'Ativo' },
      { 'Código': '2.03', 'Nome': 'Insumos Metrológicos, Lacres e Etiquetas', 'Tipo': 'Custo Direto', 'Status': 'Ativo' },
      { 'Código': '3.01', 'Nome': 'Combustível e Manutenção da Frota Operacional', 'Tipo': 'Despesa Indireta', 'Status': 'Ativo' },
      { 'Código': '3.02', 'Nome': 'Aluguel, Condomínio e Utilidades da Sede', 'Tipo': 'Despesa Indireta', 'Status': 'Ativo' },
      { 'Código': '4.01', 'Nome': 'Softwares, Licenças e Tecnologia da Informação', 'Tipo': 'Despesa Administrativa', 'Status': 'Ativo' },
      { 'Código': '5.01', 'Nome': 'Impostos sobre Faturamento (Simples Nacional / DAS / ISS)', 'Tipo': 'Tributos e Taxas', 'Status': 'Ativo' },
    ],
    optionsTables: [
      { field: 'Tipo', title: 'Tipos de Conta Contábil', options: CHART_OF_ACCOUNTS_TYPE_OPTIONS },
      { field: 'Status', title: 'Status da Categoria', options: [{ value: 'Ativo', description: 'Disponível para novos lançamentos.', allocationTip: 'Padrão.' }, { value: 'Inativo', description: 'Bloqueada para novas movimentações.', allocationTip: 'Histórico preservado.' }] },
    ],
    columnInstructions: [
      { column: 'Código', required: 'Sim', format: 'Código numérico/hierárquico (ex: 1.01)', description: 'Código contábil exclusivo da conta. Usado como chave anti-duplicidade.' },
      { column: 'Nome', required: 'Sim', format: 'Nome da Categoria', description: 'Título claro da categoria para seleção nos lançamentos financeiros.' },
      { column: 'Tipo', required: 'Sim', format: 'Opção da lista', description: 'Natureza contábil: Receita | Custo Direto | Despesa Indireta | Despesa Administrativa | Tributos e Taxas.' },
      { column: 'Status', required: 'Sim', format: 'Ativo | Inativo', description: 'Disponibilidade para uso nos módulos de contas a pagar e receber.' },
    ],
  },
};

// -------------------------------------------------------------
// GERADOR DO WORKBOOK COM TODAS AS ABAS DE OPÇÕES E INSTRUÇÕES
// -------------------------------------------------------------

export function createRichTemplateWorkbook(entity: string): XLSX.WorkBook {
  const def = ENTITY_DEFINITIONS[entity];
  if (!def) {
    throw new Error(`Definição de modelo não encontrada para entidade: ${entity}`);
  }

  const wb = XLSX.utils.book_new();

  // 1. ABA DE DADOS (com cabeçalhos e linhas de exemplo ilustrativas)
  const dataAoa: any[][] = [def.headers];
  def.sampleRows.forEach((row) => {
    dataAoa.push(def.headers.map((h) => row[h] ?? ''));
  });

  const wsData = XLSX.utils.aoa_to_sheet(dataAoa);
  wsData['!cols'] = def.headers.map((header) => ({
    wch: Math.max(16, Math.min(38, header.length + 5)),
  }));
  XLSX.utils.book_append_sheet(wb, wsData, def.sheetName);

  // 2. ABA DE OPÇÕES DE ALOCAÇÃO (tabelas de apoio)
  const optionsAoa: any[][] = [];
  optionsAoa.push(['GUIA DE OPÇÕES PARA ALOCAÇÃO CORRETA - SISTEMA COMANINS']);
  optionsAoa.push([`Módulo: ${def.label} | Utilize exatamente os valores abaixo para garantir a integração perfeita.`]);
  optionsAoa.push([]);

  def.optionsTables.forEach((table) => {
    optionsAoa.push([`TABELA: ${table.title.toUpperCase()} (Campo: "${table.field}")`]);
    optionsAoa.push(['Valor a Preencher na Planilha', 'Descrição e Finalidade', 'Regra de Alocação Recomendada']);
    table.options.forEach((opt) => {
      optionsAoa.push([opt.value, opt.description, opt.allocationTip]);
    });
    optionsAoa.push([]);
  });

  const wsOptions = XLSX.utils.aoa_to_sheet(optionsAoa);
  wsOptions['!cols'] = [
    { wch: 32 },
    { wch: 65 },
    { wch: 65 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOptions, 'Opções de Alocação');

  // 3. ABA DE INSTRUÇÕES COLUNA POR COLUNA
  const instructionsAoa: any[][] = [];
  instructionsAoa.push(['INSTRUÇÕES DE PREENCHIMENTO E REGRAS DE VALIDAÇÃO']);
  instructionsAoa.push(['Abaixo você encontra a especificação exata de cada coluna da planilha para evitar erros na importação.']);
  instructionsAoa.push([]);
  instructionsAoa.push(['Coluna', 'Obrigatório?', 'Formato Esperado', 'Descrição e Regras de Preenchimento']);

  def.columnInstructions.forEach((inst) => {
    instructionsAoa.push([inst.column, inst.required, inst.format, inst.description]);
  });

  instructionsAoa.push([]);
  instructionsAoa.push(['REGRAS GERAIS:']);
  instructionsAoa.push(['1. Não renomeie nem remova nenhuma coluna do cabeçalho da primeira aba.']);
  instructionsAoa.push(['2. As 2 linhas de exemplo da primeira aba podem ser substituídas pelos seus dados reais ou apagadas antes de importar.']);
  instructionsAoa.push(['3. Limite máximo: até 1.000 linhas por importação.']);
  instructionsAoa.push(['4. Datas aceitas: formato brasileiro DD/MM/AAAA ou ISO AAAA-MM-DD.']);
  instructionsAoa.push(['5. Valores monetários: aceitam número decimal com ponto ou vírgula (ex: 1500.50 ou 1.500,50).']);
  instructionsAoa.push(['6. Se o campo Status for preenchido como "Pago", os campos "Valor Baixado" e "Data da Baixa" são obrigatórios.']);

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsAoa);
  wsInstructions['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 30 },
    { wch: 75 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  return wb;
}

// -------------------------------------------------------------
// DEFINIÇÕES E GERADOR DE PLANILHAS OPERACIONAIS RICAS
// -------------------------------------------------------------

export const OPERATION_DEFINITIONS: Record<string, EntitySpreadsheetDefinition> = {
  orcamento: {
    entity: 'orcamento',
    label: 'Orçamento Financeiro',
    sheetName: 'Orcamento',
    templateFileName: 'modelo_orcamento_comanins',
    headers: ['Centro de Custo', 'Categoria', 'Valor Orçado', 'Data Inicial', 'Data Final', 'Observações'],
    sampleRows: [
      {
        'Centro de Custo': 'Laboratório',
        'Categoria': 'Operação',
        'Valor Orçado': 15000.00,
        'Data Inicial': '01/01/2027',
        'Data Final': '31/12/2027',
        'Observações': 'Orçamento anual de insumos metrológicos de bancada',
      },
      {
        'Centro de Custo': 'Serviço de Campo',
        'Categoria': 'Frota',
        'Valor Orçado': 25000.00,
        'Data Inicial': '01/01/2027',
        'Data Final': '31/12/2027',
        'Observações': 'Orçamento de combustível e manutenção de veículos volantes',
      },
    ],
    optionsTables: [
      { field: 'Centro de Custo', title: 'Centros de Custo Permitidos', options: COST_CENTERS_OPTIONS },
      { field: 'Categoria', title: 'Categorias de Despesa Válidas', options: EXPENSE_CATEGORIES_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Centro de Custo', required: 'Sim', format: 'Opção da lista ou Código do Contrato', description: 'Setor, laboratório ou contrato receptor do teto orçamentário.' },
      { column: 'Categoria', required: 'Sim', format: 'Opção da lista de categorias', description: 'Classificação contábil da despesa orçada.' },
      { column: 'Valor Orçado', required: 'Sim', format: 'Número ou R$', description: 'Valor limite aprovado para o período orçamentário.' },
      { column: 'Data Inicial', required: 'Sim', format: 'DD/MM/AAAA ou AAAA-MM-DD', description: 'Início da vigência do orçamento.' },
      { column: 'Data Final', required: 'Sim', format: 'DD/MM/AAAA ou AAAA-MM-DD', description: 'Término da vigência do orçamento.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Detalhamento das premissas do orçamento.' },
    ],
  },

  emprestimo: {
    entity: 'emprestimo',
    label: 'Empréstimos e Financiamentos',
    sheetName: 'Emprestimos',
    templateFileName: 'modelo_emprestimos_comanins',
    headers: ['Credor', 'Tipo', 'Valor Principal', 'Juros % a.m.', 'Parcelas', 'Data Inicial', 'Dia Vencimento', 'Centro de Custo', 'Observações'],
    sampleRows: [
      {
        'Credor': 'Banco do Brasil',
        'Tipo': 'Capital de Giro',
        'Valor Principal': 50000.00,
        'Juros % a.m.': 1.25,
        'Parcelas': 24,
        'Data Inicial': '15/10/2026',
        'Dia Vencimento': 15,
        'Centro de Custo': 'Administrativo',
        'Observações': 'Reforço de capital de giro',
      },
      {
        'Credor': 'Santander Financiamentos',
        'Tipo': 'Financiamento Veicular',
        'Valor Principal': 85000.00,
        'Juros % a.m.': 1.15,
        'Parcelas': 36,
        'Data Inicial': '10/10/2026',
        'Dia Vencimento': 10,
        'Centro de Custo': 'Frota e Logística',
        'Observações': 'Aquisição de utilitário para equipe de campo',
      },
    ],
    optionsTables: [
      { field: 'Tipo', title: 'Tipos de Empréstimo / Financiamento', options: LOAN_TYPES_OPTIONS },
      { field: 'Centro de Custo', title: 'Centros de Custo de Alocação', options: COST_CENTERS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Credor', required: 'Sim', format: 'Nome do Banco / Credor', description: 'Instituição financeira concedente do crédito (ex: Banco do Brasil, Itaú, Santander, Caixa, Sicoob).' },
      { column: 'Tipo', required: 'Sim', format: 'Opção da lista', description: 'Modalidade de financiamento: Capital de Giro, Financiamento Veicular, Financiamento de Equipamento, etc.' },
      { column: 'Valor Principal', required: 'Sim', format: 'Número ou R$', description: 'Valor total original captado/financiado.' },
      { column: 'Juros % a.m.', required: 'Sim', format: 'Percentual mensal (ex: 1.25)', description: 'Taxa de juros mensal contratada.' },
      { column: 'Parcelas', required: 'Sim', format: 'Número inteiro (ex: 24)', description: 'Número total de prestações. O sistema criará as parcelas de contas a pagar automaticamente.' },
      { column: 'Data Inicial', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data de liberação do crédito na conta da empresa.' },
      { column: 'Dia Vencimento', required: 'Sim', format: 'Dia do mês (1 a 31)', description: 'Dia mensal de vencimento das parcelas.' },
      { column: 'Centro de Custo', required: 'Não', format: 'Opção da lista', description: 'Centro de custo onde incidirá o pagamento das parcelas.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Número do contrato bancário ou cláusulas relevantes.' },
    ],
  },

  cartao: {
    entity: 'cartao',
    label: 'Cartões Corporativos',
    sheetName: 'Cartoes',
    templateFileName: 'modelo_cartoes_comanins',
    headers: ['Portador', 'Cargo', 'Últimos 4', 'Limite', 'Dia Fechamento', 'Dia Vencimento', 'Observações'],
    sampleRows: [
      {
        'Portador': 'Carlos Eduardo Silva',
        'Cargo': 'Coordenador de Campo',
        'Últimos 4': '4589',
        'Limite': 12000.00,
        'Dia Fechamento': 3,
        'Dia Vencimento': 10,
        'Observações': 'Cartão corporativo equipe volante Petrobras',
      },
      {
        'Portador': 'Mariana Souza Santos',
        'Cargo': 'Coordenador de Laboratório',
        'Últimos 4': '8821',
        'Limite': 8000.00,
        'Dia Fechamento': 5,
        'Dia Vencimento': 12,
        'Observações': 'Cartão para suprimentos laboratoriais',
      },
    ],
    optionsTables: [
      { field: 'Cargo', title: 'Cargos e Funções Autorizados', options: CARD_ROLES_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Portador', required: 'Sim', format: 'Nome do Colaborador', description: 'Nome completo do titular responsável pela guarda e uso do cartão.' },
      { column: 'Cargo', required: 'Sim', format: 'Opção da lista de cargos', description: 'Cargo ou função do portador na COMANINS.' },
      { column: 'Últimos 4', required: 'Sim', format: '4 dígitos numéricos', description: 'Apenas os 4 últimos dígitos do cartão (ex: 4589). Por segurança, nunca informe o número completo.' },
      { column: 'Limite', required: 'Sim', format: 'Número ou R$', description: 'Limite de crédito total aprovado para o cartão.' },
      { column: 'Dia Fechamento', required: 'Sim', format: 'Dia do mês (1 a 31)', description: 'Dia do corte mensal da fatura.' },
      { column: 'Dia Vencimento', required: 'Sim', format: 'Dia do mês (1 a 31)', description: 'Dia de pagamento da fatura.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Bandeira do cartão, agência ou observações de controle.' },
    ],
  },

  despesa_cartao: {
    entity: 'despesa_cartao',
    label: 'Despesas de Cartão Corporativo',
    sheetName: 'Despesas_Cartao',
    templateFileName: 'modelo_despesas_cartao_comanins',
    headers: ['Cartão Últimos 4', 'Data Compra', 'Estabelecimento', 'Valor', 'Centro de Custo', 'Categoria', 'Vencimento Fatura', 'Comprovante', 'Observações'],
    sampleRows: [
      {
        'Cartão Últimos 4': '4589',
        'Data Compra': '10/10/2026',
        'Estabelecimento': 'Posto Petrobras Rodovia das Indústrias',
        'Valor': 345.80,
        'Centro de Custo': 'Serviço de Campo',
        'Categoria': 'Combustível',
        'Vencimento Fatura': '10/11/2026',
        'Comprovante': 'Sim',
        'Observações': 'Abastecimento veículo utilitário equipe campo',
      },
      {
        'Cartão Últimos 4': '8821',
        'Data Compra': '12/10/2026',
        'Estabelecimento': 'Eletrônica e Componentes Metrológicos',
        'Valor': 189.50,
        'Centro de Custo': 'Laboratório',
        'Categoria': 'Insumo de Campo',
        'Vencimento Fatura': '12/11/2026',
        'Comprovante': 'Sim',
        'Observações': 'Cabos de teste e conectores BNC para bancada',
      },
    ],
    optionsTables: [
      { field: 'Centro de Custo', title: 'Centros de Custo de Alocação', options: COST_CENTERS_OPTIONS },
      { field: 'Categoria', title: 'Categorias de Despesas de Cartão', options: CARD_EXPENSE_CATEGORIES_OPTIONS },
      { field: 'Comprovante', title: 'Comprovante Anexado?', options: YES_NO_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Cartão Últimos 4', required: 'Sim', format: '4 dígitos', description: 'Dígitos finais do cartão utilizado na compra.' },
      { column: 'Data Compra', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data da realização da despesa.' },
      { column: 'Estabelecimento', required: 'Sim', format: 'Razão Social / Nome Fantasia', description: 'Nome do fornecedor ou estabelecimento onde a compra foi feita.' },
      { column: 'Valor', required: 'Sim', format: 'Número ou R$', description: 'Valor total debitado no cartão.' },
      { column: 'Centro de Custo', required: 'Sim', format: 'Opção da lista ou Código Contrato', description: 'Setor ou contrato tomador da despesa.' },
      { column: 'Categoria', required: 'Sim', format: 'Opção da lista', description: 'Natureza da despesa (Combustível, Hospedagem, Alimentação em Viagem, etc.).' },
      { column: 'Vencimento Fatura', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data de vencimento da fatura do cartão em que a compra será liquidada.' },
      { column: 'Comprovante', required: 'Não', format: 'Sim | Não', description: 'Indica se a foto/cupom fiscal foi recolhido.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Motivo da compra, placa do veículo ou dados complementares.' },
    ],
  },

  reembolso: {
    entity: 'reembolso',
    label: 'Reembolsos e Adiantamentos',
    sheetName: 'Reembolsos',
    templateFileName: 'modelo_reembolsos_comanins',
    headers: ['Colaborador', 'Tipo', 'Finalidade', 'Valor', 'Data Solicitação', 'Vencimento', 'Centro de Custo', 'Observações'],
    sampleRows: [
      {
        'Colaborador': 'Roberto Alves Pereira',
        'Tipo': 'Reembolso',
        'Finalidade': 'Hospedagem em Viagem de Campo',
        'Valor': 480.00,
        'Data Solicitação': '10/10/2026',
        'Vencimento': '20/10/2026',
        'Centro de Custo': 'Serviço de Campo',
        'Observações': '2 diárias hotel Macaé parada técnica Gaslub',
      },
      {
        'Colaborador': 'Felipe Henrique Teixeira',
        'Tipo': 'Adiantamento',
        'Finalidade': 'Alimentação Extraordinária',
        'Valor': 600.00,
        'Data Solicitação': '15/10/2026',
        'Vencimento': '18/10/2026',
        'Centro de Custo': 'CT-PETROBRAS-01',
        'Observações': 'Adiantamento para viagem técnica de 4 dias',
      },
    ],
    optionsTables: [
      { field: 'Tipo', title: 'Tipo de Lançamento', options: REIMBURSEMENT_TYPES_OPTIONS },
      { field: 'Finalidade', title: 'Finalidades de Reembolso Aprovadas', options: REIMBURSEMENT_PURPOSES_OPTIONS },
      { field: 'Centro de Custo', title: 'Centros de Custo de Alocação', options: COST_CENTERS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Colaborador', required: 'Sim', format: 'Nome do Colaborador', description: 'Nome do funcionário que solicitou o reembolso ou adiantamento.' },
      { column: 'Tipo', required: 'Sim', format: 'Reembolso | Adiantamento', description: 'Modalidade da operação.' },
      { column: 'Finalidade', required: 'Sim', format: 'Opção da lista', description: 'Motivo corporativo da despesa. Veja opções na aba "Opções de Alocação".' },
      { column: 'Valor', required: 'Sim', format: 'Número ou R$', description: 'Valor a ser creditado ao colaborador.' },
      { column: 'Data Solicitação', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data em que a prestação de contas foi submetida.' },
      { column: 'Vencimento', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data limite para depósito do valor na conta do colaborador.' },
      { column: 'Centro de Custo', required: 'Não', format: 'Opção da lista ou Contrato', description: 'Centro de custo debitado.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Dados bancários do colaborador (chave Pix) ou detalhes da viagem.' },
    ],
  },

  custo_pessoal: {
    entity: 'custo_pessoal',
    label: 'Custos de Pessoal por Contrato',
    sheetName: 'Custos_Pessoal',
    templateFileName: 'modelo_custos_pessoal_comanins',
    headers: ['Colaborador / Grupo', 'Competência', 'Salário / Base', 'Encargos', 'Benefícios', 'Valor Total', 'Vencimento', 'Centro de Custo', 'Observações'],
    sampleRows: [
      {
        'Colaborador / Grupo': 'Equipe Técnica de Campo 01',
        'Competência': '2026-10',
        'Salário / Base': 18000.00,
        'Encargos': 6200.00,
        'Benefícios': 2800.00,
        'Valor Total': 27000.00,
        'Vencimento': '05/11/2026',
        'Centro de Custo': 'CT-PETROBRAS-01',
        'Observações': 'Alocação direta de equipe dedicada no contrato',
      },
      {
        'Colaborador / Grupo': 'Metrologistas de Bancada',
        'Competência': '2026-10',
        'Salário / Base': 14000.00,
        'Encargos': 4800.00,
        'Benefícios': 2200.00,
        'Valor Total': 21000.00,
        'Vencimento': '05/11/2026',
        'Centro de Custo': 'Laboratório',
        'Observações': 'Folha técnica metrológica interna',
      },
    ],
    optionsTables: [
      { field: 'Centro de Custo', title: 'Centros de Custo de Alocação', options: COST_CENTERS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Colaborador / Grupo', required: 'Sim', format: 'Nome ou Equipe', description: 'Identificação do colaborador ou grupo técnico alocado.' },
      { column: 'Competência', required: 'Sim', format: 'AAAA-MM ou MM/AAAA (ex: 2026-10)', description: 'Mês de competência da folha de pagamento.' },
      { column: 'Salário / Base', required: 'Não', format: 'Número ou R$', description: 'Salários brutos da equipe alocada.' },
      { column: 'Encargos', required: 'Não', format: 'Número ou R$', description: 'INSS patronal, FGTS e provisões (13º e férias).' },
      { column: 'Benefícios', required: 'Não', format: 'Número ou R$', description: 'Vale Refeição, Transporte, Seguro e Plano de Saúde.' },
      { column: 'Valor Total', required: 'Sim', format: 'Número ou R$', description: 'Custo total consolidado. Se deixado vazio, será calculado como Base + Encargos + Benefícios.' },
      { column: 'Vencimento', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data de liquidação/pagamento dos salários.' },
      { column: 'Centro de Custo', required: 'Sim', format: 'Código do Contrato ou Centro de Custo', description: 'Contrato do cliente ou setor para onde o custo de mão de obra será alocado no DRE.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Detalhamento de horas técnicas ou adicionais.' },
    ],
  },

  rateio: {
    entity: 'rateio',
    label: 'Rateio de Custos Compartilhados',
    sheetName: 'Rateios',
    templateFileName: 'modelo_rateios_comanins',
    headers: ['Nome da Regra', 'Centro de Custo Origem', 'Destino 1', '% 1', 'Destino 2', '% 2', 'Destino 3', '% 3', 'Destino 4', '% 4', 'Destino 5', '% 5', 'Observações'],
    sampleRows: [
      {
        'Nome da Regra': 'Rateio Administrativo Geral',
        'Centro de Custo Origem': 'Administrativo',
        'Destino 1': 'Laboratório',
        '% 1': 40,
        'Destino 2': 'Serviço de Campo',
        '% 2': 60,
        'Destino 3': '',
        '% 3': '',
        'Destino 4': '',
        '% 4': '',
        'Destino 5': '',
        '% 5': '',
        'Observações': 'Distribuição do suporte administrativo entre operações',
      },
      {
        'Nome da Regra': 'Rateio Frota Volante',
        'Centro de Custo Origem': 'Frota e Logística',
        'Destino 1': 'Serviço de Campo',
        '% 1': 70,
        'Destino 2': 'Laboratório',
        '% 2': 30,
        'Destino 3': '',
        '% 3': '',
        'Destino 4': '',
        '% 4': '',
        'Destino 5': '',
        '% 5': '',
        'Observações': 'Distribuição de despesas de veículos entre frentes de atendimento',
      },
    ],
    optionsTables: [
      { field: 'Centro de Custo Origem', title: 'Centros de Custo de Origem Válidos', options: COST_CENTERS_OPTIONS },
      { field: 'Destino', title: 'Centros de Custo de Destino Permitidos', options: COST_CENTERS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Nome da Regra', required: 'Sim', format: 'Texto identificador', description: 'Título claro da fórmula de rateio corporativo.' },
      { column: 'Centro de Custo Origem', required: 'Sim', format: 'Opção da lista', description: 'Centro de custo acumulador original das despesas a serem distribuídas.' },
      { column: 'Destino 1 a 5', required: 'Sim', format: 'Opção da lista ou Contrato', description: 'Centros de custo ou contratos que receberão parcelas do custo.' },
      { column: '% 1 a 5', required: 'Sim', format: 'Percentual numérico (ex: 60)', description: 'Percentual atribuído a cada destino. ATENÇÃO: A SOMA DEVE SER EXATAMENTE 100%.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Critério metrológico ou societário de divisão de custos.' },
    ],
  },

  ativo: {
    entity: 'ativo',
    label: 'Ativos e Investimentos',
    sheetName: 'Ativos',
    templateFileName: 'modelo_ativos_comanins',
    headers: ['Ativo', 'Data Aquisição', 'Valor Aquisição', 'Valor Residual', 'Vida Útil Meses', 'Fornecedor', 'Centro de Custo', 'Gerar Conta a Pagar', 'Vencimento', 'Observações'],
    sampleRows: [
      {
        'Ativo': 'Calibrador Multifunção Fluke 5522A RBC',
        'Data Aquisição': '01/10/2026',
        'Valor Aquisição': 95000.00,
        'Valor Residual': 9500.00,
        'Vida Útil Meses': 120,
        'Fornecedor': 'Fluke do Brasil Ltda',
        'Centro de Custo': 'Laboratório',
        'Gerar Conta a Pagar': 'Sim',
        'Vencimento': '30/10/2026',
        'Observações': 'Padrão elétrico de alta precisão RBC com rastreabilidade',
      },
      {
        'Ativo': 'Caminhonete Toyota Hilux 4x4 Cabine Dupla',
        'Data Aquisição': '15/10/2026',
        'Valor Aquisição': 220000.00,
        'Valor Residual': 44000.00,
        'Vida Útil Meses': 60,
        'Fornecedor': 'Concessionária Toyota Leste',
        'Centro de Custo': 'Frota e Logística',
        'Gerar Conta a Pagar': 'Não',
        'Vencimento': '',
        'Observações': 'Veículo de apoio volante para contratos de parada técnica',
      },
    ],
    optionsTables: [
      { field: 'Centro de Custo', title: 'Centros de Custo de Alocação', options: COST_CENTERS_OPTIONS },
      { field: 'Vida Útil Meses', title: 'Tabela de Vida Útil Recomendada COMANINS', options: ASSET_LIFE_OPTIONS },
      { field: 'Gerar Conta a Pagar', title: 'Gerar Conta a Pagar Automaticamente?', options: YES_NO_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Ativo', required: 'Sim', format: 'Descrição do Bem / Equipamento', description: 'Nome completo, marca, modelo e número de série do ativo patrimonial.' },
      { column: 'Data Aquisição', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data da compra ou emissão da Nota Fiscal do ativo.' },
      { column: 'Valor Aquisição', required: 'Sim', format: 'Número ou R$', description: 'Custo total de aquisição do bem.' },
      { column: 'Valor Residual', required: 'Não', format: 'Número ou R$', description: 'Valor estimado de venda ao fim da vida útil (geralmente 10% a 20%).' },
      { column: 'Vida Útil Meses', required: 'Sim', format: 'Número de meses (ex: 120)', description: 'Tempo contábil de depreciação. Veja a tabela de vida útil na aba "Opções de Alocação".' },
      { column: 'Fornecedor', required: 'Não', format: 'Nome do Fabricante / Fornecedor', description: 'Fornecedor de quem o ativo foi adquirido.' },
      { column: 'Centro de Custo', required: 'Sim', format: 'Opção da lista', description: 'Setor onde o bem físico permanecerá alocado.' },
      { column: 'Gerar Conta a Pagar', required: 'Não', format: 'Sim | Não', description: 'Se "Sim", cria a obrigação financeira no módulo de Contas a Pagar.' },
      { column: 'Vencimento', required: 'Condicional', format: 'DD/MM/AAAA', description: 'Obrigatório se Gerar Conta a Pagar = "Sim".' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Número do certificado RBC, patrimônio interno ou localização.' },
    ],
  },

  tributo: {
    entity: 'tributo',
    label: 'Tributos e Retenções Fiscais',
    sheetName: 'Tributos',
    templateFileName: 'modelo_tributos_comanins',
    headers: ['Tributo', 'Competência', 'Valor', 'Data Competência', 'Vencimento', 'Centro de Custo', 'Documento', 'Observações'],
    sampleRows: [
      {
        'Tributo': 'DAS - Simples Nacional',
        'Competência': '2026-10',
        'Valor': 8450.00,
        'Data Competência': '01/10/2026',
        'Vencimento': '20/11/2026',
        'Centro de Custo': 'Administrativo',
        'Documento': 'DAS-10/2026',
        'Observações': 'Guia mensal única do Simples Nacional',
      },
      {
        'Tributo': 'ISS Retido',
        'Competência': '2026-10',
        'Valor': 1250.00,
        'Data Competência': '05/10/2026',
        'Vencimento': '10/11/2026',
        'Centro de Custo': 'CT-PETROBRAS-01',
        'Documento': 'NFS-e 2026/0894',
        'Observações': 'Retenção na fonte pelo cliente tomador de serviços em Macaé',
      },
    ],
    optionsTables: [
      { field: 'Tributo', title: 'Tipos de Tributo e Obrigações Fiscais', options: TAX_TYPES_OPTIONS },
      { field: 'Centro de Custo', title: 'Centros de Custo de Alocação', options: COST_CENTERS_OPTIONS },
    ],
    columnInstructions: [
      { column: 'Tributo', required: 'Sim', format: 'Opção da lista', description: 'Tributo municipal, estadual ou federal. Veja opções na aba "Opções de Alocação".' },
      { column: 'Competência', required: 'Sim', format: 'AAAA-MM ou MM/AAAA (ex: 2026-10)', description: 'Mês/Ano de ocorrência do fato gerador do tributo.' },
      { column: 'Valor', required: 'Sim', format: 'Número ou R$', description: 'Valor devido da guia fiscal.' },
      { column: 'Data Competência', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data do fato gerador ou primeiro dia do mês de competência.' },
      { column: 'Vencimento', required: 'Sim', format: 'DD/MM/AAAA', description: 'Data de vencimento para pagamento sem encargos.' },
      { column: 'Centro de Custo', required: 'Não', format: 'Opção da lista ou Contrato', description: 'Centro de custo onde o encargo fiscal será apropriado.' },
      { column: 'Documento', required: 'Não', format: 'Código da Guia / DARF / NF', description: 'Número do documento de arrecadação ou da Nota Fiscal geradora.' },
      { column: 'Observações', required: 'Não', format: 'Texto livre', description: 'Código de barras para pagamento ou anotações contábeis.' },
    ],
  },
};

export function createRichOperationTemplateWorkbook(kind: string): XLSX.WorkBook {
  const def = OPERATION_DEFINITIONS[kind];
  if (!def) {
    throw new Error(`Definição de modelo operacional não encontrada para: ${kind}`);
  }

  const wb = XLSX.utils.book_new();

  // 1. ABA DE DADOS
  const dataAoa: any[][] = [def.headers];
  def.sampleRows.forEach((row) => {
    dataAoa.push(def.headers.map((h) => row[h] ?? ''));
  });

  const wsData = XLSX.utils.aoa_to_sheet(dataAoa);
  wsData['!cols'] = def.headers.map((header) => ({
    wch: Math.max(16, Math.min(38, header.length + 5)),
  }));
  XLSX.utils.book_append_sheet(wb, wsData, def.sheetName);

  // 2. ABA DE OPÇÕES DE ALOCAÇÃO
  const optionsAoa: any[][] = [];
  optionsAoa.push(['GUIA DE OPÇÕES PARA ALOCAÇÃO CORRETA - SISTEMA COMANINS']);
  optionsAoa.push([`Módulo Operacional: ${def.label} | Utilize os valores oficiais abaixo para garantir a integração perfeita.`]);
  optionsAoa.push([]);

  def.optionsTables.forEach((table) => {
    optionsAoa.push([`TABELA: ${table.title.toUpperCase()} (Campo: "${table.field}")`]);
    optionsAoa.push(['Valor a Preencher na Planilha', 'Descrição e Finalidade', 'Regra de Alocação Recomendada']);
    table.options.forEach((opt) => {
      optionsAoa.push([opt.value, opt.description, opt.allocationTip]);
    });
    optionsAoa.push([]);
  });

  const wsOptions = XLSX.utils.aoa_to_sheet(optionsAoa);
  wsOptions['!cols'] = [
    { wch: 32 },
    { wch: 65 },
    { wch: 65 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOptions, 'Opções de Alocação');

  // 3. ABA DE INSTRUÇÕES COLUNA POR COLUNA
  const instructionsAoa: any[][] = [];
  instructionsAoa.push(['INSTRUÇÕES DE PREENCHIMENTO E REGRAS DE VALIDAÇÃO']);
  instructionsAoa.push(['Abaixo você encontra a especificação exata de cada coluna da planilha para evitar erros na importação.']);
  instructionsAoa.push([]);
  instructionsAoa.push(['Coluna', 'Obrigatório?', 'Formato Esperado', 'Descrição e Regras de Preenchimento']);

  def.columnInstructions.forEach((inst) => {
    instructionsAoa.push([inst.column, inst.required, inst.format, inst.description]);
  });

  instructionsAoa.push([]);
  instructionsAoa.push(['REGRAS GERAIS:']);
  instructionsAoa.push(['1. Não altere os nomes das colunas na primeira linha da primeira aba.']);
  instructionsAoa.push(['2. As 2 linhas de exemplo da primeira aba podem ser substituídas pelos seus dados reais antes da importação.']);
  instructionsAoa.push(['3. Limite de segurança: até 200 registros por importação desta rotina.']);
  instructionsAoa.push(['4. Datas aceitas: formato brasileiro DD/MM/AAAA ou ISO AAAA-MM-DD.']);
  instructionsAoa.push(['5. Valores monetários: aceitam números ou formato R$ (ex: 1500,50 ou 1500.50).']);

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsAoa);
  wsInstructions['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 30 },
    { wch: 75 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  return wb;
}

export function getOptionsForEntity(entity: string): OptionsTable[] {
  return ENTITY_DEFINITIONS[entity]?.optionsTables || [];
}

export function getOptionsForOperation(kind: string): OptionsTable[] {
  return OPERATION_DEFINITIONS[kind]?.optionsTables || [];
}

export function getColumnInstructionsForEntity(entity: string): ColumnInstruction[] {
  return ENTITY_DEFINITIONS[entity]?.columnInstructions || [];
}

export function getColumnInstructionsForOperation(kind: string): ColumnInstruction[] {
  return OPERATION_DEFINITIONS[kind]?.columnInstructions || [];
}

