// SEEK — Base de Dados Corporativa Integrada (Mock Interconectado)

import { Company, Branch, UserProfile, AuditLogEntry } from '../types/core';
import { ApprovalItem } from '../types/workflow';
import {
  TaskItem,
  TicketItem,
  DocumentToSign,
  FinancialEntry,
  CrmOpportunity,
  EmployeeProfile,
  PurchaseRequisition,
  AssetRecord,
  ContractRecord
} from '../types/modules';

export const COMPANIES: Company[] = [
  {
    id: 'comp-1',
    code: 'SEEK-CORP',
    tradeName: 'DiskIngressos Matriz',
    legalName: 'DiskIngressos Serviços de Bilheteria e Eventos S.A.',
    documentNumber: '08.123.456/0001-90',
    isHolding: true
  },
  {
    id: 'comp-2',
    code: 'SEEK-SP',
    tradeName: 'DiskIngressos SP',
    legalName: 'DiskIngressos Operações São Paulo Ltda.',
    documentNumber: '08.123.456/0002-71',
    isHolding: false
  },
  {
    id: 'comp-3',
    code: 'SEEK-RJ',
    tradeName: 'DiskIngressos Rio',
    legalName: 'DiskIngressos Entretenimento Rio de Janeiro Ltda.',
    documentNumber: '08.123.456/0003-52',
    isHolding: false
  }
];

export const BRANCHES: Branch[] = [
  {
    id: 'branch-1',
    companyId: 'comp-1',
    code: 'FIL-01',
    name: 'Curitiba (Sede / Matriz)',
    city: 'Curitiba',
    state: 'PR',
    isHeadquarter: true
  },
  {
    id: 'branch-2',
    companyId: 'comp-1',
    code: 'FIL-02',
    name: 'Curitiba (Centro de Distribuição & PDV)',
    city: 'Curitiba',
    state: 'PR',
    isHeadquarter: false
  },
  {
    id: 'branch-3',
    companyId: 'comp-2',
    code: 'FIL-03',
    name: 'São Paulo (Faria Lima / Operações)',
    city: 'São Paulo',
    state: 'SP',
    isHeadquarter: false
  },
  {
    id: 'branch-4',
    companyId: 'comp-3',
    code: 'FIL-04',
    name: 'Rio de Janeiro (Barra da Tijuca)',
    city: 'Rio de Janeiro',
    state: 'RJ',
    isHeadquarter: false
  }
];

export const DEMO_PROFILES: UserProfile[] = [
  {
    id: 'user-ceo',
    fullName: 'Carlos Drummond de Castro',
    email: 'carlos.drummond@diskingressos.com.br',
    roleLevel: 'DIRETORIA',
    roleTitle: 'Diretor Presidente / CEO',
    department: 'Diretoria Executiva',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 500000
  },
  {
    id: 'user-cfo',
    fullName: 'Helena Silveira Ramos',
    email: 'helena.silveira@diskingressos.com.br',
    roleLevel: 'GESTOR_DEPARTAMENTO',
    roleTitle: 'Gerente Financeira & Controladoria',
    department: 'Financeiro',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 75000
  },
  {
    id: 'user-rh',
    fullName: 'Rafael Medeiros Pires',
    email: 'rafael.medeiros@diskingressos.com.br',
    roleLevel: 'GESTOR_DEPARTAMENTO',
    roleTitle: 'Coordenador de RH & DP',
    department: 'Recursos Humanos',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 20000
  },
  {
    id: 'user-compras',
    fullName: 'Mariana Fontes Prado',
    email: 'mariana.fontes@diskingressos.com.br',
    roleLevel: 'GESTOR_DEPARTAMENTO',
    roleTitle: 'Gestora de Compras & Suprimentos',
    department: 'Compras',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 30000
  },
  {
    id: 'user-crm',
    fullName: 'Lucas Bertolli Costa',
    email: 'lucas.bertolli@diskingressos.com.br',
    roleLevel: 'GESTOR_DEPARTAMENTO',
    roleTitle: 'Líder Comercial & CRM',
    department: 'Comercial',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 25000
  },
  {
    id: 'user-operacional',
    fullName: 'Beatriz Castro Lima',
    email: 'beatriz.castro@diskingressos.com.br',
    roleLevel: 'OPERACIONAL',
    roleTitle: 'Analista de Operações Pleno',
    department: 'Operações de Eventos',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 1500
  }
];

