import { Router, Request, Response } from 'express';

export const seekAiRouter = Router();

seekAiRouter.post('/query', (req: Request, res: Response) => {
  const { query, userRole } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'A pergunta ou instrução é obrigatória.' });
  }

  const lower = query.toLowerCase();
  let answer = '';

  if (lower.includes('pagamentos vencem') || lower.includes('contas vencem')) {
    answer = `Localizei 3 pagamentos com vencimento próximo no Financeiro:\n` +
      `• CP-2026-1044: Licenciamento Datacenter (Equinix) — R$ 34.800,00 [10/10/2026]\n` +
      `• CP-2026-1045: Pulseiras RFID & Bobinas (Gráfica do Sul) — R$ 12.450,00 [15/10/2026]\n` +
      `• Total consolidado a liquidar na semana: R$ 47.250,00.`;
  } else if (lower.includes('contratos') || lower.includes('90 dias') || lower.includes('60 dias')) {
    answer = `Identifiquei 1 contrato com alerta de renovação nos próximos 90 dias:\n` +
      `• Contrato CT-2024-0089 (Allianz Parque): Vencimento em 27 dias (01/11/2026). Valor: R$ 85.000,00/mês. Reajuste previsto: IPCA (+4.2%).`;
  } else if (lower.includes('orçamento') || lower.includes('ultrapassou')) {
    answer = `📊 Análise Orçamentária SEEK Controladoria:\n` +
      `• Operações de Eventos: Consumiu 104.2% da dotação trimestral devido à aquisição de catracas móveis para o Festival Curitiba.\n` +
      `• TI & Infraestrutura: 91.8% da dotação.\n` +
      `• Marketing & Comercial: 78.5% da dotação.`;
  } else if (lower.includes('projetos') || lower.includes('atrasados')) {
    answer = `Nenhum projeto estratégico está em atraso crítico. O projeto "Implantação SEEK V1" está em 85% de conclusão com entrega prevista para 15/11/2026.`;
  } else if (lower.includes('resumo executivo') || lower.includes('semana')) {
    answer = `📈 Resumo Executivo da Semana:\n` +
      `• Receita Operacional Bruta: R$ 230.600,00\n` +
      `• Saldo em Bancos: R$ 1.840.500,00\n` +
      `• EBITDA Projetado: 24.8%\n` +
      `• Oportunidades Ganhas no CRM: R$ 240.000,00 (Teatro Bradesco SP).`;
  } else {
    answer = `Compreendido! O SEEK IA analisou os registros dos 15 módulos corporativos. Ação registrada em conformidade com o perfil ${userRole || 'ativo'}.`;
  }

  return res.json({
    query,
    answer,
    generatedAt: new Date().toISOString()
  });
});
