import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { dashboardServico } from '../servicos/dashboard.servico';
import { usarPermissoes } from '@/compartilhado/autorizacao/ContextoPermissoes';
import { Botao, CartaoConteudo, Esqueleto } from '@/compartilhado/componentes/UI';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { RegistroAcessoLocal } from '@/compartilhado/types/bancoLocal.tipos';
import { toast } from 'react-hot-toast';
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
    Users,
    Trash2
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
import { format, subDays, parseISO, isSameDay } from 'date-fns';

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
    cor: 'marinho' | 'amber' | 'rose' | 'emerald';
    tendencia?: number;
    inverterTendencia?: boolean;
}

const CardEstatistica = ({ titulo, valor, subtitulo, icone: Icone, cor, tendencia, inverterTendencia }: PropsCardEstatistica) => {
    const coresTema = {
        marinho: { barra: 'bg-slate-700', bg: 'bg-slate-50', text: 'text-slate-600' },
        amber: { barra: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
        rose: { barra: 'bg-rose-500', bg: 'bg-rose-50', text: 'text-rose-600' },
        emerald: { barra: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' }
    };

    const tema = coresTema[cor];

    return (
        <div className="relative bg-white p-5 rounded-r-2xl rounded-l-none border border-slate-200 shadow-sm flex items-center gap-4 group transition-all hover:shadow-md overflow-hidden">
            {/* Barra de Acento Lateral */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${tema.barra} opacity-80 group-hover:opacity-100 transition-all`} />
            
            {/* Ícone Circular (Sem Borda) */}
            <div className={`w-12 h-12 rounded-full ${tema.bg} ${tema.text} flex items-center justify-center shrink-0`}>
                <Icone size={22} strokeWidth={2.5} />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{titulo}</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-800 leading-none">{valor}</span>
                    {subtitulo && (
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate">{subtitulo}</span>
                    )}
                </div>
            </div>

            {/* Tendência (Pequena Tag) */}
            {tendencia !== undefined && tendencia !== 0 && (
                <div className={`flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${(tendencia > 0 && !inverterTendencia) || (tendencia < 0 && inverterTendencia)
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                    {tendencia > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(tendencia)}%
                </div>
            )}
        </div>
    );
};

const LiveAccessFeed = ({ alunos, aoReceberNovos }: { alunos: any[], aoReceberNovos?: () => void }) => {
    const [registros, definirRegistros] = useState<any[]>([]);
    const [ultimaAtualizacao, definirUltimaAtualizacao] = useState<string | null>(null);
    const [conectado, definirConectado] = useState(true);

    // Polling de ALTA FREQUÊNCIA para registros de acesso
    useEffect(() => {
        let timer: any;
        let montado = true;

        const buscarNovos = async (isFirst = false) => {
            try {
                const desde = isFirst ? undefined : ultimaAtualizacao;
                const novos = await dashboardServico.buscarRegistrosRecentes(desde);

                if (!montado) return;

                if (novos && novos.length > 0) {
                    definirRegistros(prev => {
                        const idsExistentes = new Set(prev.map(r => r.id));
                        const realmenteNovos = novos.filter((n: any) => {
                            const isNovo = !idsExistentes.has(n.id);
                            const isDeHoje = isSameDay(parseISO(n.timestamp), new Date());
                            return isNovo && isDeHoje;
                        });

                        if (realmenteNovos.length === 0) return prev;

                        if (aoReceberNovos) aoReceberNovos();

                        const listaCombinada = [...realmenteNovos, ...prev]
                            .filter(r => isSameDay(parseISO(r.timestamp), new Date()))
                            .slice(0, 30);
                            
                        const maisNovo = listaCombinada[0]?.timestamp;
                        if (maisNovo) definirUltimaAtualizacao(maisNovo);

                        return listaCombinada;
                    });
                }
                definirConectado(true);
            } catch (e) {
                console.error("Erro no poll de tempo real:", e);
                definirConectado(false);
            } finally {
                if (montado) {
                    timer = setTimeout(() => buscarNovos(), 3000); // Mais agressivo: 3s
                }
            }
        };

        buscarNovos(true);
        return () => {
            montado = false;
            clearTimeout(timer);
        };
    }, [ultimaAtualizacao, dashboardServico]);

    return (
        <CartaoConteudo className="h-full flex flex-col bg-white border border-slate-200 shadow-suave rounded-[2.5rem] overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30 backdrop-blur-sm">
                <div className="flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Monitoramento</h3>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        <Radar size={16} className={`text-slate-600 ${conectado ? 'animate-pulse' : 'text-rose-400'}`} />
                        Fluxo ao Vivo
                    </h4>
                </div>
                <div className={`flex items-center gap-2 px-4 py-1.5 bg-white border rounded-full shadow-sm transition-all duration-500 ${conectado ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-200 bg-rose-50'}`}>
                    <span className="relative flex h-2 w-2">
                        {conectado && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${conectado ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-[0.15em] leading-none ${conectado ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {conectado ? 'Radar Ativo' : 'Offline'}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2 min-h-[400px]">
                <AnimatePresence initial={false}>
                    {registros.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center gap-4"
                        >
                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                                <Activity size={32} strokeWidth={1} />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Varredura iniciada...</p>
                        </motion.div>
                    ) : (
                        registros.map((reg, index) => {
                            const aluno = alunos.find(a => a.matricula === reg.aluno_matricula);
                            const isEntrada = reg.tipo_movimentacao === 'ENTRADA';
                            const isNew = index === 0 && (new Date().getTime() - parseISO(reg.timestamp).getTime() < 10000);

                            return (
                                <motion.div
                                    key={reg.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ 
                                        opacity: 1, 
                                        scale: 1, 
                                        y: 0,
                                        backgroundColor: isNew ? 'rgba(236, 253, 245, 0.5)' : 'transparent'
                                    }}
                                    className={`p-4 rounded-[1.5rem] border transition-all duration-300 flex items-center gap-5 group/item ${isNew ? 'border-emerald-200 shadow-lg shadow-emerald-500/5' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-sm transition-all duration-500 group-hover/item:scale-110 ${isEntrada ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                        {isEntrada ? <LogIn size={20} strokeWidth={2.5} /> : <LogOut size={20} strokeWidth={2.5} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate leading-tight">
                                            {aluno?.nome_completo || 'Aluno Identificado'}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {reg.aluno_matricula} • <span className="text-slate-900">{aluno?.turma_id || '---'}</span>
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] font-black text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">
                                                {format(parseISO(reg.timestamp), 'HH:mm')}
                                            </span>
                                            {isNew && (
                                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter animate-pulse">Agora</span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-50 border-dashed">
                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <span>Catraki Operational Radar</span>
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-slate-300 animate-bounce" />
                        <div className="w-1 h-1 rounded-full bg-slate-300 animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1 h-1 rounded-full bg-slate-300 animate-bounce [animation-delay:0.4s]" />
                    </div>
                </div>
            </div>
        </CartaoConteudo>
    );
};


export default function Painel() {
    const { dados: estatisticasRaw, carregando, recarregar: atualizarKPIs } = usarConsulta(
        ['estatisticas-dashboard-online'],
        () => dashboardServico.obterEstatisticas(),
        { refetchInterval: 30000, staleTime: 25000 }
    );

    const { ehAdmin, ehCentral } = usarPermissoes();
    const [modoFoco, definirModoFoco] = useState(false);

    // Atalho de Teclado (F para Foco)
    useEffect(() => {
        const lidarTeclado = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
                definirModoFoco(prev => !prev);
                if (!modoFoco) {
                    toast.success('Radar em Tela Cheia', { icon: '🎯', position: 'bottom-center' });
                }
            }
            if (e.key === 'Escape' && modoFoco) {
                definirModoFoco(false);
            }
        };
        window.addEventListener('keydown', lidarTeclado);
        return () => window.removeEventListener('keydown', lidarTeclado);
    }, [modoFoco]);

    const estatisticas = useMemo(() => {
        if (!estatisticasRaw) return {
            totalAlunos: 0,
            totalTurmas: 0,
            presentesHoje: 0,
            atrasosHoje: 0,
            saidasHoje: 0,
            alunosEmRisco: 0,
            permanenciaMedia: '---',
            tendenciaFrequencia: 0,
            historicoPresenca: [],
            registrosRecentes: [],
            alunos: []
        };

        return estatisticasRaw;
    }, [estatisticasRaw]);

    const dataLine = {
        labels: estatisticas.historicoPresenca.map(h => h.data),
        datasets: [{
            label: 'Alunos Presentes',
            data: estatisticas.historicoPresenca.map(h => h.total),
            borderColor: '#2B59FF',
            borderWidth: 4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#2B59FF',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(43, 89, 255, 0.15)');
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
            acoes={
                <div className="flex gap-3">
                    <Botao 
                        variante="ghost" 
                        icone={Radar} 
                        onClick={() => definirModoFoco(true)}
                        className="hidden md:flex"
                    >
                        Modo Radar (F)
                    </Botao>
                    {ehCentral && (
                        <Botao 
                            variante="secundario" 
                            icone={Trash2} 
                            onClick={async () => {
                                if (window.confirm('🚨 CUIDADO: Isso apagará TODO o histórico de acessos. Deseja continuar?')) {
                                    try {
                                        await dashboardServico.limparHistorico();
                                        window.location.reload();
                                    } catch (e) {
                                        toast.error('Erro ao limpar histórico.');
                                    }
                                }
                            }}
                        >
                            Limpar Logs
                        </Botao>
                    )}
                </div>
            }
        >
            {/* Overlay de MODO FOCO */}
            <AnimatePresence>
                {modoFoco && (
                    <motion.div
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[100] bg-slate-900 flex flex-col p-8 md:p-12 lg:p-20"
                    >
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-lg">
                                    <Radar size={40} className="animate-pulse" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Radar de Monitoramento</h2>
                                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">Tempo Real • Portaria Central</p>
                                </div>
                            </div>
                            <button
                                onClick={() => definirModoFoco(false)}
                                className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest border border-white/10 transition-all"
                            >
                                Sair do Modo Radar [ESC]
                            </button>
                        </div>
                        
                        <div className="flex-1 w-full max-w-5xl mx-auto shadow-2xl shadow-indigo-500/10 rounded-[3rem] overflow-hidden">
                            <LiveAccessFeed alunos={estatisticas.alunos} aoReceberNovos={() => atualizarKPIs()} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-8 pb-12">
                

                {/* --- LINHA DE KPIs ESSENCIAIS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardEstatistica
                        titulo="Presentes Hoje"
                        valor={estatisticas.presentesHoje}
                        subtitulo={`${estatisticas.totalAlunos > 0 ? Math.round((estatisticas.presentesHoje / estatisticas.totalAlunos) * 100) : 0}% da escola`}
                        icone={CheckCircle}
                        cor="emerald"
                        tendencia={estatisticas.tendenciaFrequencia}
                    />
                    <CardEstatistica
                        titulo="Atrasos Detectados"
                        valor={estatisticas.atrasosHoje}
                        subtitulo="Entradas pós-tolerância"
                        icone={Clock}
                        cor="amber"
                        inverterTendencia
                    />
                    <CardEstatistica
                        titulo="Saídas Registradas"
                        valor={estatisticas.saidasHoje}
                        subtitulo="Fluxo total de hoje"
                        icone={LogOut}
                        cor="marinho"
                    />
                    <CardEstatistica
                        titulo="Risco de Abandono"
                        valor={estatisticas.alunosEmRisco}
                        subtitulo="Ações pedagógicas urgentes"
                        icone={AlertTriangle}
                        cor="rose"
                        inverterTendencia
                    />
                </div>

                {/* --- ÁREA CENTRAL: ANÁLISE E TEMPO REAL --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Gráfico de Frequência */}
                    <div className="lg:col-span-2">
                        <CartaoConteudo className="p-8 flex flex-col bg-white border border-slate-200 shadow-suave rounded-2xl overflow-hidden group min-h-[480px]">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4 border-l-4 border-slate-900 pl-4">
                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Tendência Mensal</h3>
                                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Frequência da Semana</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                                    <TrendingUp size={16} className="text-eletrico" />
                                    <span className="text-[11px] font-black text-slate-600 uppercase">Média: {Math.round(estatisticas.historicoPresenca.reduce((a, b) => a + b.total, 0) / 7)} alunos/dia</span>
                                </div>
                            </div>

                            <div className="flex-1 w-full relative min-h-[300px]">
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

                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Estudantes</p>
                                    <p className="text-sm font-black text-slate-700">{estatisticas.totalAlunos}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Turmas Ativas</p>
                                    <p className="text-sm font-black text-slate-700">{estatisticas.totalTurmas}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Permanência Média</p>
                                    <p className="text-sm font-black text-slate-700">{estatisticas.permanenciaMedia}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Sistema</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Operacional</p>
                                    </div>
                                </div>
                            </div>
                        </CartaoConteudo>
                    </div>

                    {/* Feed em Tempo Real */}
                    <div className="lg:col-span-1 h-full min-h-[480px]">
                        <LiveAccessFeed 
                            alunos={estatisticas.alunos} 
                            aoReceberNovos={() => atualizarKPIs()} 
                        />
                    </div>

                </div>

            </div>
        </LayoutAdministrativo>
    );
}