export const INITIAL_APPROVALS: ApprovalItem[] = [
  {
    id: 'app-01',
    companyId: 'comp-1',
    entityType: 'COMPRA',
    title: 'Aquisição de 15 Leitores Biométricos e Catracas Portáteis',
    description: 'Equipamentos para operação em grandes festivais com leitor QR code e NFC homologados.',
    department: 'Operações de Eventos',
    requesterName: 'Beatriz Castro Lima',
    requesterRole: 'Analista de Operações Pleno',
    createdAt: '2026-10-04 14:30',
    amount: 18450.00,
    status: 'PENDENTE',
    currentStepIndex: 1,
    priority: 'ALTA',
    steps: [
      {
        stepNumber: 1,
        label: 'Aprovação do Gestor do Departamento (Compras)',
        requiredLevel: 'GESTOR_DEPARTAMENTO',
        status: 'APROVADO',
        deciderName: 'Mariana Fontes Prado',
        decisionDate: '2026-10-04 16:10',
        comment: 'Cotação validada com 3 fornecedores. Menor preço homologado.'
      },
      {
        stepNumber: 2,
        label: 'Alçada Financeira & Orçamento',
        requiredLevel: 'GESTOR_DEPARTAMENTO',
        status: 'PENDENTE'
      },
      {
        stepNumber: 3,
        label: 'Alçada de Diretoria Executiva (> R$ 15.000)',
        requiredLevel: 'DIRETORIA',
        status: 'PENDENTE'
      }
    ]
  },
  {
    id: 'app-02',
    companyId: 'comp-1',
    entityType: 'CONTRATO',
    title: 'Renovação Contrato Master de Infraestrutura Cloud AWS',
    description: 'Acordo corporativo anual com reserva de instâncias para suportar picos de vendas simultâneas.',
    department: 'Tecnologia da Informação',
    requesterName: 'Eduardo Martins (TI)',
    requesterRole: 'Tech Lead Infraestrutura',
    createdAt: '2026-10-03 11:20',
    amount: 142000.00,
    status: 'PENDENTE',
    currentStepIndex: 1,
    priority: 'CRITICA',
    steps: [
      {
        stepNumber: 1,
        label: 'Validação Técnica e Jurídica',
        requiredLevel: 'GESTOR_DEPARTAMENTO',
        status: 'APROVADO',
        deciderName: 'Dr. Fernando Araripe (Jurídico)',
        decisionDate: '2026-10-03 17:45',
        comment: 'Minuta analisada e cláusula de SLA de 99.99% inclusa.'
      },
      {
        stepNumber: 2,
        label: 'Alçada Diretoria Executiva (> R$ 50.000)',
        requiredLevel: 'DIRETORIA',
        status: 'PENDENTE'
      }
    ]
  },
  {
    id: 'app-03',
    companyId: 'comp-1',
    entityType: 'PAGAMENTO',
    title: 'Adiantamento de Diárias e Hospedagem - Equipe Festival Rock Curitiba',
    description: 'Hospedagem e transporte para 12 colaboradores destacados para suporte no local.',
    department: 'Operações de Eventos',
    requesterName: 'Beatriz Castro Lima',
    requesterRole: 'Analista de Operações Pleno',
    createdAt: '2026-10-05 09:15',
    amount: 4800.00,
    status: 'PENDENTE',
    currentStepIndex: 0,
    priority: 'MEDIA',
    steps: [
      {
        stepNumber: 1,
        label: 'Aprovação da Gerência Financeira',
        requiredLevel: 'GESTOR_DEPARTAMENTO',
        status: 'PENDENTE'
      }
    ]
  },
  {
    id: 'app-04',
    companyId: 'comp-1',
    entityType: 'FERIAS',
    title: 'Programação de Férias 20 Dias - Analista Fiscal',
    description: 'Período solicitado: 15/11/2026 a 04/12/2026. Saldo total de 30 dias.',
    department: 'Financeiro / Fiscal',
    requesterName: 'Camila Zanin',
    requesterRole: 'Analista Fiscal Sênior',
    createdAt: '2026-10-02 16:00',
    amount: undefined,
    status: 'APROVADO',
    currentStepIndex: 1,
    priority: 'BAIXA',
    steps: [
      {
        stepNumber: 1,
        label: 'Aprovação Gestora Financeira',
        requiredLevel: 'GESTOR_DEPARTAMENTO',
        status: 'APROVADO',
        deciderName: 'Helena Silveira Ramos',
        decisionDate: '2026-10-02 17:30',
        comment: 'Cobertura de tarefas acordada com o time.'
      },
      {
        stepNumber: 2,
        label: 'Homologação RH / Departamento Pessoal',
        requiredLevel: 'GESTOR_DEPARTAMENTO',
        status: 'APROVADO',
        deciderName: 'Rafael Medeiros Pires',
        decisionDate: '2026-10-03 09:00',
        comment: 'Lançado no calendário corporativo de férias.'
      }
    ]
  },
  {
    id: 'app-05',
    companyId: 'comp-1',
    entityType: 'DESCONTO_COMERCIAL',
    title: 'Proposta Comercial Especial — Festival Sertanejo Brasil (Comissão 4.2%)',
    description: 'Solicitação de taxa diferenciada de conveniência em troca de exclusividade por 3 edições.',
    department: 'Comercial',
    requesterName: 'Lucas Bertolli Costa',
    requesterRole: 'Líder Comercial & CRM',
    createdAt: '2026-10-04 18:00',
    amount: 320000.00,
    status: 'PENDENTE',
    currentStepIndex: 0,
    priority: 'ALTA',
    steps: [
      {
        stepNumber: 1,
        label: 'Alçada Diretoria Comercial & Executiva',
        requiredLevel: 'DIRETORIA',
        status: 'PENDENTE'
      }
    ]
  }
];

