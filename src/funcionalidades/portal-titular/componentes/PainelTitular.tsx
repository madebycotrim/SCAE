/**
 * Dashboard interna do Titular de Dados.
 * Exibe a Timeline (ECA), opções DPO (Baixar JSON e Descadastrar).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalService } from '../servicos/portal.service';
import { usarTenant } from '@tenant/provedorTenant';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Fingerprint,
    ArrowLeft,
    Download,
    BellOff,
    MapPin,
    Clock,
    LogOut,
    CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PainelTitular() {
    const { id: slugEscola } = usarTenant();
    const navegar = useNavigate();

    interface AcessoTimeline {
        tipo_movimentacao: string;
        timestamp_acesso: string;
        [k: string]: unknown;
    }
    interface DadosTitular {
        aluno?: { nome_completo: string; matricula: string; turma_nome?: string };
        acessos?: AcessoTimeline[];
        [k: string]: unknown;
    }
    const [dados, definirDados] = useState<DadosTitular | null>(null);
    const [carregando, definirCarregando] = useState(true);

    useEffect(() => {
        carregarTimeline();
    }, []);

    const carregarTimeline = async () => {
        try {
            const resposta = await portalService.buscarTimeline();
            definirDados(resposta);
        } catch (e) {
            toast.error('Sessão expirada ou inválida.');
            sair();
        } finally {
            definirCarregando(false);
        }
    };

    const sair = () => {
        portalService.sair();
        navegar(`/${slugEscola}/portal-titular`);
    };

    // Ação LGPD Art. 18 (Portabilidade / Acesso)
    const exportarDados = () => {
        if (!dados) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dados, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `lgpd_export_${dados.aluno?.matricula}_sot.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success("Dados exportados com segurança.");
    };

    const desvincularNotificacoes = async () => {
        if (!confirm('Deseja parar de receber alertas PUSH/Web no seu celular?')) return;
        try {
            await portalService.revogarNotificacoes();
            toast.success('Notificações revogadas com sucesso.');
        } catch (e) {
            toast.error('Falha de revogação. Tente mais tarde.');
        }
    };

    if (carregando) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100/50 pb-20">
            {/* Nav Mobile-first */}
            <div className="bg-indigo-600 px-6 py-4 shadow-md sticky top-0 z-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Fingerprint className="text-indigo-200" size={24} />
                    <h1 className="text-white font-bold tracking-tight">Portal DPO / Titular</h1>
                </div>
                <button onClick={sair} className="p-2 bg-indigo-700 hover:bg-indigo-800 rounded-full text-indigo-100 transition">
                    <LogOut size={18} />
                </button>
            </div>

            {/* Cabeçalho do Aluno */}
            <div className="bg-white px-6 py-8 border-b border-slate-200">
                <div className="max-w-xl mx-auto">
                    <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-1">Dependente Vinculado</p>
                    <h2 className="text-2xl font-black text-slate-800 leading-tight">
                        {dados?.aluno?.nome_completo || 'Aluno Anonimizado'}
                    </h2>
                    <div className="flex gap-2 mt-3">
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                            Mat: {dados?.aluno?.matricula}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
                            Turma: {dados?.aluno?.turma_nome || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-xl mx-auto mt-6 px-4 space-y-6">

                {/* Ações LGPD */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={exportarDados}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-indigo-600 hover:bg-slate-50 transition active:scale-95"
                    >
                        <Download size={22} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Exportar (JSON)</span>
                    </button>

                    <button
                        onClick={desvincularNotificacoes}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-rose-500 hover:bg-slate-50 transition active:scale-95"
                    >
                        <BellOff size={22} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Parar Push</span>
                    </button>
                </div>

                {/* Feed (Timeline de Acessos) */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 mt-6 relative">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Clock size={16} className="text-indigo-500" />
                        Histórico Recente de Catraca
                    </h3>

                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">

                        {dados?.acessos?.length === 0 ? (
                            <p className="text-sm text-slate-400 italic text-center py-6">Nenhum evento registrado recentemente.</p>
                        ) : (
                            dados?.acessos?.slice(0, 10).map((acesso, idx: number) => {
                                const horario = format(parseISO(acesso.timestamp_acesso), "dd 'de' MMM, HH:mm", { locale: ptBR });
                                const ehEntrada = acesso.tipo_movimentacao === 'ENTRADA';

                                return (
                                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm bg-slate-100 z-10">
                                            {ehEntrada ?
                                                <ArrowLeft size={12} className="text-emerald-500 -rotate-45" /> :
                                                <ArrowLeft size={12} className="text-rose-500 rotate-[135deg]" />
                                            }
                                        </div>

                                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${ehEntrada ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {acesso.tipo_movimentacao}
                                                </span>
                                            </div>
                                            <span className="text-slate-500 text-xs font-medium">{horario}</span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                <p className="text-center text-[10px] text-slate-400 mt-8 mb-4">
                    Este extrato é restrito aos últimos 100 acessos sincronizados do aluno.
                    O arquivo Exportar (JSON) contém as cópias integrais dos rastros da central.
                </p>

            </div>
        </div>
    )
}

