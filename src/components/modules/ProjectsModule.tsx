import React, { useState, useEffect } from 'react';
import {
  KanbanSquare,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  Target,
  ArrowRight,
  TrendingUp,
  Briefcase,
  AlertCircle,
  FolderGit2,
  Calendar,
  Layers
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export interface ProjectsModuleProps {
  initialTab?: 'projects' | 'kanban';
}

export const ProjectsModule: React.FC<ProjectsModuleProps> = ({ initialTab = 'projects' }) => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'projects' | 'kanban'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  // Modais
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Forms
  const [projectForm, setProjectForm] = useState({
    name: '',
    department: 'Tecnologia & Operações',
    budget: '',
    leaderName: currentUser.fullName,
    deadline: '2026-12-31'
  });

  const [taskForm, setTaskForm] = useState({
    projectId: '',
    title: '',
    assignedToName: currentUser.fullName,
    estimatedHours: '16',
    priority: 'MEDIA'
  });

  const loadData = async () => {
    try {
      const pRes = await api.getProjects();
      if (pRes && pRes.length > 0) {
        setProjects(pRes);
      } else {
        // Fallback default projects
        setProjects([
          {
            id: 'prj-01',
            code: 'PRJ-2026-01',
            name: 'Implantação da Plataforma Integrada SEEK V1',
            department: 'Tecnologia & Operações',
            progress: 88,
            budget: 180000.00,
            spent: 142000.00,
            status: 'EM_ANDAMENTO',
            leaderName: 'Eduardo Martins',
            deadline: '15/11/2026'
          },
          {
            id: 'prj-02',
            code: 'PRJ-2026-02',
            name: 'Expansão Operacional Filial São Paulo (Faria Lima)',
            department: 'Diretoria & Comercial',
            progress: 60,
            budget: 450000.00,
            spent: 280000.00,
            status: 'EM_ANDAMENTO',
            leaderName: 'Lucas Bertolli Costa',
            deadline: '30/12/2026'
          },
          {
            id: 'prj-03',
            code: 'PRJ-2026-03',
            name: 'Migração de Datacenter & Redundância de Links Corporativos',
            department: 'Tecnologia & Infraestrutura',
            progress: 95,
            budget: 80000.00,
            spent: 78500.00,
            status: 'EM_ANDAMENTO',
            leaderName: 'Beatriz Castro Lima',
            deadline: '20/10/2026'
          }
        ]);
      }

      const tRes = await api.getProjectTasks();
      if (tRes && tRes.length > 0) {
        setTasks(tRes);
      } else {
        // Fallback initial tasks
        setTasks([
          {
            id: 'tsk-01',
            projectId: 'prj-01',
            title: 'Mapeamento de alçadas e matriz de permissões RBAC',
            assignedToName: 'Roberto Vianna Guimarães',
            status: 'CONCLUIDA',
            estimatedHours: 24,
            spentHours: 22,
            priority: 'ALTA'
          },
          {
            id: 'tsk-02',
            projectId: 'prj-01',
            title: 'Homologação do motor contábil e conciliação bancária',
            assignedToName: 'Camila Fernandes Souza',
            status: 'EM_ANDAMENTO',
            estimatedHours: 40,
            spentHours: 32,
            priority: 'CRITICA'
          },
          {
            id: 'tsk-03',
            projectId: 'prj-01',
            title: 'Integração de roteadores SD-WAN e switches Cisco Catalyst',
            assignedToName: 'Gabriel Vasconcelos',
            status: 'A_FAZER',
            estimatedHours: 30,
            spentHours: 0,
            priority: 'ALTA'
          },
          {
            id: 'tsk-04',
            projectId: 'prj-02',
            title: 'Contratação e onboarding do squad comercial São Paulo',
            assignedToName: 'Juliana Mendes Rocha',
            status: 'EM_ANDAMENTO',
            estimatedHours: 20,
            spentHours: 15,
            priority: 'MEDIA'
          }
        ]);
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const budgetVal = parseFloat(projectForm.budget) || 50000;

    const payload = {
      name: projectForm.name,
      department: projectForm.department,
      budget: budgetVal,
      spent: 0,
      progress: 0,
      leaderName: projectForm.leaderName,
      deadline: projectForm.deadline
    };

    const res = await api.createProject(payload);
    if (res && res.project) {
      setProjects(prev => [res.project, ...prev]);
    } else {
      const mockPrj = {
        id: `prj-${Date.now()}`,
        code: `PRJ-2026-0${projects.length + 1}`,
        ...payload,
        status: 'EM_ANDAMENTO'
      };
      setProjects(prev => [mockPrj, ...prev]);
    }

    setNotification(`Projeto "${projectForm.name}" criado com sucesso e CapEx alocado.`);
    setIsProjectModalOpen(false);
    setProjectForm({
      name: '',
      department: 'Tecnologia & Operações',
      budget: '',
      leaderName: currentUser.fullName,
      deadline: '2026-12-31'
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const prjId = taskForm.projectId || (projects[0]?.id ?? 'prj-01');
    const estHours = parseInt(taskForm.estimatedHours, 10) || 8;

    const payload = {
      projectId: prjId,
      title: taskForm.title,
      assignedToName: taskForm.assignedToName,
      estimatedHours: estHours,
      spentHours: 0,
      status: 'A_FAZER',
      priority: taskForm.priority
    };

    const res = await api.createProjectTask(payload);
    if (res && res.task) {
      setTasks(prev => [res.task, ...prev]);
    } else {
      const mockTask = {
        id: `tsk-${Date.now()}`,
        ...payload
      };
      setTasks(prev => [mockTask, ...prev]);
    }

    setNotification(`Tarefa cadastrada no Kanban corporativo com sucesso.`);
    setIsTaskModalOpen(false);
    setTaskForm({
      projectId: '',
      title: '',
      assignedToName: currentUser.fullName,
      estimatedHours: '16',
      priority: 'MEDIA'
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateTaskStatus = async (taskId: string, nextStatus: string) => {
    await api.updateProjectTaskStatus(taskId, nextStatus, currentUser.fullName);
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );
    setNotification(`Status da tarefa atualizado para ${nextStatus.replace('_', ' ')}.`);
    setTimeout(() => setNotification(null), 3000);
  };

  // KPIs
  const totalBudget = projects.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);
  const totalSpent = projects.reduce((acc, p) => acc + (Number(p.spent) || 0), 0);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'CONCLUIDA').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filtragem de tarefas pelo projeto selecionado
  const filteredTasks = selectedProjectId === 'ALL'
    ? tasks
    : tasks.filter(t => t.projectId === selectedProjectId);

  const todoTasks = filteredTasks.filter(t => t.status === 'A_FAZER');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'EM_ANDAMENTO');
  const doneTasks = filteredTasks.filter(t => t.status === 'CONCLUIDA');

  return (
    <div className="space-y-6">
      {/* Top Banner Projetos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-slate-900">Projetos, Operações & Tarefas</h1>
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800">
              SEEK Gestão Estratégica
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Planejamento estratégico de iniciativas, controle de CapEx/OpEx e Kanban integrado com apontamento de horas.
          </p>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          {activeTab === 'projects' ? (
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center space-x-1.5 rounded-lg bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Projeto</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (projects.length > 0 && !taskForm.projectId) {
                  setTaskForm(prev => ({ ...prev, projectId: projects[0].id }));
                }
                setIsTaskModalOpen(true);
              }}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Tarefa</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Notification */}
      {notification && (
        <div className="flex items-center space-x-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* KPIs de Projetos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projetos Estratégicos"
          value={projects.length}
          subtitle="Com CapEx e orçamento ativo"
          icon={KanbanSquare}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <StatCard
          title="Taxa de Conclusão de Tarefas"
          value={`${taskCompletionRate}%`}
          change={`${completedTasks}/${totalTasks} tarefas`}
          changeType="positive"
          subtitle="Entregas no prazo"
          icon={Target}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="CapEx Consolidado"
          value={`R$ ${(totalBudget / 1000).toFixed(1)}k`}
          subtitle={`Realizado: R$ ${(totalSpent / 1000).toFixed(1)}k (${Math.round((totalSpent / (totalBudget || 1)) * 100)}%)`}
          icon={Clock}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Colaboradores Alocados"
          value="28"
          subtitle="Em squads multifuncionais"
          icon={Users}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex space-x-1 bg-slate-100 dark:bg-[#070e1c] border border-transparent dark:border-cyan-500/30 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-white dark:bg-cyan-950/90 text-blue-700 dark:text-[#00f5ff] dark:border dark:border-[#00f5ff] shadow-xs dark:shadow-[0_0_12px_rgba(0,245,255,0.35)] dark:drop-shadow-[0_0_8px_rgba(0,245,255,0.85)]'
                : 'text-slate-600 dark:text-cyan-400/80 hover:text-slate-900 dark:hover:text-[#00f5ff] dark:hover:drop-shadow-[0_0_6px_rgba(0,245,255,0.6)]'
            }`}
          >
            <FolderGit2 className="h-4 w-4" />
            <span>Projetos Corporativos ({projects.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-white dark:bg-indigo-950/90 text-indigo-700 dark:text-[#a5b4fc] dark:border dark:border-[#a5b4fc] shadow-xs dark:shadow-[0_0_12px_rgba(165,180,252,0.35)] dark:drop-shadow-[0_0_8px_rgba(165,180,252,0.85)]'
                : 'text-slate-600 dark:text-indigo-400/80 hover:text-slate-900 dark:hover:text-[#a5b4fc] dark:hover:drop-shadow-[0_0_6px_rgba(165,180,252,0.6)]'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Kanban de Tarefas & Apontamentos ({tasks.length})</span>
          </button>
        </div>

        {activeTab === 'kanban' && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Filtrar por Projeto:</span>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden"
            >
              <option value="ALL">Todos os Projetos</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* View 1: Cards de Projetos */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {projects.map(p => {
            const budgetVal = Number(p.budget) || 0;
            const spentVal = Number(p.spent) || 0;
            const progressVal = Number(p.progress) || 0;

            return (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700">{p.code}</span>
                  <StatusBadge status={p.status || 'EM_ANDAMENTO'} />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{p.name}</h3>
                  <span className="text-[11px] text-slate-500 block mt-1">{p.department}</span>
                </div>

                {/* Barra de Progresso */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Progresso Operacional</span>
                    <span>{progressVal}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${progressVal}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Orçamento CapEx:</span>
                    <span className="font-bold text-slate-800">
                      R$ {(spentVal / 1000).toFixed(1)}k / {(budgetVal / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Líder Responsável:</span>
                    <span className="font-medium text-slate-800">{p.leaderName || p.leader}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Prazo de Entrega:</span>
                    <span className="font-medium text-slate-800">{p.deadline}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setActiveTab('kanban');
                  }}
                  className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-slate-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <span>Ver Tarefas no Kanban</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* View 2: Kanban de Tarefas */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {/* Coluna 1: A Fazer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">A Fazer</h4>
              </div>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {todoTasks.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {todoTasks.map(t => (
                <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={t.priority || 'MEDIA'} />
                    <span className="text-[10px] text-slate-400 font-mono">{t.estimatedHours}h estimadas</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 leading-snug">{t.title}</h5>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-700">{t.assignedToName}</span>
                    <button
                      onClick={() => handleUpdateTaskStatus(t.id, 'EM_ANDAMENTO')}
                      className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                    >
                      Iniciar →
                    </button>
                  </div>
                </div>
              ))}
              {todoTasks.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400">
                  Nenhuma tarefa pendente nesta fila.
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Em Andamento */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-100">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Em Andamento</h4>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                {inProgressTasks.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {inProgressTasks.map(t => (
                <div key={t.id} className="rounded-lg border border-blue-200 bg-white p-3.5 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={t.priority || 'ALTA'} />
                    <span className="text-[10px] text-blue-700 font-mono font-bold">
                      {t.spentHours || 0}h / {t.estimatedHours}h
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 leading-snug">{t.title}</h5>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-700">{t.assignedToName}</span>
                    <button
                      onClick={() => handleUpdateTaskStatus(t.id, 'CONCLUIDA')}
                      className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                    >
                      Concluir ✓
                    </button>
                  </div>
                </div>
              ))}
              {inProgressTasks.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400">
                  Nenhuma tarefa em andamento no momento.
                </div>
              )}
            </div>
          </div>

          {/* Coluna 3: Concluídas */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Concluídas</h4>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {doneTasks.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[300px]">
              {doneTasks.map(t => (
                <div key={t.id} className="rounded-lg border border-emerald-200 bg-white p-3.5 shadow-2xs space-y-2 opacity-90">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Entregue
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono">{t.spentHours || t.estimatedHours}h apontadas</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 line-through text-slate-500 leading-snug">{t.title}</h5>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="font-medium text-slate-700">{t.assignedToName}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">100% OK</span>
                  </div>
                </div>
              ))}
              {doneTasks.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-400">
                  Nenhuma tarefa concluída ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Projeto */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="Novo Projeto Estratégico"
        subtitle="Defina escopo, departamento responsável, CapEx alocado e líder de entrega."
      >
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nome do Projeto</label>
            <input
              type="text"
              required
              value={projectForm.name}
              onChange={e => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Modernização do Sistema de Controle de Acesso"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Departamento</label>
              <select
                value={projectForm.department}
                onChange={e => setProjectForm(prev => ({ ...prev, department: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Tecnologia & Operações">Tecnologia & Operações</option>
                <option value="Diretoria & Comercial">Diretoria & Comercial</option>
                <option value="Operações de Eventos">Operações de Eventos</option>
                <option value="Financeiro & Controladoria">Financeiro & Controladoria</option>
                <option value="RH & Governança">RH & Governança</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Orçamento CapEx (R$)</label>
              <input
                type="number"
                step="1000"
                required
                value={projectForm.budget}
                onChange={e => setProjectForm(prev => ({ ...prev, budget: e.target.value }))}
                placeholder="Ex: 120000"
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Líder do Projeto</label>
              <input
                type="text"
                required
                value={projectForm.leaderName}
                onChange={e => setProjectForm(prev => ({ ...prev, leaderName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Data Limite de Entrega</label>
              <input
                type="date"
                required
                value={projectForm.deadline}
                onChange={e => setProjectForm(prev => ({ ...prev, deadline: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-800 cursor-pointer"
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nova Tarefa */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Nova Tarefa Operacional"
        subtitle="Adicione uma entrega ao Kanban do projeto com estimativa de horas e responsável."
      >
        <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Projeto Vinculado</label>
            <select
              value={taskForm.projectId}
              onChange={e => setTaskForm(prev => ({ ...prev, projectId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Título / Descrição da Tarefa</label>
            <input
              type="text"
              required
              value={taskForm.title}
              onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Configurar VPN IPsec e regras de firewall para Filial SP"
              className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Responsável</label>
              <input
                type="text"
                required
                value={taskForm.assignedToName}
                onChange={e => setTaskForm(prev => ({ ...prev, assignedToName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Horas Estimadas</label>
              <input
                type="number"
                min="1"
                required
                value={taskForm.estimatedHours}
                onChange={e => setTaskForm(prev => ({ ...prev, estimatedHours: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Prioridade</label>
              <select
                value={taskForm.priority}
                onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-800 focus:border-indigo-600 focus:outline-hidden"
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="rounded-lg px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-indigo-800 cursor-pointer"
            >
              Adicionar ao Kanban
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
