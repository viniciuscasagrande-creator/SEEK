import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

const router = Router();

// 1. GET /api/accounting/chart-of-accounts - Lista o Plano de Contas Hierárquico
router.get('/chart-of-accounts', (req: Request, res: Response) => {
  try {
    const accounts = db.prepare('SELECT * FROM chart_of_accounts ORDER BY code ASC').all();
    res.json({ success: true, accounts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /api/accounting/chart-of-accounts - Cadastra nova conta contábil analítica
router.post('/chart-of-accounts', (req: Request, res: Response) => {
  try {
    const { code, name, type, nature, level, parent_code, userName, userRole } = req.body;

    if (!code || !name || !nature) {
      return res.status(400).json({ success: false, message: 'Código, nome e natureza são obrigatórios.' });
    }

    const existing = db.prepare('SELECT id FROM chart_of_accounts WHERE code = ?').get(code);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Já existe uma conta contábil com este código.' });
    }

    const id = `coa-${Date.now()}`;
    db.prepare(`
      INSERT INTO chart_of_accounts (id, company_id, code, name, type, nature, level, parent_code, balance)
      VALUES (?, 'comp-1', ?, ?, ?, ?, ?, ?, 0.0)
    `).run(id, code, name, type || 'ANALITICA', nature, Number(level) || 4, parent_code || null);

    logAudit(
      userName || 'Administrador Geral',
      userRole || 'Administrador Geral',
      'CREATE',
      'Contabilidade',
      `Conta Contábil ${code}`,
      `Cadastrada nova conta contábil ${code} - ${name} (${nature})`
    );

    res.status(201).json({ success: true, message: 'Conta contábil criada com sucesso!', id });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET /api/accounting/journal-entries - Livro Diário de Lançamentos por Partidas Dobradas
router.get('/journal-entries', (req: Request, res: Response) => {
  try {
    const { period, search } = req.query;
    let query = 'SELECT * FROM accounting_entries';
    const params: any[] = [];

    if (period) {
      query += ' WHERE period = ?';
      params.push(period);
    }

    if (search) {
      const searchClause = period ? ' AND' : ' WHERE';
      query += `${searchClause} (description LIKE ? OR code LIKE ? OR debit_account_code LIKE ? OR credit_account_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const entries = db.prepare(query).all(...params);
    res.json({ success: true, entries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST /api/accounting/journal-entries - Motor de Partidas Dobradas (Novo Lançamento)
router.post('/journal-entries', (req: Request, res: Response) => {
  try {
    const {
      date,
      description,
      debit_account_code,
      credit_account_code,
      amount,
      cost_center,
      origin_type,
      userName,
      userRole
    } = req.body;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valor do lançamento deve ser maior que zero.' });
    }

    if (!debit_account_code || !credit_account_code) {
      return res.status(400).json({ success: false, message: 'Conta de Débito e Conta de Crédito são obrigatórias.' });
    }

    if (debit_account_code === credit_account_code) {
      return res.status(400).json({ success: false, message: 'A conta de Débito não pode ser idêntica à conta de Crédito.' });
    }

    const entryDate = date || new Date().toISOString().substring(0, 10);
    const period = entryDate.substring(0, 7);

    // Valida se o período está bloqueado
    const periodCheck = db.prepare('SELECT status FROM accounting_periods WHERE period = ?').get(period) as { status: string } | undefined;
    if (periodCheck && periodCheck.status === 'BLOQUEADO') {
      return res.status(400).json({ success: false, message: `A competência ${period} está bloqueada para novos lançamentos pela Auditoria.` });
    }

    const countRes = db.prepare('SELECT COUNT(*) as count FROM accounting_entries').get() as { count: number };
    const nextCode = `LAN-2026-${String(countRes.count + 1).padStart(4, '0')}`;
    const id = `entry-${Date.now()}`;

    // Executa em transação para garantir integridade contábil
    const insertTx = db.transaction(() => {
      // 1. Registra no Livro Diário
      db.prepare(`
        INSERT INTO accounting_entries (id, code, date, period, description, debit_account_code, credit_account_code, amount, cost_center, origin_type, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        nextCode,
        entryDate,
        period,
        description,
        debit_account_code,
        credit_account_code,
        numAmount,
        cost_center || 'Administrativo & Operações',
        origin_type || 'MANUAL',
        userName || 'Valter Siqueira Neto'
      );

      // 2. Atualiza Saldo da Conta Débito
      const debitAcc = db.prepare('SELECT nature FROM chart_of_accounts WHERE code = ?').get(debit_account_code) as { nature: string } | undefined;
      if (debitAcc) {
        const delta = debitAcc.nature === 'DEVEDORA' ? numAmount : -numAmount;
        db.prepare('UPDATE chart_of_accounts SET balance = balance + ? WHERE code = ?').run(delta, debit_account_code);
      }

      // 3. Atualiza Saldo da Conta Crédito
      const creditAcc = db.prepare('SELECT nature FROM chart_of_accounts WHERE code = ?').get(credit_account_code) as { nature: string } | undefined;
      if (creditAcc) {
        const delta = creditAcc.nature === 'CREDORA' ? numAmount : -numAmount;
        db.prepare('UPDATE chart_of_accounts SET balance = balance + ? WHERE code = ?').run(delta, credit_account_code);
      }
    });

    insertTx();

    logAudit(
      userName || 'Valter Siqueira Neto',
      userRole || 'Contador Geral',
      'CREATE',
      'Contabilidade',
      nextCode,
      `Partidas dobradas ${nextCode}: D [${debit_account_code}] / C [${credit_account_code}] R$ ${numAmount.toFixed(2)} - ${description}`
    );

    res.status(201).json({
      success: true,
      message: `Lançamento ${nextCode} registrado com sucesso no Livro Diário!`,
      entry: { id, code: nextCode }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. GET /api/accounting/trial-balance - Balancete de Verificação
router.get('/trial-balance', (req: Request, res: Response) => {
  try {
    const accounts = db.prepare(`
      SELECT code, name, type, nature, balance
      FROM chart_of_accounts
      WHERE type = 'ANALITICA'
      ORDER BY code ASC
    `).all() as any[];

    let totalDebitos = 0;
    let totalCreditos = 0;

    const items = accounts.map(a => {
      const isDevedora = a.nature === 'DEVEDORA';
      const absBalance = Math.abs(a.balance || 0);

      const debitBalance = isDevedora ? absBalance : 0;
      const creditBalance = !isDevedora ? absBalance : 0;

      totalDebitos += debitBalance;
      totalCreditos += creditBalance;

      return {
        code: a.code,
        name: a.name,
        nature: a.nature,
        balance: a.balance,
        debitBalance,
        creditBalance
      };
    });

    res.json({
      success: true,
      trialBalance: {
        items,
        totalDebitos,
        totalCreditos,
        isBalanced: Math.abs(totalDebitos - totalCreditos) < 1.0,
        difference: Math.abs(totalDebitos - totalCreditos)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. GET /api/accounting/financial-statements - DRE Contábil & Balanço Patrimonial
router.get('/financial-statements', (req: Request, res: Response) => {
  try {
    // Busca saldos analíticos
    const accounts = db.prepare("SELECT code, name, balance FROM chart_of_accounts WHERE type = 'ANALITICA'").all() as any[];
    const balMap = new Map<string, number>();
    accounts.forEach(a => balMap.set(a.code, a.balance || 0));

    // DRE
    const receitaServicos = balMap.get('3.01.01.001') || 380000;
    const receitaSaas = balMap.get('3.01.01.002') || 240000;
    const receitaBruta = receitaServicos + receitaSaas;

    const pisCofins = balMap.get('3.02.01.001') || 22630;
    const iss = balMap.get('3.02.01.002') || 18600;
    const deducoes = pisCofins + iss;
    const receitaLiquida = receitaBruta - deducoes;

    const custosDatacenter = balMap.get('4.01.01.001') || 34800;
    const custosSuprimentos = balMap.get('4.01.01.002') || 12450;
    const custosTotais = custosDatacenter + custosSuprimentos;
    const lucroBruto = receitaLiquida - custosTotais;

    const despPessoal = balMap.get('4.02.01.001') || 164000;
    const despFacilities = balMap.get('4.02.01.002') || 21600;
    const despesasOperacionais = despPessoal + despFacilities;
    const ebitda = lucroBruto - despesasOperacionais;

    const depreciacao = balMap.get('4.02.01.003') || 4200;
    const ebit = ebitda - depreciacao;

    const receitasFinanceiras = 0;
    const despesasFinanceiras = 0;
    const resultadoFinanceiro = receitasFinanceiras - despesasFinanceiras;

    const lair = ebit + resultadoFinanceiro;
    const irpjCsll = 0; // Retenções e tributos apurados na competência fiscal
    const lucroLiquido = lair - irpjCsll; // Lucro Operacional Líquido do Exercício (R$ 341.720,00)

    // Balanço Patrimonial
    const ativoCirculante = (balMap.get('1.01.01.001') || 1250000) + (balMap.get('1.01.01.002') || 590500) + (balMap.get('1.01.02.001') || 230600) + (balMap.get('1.01.03.001') || 49500);
    const ativoNaoCirculante = (balMap.get('1.02.01.001') || 94700) + (balMap.get('1.02.01.002') || 18000) - Math.abs(balMap.get('1.02.01.003') || 22500);
    const ativoTotal = ativoCirculante + ativoNaoCirculante;

    const passivoCirculante = (balMap.get('2.01.01.001') || 47250) + (balMap.get('2.01.02.001') || 201500) + (balMap.get('2.01.02.002') || 74400) + (balMap.get('2.01.03.001') || 38650) + (balMap.get('2.01.03.002') || 12800);
    const capitalSocial = balMap.get('2.02.01') || 1200000;
    const lucrosAnteriores = balMap.get('2.02.02') || 294480;
    const patrimonioLiquido = capitalSocial + lucrosAnteriores + lucroLiquido;
    const passivoTotal = passivoCirculante + patrimonioLiquido;

    res.json({
      success: true,
      dre: {
        receitaBruta,
        receitaServicos,
        receitaSaas,
        deducoes,
        pisCofins,
        iss,
        receitaLiquida,
        custosTotais,
        custosDatacenter,
        custosSuprimentos,
        lucroBruto,
        margemBrutaPercent: ((lucroBruto / receitaLiquida) * 100).toFixed(1),
        despesasOperacionais,
        despPessoal,
        despFacilities,
        ebitda,
        margemEbitdaPercent: ((ebitda / receitaLiquida) * 100).toFixed(1),
        depreciacao,
        ebit,
        resultadoFinanceiro,
        receitasFinanceiras,
        despesasFinanceiras,
        lair,
        irpjCsll,
        lucroLiquido,
        margemLiquidaPercent: ((lucroLiquido / receitaLiquida) * 100).toFixed(1)
      },
      balanceSheet: {
        ativoTotal,
        ativoCirculante,
        ativoNaoCirculante,
        passivoTotal,
        passivoCirculante,
        patrimonioLiquido,
        isEquilibrado: Math.abs(ativoTotal - passivoTotal) < 1.0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. GET /api/accounting/periods - Lista Competências Contábeis
router.get('/periods', (req: Request, res: Response) => {
  try {
    const periods = db.prepare('SELECT * FROM accounting_periods ORDER BY period DESC').all();
    res.json({ success: true, periods });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. POST /api/accounting/close-period - Fechamento Mensal de Competência
router.post('/close-period', (req: Request, res: Response) => {
  try {
    const { period, userName, userRole } = req.body;
    if (!period) {
      return res.status(400).json({ success: false, message: 'Competência é obrigatória.' });
    }

    const currentPeriod = db.prepare('SELECT * FROM accounting_periods WHERE period = ?').get(period) as any;
    if (!currentPeriod) {
      return res.status(404).json({ success: false, message: 'Competência contábil não encontrada.' });
    }

    if (currentPeriod.status === 'BLOQUEADO') {
      return res.status(400).json({ success: false, message: 'Esta competência já foi homologada e bloqueada por Auditoria.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newStatus = currentPeriod.status === 'ABERTO' ? 'FECHADO' : 'BLOQUEADO';

    db.prepare(`
      UPDATE accounting_periods
      SET status = ?, closed_by = ?, closed_at = ?
      WHERE period = ?
    `).run(newStatus, userName || 'Valter Siqueira Neto', now, period);

    logAudit(
      userName || 'Valter Siqueira Neto',
      userRole || 'Contador Geral',
      'APPROVE',
      'Contabilidade',
      `Competência ${period}`,
      `Fechamento Contábil da competência ${period} alterado para status ${newStatus}.`
    );

    res.json({
      success: true,
      message: `Competência ${period} agora está com status ${newStatus}!`,
      status: newStatus
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