export const MY_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Validar conciliação bancária da conta Bradesco Matriz',
    module: 'Financeiro',
    dueDate: 'Hoje, 18:00',
    priority: 'ALTA',
    status: 'EM_ANDAMENTO',
    relatedEntity: 'Bradesco Ag. 1204 - C/C 45890-1'
  },
  {
    id: 'task-2',
    title: 'Revisar aditivo contratual da Arena Multiuso Curitiba',
    module: 'Jurídico',
    dueDate: 'Amanhã, 12:00',
    priority: 'ALTA',
    status: 'A_FAZER',
    relatedEntity: 'Contrato CT-2025-044'
  },
  {
    id: 'task-3',
    title: 'Aprovar fechamento de ponto e horas extras de Setembro',
    module: 'RH & DP',
    dueDate: '07/10/2026',
    priority: 'MEDIA',
    status: 'A_FAZER',
    relatedEntity: 'Folha de Pagamento Matriz'
  },
  {
    id: 'task-4',
    title: 'Liberar pagamento de fornecedores homologados Lote 01',
    module: 'Compras',
    dueDate: 'Hoje, 16:30',
    priority: 'URGENTE',
    status: 'EM_ANDAMENTO',
    relatedEntity: 'Lote Pagamentos #984'
  }
];

export const MY_TICKETS: TicketItem[] = [
  {
    id: 'tkt-101',
    code: 'CH-2026-0881',
    title: 'Liberação de VPN e Acesso ao SEEK para nova Analista Comercial',
    department: 'TI',
    status: 'EM_ATENDIMENTO',
    priority: 'ALTA',
    slaHoursRemaining: 3.5,
    requesterName: 'Lucas Bertolli',
    createdAt: '05/10/2026 08:30'
  },
  {
    id: 'tkt-102',
    code: 'CH-2026-0879',
    title: 'Envio de comprovante de retenção de ISS tomador de serviço',
    department: 'Financeiro',
    status: 'ABERTO',
    priority: 'MEDIA',
    slaHoursRemaining: 14.0,
    requesterName: 'Camila Zanin',
    createdAt: '04/10/2026 17:15'
  },
  {
    id: 'tkt-103',
    code: 'CH-2026-0865',
    title: 'Emissão de termo de empréstimo de notebook reserva',
    department: 'Administrativo',
    status: 'RESOLVIDO',
    priority: 'BAIXA',
    slaHoursRemaining: 0,
    requesterName: 'Beatriz Castro',
    createdAt: '03/10/2026 10:00'
  }
];

