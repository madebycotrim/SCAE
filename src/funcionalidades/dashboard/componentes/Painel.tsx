import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { servicoSincronizacao } from '@compartilhado/servicos/sincronizacao';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { AlunoLocal } from '@compartilhado/types/bancoLocal.tipos';
import { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';
import {
    Users,
    Clock,
    ShieldCheck,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    LogOut,
    LogIn
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Painel');
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

// --- Componentes Auxiliares ---

interface PropsCardEstatistica {
    titulo: string;
    valor: string | number;
    subtitulo?: string;
    icone: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    cor: string;
    tendencia?: number;
    inverterTendencia?: boolean;
}

const CardEstatistica = ({ titulo, valor, subtitulo, icone: Icone, cor, tendencia, inverterTendencia }: PropsCardEstatistica) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className={`w-10 h-10 rounded-lg bg-${cor}-100 flex items-center justify-center text-${cor}-600`}>
                <Icone size={20} />
            </div>
            {tendencia !== undefined && (
                <div className={`
                    flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                    ${(inverterTendencia ? tendencia < 0 : tendencia > 0)
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'}
                `}>
                    {tendencia > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(tendencia)}%
                </div>
            )}
        </div>
        <div>
            <h3 className="text-slate-500 text-sm font-medium mb-1">{titulo}</h3>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{valor}</p>
            {subtitulo && (
                <p className="text-xs text-slate-400 mt-2">{subtitulo}</p>
            )}
        </div>
    </div>
);

const LiveAccessFeed = ({ registros, alunos }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Activity size={18} className="text-indigo-600" />
                    Feed de Acessos
                </h3>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Ao Vivo</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {registros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <Activity size={32} className="text-slate-200 mb-3" />
                        <p className="text-sm text-slate-400">Nenhum registro de acesso recente.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {registros.slice(0, 15).map((reg) => {
                            const aluno = alunos.find(a => a.matricula === reg.aluno_matricula);
                            const isEntrada = reg.tipo_movimentacao === 'ENTRADA';
                            return (
                                <div key={reg.id} className="p-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEntrada ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {isEntrada ? <LogIn size={16} /> : <LogOut size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{aluno?.nome_completo || 'Aluno não identificado'}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {reg.aluno_matricula} • {aluno?.turma_id || 'Sem turma'}
                                        </p>
                                    </div>
                                    <div className="text-right whitespace-nowrap">
                                        <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded">
                                            {format(parseISO(reg.timestamp), 'HH:mm')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Ver Histórico Completo</button>
            </div>
        </div>
    );
};


export default function Painel() {
    const { usuarioAtual } = usarAutenticacao();
    const { dados: estatisticasRaw, carregando } = usarConsulta(
        ['estatisticas-dashboard'],
        async () => {
            const dados = await bancoLocal.obterDadosDashboard();
            const banco = await bancoLocal.iniciarBanco();
            const pendentes = await banco.countFromIndex('registros_acesso', 'sincronizado', 0);
            return { ...dados, pendencias: pendentes };
        },
        { refetchInterval: 15000, staleTime: 14000 } // Refetch a cada 15s como no código original
    );

    const calcularEstatisticas = (dados) => {
        if (!dados) return {
            totalAlunos: 0,
            presentesHoje: 0,
            atrasosHoje: 0,
            saidasHoje: 0,
            alunosRisco: [],
            historicoPresenca: [],
            registrosRecentes: [],
            pendenciasSync: 0,
            alunos: []
        };

        const { alunos, registros, pendencias } = dados;
        const hojeStr = format(new Date(), 'yyyy-MM-dd');

        // Filtrar registros de hoje
        const registrosHoje = registros.filter(r => r.timestamp.startsWith(hojeStr));
        const entradasHoje = new Set(
            registrosHoje.filter(r => r.tipo_movimentacao === 'ENTRADA').map(r => r.aluno_matricula)
        ).size;
        const saidasHoje = registrosHoje.filter(r => r.tipo_movimentacao === 'SAIDA').length;

        let atrasos = 0;
        registrosHoje.forEach(r => {
            if (r.tipo_movimentacao === 'ENTRADA') {
                const hora = parseInt(r.timestamp.substring(11, 13));
                const min = parseInt(r.timestamp.substring(14, 16));
                const minutosDia = hora * 60 + min;
                if ((minutosDia > 435 && minutosDia < 720) || (minutosDia > 795 && minutosDia < 1080)) {
                    atrasos++;
                }
            }
        });

        // Histórico 7 dias
        const historico = Array.from({ length: 7 }).map((_, i) => {
            const d = subDays(new Date(), 6 - i);
            const dStr = format(d, 'yyyy-MM-dd');
            const regsDia = registros.filter(r => r.timestamp.startsWith(dStr) && r.tipo_movimentacao === 'ENTRADA');
            const total = new Set(regsDia.map(r => r.aluno_matricula)).size;
            return { data: format(d, 'dd/MM'), total };
        });

        return {
            totalAlunos: alunos.length,
            presentesHoje: entradasHoje,
            atrasosHoje: atrasos,
            saidasHoje,
            alunosRisco: [],
            historicoPresenca: historico,
            registrosRecentes: registros.slice().sort((a: RegistroAcessoLocal, b: RegistroAcessoLocal) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50),
            pendenciasSync: pendencias || 0,
            alunos: alunos
        };
    };

    const estatisticas = useMemo(() => calcularEstatisticas(estatisticasRaw), [estatisticasRaw]);

    // Chart Data
    const dataLine = {
        labels: estatisticas.historicoPresenca.map(h => h.data),
        datasets: [{
            label: 'Presença',
            data: estatisticas.historicoPresenca.map(h => h.total),
            borderColor: '#6366f1',
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
                gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.4
        }]
    };

    return (
        <LayoutAdministrativo titulo="Centro de Comando" subtitulo="Monitoramento Estratégico em Tempo Real" acoes={null}>
            <div className="space-y-6 pb-8">

                {/* Top Row: KPIs importantes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <CardEstatistica
                        titulo="Alunos Presentes"
                        valor={estatisticas.presentesHoje}
                        subtitulo="Entradas registradas hoje"
                        icone={Users}
                        cor="indigo"
                        tendencia={12}
                    />
                    <CardEstatistica
                        titulo="Atrasos Identificados"
                        valor={estatisticas.atrasosHoje}
                        subtitulo="Chegadas fora do horário"
                        icone={Clock}
                        cor="amber"
                        tendencia={-5}
                        inverterTendencia
                    />
                    <CardEstatistica
                        titulo="Saídas Antecipadas"
                        valor={estatisticas.saidasHoje}
                        subtitulo="Alunos que deixaram a escola"
                        icone={LogOut}
                        cor="rose"
                    />
                    <CardEstatistica
                        titulo="Total de Matriculados"
                        valor={estatisticas.totalAlunos}
                        subtitulo="Base de alunos ativa"
                        icone={ShieldCheck}
                        cor="emerald"
                    />
                </div>

                {/* Main Content Grid: 3 Columns (2 for chart, 1 for feed) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left Column (2/3) */}
                    <div className="lg:col-span-2">
                        {/* Chart Section */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[420px]">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-semibold text-slate-800 text-base mb-1">Fluxo de Frequência</h3>
                                    <p className="text-sm text-slate-500">Comparativo dos últimos 7 dias</p>
                                </div>
                                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-[320px] relative">
                                <Line data={dataLine} options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            backgroundColor: '#1e293b',
                                            titleFont: { family: 'inherit', weight: 600, size: 12 },
                                            bodyFont: { family: 'inherit', size: 12 },
                                            padding: 12,
                                            cornerRadius: 8,
                                            displayColors: false
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            grid: { color: '#f1f5f9' },
                                            ticks: { font: { family: 'inherit', size: 11 }, color: '#64748b' }
                                        },
                                        x: {
                                            grid: { display: false },
                                            ticks: { font: { family: 'inherit', size: 11 }, color: '#64748b' }
                                        }
                                    }
                                }} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column (1/3) - Live Feed */}
                    <div className="lg:col-span-1 h-[420px]">
                        <LiveAccessFeed registros={estatisticas.registrosRecentes} alunos={estatisticas.alunos} />
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}

