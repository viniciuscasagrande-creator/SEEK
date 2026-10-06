import { Router, Request, Response } from 'express';
import { getMigrationsStatus, isPostgresConfigured } from '../db.js';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { companyRepository } from '../repositories/company.repository.js';
import { companyService } from '../services/company.service.js';
import { workflowRepository } from '../repositories/workflow.repository.js';

export const coreRouter = Router();

coreRouter.get('/companies', (_req: Request, res: Response) => {
  try {
    const companies = companyRepository.listCompanies(true);
    return res.json({ companies });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/branches', (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    const branches = companyRepository.listBranches(companyId as string);
    return res.json({ branches });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/departments', (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    const departments = companyRepository.listDepartments(companyId as string);
    return res.json({ departments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/cost-centers', (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    const costCenters = companyRepository.listCostCenters(companyId as string);
    return res.json({ costCenters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

coreRouter.get('/parameters', (_req: Request, res: Response) => {
  try {
    const parameters = companyRepository.getParameters();
    return res.json({ parameters });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Parceiros de Negócios (Clientes e Fornecedores) com Mascaramento LGPD via CompanyService
coreRouter.get('/partners', (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { companyId } = req.query;
    const result = companyService.getPartnersWithMasking(authReq.user, companyId as string);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Acesso restrito a auditoria e governança C-Level via WorkflowRepository
coreRouter.get('/audit-logs', requireRole(['ADMIN_GERAL', 'AUDITORIA', 'DIRETORIA']), (_req: Request, res: Response) => {
  try {
    const logs = workflowRepository.listAuditLogs(200);
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
