import { useMemo, useState, useEffect, useRef } from 'react';
import { 
    CheckCircle, 
    Clock, 
    LogOut, 
    AlertTriangle, 
    TrendingUp,
    Trash2,
    Activity,
    User,
    Wifi
} from 'lucide-react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CardMetrica, CartaoConteudo, Botao } from '@/compartilhado/componentes/UI';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import { dashboardServico } from '@/funcionalidades/dashboard/servicos/dashboard.servico';
import { usarPermissoes } from '@/compartilhado/autorizacao/ContextoPermissoes';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * RadarIcon - Pequeno widget animado para indicar atividade real-time
 */
/**
 * Ícone de radar animado para indicação de atividade em tempo real.
 */
const RadarIcon = () => (
    <div className="relative flex items-center justify-center w-5 h-5">
        <div className="absolute w-full h-full bg-emerald-400 rounded-full animate-ping opacity-20" />
        <div className="absolute w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
    </div>
);

/**
 * LiveAccessFeed - Monitor de acessos em tempo real via polling otimizado
 */
/**
 * Monitor de acessos em tempo real com polling otimizado.
 * @param alunos - Lista de alunos para cruzamento de dados
 * @param aoReceberNovos - Callback disparado ao detectar novas entradas
 */
export function LiveAccessFeed({ alunos, aoReceberNovos }: { alunos: any[], aoReceberNovos: () => void }) {
    const [registros, setRegistros] = useState<any[]>([]);
    const [carregando, setCarregando] = useState(true);
    const ultimaDataRef = useRef<string | null>(null);
    const inicializadoRef = useRef(false);

    useEffect(() => {
        let montado = true;
        let timerId: any;

        const buscarNovos = async () => {
            try {
                // Se for a primeira busca, define o ponto de partida como o início do dia de hoje (UTC)
                if (!ultimaDataRef.current) {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    ultimaDataRef.current = hoje.toISOString();
                }

                // Busca via serviço que já injeta os headers necessários
                const novos = await dashboardServico.buscarRegistrosRecentes(ultimaDataRef.current);

                if (montado && novos && novos.length > 0) {
                    // Atualiza a referência da última data para o próximo poll
                    // Compatibilidade Híbrida: Nuvem usa 'timestamp', Local usa 'timestamp_acesso'
                    const ultimaData = novos[0].timestamp || novos[0].timestamp_acesso || novos[0].criado_em;
                    
                    if (ultimaDataRef.current !== ultimaData) {
                        ultimaDataRef.current = ultimaData;
                        
                        setRegistros(anterior => {
                            // Evita duplicados comparando IDs e garante que o ID existe
                            const idsExistentes = new Set(anterior.map(r => r.id).filter(id => !!id));
                            const unicos = novos.filter((n: any) => n.id && !idsExistentes.has(n.id));
                            
                            if (unicos.length > 0) {
                                console.log(`[Painel] Radar identificou ${unicos.length} novos acessos.`);
                                if (inicializadoRef.current) aoReceberNovos(); // Notifica o pai para atualizar KPIs (Presentes Hoje, etc)
                            }
                            
                            return [...unicos, ...anterior].slice(0, 15);
                        });
                    }
                }
            } catch (erro) {
                console.error('Erro no poll de tempo real:', erro);
            } finally {
                setCarregando(false);
                inicializadoRef.current = true;
                if (montado) timerId = setTimeout(buscarNovos, 2000); // Poll a cada 2s
            }
        };

        buscarNovos();
        return () => {
            montado = false;
            clearTimeout(timerId);
        };
    }, [aoReceberNovos]);

    return (
        <CartaoConteudo className="h-full flex flex-col bg-white border border-slate-200 shadow-suave rounded-xl overflow-hidden group">
            <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <RadarIcon />
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">AO VIVO</h4>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight">Monitorando Atividade</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                    <Wifi size={10} className="text-emerald-500" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Conexão Ativa</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scroll-smooth">
                <AnimatePresence initial={false}>
                    {registros.map((reg) => {
                        const alunoPadrao = alunos?.find(a => a.matricula === reg.aluno_matricula);
                        const ehSaida = reg.tipo_movimentacao === 'SAIDA';

                        return (
                            <motion.div
                                key={reg.id}
                                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                className={`p-4 bg-white border border-slate-100 rounded-xl shadow-sm transition-colors flex items-center justify-between group/card ${
                                    reg.tipo_movimentacao === 'NEGADO' ? 'hover:border-rose-200' : 'hover:border-emerald-200'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover/card:scale-110 ${
                                        reg.tipo_movimentacao === 'NEGADO' 
                                            ? 'bg-rose-50 text-rose-500' 
                                            : ehSaida ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'
                                    }`}>
                                        {reg.tipo_movimentacao === 'NEGADO' ? <AlertTriangle size={20} /> : ehSaida ? <LogOut size={20} /> : <Activity size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black text-slate-800 uppercase leading-none mb-1">
                                            {alunoPadrao?.nome_completo || reg.aluno_nome || 'Acesso Identificado'}
                                        </p>
                                        {reg.tipo_movimentacao !== 'NEGADO' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                    {reg.aluno_matricula} • {reg.turma_nome || alunoPadrao?.turma_id || 'SEM TURMA'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="text-right flex flex-col items-end">
                                    <p className="text-[11px] font-black text-slate-900 leading-none mb-1">
                                        {new Date(reg.timestamp || reg.timestamp_acesso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </p>
                                    <div className="flex gap-1 items-center">
                                        <span className={`text-[7px] font-black px-1 py-0.5 rounded-sm uppercase tracking-tighter ${reg.fonte === 'agente' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {reg.fonte === 'agente' ? '⚡ Local' : '☁ Nuvem'}
                                        </span>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                            reg.tipo_movimentacao === 'NEGADO'
                                                ? 'bg-rose-100 text-rose-700'
                                                : ehSaida ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {reg.tipo_movimentacao}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}

                    {registros.length === 0 && !carregando && (
                        <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4">
                                <User size={32} className="text-slate-300" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando Movimentação</p>
                            <p className="text-[8px] font-bold text-slate-300 uppercase mt-1">Sincronizado com Portaria</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </CartaoConteudo>
    );
}

/**
 * Painel administrativo principal (Dashboard) com métricas e monitoramento.
 */
export default function Painel() {
    const { dados: estatisticasRaw, recarregar: atualizarKPIs } = usarConsulta(
        ['estatisticas-dashboard-online'],
        () => dashboardServico.obterEstatisticas(),
        { refetchInterval: 30000, staleTime: 25000 }
    );

    const { ehCentral } = usarPermissoes();
    const [registrosAoVivo, setRegistrosAoVivo] = useState<any[]>([]);
    const ultimaDataRef = useRef<string | null>(null);

    const [estadoConfirmacao, setEstadoConfirmacao] = useState<{
        aberto: boolean;
        titulo: string;
        mensagem: string;
        aoConfirmar: () => void;
        variante?: 'perigo' | 'padrao';
    }>({
        aberto: false,
        titulo: '',
        mensagem: '',
        aoConfirmar: () => {},
    });

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

        return {
            ...estatisticasRaw,
            totalAlunos: estatisticasRaw.totalAlunos || (estatisticasRaw.alunos?.length || 0),
            historicoPresenca: estatisticasRaw.historicoPresenca || [],
            registrosRecentes: estatisticasRaw.registrosRecentes || [],
            alunos: estatisticasRaw.alunos || []
        };
    }, [estatisticasRaw]);

    // 🚀 ENGINE RADAR: Sincronização em Tempo Real (Feedback Instantâneo)
    useEffect(() => {
        let montado = true;
        let timeoutId: any;

        const sincronizarRadar = async () => {
            try {
                // Se for o primeiro ciclo, inicializa com o que veio no snapshot do dashboard
                if (!ultimaDataRef.current) {
                    const iniciais = estatisticas.registrosRecentes || [];
                    setRegistrosAoVivo(iniciais);
                    
                    if (iniciais.length > 0) {
                        ultimaDataRef.current = iniciais[0].timestamp || iniciais[0].timestamp_acesso;
                    } else {
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        ultimaDataRef.current = hoje.toISOString();
                    }
                }

                const novos = await dashboardServico.buscarRegistrosRecentes(ultimaDataRef.current);
                
                if (montado && novos && novos.length > 0) {
                    const ultimaData = novos[0].timestamp || novos[0].timestamp_acesso;
                    
                    // Só atualiza se houver mudança temporal real
                    if (ultimaDataRef.current !== ultimaData) {
                        ultimaDataRef.current = ultimaData;
                        
                        setRegistrosAoVivo(anterior => {
                            const idsExistentes = new Set(anterior.map(r => r.id));
                            const unicos = novos.filter((n: any) => !idsExistentes.has(n.id));
                            
                            if (unicos.length > 0) {
                                console.log(`[Painel] Radar identificou ${unicos.length} novos acessos. Sincronizando KPIs...`);
                                // Se entrou gente nova, força atualização dos contadores do topo (Presentes, Atrasos, etc)
                                atualizarKPIs();
                            }
                            
                            return [...unicos, ...anterior].slice(0, 20);
                        });
                    }
                }
            } catch (e) {
                // Falhas silenciosas para não interromper a UX do dashboard
            } finally {
                if (montado) timeoutId = setTimeout(sincronizarRadar, 3000); // 3s = Sweet spot entre carga e percepção de tempo real
            }
        };

        sincronizarRadar();

        return () => {
            montado = false;
            clearTimeout(timeoutId);
        };
    }, [atualizarKPIs, estatisticas.registrosRecentes]);

    const historicoCronologico = useMemo(() => 
        [...estatisticas.historicoPresenca].reverse(), 
    [estatisticas.historicoPresenca]);

    const dataLine = {
        labels: historicoCronologico.map(h => h.data),
        datasets: [{
            label: 'Alunos Presentes',
            data: historicoCronologico.map(h => h.total),
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
            titulo="Painel"
            subtitulo="Visão geral do fluxo de acessos e tendências do dia"
            acoes={
                <div className="flex gap-3">
                    {ehCentral && (
                        <button 
                            onClick={async () => {
                                setEstadoConfirmacao({
                                    aberto: true,
                                    titulo: 'Hard Reset Cloud Logs?',
                                    mensagem: '🚨 OPERAÇÃO CRÍTICA: Isso purgará permanentemente TODO o histórico de acessos da nuvem. Esta ação é irreversível e exige autorização administrativa.',
                                    variante: 'perigo',
                                    aoConfirmar: async () => {
                                        setEstadoConfirmacao(anterior => ({ ...anterior, aberto: false }));
                                        try {
                                            await dashboardServico.limparHistorico();
                                            window.location.reload();
                                        } catch (e) {
                                            toast.error('Erro na purga de dados.');
                                        }
                                    }
                                });
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                            <Trash2 size={14} /> Purga de Histórico
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-6">
                {/* --- LINHA DE KPIs LUXURY 2XL --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardMetrica
                        label="Fluxo Estudantil"
                        valor={estatisticas.presentesHoje}
                        subtitulo={`${estatisticas.totalAlunos > 0 ? Math.round((estatisticas.presentesHoje / estatisticas.totalAlunos) * 100) : 0}% da massa crítica`}
                        icone={CheckCircle}
                        tendencia={estatisticas.tendenciaFrequencia}
                        variante="verde"
                    />
                    <CardMetrica
                        label="Alertas de Atraso"
                        valor={estatisticas.atrasosHoje}
                        subtitulo="Anomalias Crônicas"
                        icone={Clock}
                        inverterTendencia
                        variante="laranja"
                    />
                    <CardMetrica
                        label="Saídas Registradas"
                        valor={estatisticas.saidasHoje}
                        subtitulo="Descompressão de Fluxo"
                        icone={LogOut}
                        variante="indigo"
                    />
                    <CardMetrica
                        label="Risco Acadêmico"
                        valor={estatisticas.alunosEmRisco}
                        subtitulo="Déficit de Frequência"
                        icone={AlertTriangle}
                        inverterTendencia
                        variante="roxo"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-10 gap-10 items-start">
                    {/* Gráfico Analítico SaaS de Elite */}
                    <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-8 flex flex-col relative">
                        <div className="mb-10">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Frequência Semanal</h3>
                            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">Tendência de Acessos</h4>
                        </div>

                        <div className="flex-1 w-full relative min-h-[300px]">
                            <Line data={dataLine} options={{
                                maintainAspectRatio: false,
                                responsive: true,
                                plugins: { 
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: '#000',
                                        titleFont: { size: 10, weight: 'bold' },
                                        bodyFont: { size: 11 },
                                        padding: 10,
                                        cornerRadius: 8,
                                        displayColors: false
                                    }
                                },
                                scales: {
                                    y: { 
                                        beginAtZero: true, 
                                        grid: { color: '#f1f5f9' },
                                        border: { display: false },
                                        ticks: { font: { size: 9 }, color: '#94a3b8' }
                                    },
                                    x: { 
                                        grid: { display: false },
                                        ticks: { font: { size: 9 }, color: '#94a3b8' }
                                    }
                                }
                            }} />
                        </div>

                        <div className="mt-10 pt-8 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Massa Crítica</p>
                                <p className="text-lg font-black text-slate-900">{estatisticas.totalAlunos}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Células Escolares</p>
                                <p className="text-lg font-black text-slate-900">{estatisticas.totalTurmas}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Ciclo Médio</p>
                                <p className="text-lg font-black text-slate-900">{estatisticas.permanenciaMedia}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">Rede</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ativo</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AO VIVO Lateral (Elite surveillance Terminal - Modo Claro) */}
                    <div className="lg:col-span-4 h-full">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col relative">
                            <div className="px-8 py-7 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-none mb-1">AO VIVO</h4>
                                        <p className="text-[8px] font-medium text-slate-500 uppercase tracking-tight">Sincronização em tempo real</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar scroll-smooth relative z-10 bg-white">
                                <AnimatePresence initial={false}>
                                    {registrosAoVivo.map((reg) => {
                                        const alunoData = estatisticas.alunos?.find(a => a.matricula === reg.aluno_matricula);
                                        const isSaida = reg.tipo_movimentacao === 'SAIDA';
                                        const isLocal = reg.fonte === 'agente';

                                        return (
                                            <motion.div
                                                key={reg.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                className={`p-5 bg-white border border-slate-100 rounded-xl transition-all duration-300 flex items-center justify-between group/card hover:bg-slate-50 hover:scale-[1.01] hover:border-slate-200 shadow-sm`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                                        reg.tipo_movimentacao === 'NEGADO' 
                                                            ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                                                            : isSaida ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                                                    }`}>
                                                        {reg.tipo_movimentacao === 'NEGADO' ? <AlertTriangle size={24} /> : isSaida ? <LogOut size={24} /> : <Activity size={24} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1.5">
                                                            {alunoData?.nome_completo || reg.aluno_nome || 'ID INDEFINIDO'}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                                                {reg.aluno_matricula} • {reg.turma_nome || alunoData?.turma_id || 'EXTERNO'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="text-right flex flex-col items-end gap-2">
                                                    <p className="text-[11px] font-black text-slate-700 leading-none">
                                                        {new Date(reg.timestamp || reg.timestamp_acesso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <div className="flex gap-1.5 items-center">
                                                        {isLocal && (
                                                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-indigo-600 text-white shadow-sm">
                                                                ⚡ Local
                                                            </span>
                                                        )}
                                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                                            reg.tipo_movimentacao === 'NEGADO'
                                                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                                                : isSaida ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                        }`}>
                                                            {reg.tipo_movimentacao}
                                                        </span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    {registrosAoVivo.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center py-24 opacity-60 text-center">
                                            <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center mb-6 animate-spin-slow">
                                                <Wifi size={32} className="text-slate-300" />
                                            </div>
                                            <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em]">Scanning Flow...</p>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase mt-2 tracking-widest">Aguardando Batidas no Hardware</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {estadoConfirmacao.aberto && (
                <ModalConfirmacao
                    titulo={estadoConfirmacao.titulo}
                    mensagem={estadoConfirmacao.mensagem}
                    aoConfirmar={estadoConfirmacao.aoConfirmar}
                    aoCancelar={() => setEstadoConfirmacao(anterior => ({ ...anterior, aberto: false }))}
                    variante={estadoConfirmacao.variante}
                />
            )}
        </LayoutAdministrativo>
    );
}
