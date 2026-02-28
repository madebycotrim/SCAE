/**
 * Tela principal do Motor de EvasÃ£o.
 * Estilo visual baseado em Listas Kanban (To Do -> Doing -> Done).
 * Somente Coordenadores e Admins tÃªm acesso atravÃ©s de rota protegida.
 */
import { useEvasao } from '../hooks/useEvasao';
import { StatusEvasao, AlertaEvasao } from '../types/evasao.tipos';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import {
    AlertTriangle,
    Search,
    Clock,
    CheckCircle2,
    RefreshCw,
    MoreHorizontal,
    PhoneCall,
    UserCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PainelEvasao() {
    const {
        alertas,
        carregando,
        processando,
        atualizarTratativa,
        rodarMotorEvasao
    } = useEvasao();

    // Filtros e Agrupamentos do Kanban
    const pendentes = alertas.filter(a => a.status === 'PENDENTE');
    const emAnalise = alertas.filter(a => a.status === 'EM_ANALISE');
    const resolvidos = alertas.filter(a => a.status === 'RESOLVIDO');

    return (
        <LayoutAdministrativo
            titulo="Alertas de EvasÃ£o"
            subtitulo="Acompanhe alunos com alta taxa de ausÃªncia contÃ­nua."
            acoes={
                <button
                    onClick={rodarMotorEvasao}
                    disabled={processando || carregando}
                    className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
                >
                    <Search size={16} className={processando ? "animate-ping" : ""} />
                    {processando ? "Vistoriando Registros..." : "Processar Motor de Faltas"}
                </button>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

                {/* COLUNA 1: PENDENTES (Novos Alertas CrÃ­ticos) */}
                <ColunaKanban
                    titulo="Pendentes"
                    icone={<AlertTriangle size={18} className="text-rose-500" />}
                    corBorda="border-rose-200"
                    corFundo="bg-rose-50/50"
                    contador={pendentes.length}
                >
                    {pendentes.map(alerta => (
                        <CardAlerta
                            key={alerta.id}
                            alerta={alerta}
                            acaoPrimaria={{
                                label: "Iniciar Tratativa",
                                icon: <PhoneCall size={14} />,
                                color: "bg-amber-100 text-amber-700 hover:bg-amber-200",
                                onClick: () => atualizarTratativa(alerta.id, 'EM_ANALISE')
                            }}
                        />
                    ))}
                    {pendentes.length === 0 && <EmptyState mensagem="Nenhum alerta crÃ­tico pendente." />}
                </ColunaKanban>

                {/* COLUNA 2: EM ANÃLISE (CoordenaÃ§Ã£o ligando pra famÃ­lia) */}
                <ColunaKanban
                    titulo="Em Tratativa"
                    icone={<Clock size={18} className="text-amber-500" />}
                    corBorda="border-amber-200"
                    corFundo="bg-amber-50/50"
                    contador={emAnalise.length}
                >
                    {emAnalise.map(alerta => (
                        <CardAlerta
                            key={alerta.id}
                            alerta={alerta}
                            acaoPrimaria={{
                                label: "Marcar Resolvido",
                                icon: <UserCheck size={14} />,
                                color: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                                onClick: () => atualizarTratativa(alerta.id, 'RESOLVIDO')
                            }}
                            acaoSecundaria={{
                                label: "Reverter",
                                icon: <RefreshCw size={14} />,
                                color: "hover:bg-slate-100 text-slate-500",
                                onClick: () => atualizarTratativa(alerta.id, 'PENDENTE')
                            }}
                        />
                    ))}
                    {emAnalise.length === 0 && <EmptyState mensagem="Nenhuma averiguaÃ§Ã£o ocorrendo agora." />}
                </ColunaKanban>

                {/* COLUNA 3: RESOLVIDOS (HistÃ³rico de sucesso ou desligamento) */}
                <ColunaKanban
                    titulo="Resolvidos Fixados"
                    icone={<CheckCircle2 size={18} className="text-emerald-500" />}
                    corBorda="border-emerald-200"
                    corFundo="bg-emerald-50/50"
                    contador={resolvidos.length}
                >
                    {resolvidos.map(alerta => (
                        <CardAlerta
                            key={alerta.id}
                            alerta={alerta}
                            acaoSecundaria={{
                                label: "Reabrir InvestigaÃ§Ã£o",
                                icon: <RefreshCw size={14} />,
                                color: "hover:bg-slate-100 text-slate-500",
                                onClick: () => atualizarTratativa(alerta.id, 'EM_ANALISE')
                            }}
                        />
                    ))}
                    {resolvidos.length === 0 && <EmptyState mensagem="Caixa de resoluÃ§Ãµes vazia." />}
                </ColunaKanban>

            </div>
        </LayoutAdministrativo>
    )
}

// ----------------------------------------------------
// Subcomponentes visuais locais
// ----------------------------------------------------

interface PropsColunaKanban {
    titulo: string;
    icone: React.ReactNode;
    corBorda: string;
    corFundo: string;
    contador: number;
    children: React.ReactNode;
}

function ColunaKanban({ titulo, icone, corBorda, corFundo, contador, children }: PropsColunaKanban) {
    return (
        <div className={`flex flex-col rounded-2xl border ${corBorda} ${corFundo} p-4 max-h-[75vh] min-h-[50vh]`}>
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                    {icone}
                    <h3 className="font-bold text-slate-700">{titulo}</h3>
                </div>
                <span className="bg-white text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
                    {contador}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {children}
            </div>
        </div>
    )
}

interface AcaoCardAlerta {
    label: string;
    onClick: () => void;
    color: string;
    icon: React.ReactNode;
}

function CardAlerta({ alerta, acaoPrimaria, acaoSecundaria }: { alerta: AlertaEvasao, acaoPrimaria?: AcaoCardAlerta, acaoSecundaria?: AcaoCardAlerta }) {
    const dataAlerta = format(parseISO(alerta.data_criacao), "dd 'de' MMM, HH:mm", { locale: ptBR });

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-slate-800 text-sm">{alerta.aluno_nome || 'Aluno Anonimizado'}</h4>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        {alerta.turma_nome || 'S/ Turma'} â€¢ {alerta.aluno_matricula}
                    </span>
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <p className="text-xs text-slate-600 mt-3 mb-4 leading-relaxed line-clamp-2">
                {alerta.motivo}
            </p>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                <span className="text-[10px] text-slate-400 flex items-center gap-1.5" title="Data da ocorrÃªncia original">
                    <Clock size={12} />
                    {dataAlerta}
                </span>

                <div className="flex gap-2">
                    {acaoSecundaria && (
                        <button
                            onClick={acaoSecundaria.onClick}
                            className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${acaoSecundaria.color}`}
                            title={acaoSecundaria.label}
                        >
                            {acaoSecundaria.icon}
                        </button>
                    )}
                    {acaoPrimaria && (
                        <button
                            onClick={acaoPrimaria.onClick}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 flex-1 ${acaoPrimaria.color}`}
                        >
                            {acaoPrimaria.icon}
                            {acaoPrimaria.label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function EmptyState({ mensagem }: { mensagem: string }) {
    return (
        <div className="flex items-center justify-center h-full p-8 text-center text-sm text-slate-400 italic">
            {mensagem}
        </div>
    )
}
