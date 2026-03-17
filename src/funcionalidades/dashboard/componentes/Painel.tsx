import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { dashboardServico } from '../servicos/dashboard.servico';
import { servicoSincronizacao } from '@/compartilhado/servicos/sincronizacao';
import { Botao, CartaoConteudo, Esqueleto } from '@/compartilhado/componentes/UI';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { RegistroAcessoLocal } from '@/compartilhado/types/bancoLocal.tipos';
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

// --- Componentes Auxiliares ---

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
        amber: 'border-l-amber-500',
        rose: 'border-l-rose-500',
        emerald: 'border-l-emerald-500'
    };

    const corIcone = {
        indigo: 'text-slate-500 border-slate-200',
        amber: 'text-amber-500 border-amber-200',
        rose: 'text-rose-500 border-rose-200',
        emerald: 'text-emerald-500 border-emerald-200'
    };

    return (
        <CartaoConteudo className={`p-5 transition-all relative overflow-hidden group bg-white border border-slate-200 border-l-4 ${corAcento[cor]} rounded-2xl`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 bg-white ${corIcone[cor]} z-10 transition-transform group-hover:scale-105`}>
                    <Icone size={18} strokeWidth={2} />
                </div>
                <div className="z-10 flex-1">
                    <h3 className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-0.5 leading-none">{titulo}</h3>
                    <div className="flex items-baseline gap-2">
                        <p className="text-xl font-black text-slate-700 leading-tight">{valor}</p>
                        {subtitulo && (
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter truncate">{subtitulo}</p>
                        )}
                    </div>
                </div>
                {tendencia !== undefined && tendencia !== 0 && (
                    <div className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${(tendencia > 0 && !inverterTendencia) || (tendencia < 0 && inverterTendencia)
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                        {tendencia > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(tendencia)}%
                    </div>
                )}
            </div>
        </CartaoConteudo>
    );
};

const LiveAccessFeed = ({ alunos }: { alunos: any[] }) => {
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
                        const realmenteNovos = novos.filter((n: any) => !idsExistentes.has(n.id));
                        
                        if (realmenteNovos.length === 0) return prev;

                        const listaCombinada = [...realmenteNovos, ...prev].slice(0, 30);
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
                    timer = setTimeout(() => buscarNovos(), 4000); 
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
        <CartaoConteudo className="h-full flex flex-col bg-white border border-slate-200 shadow-suave rounded-2xl overflow-hidden group">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Radar size={14} className={`text-slate-600 ${conectado ? 'animate-pulse' : 'text-rose-400'}`} />
                    Acessos em Tempo Real
                </h3>
                <div className={`flex items-center gap-2 px-3 py-1 bg-white border rounded-xl shadow-sm transition-colors ${conectado ? 'border-slate-200' : 'border-rose-200 bg-rose-50'}`}>
                    <span className="relative flex h-1.5 w-1.5">
                        {conectado && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${conectado ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${conectado ? 'text-slate-500' : 'text-rose-600'}`}>
                        {conectado ? 'AO VIVO' : 'OFFLINE'}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1 min-h-[350px]">
                <AnimatePresence initial={false}>
                    {registros.length === 0 ? (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center opacity-40 grayscale gap-4"
                        >
                            <Activity size={32} strokeWidth={1} className="text-slate-400" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Aguardando leituras...</p>
                        </motion.div>
                    ) : (
                        registros.map((reg) => {
                            const aluno = alunos.find(a => a.matricula === reg.aluno_matricula);
                            const isEntrada = reg.tipo_movimentacao === 'ENTRADA';
                            return (
                                <motion.div
                                    key={reg.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all flex items-center gap-4 group/item"
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 shadow-sm transition-transform ${isEntrada ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        {isEntrada ? <LogIn size={18} /> : <LogOut size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">
                                            {aluno?.nome_completo || 'Aluno Identificado'}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                            {reg.aluno_matricula} • {aluno?.turma_id || '---'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                            {format(parseISO(reg.timestamp), 'HH:mm')}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">
                    Portões sincronizados a cada 4 segundos
                </p>
            </div>
        </CartaoConteudo>
    );
};


export default function Painel() {
    const { dados: estatisticasRaw, carregando } = usarConsulta(
        ['estatisticas-dashboard-online'],
        () => dashboardServico.obterEstatisticas(),
        { refetchInterval: 60000, staleTime: 55000 }
    );

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

        const { alunos, registros, turmas, alertas } = estatisticasRaw;
        const hojeStr = format(new Date(), 'yyyy-MM-dd');

        const registrosHoje = registros.filter(r => r.timestamp && r.timestamp.startsWith(hojeStr));
        const entradasHojeSet = new Set(
            registrosHoje.filter(r => r.tipo_movimentacao === 'ENTRADA').map(r => r.aluno_matricula)
        );
        const entradasHoje = entradasHojeSet.size;
        const saidasHojeCount = registrosHoje.filter(r => r.tipo_movimentacao === 'SAIDA').length;

        // Cálculo de Atrasos (Proxy básico baseado no horário)
        let atrasos = 0;
        registrosHoje.forEach(r => {
            if (r.tipo_movimentacao === 'ENTRADA' && r.timestamp) {
                const hora = parseInt(r.timestamp.substring(11, 13));
                const min = parseInt(r.timestamp.substring(14, 16));
                const minutosDia = hora * 60 + min;
                // Atraso se entrar após 07:15 ou após 13:15
                if ((minutosDia > 435 && minutosDia < 720) || (minutosDia > 795 && minutosDia < 1080)) {
                    atrasos++;
                }
            }
        });

        // Cálculo de Permanência Média Real
        const registrosPorAluno: Record<string, { ENTRADA?: number, SAIDA?: number }> = {};
        registrosHoje.forEach(r => {
            if (!registrosPorAluno[r.aluno_matricula]) registrosPorAluno[r.aluno_matricula] = {};
            const ts = new Date(r.timestamp).getTime();
            if (r.tipo_movimentacao === 'ENTRADA') registrosPorAluno[r.aluno_matricula].ENTRADA = ts;
            if (r.tipo_movimentacao === 'SAIDA') registrosPorAluno[r.aluno_matricula].SAIDA = ts;
        });

        let totalMinutos = 0;
        let contagemPares = 0;
        Object.values(registrosPorAluno).forEach(p => {
            if (p.ENTRADA && p.SAIDA && p.SAIDA > p.ENTRADA) {
                totalMinutos += (p.SAIDA - p.ENTRADA) / (1000 * 60);
                contagemPares++;
            }
        });

        // Histórico de 7 dias
        const historico = Array.from({ length: 7 }).map((_, i) => {
            const d = subDays(new Date(), 6 - i);
            const dStr = format(d, 'yyyy-MM-dd');
            const regsDia = registros.filter(r => r.timestamp && r.timestamp.startsWith(dStr) && r.tipo_movimentacao === 'ENTRADA');
            const total = new Set(regsDia.map(r => r.aluno_matricula)).size;
            return { data: format(d, 'dd/MM'), total };
        });

        const mediaSemana = historico.slice(0, 6).reduce((a, b) => a + b.total, 0) / 6;
        const tendencia = mediaSemana > 0 ? Math.round(((entradasHoje - mediaSemana) / mediaSemana) * 100) : 0;

        return {
            totalAlunos: alunos.length,
            totalTurmas: turmas.length,
            presentesHoje: entradasHoje,
            atrasosHoje: atrasos,
            saidasHoje: saidasHojeCount,
            alunosEmRisco: alertas?.length || 0,
            permanenciaMedia: contagemPares > 0 ? `${(totalMinutos / contagemPares / 60).toFixed(1)}h` : '---',
            tendenciaFrequencia: tendencia,
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
            subtitulo="Monitoramento e Gestão Escolar"
            acoes={null}
        >
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
                        cor="indigo"
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
                                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                                    <TrendingUp size={16} className="text-indigo-600" />
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
                                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Estudantes</p>
                                    <p className="text-sm font-black text-slate-700">{estatisticas.totalAlunos}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Turmas Ativas</p>
                                    <p className="text-sm font-black text-slate-700">{estatisticas.totalTurmas}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Permanência Média</p>
                                    <p className="text-sm font-black text-slate-700">{estatisticas.permanenciaMedia}</p>
                                </div>
                                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
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
                        <LiveAccessFeed alunos={estatisticas.alunos} />
                    </div>

                </div>

            </div>
        </LayoutAdministrativo>
    );
}

