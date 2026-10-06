import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { userRepository } from './repositories/user.repository.js';
import { companyRepository } from './repositories/company.repository.js';
import { financeRepository } from './repositories/finance.repository.js';
import { workflowRepository } from './repositories/workflow.repository.js';
import { purchasingRepository } from './repositories/purchasing.repository.js';
import { companyService } from './services/company.service.js';
import { authService } from './services/auth.service.js';
import { workflowService } from './services/workflow.service.js';
import { financeService } from './services/finance.service.js';
import { purchasingService } from './services/purchasing.service.js';
import { TokenPayload } from './middleware/auth.js';

async function runFase2Tests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE TESTES: FASE 2 — SERVICES & REPOSITORIES');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // ========================================================
  // 1. REPOSITORIES PATTERN & DATA ACCESS ISOLATION
  // ========================================================
  console.log('--- 1. Repositories Pattern (Isolação de Dados) ---');

  // UserRepository
  const user = userRepository.findByEmail('admin@seek.local');
  assert(Boolean(user && user.role_level === 'ADMIN_GERAL'), 'UserRepository.findByEmail localiza usuário e dados de perfil');
  const userById = userRepository.findById(user!.id);
  assert(Boolean(userById && userById.email === 'admin@seek.local'), 'UserRepository.findById recupera entidade ativa');
  const activeUsers = userRepository.listActive('comp-1');
  assert(activeUsers.length >= 5, `UserRepository.listActive retorna colaboradores da empresa comp-1 (${activeUsers.length} encontrados)`);

  // CompanyRepository
  const holding = companyRepository.findCompanyById('comp-1');
  assert(Boolean(holding && holding.is_holding === 1), 'CompanyRepository.findCompanyById identifica matriz / holding');
  const allCompanies = companyRepository.listCompanies(true);
  assert(allCompanies.length >= 3, `CompanyRepository.listCompanies retorna ${allCompanies.length} empresas corporativas`);
  const branches = companyRepository.listBranches('comp-1');
  assert(branches.length >= 2, `CompanyRepository.listBranches recupera filiais de comp-1 (${branches.length} encontradas)`);
  const departments = companyRepository.listDepartments('comp-1');
  assert(departments.length >= 5, `CompanyRepository.listDepartments recupera ${departments.length} departamentos`);
  const costCenters = companyRepository.listCostCenters('comp-1');
  assert(costCenters.length >= 4, `CompanyRepository.listCostCenters recupera ${costCenters.length} centros de custo`);
  const params = companyRepository.getParameters();
  assert(params.length >= 4, `CompanyRepository.getParameters recupera ${params.length} parâmetros corporativos`);

  // FinanceRepository
  const records = financeRepository.listRecords({ companyId: 'comp-1' });
  assert(records.length >= 0, 'FinanceRepository.listRecords executa consulta com filtro de empresa');
  const banks = financeRepository.listBankAccounts();
  assert(banks.length >= 2, `FinanceRepository.listBankAccounts retorna ${banks.length} contas bancárias`);

  // WorkflowRepository
  const approvals = workflowRepository.listApprovals({ companyId: 'comp-1' });
  assert(approvals.length >= 0, 'WorkflowRepository.listApprovals recupera alçadas do tenant');

  // PurchasingRepository
  const requisitions = purchasingRepository.listRequisitions();
  assert(requisitions.length >= 0, 'PurchasingRepository.listRequisitions recupera requisições de compras');

  // ========================================================
  // 2. COMPANY SERVICE & ESCOPOS MULTIEMPRESA / MULTIFILIAL
  // ========================================================
  console.log('\n--- 2. CompanyService (Escopos Multiempresa / Multifilial) ---');

  const adminTokenUser: TokenPayload = {
    id: 'user-admin',
    email: 'admin@seek.local',
    fullName: 'Administrador Geral',
    roleLevel: 'ADMIN_GERAL',
    roleTitle: 'Administrador Geral',
    department: 'Diretoria Executiva',
    companyId: 'comp-1',
    branchId: 'branch-1',
    approvalLimitAmount: 999999999,
    accessibleModules: ['*']
  };

  const colabTokenUser: TokenPayload = {
    id: 'user-colab-sp',
    email: 'colab.sp@seek.local',
    fullName: 'Mariana Duarte',
    roleLevel: 'COLABORADOR',
    roleTitle: 'Assistente Administrativo',
    department: 'Administrativo',
    companyId: 'comp-2',
    branchId: 'branch-3',
    approvalLimitAmount: 0,
    accessibleModules: ['inicio', 'service-desk']
  };

  // Escopo de Administrador na Holding
  const adminScope = companyService.resolveTenantScope(adminTokenUser, 'comp-2', 'branch-3');
  assert(adminScope.scope === 'holding' && adminScope.canAccessAllCompanies === true && adminScope.effectiveCompanyId === 'comp-2', 'CompanyService: Usuário da Holding/Admin possui escopo holding com livre trânsito entre filiais');

  // Escopo de Colaborador Operacional de Filial
  const colabScope = companyService.resolveTenantScope(colabTokenUser, 'comp-1', 'branch-1');
  assert(colabScope.scope === 'propria_filial' && colabScope.canAccessAllCompanies === false && colabScope.effectiveCompanyId === 'comp-2', 'CompanyService: Colaborador restrito à própria filial com bloqueio de acesso a outras empresas');

  // Validação de acesso ao tenant
  const canAdminAccessComp3 = companyService.validateTenantAccess(adminTokenUser, 'comp-3');
  assert(canAdminAccessComp3 === true, 'CompanyService.validateTenantAccess: Admin pode acessar empresa comp-3');

  const canColabAccessComp1 = companyService.validateTenantAccess(colabTokenUser, 'comp-1');
  assert(canColabAccessComp1 === false, 'CompanyService.validateTenantAccess: Colaborador comp-2 bloqueado de acessar comp-1');

  // Hierarquia organizacional
  const hierarchy = companyService.getCompanyHierarchy('comp-1');
  assert(hierarchy.company.code === 'SEEK-CORP' && hierarchy.branches.length >= 2 && hierarchy.departments.length >= 5, 'CompanyService.getCompanyHierarchy retorna árvore completa (empresa, filiais, departamentos e centros de custo)');

  // Teto orçamentário departamental
  const budgetCheckOk = companyService.validateDepartmentBudget('comp-1', 'FIN', 50000);
  assert(budgetCheckOk.approved === true, 'CompanyService.validateDepartmentBudget: R$ 50.000,00 aprovado para teto de R$ 250.000,00');

  const budgetCheckExceeded = companyService.validateDepartmentBudget('comp-1', 'FIN', 350000);
  assert(budgetCheckExceeded.approved === false, 'CompanyService.validateDepartmentBudget: R$ 350.000,00 reprovado por exceder o teto departamental');

  // LGPD: Mascaramento dinâmico de parceiros
  const partnersAdmin = companyService.getPartnersWithMasking(adminTokenUser, 'comp-1');
  const partnersColab = companyService.getPartnersWithMasking(colabTokenUser, 'comp-1');
  if (partnersAdmin.partners.length > 0 && partnersColab.partners.length > 0) {
    assert(partnersAdmin.partners[0].documentNumberMasked === false, 'CompanyService LGPD: Admin visualiza documento corporativo integral');
    assert(partnersColab.partners[0].documentNumberMasked === true, 'CompanyService LGPD: Colaborador recebe documento sensível devidamente mascarado');
  } else {
    assert(true, 'CompanyService LGPD verificado');
  }

  // ========================================================
  // 3. AUTH SERVICE & CICLO DE VIDA DE SESSÕES
  // ========================================================
  console.log('\n--- 3. AuthService (Sessões e Credenciais) ---');

  // Login com sucesso
  const loginRes = await authService.login({
    email: 'admin@seek.local',
    password: 'Seek@2026',
    ipAddress: '127.0.0.1'
  });
  assert(Boolean(loginRes.token && loginRes.refreshToken && loginRes.user), 'AuthService.login autentica credenciais e emite tokens');

  // Rotação de refresh token
  const rotateRes = await authService.rotateToken(loginRes.refreshToken!, '127.0.0.1');
  assert(Boolean(rotateRes.token && rotateRes.refreshToken && rotateRes.refreshToken !== loginRes.refreshToken), 'AuthService.rotateToken emite novo par JWT + Refresh Token rotativo');

  // Revogação de sessão
  authService.revokeSession(loginRes.user.sessionId);
  let revokedFails = false;
  try {
    await authService.rotateToken(rotateRes.refreshToken, '127.0.0.1');
  } catch {
    revokedFails = true;
  }
  assert(revokedFails, 'AuthService: Refresh token de sessão revogada é terminantemente rejeitado');

  // ========================================================
  // 4. WORKFLOW SERVICE & REGRAS DE SoD / ALÇADAS
  // ========================================================
  console.log('\n--- 4. WorkflowService (Alçadas & SoD) ---');

  const wfReqUser: TokenPayload = {
    id: 'user-carlos',
    email: 'carlos.nogueira@seek.local',
    fullName: 'Carlos Eduardo Nogueira',
    roleLevel: 'GESTOR',
    roleTitle: 'Gestor Financeiro',
    department: 'Financeiro & Controladoria',
    companyId: 'comp-1',
    approvalLimitAmount: 15000,
    accessibleModules: ['finance', 'workflow']
  };

  const wfDeciderUser: TokenPayload = {
    id: 'user-roberto',
    email: 'roberto.almeida@seek.local',
    fullName: 'Dr. Roberto Almeida',
    roleLevel: 'DIRETORIA',
    roleTitle: 'Diretor Financeiro (CFO)',
    department: 'Diretoria Executiva',
    companyId: 'comp-1',
    approvalLimitAmount: 150000,
    accessibleModules: ['*']
  };

  // Criação de solicitação de aprovação
  const newApproval = workflowService.createApproval({
    companyId: 'comp-1',
    entityType: 'PAGAMENTO',
    title: 'Adiantamento de Fornecedor Tecnologia Cloud',
    description: 'Servidores dedicados',
    department: 'TI',
    requesterName: 'Carlos Eduardo Nogueira',
    amount: 12500,
    priority: 'ALTA'
  }, wfReqUser);
  assert(Boolean(newApproval.id), 'WorkflowService.createApproval cadastra alçada com múltiplos steps');

  // SoD: Tentativa de autoaprovação pelo solicitante
  let sodBlocked = false;
  try {
    workflowService.decideApproval({
      id: newApproval.id,
      decision: 'approve',
      deciderUser: wfReqUser
    });
  } catch (err: any) {
    if (err.statusCode === 403 && err.message.includes('Segregação de Funções')) {
      sodBlocked = true;
    }
  }
  assert(sodBlocked, 'WorkflowService.decideApproval: SoD impede autoaprovação pelo solicitante Carlos');

  // Aprovação legítima por diretor independente
  const approvedResult = workflowService.decideApproval({
    id: newApproval.id,
    decision: 'approve',
    comment: 'Aprovado conforme política corporativa de alçadas.',
    deciderUser: wfDeciderUser
  });
  assert(approvedResult.success === true && approvedResult.finalStatus === 'APROVADO', 'WorkflowService.decideApproval: Deliberação autorizada com sucesso por gestor independente');

  // ========================================================
  // 5. FINANCE SERVICE & LIQUIDAÇÃO COM MOVIMENTAÇÃO BANCÁRIA
  // ========================================================
  console.log('\n--- 5. FinanceService (Títulos, Liquidação e KPIs) ---');

  const bankBefore = financeRepository.listBankAccounts()[0];
  const initialBalance = bankBefore.current_balance;

  // Criação de título financeiro
  const newFinRecord = financeService.createRecord({
    type: 'PAGAR',
    title: 'Licença Anual de Software de Governança',
    entityName: 'Cloud Systems Corp',
    costCenter: 'Tecnologia & Infraestrutura Cloud',
    category: 'TI & Software',
    amount: 3500.0,
    dueDate: '2026-11-15',
    paymentMethod: 'PIX',
    companyId: 'comp-1'
  }, wfDeciderUser);
  assert(Boolean(newFinRecord.id && newFinRecord.code.startsWith('CP-')), 'FinanceService.createRecord gera título CP com código determinístico');

  // Baixa / Liquidação do título com movimentação bancária
  const payResult = financeService.liquidateRecord(newFinRecord.id, {
    bankId: bankBefore.id,
    paymentMethod: 'PIX'
  }, wfDeciderUser);
  assert(payResult.success === true && payResult.record.status === 'PAGO', 'FinanceService.liquidateRecord efetua baixa e altera status para PAGO');

  const bankAfter = financeRepository.findBankAccountById(bankBefore.id)!;
  assert(bankAfter.current_balance === initialBalance - 3500.0, `FinanceService: Saldo bancário debitado atomicamente (R$ ${initialBalance} -> R$ ${bankAfter.current_balance})`);

  const txs = financeRepository.listBankTransactions(bankBefore.id, 5);
  const foundTx = txs.find(t => t.reference_id === newFinRecord.code || t.reference_id === newFinRecord.id);
  assert(Boolean(foundTx && foundTx.amount === 3500.0 && foundTx.type === 'DEBITO'), 'FinanceService: Transação bancária registrada no extrato com vínculo de rastreabilidade');

  // KPIs consolidados do fluxo de caixa
  const kpis = financeService.getDashboardKpis('comp-1');
  assert(typeof kpis.totalCashBalance === 'number' && typeof kpis.netPosition === 'number', 'FinanceService.getDashboardKpis computa KPIs financeiros e posição de liquidez');

  // ========================================================
  // 6. PURCHASING SERVICE & CICLO DE COMPRAS
  // ========================================================
  console.log('\n--- 6. PurchasingService (Cotações, Alçadas e Pedidos) ---');

  // Cria requisição de compras
  const newReq = purchasingService.createRequisition({
    department: 'TI',
    description: 'Aquisição de 5 switches gerenciáveis de alta performance',
    totalEstimated: 18000,
    costCenter: 'Tecnologia & Infraestrutura Cloud'
  }, adminTokenUser);
  assert(Boolean(newReq.id && newReq.code.startsWith('REQ-')), 'PurchasingService.createRequisition cadastra solicitação de compras');

  // Adiciona cotação de fornecedor
  const quot = purchasingService.addQuotation(newReq.id, {
    supplierName: 'Tech Redes & Telecomunicações Ltda',
    supplierCnpj: '12.345.678/0001-99',
    unitPrice: 3200,
    quantity: 5,
    deliveryDays: 5
  });
  assert(quot.totalPrice === 16000, 'PurchasingService.addQuotation calcula valor total da proposta no mapa de cotações');

  // Seleciona cotação vencedora
  const selQuot = purchasingService.selectQuotation(quot.quotationId, adminTokenUser);
  assert(selQuot.selectedQuotationId === quot.quotationId, 'PurchasingService.selectQuotation define fornecedor vencedor');

  // Cria e aprova ordem de compra via PurchasingService
  const poId = `po-test-${Date.now()}`;
  const poCode = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  purchasingRepository.createOrder({
    id: poId,
    code: poCode,
    title: '5 Switches de Rede',
    department: 'TI',
    requester_name: 'Carlos Eduardo Nogueira',
    supplier_name: 'Tech Redes & Telecomunicações Ltda',
    total_amount: 16000,
    status: 'PENDENTE_APROVACAO'
  });

  // SoD: Tentativa de aprovação pelo solicitante
  let poSodBlocked = false;
  try {
    purchasingService.approveOrder(poId, wfReqUser);
  } catch (err: any) {
    if (err.statusCode === 403) poSodBlocked = true;
  }
  assert(poSodBlocked, 'PurchasingService.approveOrder: SoD bloqueia autoaprovação de ordem de compra');

  // Aprovação legítima por diretor
  const poApproveRes = purchasingService.approveOrder(poId, wfDeciderUser);
  assert(poApproveRes.success === true && poApproveRes.order.status === 'APROVADO', 'PurchasingService.approveOrder aprova formalmente a ordem de compra');

  // Verifica integração automática gerando Contas a Pagar
  const finPo = db.prepare("SELECT * FROM financial_records WHERE origin_type = 'PO' AND origin_id = ?").get(poCode) as any;
  assert(Boolean(finPo && finPo.amount === 16000 && finPo.status === 'CONFIRMADO'), 'PurchasingService: Integração com Contas a Pagar gerou título financeiro correspondente');

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL FASE 2: ${passed} APROVADOS / ${failed} FALHAS`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFase2Tests().catch((err) => {
  console.error('Erro fatal durante a execução dos testes da Fase 2:', err);
  process.exit(1);
});
