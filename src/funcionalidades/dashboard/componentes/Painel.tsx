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
const RadarIcon = () => (
    <div className="relative flex items-center justify-center w-5 h-5">
        <div className="absolute w-full h-full bg-emerald-400 rounded-full animate-ping opacity-20" />
        <div className="absolute w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
    </div>
);

/**
 * LiveAccessFeed - Monitor de acessos em tempo real via polling otimizado
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
                // Busca via serviço que já injeta os headers necessários
                const novos = await dashboardServico.buscarRegistrosRecentes(ultimaDataRef.current || undefined);

                if (montado && novos && novos.length > 0) {
                    // Atualiza a referência da última data para o próximo poll
                    // Compatibilidade Híbrida: Nuvem usa 'timestamp', Local usa 'timestamp_acesso'
                    const ultimaData = novos[0].timestamp || novos[0].timestamp_acesso || novos[0].criado_em;
                    
                    if (ultimaDataRef.current !== ultimaData) {
                        ultimaDataRef.current = ultimaData;
                        
                        setRegistros(prev => {
                            // Evita duplicados comparando IDs
                            const idsExistentes = new Set(prev.map(r => r.id));
                            const unicos = novos.filter((n: any) => !idsExistentes.has(n.id));
                            
                            if (unicos.length > 0 && inicializadoRef.current) {
                                aoReceberNovos(); // Notifica o pai para atualizar KPIs (Presentes Hoje, etc)
                            }
                            
                            return [...unicos, ...prev].slice(0, 15);
                        });
                    }
                }
            } catch (erro) {
                console.error('Erro no poll de tempo real:', erro);
            } finally {
                setCarregando(false);
                inicializadoRef.current = true;
                if (montado) timerId = setTimeout(buscarNovos, 4000); // Poll a cada 4s
            }
        };

        buscarNovos();
        return () => {
            montado = false;
            clearTimeout(timerId);
        };
    }, [aoReceberNovos]);

    return (
        <CartaoConteudo className="h-full flex flex-col bg-white border border-slate-200 shadow-suave rounded-2xl overflow-hidden group">
            <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <RadarIcon />
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Live Radar</h4>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight">Monitorando Atividade</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                    <Wifi size={10} className="text-emerald-500" />
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Conexão Ativa</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {registros.map((reg) => {
                        const alunoData = alunos?.find(a => a.matricula === reg.aluno_matricula);
                        const isSaida = reg.tipo_movimentacao === 'SAIDA';

                        return (
                            <motion.div
                                key={reg.id}
                                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-colors flex items-center justify-between group/card"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover/card:scale-110 ${isSaida ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                        {isSaida ? <LogOut size={20} /> : <Activity size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black text-slate-800 uppercase leading-none mb-1">
                                            {alunoData?.nome_completo || reg.aluno_nome || 'Acesso Identificado'}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                {reg.aluno_matricula} • {reg.turma_nome || alunoData?.turma_id || 'SEM TURMA'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-slate-900 leading-none mb-1">
                                        {new Date(reg.timestamp || reg.timestamp_acesso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${isSaida ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {reg.tipo_movimentacao}
                                    </span>
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

export default function Painel() {
    const { dados: estatisticasRaw, recarregar: atualizarKPIs } = usarConsulta(
        ['estatisticas-dashboard-online'],
        () => dashboardServico.obterEstatisticas(),
        { refetchInterval: 30000, staleTime: 25000 }
    );

    const { ehCentral } = usarPermissoes();
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
                    {ehCentral && (
                        <Botao 
                            variante="secundario" 
                            icone={Trash2} 
                            onClick={async () => {
                                setEstadoConfirmacao({
                                    aberto: true,
                                    titulo: 'Limpar Todo Histórico?',
                                    mensagem: '🚨 CUIDADO: Isso apagará permanentemente TODO o histórico de acessos da escola na nuvem. Esta operação é irreversível.',
                                    variante: 'perigo',
                                    aoConfirmar: async () => {
                                        setEstadoConfirmacao(prev => ({ ...prev, aberto: false }));
                                        try {
                                            await dashboardServico.limparHistorico();
                                            window.location.reload();
                                        } catch (e) {
                                            toast.error('Erro ao limpar histórico.');
                                        }
                                    }
                                });
                            }}
                        >
                            Limpar Logs
                        </Botao>
                    )}
                </div>
            }
        >
            <div className="space-y-8 pb-12">
                {/* --- LINHA DE KPIs --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardMetrica
                        label="Presentes Hoje"
                        valor={estatisticas.presentesHoje}
                        subtitulo={`${estatisticas.totalAlunos > 0 ? Math.round((estatisticas.presentesHoje / estatisticas.totalAlunos) * 100) : 0}% da escola`}
                        icone={CheckCircle}
                        bg="bg-emerald-50"
                        text="text-emerald-600"
                        border="border-emerald-100"
                        tendencia={estatisticas.tendenciaFrequencia}
                    />
                    <CardMetrica
                        label="Atrasos Detectados"
                        valor={estatisticas.atrasosHoje}
                        subtitulo="Entradas pós-tolerância"
                        icone={Clock}
                        bg="bg-amber-50"
                        text="text-amber-600"
                        border="border-amber-100"
                        inverterTendencia
                    />
                    <CardMetrica
                        label="Saídas Registradas"
                        valor={estatisticas.saidasHoje}
                        subtitulo="Fluxo total de hoje"
                        icone={LogOut}
                        bg="bg-indigo-50"
                        text="text-indigo-600"
                        border="border-indigo-100"
                    />
                    <CardMetrica
                        label="Risco de Abandono"
                        valor={estatisticas.alunosEmRisco}
                        subtitulo="Ações pedagógicas urgentes"
                        icone={AlertTriangle}
                        bg="bg-rose-50"
                        text="text-rose-600"
                        border="border-rose-100"
                        inverterTendencia
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                        <CartaoConteudo className="p-8 flex flex-col bg-white border border-slate-200 shadow-suave rounded-2xl overflow-hidden min-h-[480px]">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4 border-l-4 border-slate-900 pl-4">
                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Tendência Mensal</h3>
                                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Frequência da Semana</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                                    <TrendingUp size={16} className="text-eletrico" />
                                    <span className="text-[11px] font-black text-slate-600 uppercase">Média Geral</span>
                                </div>
                            </div>

                            <div className="flex-1 w-full relative min-h-[300px]">
                                <Line data={dataLine} options={{
                                    maintainAspectRatio: false,
                                    responsive: true,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                                        x: { grid: { display: false } }
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
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sistema</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Ok</p>
                                    </div>
                                </div>
                            </div>
                        </CartaoConteudo>
                    </div>

                    <div className="lg:col-span-1 h-full min-h-[480px]">
                        <LiveAccessFeed 
                            alunos={estatisticas.alunos} 
                            aoReceberNovos={() => atualizarKPIs()} 
                        />
                    </div>
                </div>
            </div>

            {estadoConfirmacao.aberto && (
                <ModalConfirmacao
                    titulo={estadoConfirmacao.titulo}
                    mensagem={estadoConfirmacao.mensagem}
                    aoConfirmar={estadoConfirmacao.aoConfirmar}
                    aoCancelar={() => setEstadoConfirmacao(prev => ({ ...prev, aberto: false }))}
                    variante={estadoConfirmacao.variante}
                />
            )}
        </LayoutAdministrativo>
    );
}
