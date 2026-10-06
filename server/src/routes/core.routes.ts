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
coreRouter.get('/audit-logs', requireRole(['ADMIN_GERAL', 'AUDITORIA', 'DIRETORIA', 'FINANCEIRO', 'ADMIN']), (_req: Request, res: Response) => {
  try {
    const rawLogs = workflowRepository.listAuditLogs(200);
    const logs = rawLogs.map(l => ({
      id: l.id,
      timestamp: l.timestamp,
      userName: l.user_name,
      userRole: l.user_role,
      user_name: l.user_name,
      user_role: l.user_role,
      action: l.action,
      module: l.module,
      entity: l.entity,
      description: l.description,
      ipAddress: l.ip_address,
      ip_address: l.ip_address,
      correlationId: l.correlation_id,
      correlation_id: l.correlation_id
    }));
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
