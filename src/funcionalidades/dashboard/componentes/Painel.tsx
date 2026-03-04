import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { Botao, CartaoConteudo } from '@compartilhado/componentes/UI';
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
    LogIn,
    ArrowRight,
    Radar
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { useMemo } from 'react';
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

// --- Componentes Auxiliares Standardized ---

interface PropsCardEstatistica {
    titulo: string;
    valor: string | number;
    subtitulo?: string;
    icone: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    cor: 'indigo' | 'amber' | 'rose' | 'emerald';
    tendencia?: number;
    inverterTendencia?: boolean;
}

const CardEstatistica = ({ titulo, valor, subtitulo, icone: Icone, cor, tendencia, inverterTendencia }: PropsCardEstatistica) => {
    const corConfig = {
        indigo: 'bg-indigo-600 text-white shadow-indigo-900/10 border-indigo-500',
        amber: 'bg-amber-500 text-white shadow-amber-900/10 border-amber-400',
        rose: 'bg-rose-500 text-white shadow-rose-900/10 border-rose-400',
        emerald: 'bg-emerald-600 text-white shadow-emerald-900/10 border-emerald-500'
    };

    const corIconeBg = {
        indigo: 'bg-white/10',
        amber: 'bg-white/10',
        rose: 'bg-white/10',
        emerald: 'bg-white/10'
    };

    return (
        <CartaoConteudo className={`p-8 hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden group border-none rounded-[2.5rem] ${corConfig[cor]}`}>
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full group-hover:scale-150 transition-transform"></div>
            <div className="flex justify-between items-start mb-6 z-10 relative">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl ${corIconeBg[cor]} backdrop-blur-sm group-hover:rotate-6 transition-transform`}>
                    <Icone size={24} strokeWidth={2.5} />
                </div>
                {tendencia !== undefined && (
                    <div className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md uppercase tracking-widest">
                        {tendencia > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(tendencia)}%
                    </div>
                )}
            </div>
            <div className="z-10 relative">
                <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1 leading-none">{titulo}</h3>
                <p className="text-3xl font-black text-white tracking-tighter leading-tight">{valor}</p>
                {subtitulo && (
                    <p className="text-[10px] text-white/50 font-bold mt-2 uppercase tracking-wide">{subtitulo}</p>
                )}
            </div>
        </CartaoConteudo>
    );
};

const LiveAccessFeed = ({ registros, alunos }) => {
    return (
        <CartaoConteudo className="h-full flex flex-col bg-white border-slate-200 shadow-2xl rounded-[2.5rem] overflow-hidden group">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Radar size={16} className="text-indigo-600 animate-pulse" />
                    Telemetria em Real-Time
                </h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">AO VIVO</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {registros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40 grayscale gap-4">
                        <Activity size={48} strokeWidth={1} className="text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Silêncio Operacional</p>
                    </div>
                ) : (
                    registros.slice(0, 15).map((reg) => {
                        const aluno = alunos.find(a => a.matricula === reg.aluno_matricula);
                        const isEntrada = reg.tipo_movimentacao === 'ENTRADA';
                        return (
                            <div key={reg.id} className="p-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-4 group/item border border-transparent hover:border-slate-100">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover/item:scale-110 ${isEntrada ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {isEntrada ? <LogIn size={20} /> : <LogOut size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-900 group-hover/item:text-indigo-700 transition-colors uppercase tracking-tight truncate">
                                        {aluno?.nome_completo || 'Identificando...'}
                                    </p>
                                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        {reg.aluno_matricula} • {aluno?.turma_id || 'Avulso'}
                                    </p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="text-[10px] font-mono font-black text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-sm group-hover/item:border-indigo-200 group-hover/item:bg-indigo-50 transition-all">
                                        {format(parseISO(reg.timestamp), 'HH:mm')}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <button className="w-full p-4 bg-slate-50 border-t border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all flex items-center justify-center gap-2 group/btn">
                Auditoria Completa de Fluxo
                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
        </CartaoConteudo>
    );
};


export default function Painel() {
    const { dados: estatisticasRaw, carregando } = usarConsulta(
        ['estatisticas-dashboard'],
        async () => {
            const dados = await bancoLocal.obterDadosDashboard();
            const banco = await bancoLocal.iniciarBanco();
            const pendentes = await banco.countFromIndex('registros_acesso', 'sincronizado', 0);
            return { ...dados, pendencias: pendentes };
        },
        { refetchInterval: 15000, staleTime: 14000 }
    );

    const estatisticas = useMemo(() => {
        if (!estatisticasRaw) return {
            totalAlunos: 0,
            presentesHoje: 0,
            atrasosHoje: 0,
            saidasHoje: 0,
            historicoPresenca: [],
            registrosRecentes: [],
            alunos: []
        };

        const { alunos, registros } = estatisticasRaw;
        const hojeStr = format(new Date(), 'yyyy-MM-dd');

        const registrosHoje = registros.filter(r => r.timestamp.startsWith(hojeStr));
        const entradasHoje = new Set(
            registrosHoje.filter(r => r.tipo_movimentacao === 'ENTRADA').map(r => r.aluno_matricula)
        ).size;
        const saidasHojeCount = registrosHoje.filter(r => r.tipo_movimentacao === 'SAIDA').length;

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
            saidasHoje: saidasHojeCount,
            historicoPresenca: historico,
            registrosRecentes: registros.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50),
            alunos: alunos
        };
    }, [estatisticasRaw]);

    const dataLine = {
        labels: estatisticas.historicoPresenca.map(h => h.data),
        datasets: [{
            label: 'Alunos Presentes',
            data: estatisticas.historicoPresenca.map(h => h.total),
            borderColor: '#6366f1',
            borderWidth: 4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#6366f1',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.4
        }]
    };

    return (
        <LayoutAdministrativo
            titulo="Visão Geral"
            subtitulo="Acompanhamento de alunos e movimentação em tempo real"
            acoes={null}
        >
            <div className="space-y-8 pb-12">

                {/* Grid de Indicadores Principais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardEstatistica
                        titulo="Alunos na Escola"
                        valor={estatisticas.presentesHoje}
                        subtitulo="Entradas registradas hoje"
                        icone={Users}
                        cor="indigo"
                        tendencia={12}
                    />
                    <CardEstatistica
                        titulo="Atrasos do Dia"
                        valor={estatisticas.atrasosHoje}
                        subtitulo="Entradas fora do horário"
                        icone={Clock}
                        cor="amber"
                        tendencia={-5}
                        inverterTendencia
                    />
                    <CardEstatistica
                        titulo="Saídas Registradas"
                        valor={estatisticas.saidasHoje}
                        subtitulo="Alunos que saíram hoje"
                        icone={LogOut}
                        cor="rose"
                    />
                    <CardEstatistica
                        titulo="Total de Alunos"
                        valor={estatisticas.totalAlunos}
                        subtitulo="Estudantes cadastrados"
                        icone={ShieldCheck}
                        cor="emerald"
                    />
                </div>

                {/* Grid de Análises e Atividade */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                    {/* Coluna de Gráficos */}
                    <div className="lg:col-span-2">
                        <CartaoConteudo className="p-10 flex flex-col h-full bg-white border-slate-200 shadow-2xl rounded-[2.5rem] overflow-hidden group">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Evolução Diária</h3>
                                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Frequência da Semana</h4>
                                </div>
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm group-hover:rotate-12 transition-transform">
                                    <TrendingUp size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="flex-1 w-full min-h-[350px] relative">
                                <Line data={dataLine} options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            backgroundColor: '#0f172a',
                                            titleFont: { family: 'inherit', weight: 800, size: 12 },
                                            bodyFont: { family: 'inherit', size: 12, weight: 600 },
                                            padding: 16,
                                            cornerRadius: 16,
                                            displayColors: false,
                                            caretSize: 8,
                                            bodyColor: '#cbd5e1'
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            grid: { color: '#f8fafc', drawTicks: false },
                                            border: { display: false },
                                            ticks: {
                                                font: { family: 'inherit', size: 10, weight: 700 },
                                                color: '#94a3b8',
                                                padding: 10
                                            }
                                        },
                                        x: {
                                            grid: { display: false },
                                            border: { display: false },
                                            ticks: {
                                                font: { family: 'inherit', size: 10, weight: 700 },
                                                color: '#94a3b8',
                                                padding: 10
                                            }
                                        }
                                    }
                                }} />
                            </div>
                        </CartaoConteudo>
                    </div>

                    {/* Real-time Telemetry Column */}
                    <div className="lg:col-span-1">
                        <LiveAccessFeed registros={estatisticas.registrosRecentes} alunos={estatisticas.alunos} />
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
