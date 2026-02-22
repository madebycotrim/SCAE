import { useState, useEffect } from 'react';
import { useAutenticacao } from '../contexts/ContextoAutenticacao';
import LayoutAdministrativo from '../componentes/LayoutAdministrativo';
import { bancoLocal } from '../servicos/bancoLocal';
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

const CardEstatistica = ({ titulo, valor, subtitulo, icone: Icone, cor, tendencia, inverterTendencia }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-8 opacity-[0.03] transform translate-x-1/4 -translate-y-1/4`}>
            <Icone size={120} />
        </div>

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3.5 rounded-2xl bg-${cor}-50 text-${cor}-600 bg-opacity-60 ring-1 ring-${cor}-100 shadow-sm`}>
                <Icone size={24} />
            </div>
            {tendencia !== undefined && (
                <div className={`
                    flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full 
                    ${(inverterTendencia ? tendencia < 0 : tendencia > 0)
                        ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                        : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'}
                `}>
                    {tendencia > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {Math.abs(tendencia)}%
                </div>
            )}
        </div>
        <div className="relative z-10">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{titulo}</h3>
            <p className="text-3xl font-black text-slate-800 tracking-tight mb-2">{valor}</p>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full bg-${cor}-400`}></span>
                {subtitulo}
            </p>
        </div>
    </div>
);

const LiveAccessFeed = ({ registros, alunos }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Activity size={16} className="text-indigo-500" />
                    Feed em Tempo Real
                </h3>
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                {registros.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                        <p className="text-slate-400 text-sm">Nenhuma atividade recente.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {registros.slice(0, 15).map((reg) => {
                            const aluno = alunos.find(a => a.matricula === reg.aluno_matricula);
                            const isEntrada = reg.tipo_movimentacao === 'ENTRADA';
                            return (
                                <div key={reg.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center gap-3 animate-slide-in-right">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isEntrada ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                        {isEntrada ? <LogIn size={14} /> : <LogOut size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{aluno?.nome_completo || 'Desconhecido'}</p>
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                            {reg.aluno_matricula} • {aluno?.turma_id || '-'}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {format(parseISO(reg.timestamp), 'HH:mm')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};


export default function Painel() {
    const { usuarioAtual } = useAutenticacao();
    const [estatisticas, definirEstatisticas] = useState({
        totalAlunos: 0,
        presentesHoje: 0,
        atrasosHoje: 0,
        saidasHoje: 0,
        alunosRisco: [],
        historicoPresenca: [],
        registrosRecentes: [],
        pendenciasSync: 0,
        alunos: []
    });

    const [carregando, definirCarregando] = useState(true);

    const calcularEstatisticas = (dados) => {
        const { alunos, registros, pendencias } = dados;
        const hojeStr = format(new Date(), 'yyyy-MM-dd');

        // Filtrar registros de hoje
        const registrosHoje = registros.filter(r => r.timestamp.startsWith(hojeStr));

        // Entradas Únicas
        const entradasHoje = new Set(
            registrosHoje.filter(r => r.tipo_movimentacao === 'ENTRADA').map(r => r.aluno_matricula)
        ).size;

        // Saídas
        const saidasHoje = registrosHoje.filter(r => r.tipo_movimentacao === 'SAIDA').length;

        // Atrasos (Simplificado: Entradas após 07:15 ou 13:15)
        // Isso poderia ser mais robusto com base no turno do aluno
        let atrasos = 0;
        registrosHoje.forEach(r => {
            if (r.tipo_movimentacao === 'ENTRADA') {
                const hora = parseInt(r.timestamp.substring(11, 13));
                const min = parseInt(r.timestamp.substring(14, 16));
                const minutosDia = hora * 60 + min;
                // Exemplo: 7:15 = 435 min. Se > 435 e < 12:00, atraso matutino.
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

        // Alunos em Risco (Mock/Simplificado para visualização)
        // Em produção, isso viria de uma análise mais profunda
        const alunosRisco = []; // Implementar lógica real se necessário

        definirEstatisticas({
            totalAlunos: alunos.length,
            presentesHoje: entradasHoje,
            atrasosHoje: atrasos,
            saidasHoje,
            alunosRisco,
            historicoPresenca: historico,
            registrosRecentes: registros.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50),
            pendenciasSync: pendencias || 0,
            alunos: alunos // Persist full list for lookup
        });
    };

    const carregarDados = async () => {
        try {
            const dados = await bancoLocal.obterDadosDashboard();
            // Simular contagem de pendências (se não vier da função)
            // Na prática, bancoLocal deveria retornar isso ou usamos count direto
            // Vamos assumir que dados.logs ou similar possa indicar algo, ou count em registros não sincronizados
            // Para demo:
            const banco = await bancoLocal.iniciarBanco();
            const pendentes = await banco.countFromIndex('registros_acesso', 'sincronizado', 0);

            calcularEstatisticas({ ...dados, pendencias: pendentes });
        } catch (erro) {
            console.error("Erro ao carregar dashboard:", erro);
        } finally {
            definirCarregando(false);
        }
    };

    useEffect(() => {
        carregarDados();
        const interval = setInterval(carregarDados, 15000); // Poll a cada 15s

        return () => clearInterval(interval);
    }, []);

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
        <LayoutAdministrativo titulo="Centro de Comando" subtitulo="Monitoramento Estratégico em Tempo Real">
            <div className="space-y-6 pb-10 animate-fade-in">

                {/* Top Row: KPIs importantes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

                {/* Main Content Grid: 3 Columns (2 for content, 1 for sidebar) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column (2/3) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Chart Section */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Fluxo de Frequência</h3>
                                    <p className="text-sm text-slate-500">Comparativo dos últimos 7 dias</p>
                                </div>
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                            <div className="h-64">
                                <Line data={dataLine} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
                            </div>
                        </div>



                    </div>

                    {/* Right Column (1/3) - Sidebar like */}
                    <div className="space-y-6 flex flex-col h-full">

                        {/* Live Feed - Takes most height */}
                        <div className="flex-1 min-h-[400px]">
                            <LiveAccessFeed registros={estatisticas.registrosRecentes} alunos={estatisticas.alunos} />
                        </div>



                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
