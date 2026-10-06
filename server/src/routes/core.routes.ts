import { Router, Request, Response } from 'express';
import { db, getMigrationsStatus, isPostgresConfigured } from '../db.js';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.js';

export const coreRouter = Router();

coreRouter.get('/companies', (_req: Request, res: Response) => {
  try {
    const companies = db.prepare('SELECT * FROM companies WHERE active = 1 ORDER BY is_holding DESC, trade_name ASC').all();
    return res.json({ companies });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/branches', (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    let branches;
    if (companyId) {
      branches = db.prepare('SELECT * FROM branches WHERE company_id = ? AND active = 1 ORDER BY is_headquarter DESC, name ASC').all(companyId);
    } else {
      branches = db.prepare('SELECT * FROM branches WHERE active = 1 ORDER BY is_headquarter DESC, name ASC').all();
    }
    return res.json({ branches });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/departments', (req: Request, res: Response) => {
  try {
    const departments = db.prepare('SELECT * FROM departments WHERE active = 1 ORDER BY name ASC').all();
    return res.json({ departments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/cost-centers', (req: Request, res: Response) => {
  try {
    const costCenters = db.prepare('SELECT * FROM cost_centers WHERE active = 1 ORDER BY code ASC').all();
    return res.json({ costCenters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/parameters', (_req: Request, res: Response) => {
  try {
    const parameters = db.prepare('SELECT * FROM corporate_parameters').all();
    return res.json({ parameters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Parceiros de Negócios (Clientes e Fornecedores) com Mascaramento LGPD
coreRouter.get('/partners', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const canViewFullDoc = Boolean(authReq.user && ['ADMIN_GERAL', 'DIRETORIA', 'FINANCEIRO', 'COMPRAS', 'COMERCIAL'].includes(authReq.user.roleLevel));
    const rows = db.prepare('SELECT * FROM business_partners WHERE active = 1 ORDER BY trade_name ASC').all() as any[];
    const partners = rows.map(r => {
      const clean = (r.document_number || '').replace(/\D/g, '');
      const maskedDoc = clean.length === 14 
        ? `${clean.substring(0, 2)}.***.***/${clean.substring(8, 12)}-**`
        : clean.length === 11 
          ? `***.${clean.substring(3, 6)}.***-${clean.substring(9, 11)}`
          : '****';

      return {
        id: r.id,
        companyId: r.company_id,
        type: r.type,
        legalName: r.legal_name,
        tradeName: r.trade_name,
        documentNumber: canViewFullDoc ? r.document_number : maskedDoc,
        documentNumberMasked: !canViewFullDoc,
        category: r.category,
        contactName: r.contact_name,
        email: r.email,
        city: r.city,
        state: r.state,
        rating: r.rating,
        slaPercent: r.sla_percent,
        active: Boolean(r.active)
      };
    });
    return res.json({ total: partners.length, partners });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Acesso restrito a auditoria e governança C-Level
coreRouter.get('/audit-logs', requireRole(['ADMIN_GERAL', 'AUDITORIA', 'DIRETORIA']), (_req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200').all();
    return res.json({ total: logs.length, logs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Status do Banco de Dados e Migrations (Dual Engine: SQLite / PostgreSQL)
coreRouter.get('/database', (_req: Request, res: Response) => {
  try {
    const status = getMigrationsStatus();
    return res.json({
      status: 'ONLINE',
      engine: status.engine,
      totalMigrationsApplied: status.totalApplied,
      migrations: status.migrations,
      isPostgresConfigured,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