export const DOCUMENTS_TO_SIGN: DocumentToSign[] = [
  {
    id: 'doc-01',
    title: 'Termo de Responsabilidade e Custódia de Equipamentos TI #342',
    type: 'TERMO_RESPONSABILIDADE',
    deadline: '06/10/2026',
    partyName: 'Departamento de TI Corporativo',
    status: 'PENDENTE'
  },
  {
    id: 'doc-02',
    title: 'Espelho de Ponto e Banco de Horas — Competência 09/2026',
    type: 'FOLHA_PONTO',
    deadline: '08/10/2026',
    partyName: 'Recursos Humanos DiskIngressos',
    status: 'PENDENTE'
  },
  {
    id: 'doc-03',
    title: 'Minuta Aditivo Contratual — Fornecedor AWS Serviços Cloud',
    type: 'ADITIVO',
    deadline: '10/10/2026',
    partyName: 'Amazon Web Services Brasil Ltda.',
    status: 'PENDENTE'
  }
];

export const FINANCIAL_ENTRIES: FinancialEntry[] = [
  {
    id: 'fin-01',
    code: 'CP-2026-1044',
    type: 'PAGAR',
    title: 'Licenciamento de Datacenter & Servidores Dedicados',
    entityName: 'Equinix Brasil Soluções de TI',
    costCenter: 'TI & Infraestrutura',
    category: 'Infraestrutura Tecnológica',
    amount: 34800.00,
    dueDate: '2026-10-10',
    status: 'CONFIRMADO',
    paymentMethod: 'Boleto Bancário'
  },
  {
    id: 'fin-02',
    code: 'CR-2026-0941',
    type: 'RECEBER',
    title: 'Taxa de Conveniência e Bilheteria Festival Curitiba Sounds',
    entityName: 'Live Nation Entretenimento Brasil',
    costCenter: 'Operações de Grandes Eventos',
    category: 'Receita Operacional Bruta',
    amount: 185600.00,
    dueDate: '2026-10-12',
    status: 'PREVISTO',
    paymentMethod: 'PIX Cobrança'
  },
  {
    id: 'fin-03',
    code: 'CP-2026-1045',
    type: 'PAGAR',
    title: 'Fornecimento de Bobinas Térmicas e Pulseiras RFID',
    entityName: 'Gráfica Segurança do Sul Ltda.',
    costCenter: 'Suprimentos & Insumos',
    category: 'Custos Diretos de Ingressos',
    amount: 12450.00,
    dueDate: '2026-10-15',
    status: 'PREVISTO',
    paymentMethod: 'TED Bancária'
  },
  {
    id: 'fin-04',
    code: 'CR-2026-0942',
    type: 'RECEBER',
    title: 'Faturamento Mensal Teatro Positivo (Contrato Anual)',
    entityName: 'Teatro Positivo Curitiba',
    costCenter: 'Casas de Espetáculos & Teatros',
    category: 'Receita Recorrente SaaS/Taxa',
    amount: 45000.00,
    dueDate: '2026-10-20',
    status: 'CONFIRMADO',
    paymentMethod: 'Boleto Registrado'
  },
  {
    id: 'fin-05',
    code: 'CP-2026-1046',
    type: 'PAGAR',
    title: 'Folha de Pagamento Consolidada + Encargos FGTS/INSS',
    entityName: 'Colaboradores DiskIngressos Matriz',
    costCenter: 'Recursos Humanos Corporativo',
    category: 'Despesas com Pessoal',
    amount: 289400.00,
    dueDate: '2026-10-05',
    status: 'PAGO',
    paymentMethod: 'Folha Automática Itaú'
  }
];

export const CRM_OPPORTUNITIES: CrmOpportunity[] = [
  {
    id: 'crm-1',
    clientName: 'Allianz Parque Eventos',
    title: 'Gestão Exclusiva de Bilheteria Turnê Stadium 2027',
    value: 650000.00,
    stage: 'NEGOCIACAO',
    probability: 80,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-10-28'
  },
  {
    id: 'crm-2',
    clientName: 'Festival Lollapalooza Brasil (Lote Especial)',
    title: 'Operação de Controle de Acesso e PDVs Físicos',
    value: 380000.00,
    stage: 'PROPOSTA',
    probability: 60,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-11-05'
  },
  {
    id: 'crm-3',
    clientName: 'Teatro Bradesco SP',
    title: 'Renovação Trienal Sistema SEEK Bilheteria',
    value: 240000.00,
    stage: 'GANHO',
    probability: 100,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-10-01'
  },
  {
    id: 'crm-4',
    clientName: 'Maracanã Tour & Museu do Futebol',
    title: 'Venda de Ingressos Online com Catracas Faciais',
    value: 410000.00,
    stage: 'QUALIFICACAO',
    probability: 40,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-11-20'
  },
  {
    id: 'crm-5',
    clientName: 'Arena do Grêmio',
    title: 'Sistema de Acessos e Sócios Torcedores',
    value: 520000.00,
    stage: 'PROSPECCAO',
    probability: 25,
    ownerName: 'Lucas Bertolli Costa',
    expectedCloseDate: '2026-12-15'
  }
];

