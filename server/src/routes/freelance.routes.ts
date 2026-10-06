import { Router, Request, Response } from 'express';
import { db, logAudit } from '../db.js';

const router = Router();

// 1. GET /api/freelance/dashboard - Central de Taxas (Cockpit & Métricas)
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const shifts = db.prepare('SELECT * FROM freelance_shifts').all() as any[];
    const freelancers = db.prepare('SELECT * FROM freelancers').all() as any[];

    const abertas = shifts.filter(s => s.status === 'ABERTA').length;
    const aguardandoAprovacao = shifts.filter(s => s.status === 'AGUARDANDO_APROVACAO').length;
    const convocados = shifts.filter(s => s.status === 'CONVOCADO').length;
    const confirmados = shifts.filter(s => s.status === 'CONFIRMADO').length;
    const presentes = shifts.filter(s => s.status === 'PRESENTE').length;
    const realizadas = shifts.filter(s => s.status === 'REALIZADA').length;
    const aguardandoFechamento = shifts.filter(s => s.status === 'REALIZADA' || s.status === 'PRESENTE').length;
    const aguardandoPagamento = shifts.filter(s => s.status === 'AGUARDANDO_PAGAMENTO').length;
    const pagas = shifts.filter(s => s.status === 'PAGO').length;
    const faltas = shifts.filter(s => s.status === 'FALTA').length;

    const totalComprometido = shifts
      .filter(s => s.status !== 'FALTA')
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);

    const totalPago = shifts
      .filter(s => s.status === 'PAGO')
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);

    const totalAguardandoPagamento = shifts
      .filter(s => s.status === 'AGUARDANDO_PAGAMENTO')
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);

    const mediaPorTaxa = shifts.length > 0 ? (totalComprometido / shifts.length) : 0;
    const totalFreelancersAtivos = freelancers.filter(f => f.status === 'ATIVO').length;

    const totalFinalizados = presentes + realizadas + aguardandoPagamento + pagas + faltas;
    const taxaPresencaPercent = totalFinalizados > 0 
      ? (((totalFinalizados - faltas) / totalFinalizados) * 100).toFixed(1)
      : '100.0';

    res.json({
      success: true,
      metrics: {
        totalTaxas: shifts.length,
        abertas,
        aguardandoAprovacao,
        convocados,
        confirmados,
        presentes,
        realizadas,
        aguardandoFechamento,
        aguardandoPagamento,
        pagas,
        faltas,
        totalComprometido,
        totalPago,
        totalAguardandoPagamento,
        mediaPorTaxa,
        totalFreelancersAtivos,
        taxaPresencaPercent
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/freelance/freelancers - Banco de Talentos / Cadastro de Freelancers
router.get('/freelancers', (req: Request, res: Response) => {
  try {
    const { search, role, status, availability } = req.query;
    let query = 'SELECT * FROM freelancers';
    const params: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push('(full_name LIKE ? OR cpf LIKE ? OR phone LIKE ? OR pix_key LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      conditions.push('(primary_role LIKE ? OR secondary_roles LIKE ?)');
      params.push(`%${role}%`, `%${role}%`);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (availability) {
      conditions.push('availability = ?');
      params.push(availability);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY rating DESC, total_jobs DESC, full_name ASC';

    const freelancers = db.prepare(query).all(...params);
    res.json({ success: true, freelancers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/freelance/freelancers - Cadastra Novo Freelancer no Banco de Talentos
router.post('/freelancers', (req: Request, res: Response) => {
  try {
    const {
      full_name,
      cpf,
      rg,
      phone,
      email,
      pix_key,
      pix_type = 'CPF',
      bank_name,
      agency,
      account_number,
      primary_role,
      secondary_roles,
      standard_daily_rate = 200.0,
      city = 'Curitiba',
      state = 'PR',
      notes,
      userName,
      userRole
    } = req.body;

    if (!full_name || !cpf || !phone || !pix_key || !primary_role) {
      return res.status(400).json({
        success: false,
        message: 'Nome completo, CPF, telefone, chave PIX e função principal são obrigatórios.'
      });
    }

    const existing = db.prepare('SELECT id FROM freelancers WHERE cpf = ?').get(cpf);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Já existe um profissional cadastrado com este CPF.' });
    }

    const id = `freel-${Date.now()}`;
    const dailyRate = parseFloat(standard_daily_rate) || 200.0;

    db.prepare(`
      INSERT INTO freelancers (
        id, full_name, cpf, rg, phone, email, pix_key, pix_type, bank_name, agency, account_number,
        primary_role, secondary_roles, standard_daily_rate, city, state, rating, total_jobs, punctuality_score,
        availability, status, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0, 100, 'DISPONIVEL', 'ATIVO', ?)
    `).run(
      id,
      full_name,
      cpf,
      rg || null,
      phone,
      email || null,
      pix_key,
      pix_type,
      bank_name || null,
      agency || null,
      account_number || null,
      primary_role,
      secondary_roles || null,
      dailyRate,
      city,
      state,
      notes || null
    );

    logAudit(
      userName || 'Recursos Humanos',
      userRole || 'Gerente de RH & DP',
      'CREATE',
      'RH / Freelance',
      full_name,
      `Cadastrado profissional autônomo ${full_name} (${primary_role}) com taxa padrão de R$ ${dailyRate.toFixed(2)} e PIX ${pix_key}.`
    );

    res.status(201).json({
      success: true,
      message: 'Profissional autônomo cadastrado com sucesso no banco de talentos!',
      id
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. PATCH /api/freelance/freelancers/:id - Atualiza Dados ou Status do Freelancer
router.patch('/freelancers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      phone,
      email,
      pix_key,
      pix_type,
      standard_daily_rate,
      primary_role,
      availability,
      status,
      notes,
      userName,
      userRole
    } = req.body;

    const freelancer = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(id) as any;
    if (!freelancer) {
      return res.status(404).json({ success: false, message: 'Profissional não encontrado.' });
    }

    db.prepare(`
      UPDATE freelancers
      SET
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        pix_key = COALESCE(?, pix_key),
        pix_type = COALESCE(?, pix_type),
        standard_daily_rate = COALESCE(?, standard_daily_rate),
        primary_role = COALESCE(?, primary_role),
        availability = COALESCE(?, availability),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      phone || null,
      email || null,
      pix_key || null,
      pix_type || null,
      standard_daily_rate ? parseFloat(standard_daily_rate) : null,
      primary_role || null,
      availability || null,
      status || null,
      notes || null,
      id
    );

    logAudit(
      userName || 'Recursos Humanos',
      userRole || 'Gerente de RH & DP',
      'UPDATE',
      'RH / Freelance',
      freelancer.full_name,
      `Atualizados dados cadastrais e status (${status || freelancer.status}) do profissional ${freelancer.full_name}.`
    );

    res.json({ success: true, message: 'Cadastro do freelancer atualizado com sucesso!' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. GET /api/freelance/taxas - Lista Central de Taxas / Escalas
router.get('/taxas', (req: Request, res: Response) => {
  try {
    const { status, search, operation_name, date } = req.query;
    let query = 'SELECT * FROM freelance_shifts';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'TODAS') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(code LIKE ? OR freelancer_name LIKE ? OR role_title LIKE ? OR location LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (operation_name) {
      conditions.push('operation_name LIKE ?');
      params.push(`%${operation_name}%`);
    }

    if (date) {
      conditions.push('job_date = ?');
      params.push(date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY job_date DESC, created_at DESC';

    const taxas = db.prepare(query).all(...params);
    res.json({ success: true, taxas });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. POST /api/freelance/taxas - Cria Nova Demanda / Escala de Taxa
router.post('/taxas', (req: Request, res: Response) => {
  try {
    const {
      operation_name,
      cost_center = 'Operações & Logística Corporativa',
      job_date,
      work_shift = '08:00 - 18:00',
      location,
      requester_manager,
      freelancer_id,
      role_title,
      base_fee,
      allowance_food = 0.0,
      allowance_transport = 0.0,
      userName,
      userRole
    } = req.body;

    if (!operation_name || !job_date || !location || !role_title) {
      return res.status(400).json({
        success: false,
        message: 'Operação de referência, data, local e função da taxa são obrigatórios.'
      });
    }

    let freelancerName = 'Pendente de Alocação';
    let freelancerCpf = null;
    let freelancerPix = null;
    let initialStatus = 'ABERTA';

    const numBaseFee = parseFloat(base_fee) || 200.0;
    const numAlim = parseFloat(allowance_food) || 0.0;
    const numTransp = parseFloat(allowance_transport) || 0.0;
    const totalAmount = numBaseFee + numAlim + numTransp;

    if (freelancer_id) {
      const freel = db.prepare('SELECT * FROM freelancers WHERE id = ?').get(freelancer_id) as any;
      if (freel) {
        freelancerName = freel.full_name;
        freelancerCpf = freel.cpf;
        freelancerPix = freel.pix_key;
        initialStatus = 'CONVOCADO';
      }
    }

    const countRes = db.prepare('SELECT COUNT(*) as count FROM freelance_shifts').get() as { count: number };
    const nextCode = `TX-2026-${String(countRes.count + 1).padStart(4, '0')}`;
    const id = `taxa-${Date.now()}`;

    db.prepare(`
      INSERT INTO freelance_shifts (
        id, code, operation_name, cost_center, job_date, work_shift, location, requester_manager,
        freelancer_id, freelancer_name, freelancer_cpf, freelancer_pix, role_title, base_fee,
        allowance_food, allowance_transport, overtime_amount, reimbursement_amount, total_amount,
        status, hours_worked, performance_rating, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, 0.0, 5, CURRENT_TIMESTAMP)
    `).run(
      id,
      nextCode,
      operation_name,
      cost_center,
      job_date,
      work_shift,
      location,
      requester_manager || userName || 'Eduardo Martins Fontes',
      freelancer_id || null,
      freelancerName,
      freelancerCpf,
      freelancerPix,
      role_title,
      numBaseFee,
      numAlim,
      numTransp,
      totalAmount,
      initialStatus
    );

    logAudit(
      userName || 'Recursos Humanos',
      userRole || 'Gerente de RH & DP',
      'CREATE',
      'RH / Taxas',
      nextCode,
      `Criada escala/taxa ${nextCode} para ${role_title} na operação "${operation_name}" no valor de R$ ${totalAmount.toFixed(2)}.`
    );

    res.status(201).json({
      success: true,
      message: `Taxa ${nextCode} gerada com sucesso!`,
      id,
      code: nextCode
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. PATCH /api/freelance/taxas/:id/status - Convocação, Confirmação, Check-in ou Falta
router.patch('/taxas/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, validator_name, validation_notes, userName, userRole } = req.body;

    const validStatuses = ['ABERTA', 'AGUARDANDO_APROVACAO', 'CONVOCADO', 'CONFIRMADO', 'PRESENTE', 'FALTA', 'REALIZADA'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Status informado inválido para esta operação.' });
    }

    const shift = db.prepare('SELECT * FROM freelance_shifts WHERE id = ?').get(id) as any;
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Taxa não encontrada.' });
    }

    db.prepare(`
      UPDATE freelance_shifts
      SET
        status = ?,
        validator_name = COALESCE(?, validator_name),
        validation_notes = COALESCE(?, validation_notes)
      WHERE id = ?
    `).run(status, validator_name || null, validation_notes || null, id);

    logAudit(
      userName || 'Recursos Humanos',
      userRole || 'Gerente de RH & DP',
      'UPDATE',
      'RH / Taxas',
      shift.code,
      `Taxa ${shift.code} (${shift.freelancer_name}) atualizada para status: ${status}.`
    );

    res.json({ success: true, message: `Status da taxa ${shift.code} alterado para ${status}.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. POST /api/freelance/taxas/:id/close-and-pay - FECHAMENTO DA TAXA & ENVIO AO FINANCEIRO (PIX)
// Fluxo: Validação RH -> Fechamento Taxa -> Cria Conta a Pagar no Financeiro -> Trilha de Auditoria
router.post('/taxas/:id/close-and-pay', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      hours_worked = 8.0,
      overtime_amount = 0.0,
      reimbursement_amount = 0.0,
      performance_rating = 5,
      validator_name,
      validation_notes,
      userName,
      userRole
    } = req.body;

    const shift = db.prepare('SELECT * FROM freelance_shifts WHERE id = ?').get(id) as any;
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Taxa não encontrada.' });
    }

    if (shift.status === 'PAGO') {
      return res.status(400).json({ success: false, message: 'Esta taxa já foi paga pelo Financeiro.' });
    }

    const numHours = parseFloat(hours_worked) || 8.0;
    const numOvertime = parseFloat(overtime_amount) || 0.0;
    const numReimb = parseFloat(reimbursement_amount) || 0.0;
    const numRating = parseInt(performance_rating) || 5;

    // Recalcula valor final total da taxa
    const finalTotal = shift.base_fee + shift.allowance_food + shift.allowance_transport + numOvertime + numReimb;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const today = now.substring(0, 10);
    const finRecordId = `fin-taxa-${Date.now()}`;
    const finRecordCode = `CP-TX-${shift.code}`;

    const closeTx = db.transaction(() => {
      // 1. Cria Conta a Pagar no Financeiro
      db.prepare(`
        INSERT INTO financial_records (
          id, company_id, code, type, title, entity_name, cost_center, category,
          amount, due_date, status, payment_method
        )
        VALUES (?, 'comp-1', ?, 'PAGAR', ?, ?, ?, 'Despesas com Terceiros & Freelancers', ?, ?, 'CONFIRMADO', ?)
      `).run(
        finRecordId,
        finRecordCode,
        `Taxa Freelancer: ${shift.freelancer_name} (${shift.role_title} - ${shift.operation_name})`,
        shift.freelancer_name,
        shift.cost_center,
        finalTotal,
        today,
        `PIX (${shift.freelancer_pix || 'Chave do profissional'})`
      );

      // 2. Atualiza a Taxa para AGUARDANDO_PAGAMENTO e vincula o id financeiro
      db.prepare(`
        UPDATE freelance_shifts
        SET
          status = 'AGUARDANDO_PAGAMENTO',
          hours_worked = ?,
          overtime_amount = ?,
          reimbursement_amount = ?,
          total_amount = ?,
          performance_rating = ?,
          validator_name = ?,
          validation_notes = ?,
          financial_record_id = ?,
          closed_at = ?
        WHERE id = ?
      `).run(
        numHours,
        numOvertime,
        numReimb,
        finalTotal,
        numRating,
        validator_name || userName || 'Eduardo Martins Fontes',
        validation_notes || 'Trabalho validado presencialmente e fechado pelo RH.',
        finRecordId,
        now,
        id
      );

      // 3. Atualiza histórico do Freelancer se tiver id
      if (shift.freelancer_id) {
        db.prepare(`
          UPDATE freelancers
          SET
            total_jobs = total_jobs + 1,
            availability = 'DISPONIVEL'
          WHERE id = ?
        `).run(shift.freelancer_id);
      }
    });

    closeTx();

    logAudit(
      userName || 'Recursos Humanos',
      userRole || 'Gerente de RH & DP',
      'APPROVE',
      'RH / Taxas',
      shift.code,
      `Fechamento da taxa ${shift.code} (R$ ${finalTotal.toFixed(2)}) realizado com sucesso e enviado ao Financeiro (Conta a Pagar ${finRecordCode} via PIX).`
    );

    res.json({
      success: true,
      message: `Taxa ${shift.code} fechada com sucesso! Conta a pagar gerada no Financeiro no valor de R$ ${finalTotal.toFixed(2)}.`,
      financialRecordId: finRecordId,
      totalAmount: finalTotal
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. POST /api/freelance/taxas/:id/settle-payment - BAIXA DE PAGAMENTO PIX NO FINANCEIRO & INTEGRAÇÃO CONTÁBIL
router.post('/taxas/:id/settle-payment', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userName, userRole } = req.body;

    const shift = db.prepare('SELECT * FROM freelance_shifts WHERE id = ?').get(id) as any;
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Taxa não encontrada.' });
    }

    if (shift.status === 'PAGO') {
      return res.status(400).json({ success: false, message: 'Esta taxa já consta como paga.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const today = now.substring(0, 10);
    const period = today.substring(0, 7);

    const payTx = db.transaction(() => {
      // 1. Atualiza a taxa para PAGO
      db.prepare(`
        UPDATE freelance_shifts
        SET status = 'PAGO', paid_at = ?
        WHERE id = ?
      `).run(now, id);

      // 2. Atualiza o registro no financeiro
      if (shift.financial_record_id) {
        db.prepare(`
          UPDATE financial_records
          SET status = 'PAGO'
          WHERE id = ?
        `).run(shift.financial_record_id);
      }

      // 3. Gera lançamento por partidas dobradas no Livro Diário Contábil
      // Débito: 4.02.01.001 (Despesas com Pessoal & Terceirizados)
      // Crédito: 1.01.01.001 (Banco Bradesco C/C Matriz)
      const debitAccount = '4.02.01.001';
      const creditAccount = '1.01.01.001';
      const entryId = `entry-${Date.now()}`;
      const entryCode = `LAN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      db.prepare(`
        INSERT INTO accounting_entries (
          id, code, date, period, description, debit_account_code, credit_account_code,
          amount, cost_center, origin_type, origin_id, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'FINANCEIRO', ?, ?)
      `).run(
        entryId,
        entryCode,
        today,
        period,
        `Pagamento PIX Taxa ${shift.code}: ${shift.freelancer_name} (${shift.role_title} - ${shift.operation_name})`,
        debitAccount,
        creditAccount,
        shift.total_amount,
        shift.cost_center,
        shift.id,
        userName || 'Helena Silveira Ramos'
      );

      // Atualiza saldos contábeis
      db.prepare('UPDATE chart_of_accounts SET balance = balance + ? WHERE code = ?').run(shift.total_amount, debitAccount);
      db.prepare('UPDATE chart_of_accounts SET balance = balance - ? WHERE code = ?').run(shift.total_amount, creditAccount);
    });

    payTx();

    logAudit(
      userName || 'Financeiro',
      userRole || 'Gerente Financeira',
      'APPROVE',
      'Financeiro / Taxas',
      shift.code,
      `Pagamento PIX liquidado para taxa ${shift.code} (${shift.freelancer_name}) no valor de R$ ${shift.total_amount.toFixed(2)}.`
    );

    res.json({
      success: true,
      message: `Taxa ${shift.code} liquidada via PIX com sucesso e integrada à Contabilidade e Livro Diário!`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
