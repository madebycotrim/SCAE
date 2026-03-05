import { usarConsulta } from '@compartilhado/hooks/usarConsulta';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import { Botao, CartaoConteudo } from '@compartilhado/componentes/UI';
import { RegistroAcessoLocal } from '@compartilhado/types/bancoLocal.tipos';
import {
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    LogOut,
    LogIn,
    ArrowRight,
    Radar,
    AlertTriangle,
    CheckCircle,
    Layers,
    Shield,
    ShieldCheck,
    FileText,
    Calendar,
    Grid,
    Clock,
    Users
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
    const corAcento = {
        indigo: 'border-l-slate-400',
        amber: 'border-l-amber-400',
        rose: 'border-l-rose-400',
        emerald: 'border-l-emerald-400'
    };

    const corIcone = {
        indigo: 'text-slate-600 bg-slate-50',
        amber: 'text-amber-600 bg-amber-50',
        rose: 'text-rose-600 bg-rose-50',
        emerald: 'text-emerald-600 bg-emerald-50'
    };

    return (
        <CartaoConteudo className={`p-5 transition-all relative overflow-hidden group bg-white border border-slate-200 border-l-4 ${corAcento[cor]} rounded-xl shadow-suave`}>
            <div className="flex justify-between items-start mb-3 z-10 relative">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border border-slate-200/50 shadow-suave transition-transform ${corIcone[cor]}`}>
                    <Icone size={18} strokeWidth={2} />
                </div>
                {tendencia !== undefined && (
                    <div className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${(tendencia > 0 && !inverterTendencia) || (tendencia < 0 && inverterTendencia)
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                        {tendencia > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(tendencia)}%
                    </div>
                )}
            </div>
            <div className="z-10 relative">
                <h3 className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1 leading-none">{titulo}</h3>
                <div className="flex items-baseline gap-2">
                    <p className="text-xl font-black text-slate-800 tracking-tighter leading-tight">{valor}</p>
                    {subtitulo && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate">{subtitulo}</p>
                    )}
                </div>
            </div>
        </CartaoConteudo>
    );
};

const SecaoHeader = ({ titulo, subtitulo, icone: Icone }: { titulo: string; subtitulo: string; icone: any }) => (
    <div className="flex items-center justify-between mb-6 group">
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 shadow-suave transition-all">
                <Icone size={20} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none mb-1.5">{titulo}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{subtitulo}</p>
            </div>
        </div>
        <div className="h-px flex-1 bg-slate-200/60 mx-8 hidden md:block"></div>
    </div>
);

const LiveAccessFeed = ({ registros, alunos }) => {
    return (
        <CartaoConteudo className="h-full flex flex-col bg-white border-slate-200 shadow-suave rounded-xl overflow-hidden group">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Radar size={14} className="text-slate-600 animate-pulse" />
                    Atividade em Tempo Real
                </h3>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-suave">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">AO VIVO</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
                {registros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40 grayscale gap-4">
                        <Activity size={32} strokeWidth={1} className="text-slate-400" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sincronizando...</p>
                    </div>
                ) : (
                    registros.slice(0, 15).map((reg) => {
                        const aluno = alunos.find(a => a.matricula === reg.aluno_matricula);
                        const isEntrada = reg.tipo_movimentacao === 'ENTRADA';
                        return (
                            <div key={reg.id} className="p-3 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-4 group/item">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center border shadow-suave transition-transform ${isEntrada ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {isEntrada ? <LogIn size={16} /> : <LogOut size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">
                                        {aluno?.nome_completo || 'Identificando...'}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        {reg.aluno_matricula} • {aluno?.turma_id || 'Avulso'}
                                    </p>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                        {format(parseISO(reg.timestamp), 'HH:mm')}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <button className="w-full h-11 bg-slate-50 border-t border-slate-100 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 group/btn">
                Auditoria Completa de Fluxo
                <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
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
            titulo="Dashboard Central"
            subtitulo="Gestão, Pedagogia e Controle em Tempo Real"
            acoes={null}
        >
            <div className="space-y-12 pb-16">

                {/* --- PILAR 1: VISÃO GERAL --- */}
                <section>
                    <SecaoHeader
                        titulo="Visão Estratégica"
                        subtitulo="Indicadores de performance e evolução escolar"
                        icone={TrendingUp}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                        <div className="lg:col-span-2">
                            <CartaoConteudo className="p-8 flex flex-col h-full bg-white border-slate-200 shadow-suave rounded-xl overflow-hidden group">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-4 border-l-2 border-slate-900 pl-4">
                                        <div>
                                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Evolução Diária</h3>
                                            <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">Frequência da Semana</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                                        <Activity size={12} className="text-slate-500" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase">Média: {Math.round(estatisticas.historicoPresenca.reduce((a, b) => a + b.total, 0) / 7)}</span>
                                    </div>
                                </div>
                                <div className="flex-1 w-full min-h-[300px] relative">
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
                                                grid: { color: '#f1f5f9', drawTicks: false },
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

                        <div className="flex flex-col gap-6">
                            <CardEstatistica
                                titulo="Taxa de Frequência"
                                valor={`${estatisticas.totalAlunos > 0 ? Math.round((estatisticas.presentesHoje / estatisticas.totalAlunos) * 100) : 0}%`}
                                subtitulo="Meta: 95%"
                                icone={Activity}
                                cor="indigo"
                                tendencia={2.4}
                            />
                            <CardEstatistica
                                titulo="Total de Estudantes"
                                valor={estatisticas.totalAlunos}
                                subtitulo="Cadastro Ativo"
                                icone={Users}
                                cor="indigo"
                            />
                            <CardEstatistica
                                titulo="Permanência Média"
                                valor="4.2h"
                                subtitulo="Tempo em aula"
                                icone={Clock}
                                cor="indigo"
                            />
                        </div>
                    </div>
                </section>

                {/* --- PILAR 2: PEDAGÓGICO --- */}
                <section>
                    <SecaoHeader
                        titulo="Módulo Pedagógico"
                        subtitulo="Acompanhamento preventivo e evasão"
                        icone={ShieldCheck}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <CardEstatistica
                            titulo="Risco de Abandono"
                            valor={estatisticas.atrasosHoje} // Usando dado disponível como proxy
                            subtitulo="Pendentes Urgentes"
                            icone={AlertTriangle}
                            cor="rose"
                            tendencia={-12}
                            inverterTendencia
                        />
                        <CardEstatistica
                            titulo="Faltas Consecutivas"
                            valor={8}
                            subtitulo="Turmas Críticas"
                            icone={Activity}
                            cor="rose"
                        />
                        <CardEstatistica
                            titulo="Alunos Presentes"
                            valor={estatisticas.presentesHoje}
                            subtitulo="Check-in realizado"
                            icone={CheckCircle}
                            cor="emerald"
                            tendencia={5}
                        />
                        <CardEstatistica
                            titulo="Turmas Ativas"
                            valor={12}
                            subtitulo="Em aula agora"
                            icone={Layers}
                            cor="emerald"
                        />
                    </div>
                </section>

                {/* --- PILAR 3: CONTROLE & ACESSO --- */}
                <section>
                    <SecaoHeader
                        titulo="Controle de Portaria"
                        subtitulo="Monitoramento de fluxo em tempo real"
                        icone={Radar}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 flex flex-col gap-6">
                            <CardEstatistica
                                titulo="Saídas Registradas"
                                valor={estatisticas.saidasHoje}
                                subtitulo="Fluxo de saída"
                                icone={LogOut}
                                cor="amber"
                            />
                            <CardEstatistica
                                titulo="Atrasos Detectados"
                                valor={estatisticas.atrasosHoje}
                                subtitulo="Pós-tolerância"
                                icone={Clock}
                                cor="amber"
                                tendencia={8}
                                inverterTendencia
                            />
                        </div>
                        <div className="lg:col-span-2 min-h-[400px]">
                            <LiveAccessFeed registros={estatisticas.registrosRecentes} alunos={estatisticas.alunos} />
                        </div>
                    </div>
                </section>

                {/* --- PILAR 4: ADMINISTRAÇÃO --- */}
                <section>
                    <SecaoHeader
                        titulo="Administração"
                        subtitulo="Status do sistema e atalhos rápidos"
                        icone={Shield}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-suave flex items-center justify-between group hover:border-slate-400 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors border border-slate-100">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Usuários</p>
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Time</p>
                                </div>
                            </div>
                            <ArrowRight size={12} className="text-slate-300 group-hover:translate-x-1 group-hover:text-slate-900 transition-all" />
                        </div>

                        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-suave flex items-center justify-between group hover:border-slate-400 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-slate-900 transition-colors border border-slate-100">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registros</p>
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Audit</p>
                                </div>
                            </div>
                            <ArrowRight size={12} className="text-slate-300 group-hover:translate-x-1 group-hover:text-slate-900 transition-all" />
                        </div>

                        <div className="sm:col-span-2 bg-slate-950 rounded-xl p-5 border border-slate-800 relative overflow-hidden flex items-center justify-between group">
                            <div className="relative z-10 border-l-2 border-emerald-500 pl-4">
                                <h4 className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Sync Service</h4>
                                <div className="flex items-center gap-3">
                                    <p className="text-white text-[11px] font-black uppercase tracking-widest">Database Ativa</p>
                                </div>
                            </div>
                            <Botao variante="ghost" tamanho="sm" className="text-slate-400 hover:bg-white/5 border border-white/10 relative z-10 h-8">
                                Forçar Sinc
                            </Botao>
                        </div>
                    </div>
                </section>
            </div>
        </LayoutAdministrativo>
    );
}

