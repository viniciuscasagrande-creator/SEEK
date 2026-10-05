import { Router, Request, Response } from 'express';
import { auditLogs } from '../db.js';

export const financeRouter = Router();

// Store em memória compartilhada com sincronização
export let financialRecords = [
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

financeRouter.get('/records', (req: Request, res: Response) => {
  const { type, status } = req.query;
  let result = [...financialRecords];
  if (type && type !== 'ALL') {
    result = result.filter(r => r.type === type);
  }
  if (status && status !== 'ALL') {
    result = result.filter(r => r.status === status);
  }
  return res.json({ total: result.length, records: result });
});

financeRouter.post('/records', (req: Request, res: Response) => {
  const { type, title, entityName, costCenter, category, amount, dueDate, paymentMethod } = req.body;

  if (!title || !amount || !dueDate) {
    return res.status(400).json({ error: 'Campos obrigatórios: title, amount, dueDate.' });
  }

  const codePrefix = type === 'RECEBER' ? 'CR' : 'CP';
  const newRecord = {
    id: `fin-${Date.now()}`,
    code: `${codePrefix}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    type: type || 'PAGAR',
    title,
    entityName: entityName || 'Entidade Corporativa',
    costCenter: costCenter || 'Administrativo Geral',
    category: category || 'Despesas Gerais',
    amount: parseFloat(amount),
    dueDate,
    status: 'PREVISTO',
    paymentMethod: paymentMethod || 'PIX'
  };

  financialRecords.unshift(newRecord);

  // Registro de auditoria
  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userName: req.body.userName || 'Sistema Financeiro',
    userRole: 'Financeiro',
    action: 'CREATE',
    module: 'Financeiro',
    entity: `Lançamento ${newRecord.code}`,
    description: `Criado lançamento ${newRecord.type} no valor de R$ ${newRecord.amount.toFixed(2)} (${newRecord.title})`,
    ipAddress: req.ip || '189.44.120.10'
  });

  return res.status(201).json(newRecord);
});

financeRouter.patch('/records/:id/pay', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = financialRecords.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Lançamento financeiro não encontrado.' });
  }

  financialRecords[index].status = 'PAGO';

  auditLogs.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userName: req.body.userName || 'Operador Financeiro',
    userRole: 'Financeiro',
    action: 'UPDATE',
    module: 'Financeiro',
    entity: `Lançamento ${financialRecords[index].code}`,
    description: `Baixa / liquidação financeira efetuada no valor de R$ ${financialRecords[index].amount.toFixed(2)}`,
    ipAddress: req.ip || '189.44.120.10'
  });

  return res.json({ success: true, record: financialRecords[index] });
});

financeRouter.get('/summary', (_req: Request, res: Response) => {
  const totalReceitas = financialRecords.filter(f => f.type === 'RECEBER').reduce((a, b) => a + b.amount, 0);
  const totalDespesas = financialRecords.filter(f => f.type === 'PAGAR').reduce((a, b) => a + b.amount, 0);
  const saldoLiquido = totalReceitas - totalDespesas;

  return res.json({
    totalReceitas,
    totalDespesas,
    saldoLiquido,
    disponibilidadeBancaria: 1840500.00,
    ebitdaProjetadoPercent: 24.8
  });
});
