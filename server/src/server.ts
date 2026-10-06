import express from 'express';
import cors from 'cors';
import { db } from './db.js';
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
import { seekAiRouter } from './routes/seekAi.routes.js';
import accountingRouter from './routes/accounting.routes.js';
import fiscalRouter from './routes/fiscal.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API SEEK V1 (Hiper Pacote 5: Contabilidade Avançada, Fiscal & Fechamento Contábil)
app.use('/api/auth', authRouter);
app.use('/api/core', coreRouter);
app.use('/api/finance', financeRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/fiscal', fiscalRouter);
app.use('/api/crm', crmRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/purchasing', purchasingRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/hr', hrRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/service-desk', serviceDeskRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/governance', governanceRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/seek-ai', seekAiRouter);

// Compatibilidade com rotas diretas do protótipo
app.post('/api/login', (req, res) => {
  res.redirect(307, '/api/auth/login');
});
app.use('/api/employees', (req, res, next) => {
  req.url = req.url === '/' ? '/employees' : req.url;
  hrRouter(req, res, next);
});
app.use('/api/time', (req, res, next) => {
  req.url = req.url === '/' ? '/time-records' : req.url;
  hrRouter(req, res, next);
});
app.use('/api/assets', (req, res, next) => {
  req.url = req.url === '/' ? '/assets' : req.url;
  inventoryRouter(req, res, next);
});
app.use('/api/inventoryMoves', (req, res, next) => {
  req.url = req.url === '/' ? '/movements' : req.url;
  inventoryRouter(req, res, next);
});
app.use('/api/projectTasks', (req, res, next) => {
  req.url = req.url === '/' ? '/tasks' : req.url;
  projectsRouter(req, res, next);
});
app.use('/api/tickets', (req, res, next) => {
  req.url = req.url === '/' ? '/tickets' : req.url;
  serviceDeskRouter(req, res, next);
});

// Endpoint Consolidado para o Dashboard Executivo C-Level
app.get('/api/dashboard', (_req, res) => {
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
    return res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'SEEK — Gestão Corporativa Integrada',
    package: 'Hiper Pacote 5: Contabilidade Avançada, Fiscal & Fechamento Contábil',
    version: '1.5.0-CONTABIL',
    timestamp: new Date().toISOString()
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[SEEK Core API] Servidor corporativo operacional rodando em http://0.0.0.0:${PORT}`);
});
