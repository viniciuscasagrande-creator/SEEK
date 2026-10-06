import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import { authenticateToken, requireModule } from './middleware/auth.js';
import { authRouter } from './routes/auth.routes.js';
import { coreRouter } from './routes/core.routes.js';
import { financeRouter } from './routes/finance.routes.js';
import { crmRouter } from './routes/crm.routes.js';
import { workflowRouter } from './routes/workflow.routes.js';
import { purchasingRouter } from './routes/purchasing.routes.js';
import { contractsRouter } from './routes/contracts.routes.js';
import { hrRouter } from './routes/hr.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { serviceDeskRouter } from './routes/serviceDesk.routes.js';
import { documentsRouter } from './routes/documents.routes.js';
import { governanceRouter } from './routes/governance.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { workCenterRouter } from './routes/workCenter.routes.js';
import { seekAiRouter } from './routes/seekAi.routes.js';
import accountingRouter from './routes/accounting.routes.js';
import fiscalRouter from './routes/fiscal.routes.js';
import freelanceRouter from './routes/freelance.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares Globais
app.use(cors({
  origin: [
    'https://seek-xi.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));
app.use(express.json());

// Middleware de Rastreabilidade Corporativa: Correlation ID (x-correlation-id)
app.use((req, res, next) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || `seek-corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  (req as any).correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
});

// 1. Rotas Públicas de Autenticação e Verificação de Saúde
app.use('/api/auth', authRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'SEEK — Gestão Corporativa Integrada (Enterprise ERP & CRM)',
    package: 'Hiper Pacote 11: Administração, Segurança, Auditoria e Integrações',
    version: '1.8.0-ENTERPRISE',
    officialUrl: 'https://seek-xi.vercel.app',
    authScheme: 'JWT (Bearer Token RFC 7519)',
    timestamp: new Date().toISOString()
  });
});

// 2. Rotas Protegidas com Autenticação JWT Obrigatória e RBAC no Backend
app.use('/api/core', authenticateToken, coreRouter);
app.use('/api/finance', authenticateToken, requireModule('finance'), financeRouter);
app.use('/api/accounting', authenticateToken, requireModule('accounting'), accountingRouter);
app.use('/api/fiscal', authenticateToken, requireModule('fiscal'), fiscalRouter);
app.use('/api/crm', authenticateToken, requireModule('crm'), crmRouter);
app.use('/api/workflow', authenticateToken, workflowRouter);
app.use('/api/purchasing', authenticateToken, requireModule('purchasing'), purchasingRouter);
app.use('/api/contracts', authenticateToken, requireModule('contracts'), contractsRouter);
app.use('/api/hr', authenticateToken, requireModule('hr'), hrRouter);
app.use('/api/freelance', authenticateToken, requireModule('freelance'), freelanceRouter);
app.use('/api/hr/freelance', authenticateToken, requireModule('freelance'), freelanceRouter);
app.use('/api/inventory', authenticateToken, requireModule('inventory'), inventoryRouter);
app.use('/api/projects', authenticateToken, requireModule('projects'), projectsRouter);
app.use('/api/service-desk', authenticateToken, requireModule('service-desk'), serviceDeskRouter);
app.use('/api/documents', authenticateToken, requireModule('documents'), documentsRouter);
app.use('/api/governance', authenticateToken, requireModule('governance'), governanceRouter);
app.use('/api/notifications', authenticateToken, notificationsRouter);
app.use('/api/work-center', authenticateToken, workCenterRouter);
app.use('/api/seek-ai', authenticateToken, seekAiRouter);

// Compatibilidade com rotas diretas legadas do protótipo (protegidas por token)
app.use('/api/employees', authenticateToken, (req, res, next) => {
  req.url = req.url === '/' ? '/employees' : req.url;
  hrRouter(req, res, next);
});
app.use('/api/time', authenticateToken, (req, res, next) => {
  req.url = req.url === '/' ? '/time-records' : req.url;
  hrRouter(req, res, next);
});
app.use('/api/assets', authenticateToken, (req, res, next) => {
  req.url = req.url === '/' ? '/assets' : req.url;
  inventoryRouter(req, res, next);
});
app.use('/api/inventoryMoves', authenticateToken, (req, res, next) => {
  req.url = req.url === '/' ? '/movements' : req.url;
  inventoryRouter(req, res, next);
});
app.use('/api/projectTasks', authenticateToken, (req, res, next) => {
  req.url = req.url === '/' ? '/tasks' : req.url;
  projectsRouter(req, res, next);
});
app.use('/api/tickets', authenticateToken, (req, res, next) => {
  req.url = req.url === '/' ? '/tickets' : req.url;
  serviceDeskRouter(req, res, next);
});

// Endpoint Consolidado para o Dashboard Executivo C-Level (Protegido por JWT)
app.get('/api/dashboard', authenticateToken, (_req, res) => {
  try {
    const recSum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'RECEBER'`).get() as { total: number };
    const paySum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_records WHERE type = 'PAGAR'`).get() as { total: number };
    const bankSum = db.prepare(`SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE active = 1`).get() as { total: number };

    const crmTotal = db.prepare(`SELECT COALESCE(SUM(value), 0) as total, COUNT(*) as count FROM crm_deals`).get() as { total: number; count: number };
    const crmWon = db.prepare(`SELECT COALESCE(SUM(value), 0) as total FROM crm_deals WHERE stage = 'CLIENTE'`).get() as { total: number };

    const contractsBilling = db.prepare(`SELECT COALESCE(SUM(monthly_value), 0) as total, COUNT(*) as count FROM contracts WHERE status != 'RESCINDIDO'`).get() as { total: number; count: number };
    const contractsExpiringSoon = db.prepare(`SELECT COUNT(*) as count FROM contracts WHERE days_remaining <= 30 AND status != 'RESCINDIDO'`).get() as { count: number };

    const pendingApprovals = db.prepare(`SELECT COUNT(*) as count FROM approvals WHERE status = 'PENDENTE'`).get() as { count: number };
    const pendingPurchases = db.prepare(`SELECT COUNT(*) as count FROM purchase_orders WHERE status = 'PENDENTE_APROVACAO'`).get() as { count: number };

    const headcount = db.prepare('SELECT COUNT(*) as count FROM employees WHERE active = 1').get() as { count: number };
    const openTickets = db.prepare(`SELECT COUNT(*) as count FROM tickets WHERE status != 'RESOLVIDO'`).get() as { count: number };
    const totalAssetValue = db.prepare(`SELECT COALESCE(SUM(current_book_value), 0) as total FROM assets WHERE status = 'ATIVO'`).get() as { total: number };

    const totalReceitas = recSum.total;
    const totalDespesas = paySum.total;
    const saldoLiquido = totalReceitas - totalDespesas;
    const ebitdaPercent = totalReceitas > 0 ? Number(((saldoLiquido / totalReceitas) * 100).toFixed(1)) : 24.8;

    return res.json({
      finance: {
        totalReceitas,
        totalDespesas,
        saldoLiquido,
        disponibilidadeBancaria: bankSum.total,
        ebitdaPercent
      },
      crm: {
        pipelineTotal: crmTotal.total,
        dealsCount: crmTotal.count,
        wonValue: crmWon.total
      },
      contracts: {
        monthlyBilling: contractsBilling.total,
        activeContractsCount: contractsBilling.count,
        expiringSoonCount: contractsExpiringSoon.count
      },
      hr: {
        headcount: headcount.count
      },
      operations: {
        pendingApprovalsCount: pendingApprovals.count,
        pendingPurchasesCount: pendingPurchases.count,
        openTicketsCount: openTickets.count,
        totalAssetValue: totalAssetValue.total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro no cálculo do dashboard executivo:', error);
    return res.status(500).json({ error: 'Falha ao consolidar indicadores corporativos do dashboard.' });
  }
});

// Middleware Global de Tratamento de Erros (Sanitização para não expor stack/SQL ao cliente)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SEEK Core Error]', err);
  res.status(500).json({ error: 'Erro interno no processamento da requisição corporativa.' });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[SEEK Core API] Servidor corporativo operacional rodando em http://0.0.0.0:${PORT}`);
});