export const EMPLOYEES: EmployeeProfile[] = [
  {
    id: 'emp-01',
    registrationNumber: 'MAT-0012',
    fullName: 'Carlos Drummond de Castro',
    jobTitle: 'Diretor Presidente / CEO',
    department: 'Diretoria Executiva',
    branch: 'Curitiba (Sede / Matriz)',
    regime: 'CLT',
    admissionDate: '2015-03-01',
    vacationBalanceDays: 30,
    bankHoursBalance: 0,
    active: true
  },
  {
    id: 'emp-02',
    registrationNumber: 'MAT-0045',
    fullName: 'Helena Silveira Ramos',
    jobTitle: 'Gerente Financeira & Controladoria',
    department: 'Financeiro',
    branch: 'Curitiba (Sede / Matriz)',
    regime: 'CLT',
    admissionDate: '2018-06-15',
    vacationBalanceDays: 22,
    bankHoursBalance: 8.5,
    active: true
  },
  {
    id: 'emp-03',
    registrationNumber: 'MAT-0089',
    fullName: 'Rafael Medeiros Pires',
    jobTitle: 'Coordenador de RH & DP',
    department: 'Recursos Humanos',
    branch: 'Curitiba (Sede / Matriz)',
    regime: 'CLT',
    admissionDate: '2019-01-10',
    vacationBalanceDays: 15,
    bankHoursBalance: -2.0,
    active: true
  },
  {
    id: 'emp-04',
    registrationNumber: 'MAT-0112',
    fullName: 'Mariana Fontes Prado',
    jobTitle: 'Gestora de Compras & Suprimentos',
    department: 'Compras & Suprimentos',
    branch: 'Curitiba (Sede / Matriz)',
    regime: 'CLT',
    admissionDate: '2020-09-01',
    vacationBalanceDays: 25,
    bankHoursBalance: 4.0,
    active: true
  },
  {
    id: 'emp-05',
    registrationNumber: 'MAT-0130',
    fullName: 'Lucas Bertolli Costa',
    jobTitle: 'Líder Comercial & CRM',
    department: 'Comercial',
    branch: 'Curitiba (Sede / Matriz)',
    regime: 'CLT',
    admissionDate: '2021-04-12',
    vacationBalanceDays: 18,
    bankHoursBalance: 12.0,
    active: true
  },
  {
    id: 'emp-06',
    registrationNumber: 'MAT-0164',
    fullName: 'Beatriz Castro Lima',
    jobTitle: 'Analista de Operações Pleno',
    department: 'Operações de Eventos',
    branch: 'Curitiba (Sede / Matriz)',
    regime: 'CLT',
    admissionDate: '2022-11-01',
    vacationBalanceDays: 30,
    bankHoursBalance: 6.5,
    active: true
  }
];

export const PURCHASING_REQUISITIONS: PurchaseRequisition[] = [
  {
    id: 'pr-01',
    code: 'SC-2026-0310',
    title: '15 Catracas Portáteis & Scanners Ópticos',
    department: 'Operações de Eventos',
    requesterName: 'Beatriz Castro Lima',
    supplierQuoted: 'Digicon Controle de Acesso S.A.',
    totalAmount: 18450.00,
    status: 'PENDENTE_APROVACAO',
    requiredDate: '2026-10-25'
  },
  {
    id: 'pr-02',
    code: 'SC-2026-0309',
    title: '50.000 Pulseiras Tyvek com Chip RFID',
    department: 'Bilheteria & Suprimentos',
    requesterName: 'Mariana Fontes Prado',
    supplierQuoted: 'Identifica Eventos Brasil Ltda.',
    totalAmount: 32000.00,
    status: 'APROVADO',
    requiredDate: '2026-10-18'
  },
  {
    id: 'pr-03',
    code: 'SC-2026-0308',
    title: '5 Laptops Dell Latitude i7 para Equipe Comercial SP',
    department: 'Tecnologia da Informação',
    requesterName: 'Eduardo Martins',
    supplierQuoted: 'Dell Computadores do Brasil',
    totalAmount: 26500.00,
    status: 'PEDIDO_EMITIDO',
    requiredDate: '2026-10-15'
  }
];

