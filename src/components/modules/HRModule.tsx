import React, { useState } from 'react';
import { UserCheck, Users, Calendar, Clock, Award, Briefcase, Plus, Search } from 'lucide-react';
import { EMPLOYEES } from '../../data/mockData';
import { EmployeeProfile } from '../../types/modules';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';

export const HRModule: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeProfile[]>(EMPLOYEES);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(
    e =>
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner RH */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">RH & Departamento Pessoal</h1>
            <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
              SEEK Gestão de Pessoas
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão unificada de colaboradores: o cadastro de RH é o mesmo usuário utilizado em aprovações, projetos e despesas.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <button className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800">
            <Plus className="h-4 w-4" />
            <span>Admitir Colaborador</span>
          </button>
        </div>
      </div>

      {/* KPIs do RH */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Headcount Total Ativo"
          value={employees.length}
          subtitle="DiskIngressos Matriz e Filiais"
          icon={Users}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
        />
        <StatCard
          title="Turnover Anual"
          value="3.2%"
          change="-0.8 p.p."
          changeType="positive"
          subtitle="Taxa de retenção de talentos"
          icon={Award}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Programação de Férias"
          value="12"
          subtitle="Períodos agendados no Q4"
          icon={Calendar}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Banco de Horas Geral"
          value="+42.5h"
          subtitle="Saldo consolidado da equipe"
          icon={Clock}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
      </div>

      {/* Barra de Busca de Colaboradores */}
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por colaborador, cargo ou departamento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
          />
        </div>
        <span className="text-xs text-slate-500">Cadastro Único SEEK</span>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Matrícula</th>
                <th className="py-3 px-4">Colaborador / Perfil</th>
                <th className="py-3 px-4">Cargo Corporativo</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4">Filial / Lotação</th>
                <th className="py-3 px-4 text-center">Férias (Dias)</th>
                <th className="py-3 px-4 text-center">Banco de Horas</th>
                <th className="py-3 px-4 text-center">Regime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{emp.registrationNumber}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                        {emp.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-900">{emp.fullName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{emp.jobTitle}</td>
                  <td className="py-3 px-4 text-slate-600">{emp.department}</td>
                  <td className="py-3 px-4 text-slate-500">{emp.branch}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">{emp.vacationBalanceDays} dias</td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span className={emp.bankHoursBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {emp.bankHoursBalance > 0 ? `+${emp.bankHoursBalance}h` : `${emp.bankHoursBalance}h`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {emp.regime}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
