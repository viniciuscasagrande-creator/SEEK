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
import { seekAiRouter } from './routes/seekAi.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API SEEK V1 (Hiper Pacote 3: Gestão Corporativa)
app.use('/api/auth', authRouter);
app.use('/api/core', coreRouter);
app.use('/api/finance', financeRouter);
app.use('/api/crm', crmRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/purchasing', purchasingRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/seek-ai', seekAiRouter);

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
      operations: {
        pendingApprovalsCount: pendingApprovals.count,
        pendingPurchasesCount: pendingPurchases.count
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
    package: 'Hiper Pacote 3: Gestão Corporativa',
    version: '1.3.0-GESTAO',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[SEEK Core API] Servidor corporativo operacional rodando em http://localhost:${PORT}`);
});