export const ASSETS_RECORDS: AssetRecord[] = [
  {
    id: 'ast-01',
    tagNumber: 'PAT-00452',
    description: 'Servidor Dell PowerEdge R750 64GB SSD NVMe',
    category: 'TI',
    location: 'Datacenter Curitiba Rack 02',
    responsibleName: 'Eduardo Martins (TI)',
    acquisitionCost: 48000.00,
    currentBookValue: 36000.00,
    status: 'ATIVO'
  },
  {
    id: 'ast-02',
    tagNumber: 'PAT-00612',
    description: 'Catraca Eletrônica Flap com Reconhecimento Facial',
    category: 'EQUIPAMENTO',
    location: 'Estoque Central Eventos PR',
    responsibleName: 'Beatriz Castro Lima',
    acquisitionCost: 14500.00,
    currentBookValue: 12200.00,
    status: 'ATIVO'
  },
  {
    id: 'ast-03',
    tagNumber: 'PAT-00788',
    description: 'MacBook Pro 16" M3 Max 36GB RAM',
    category: 'TI',
    location: 'Diretoria Executiva',
    responsibleName: 'Carlos Drummond de Castro',
    acquisitionCost: 22000.00,
    currentBookValue: 18500.00,
    status: 'ATIVO'
  }
];

export const CONTRACTS_RECORDS: ContractRecord[] = [
  {
    id: 'ct-01',
    contractNumber: 'CT-2024-0089',
    partyName: 'Allianz Parque Gestão de Arenas',
    type: 'CLIENTE',
    monthlyValue: 85000.00,
    startDate: '2024-11-01',
    endDate: '2026-11-01',
    daysRemaining: 27,
    readjustmentIndex: 'IPCA',
    status: 'VENCENDO'
  },
  {
    id: 'ct-02',
    contractNumber: 'CT-2025-0142',
    partyName: 'Amazon Web Services Serviços Cloud',
    type: 'FORNECEDOR',
    monthlyValue: 38000.00,
    startDate: '2025-01-15',
    endDate: '2027-01-15',
    daysRemaining: 467,
    readjustmentIndex: 'FIXO',
    status: 'VIGENTE'
  },
  {
    id: 'ct-03',
    contractNumber: 'CT-2023-0056',
    partyName: 'Teatro Guaíra Curitiba',
    type: 'CLIENTE',
    monthlyValue: 32000.00,
    startDate: '2023-08-01',
    endDate: '2026-12-31',
    daysRemaining: 87,
    readjustmentIndex: 'IGP-M',
    status: 'VIGENTE'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-01',
    timestamp: '2026-10-05 16:20:12',
    userName: 'Carlos Drummond de Castro',
    userRole: 'Diretor Presidente / CEO',
    action: 'APPROVE',
    module: 'Financeiro',
    entity: 'Orçamento Trimestral Q4',
    description: 'Aprovado teto orçamentário para expansão Filial SP no valor de R$ 450.000,00',
    ipAddress: '189.44.120.12'
  },
  {
    id: 'aud-02',
    timestamp: '2026-10-05 15:45:00',
    userName: 'Mariana Fontes Prado',
    userRole: 'Gestora de Compras',
    action: 'CREATE',
    module: 'Compras',
    entity: 'Solicitação de Compra SC-2026-0310',
    description: 'Criada solicitação para 15 catracas portáteis e submetida ao fluxo de alçadas',
    ipAddress: '189.44.120.14'
  },
  {
    id: 'aud-03',
    timestamp: '2026-10-05 14:10:30',
    userName: 'Lucas Bertolli Costa',
    userRole: 'Líder Comercial',
    action: 'UPDATE',
    module: 'CRM & Comercial',
    entity: 'Oportunidade CRM Allianz Parque',
    description: 'Avançou estágio de Proposta para Negociação (Valor R$ 650.000,00)',
    ipAddress: '189.44.120.18'
  },
  {
    id: 'aud-04',
    timestamp: '2026-10-05 11:05:44',
    userName: 'Rafael Medeiros Pires',
    userRole: 'Coordenador de RH',
    action: 'APPROVE',
    module: 'RH & DP',
    entity: 'Programação de Férias',
    description: 'Homologação de férias para Camila Zanin (Período Nov/Dez 2026)',
    ipAddress: '189.44.120.22'
  }
];
