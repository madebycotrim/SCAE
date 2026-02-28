/**
 * FormHorariosAcesso â€” FormulÃ¡rio administrativo para configurar janelas de horÃ¡rio.
 * A escola define quando Ã© perÃ­odo de ENTRADA e quando Ã© perÃ­odo de SAÃDA.
 * O hook useTipoAcesso usa esses horÃ¡rios para decidir automaticamente.
 *
 * AcessÃ­vel via painel admin: /:slugEscola/admin/horarios
 */
import { useState, useEffect } from 'react';
import { useHorariosEscola } from '@funcionalidades/configuracaoEscola';
import type { JanelaHorario } from '@funcionalidades/configuracaoEscola/types/configuracao.tipos';
import { usarTenant } from '@tenant/provedorTenant';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import toast from 'react-hot-toast';
import {
    Plus,
    Trash2,
    Clock,
    Save,
    ArrowDownUp,
    AlertCircle,
    Loader2,
    Sun,
    Moon,
} from 'lucide-react';

const TIPO_OPCOES = [
    { valor: 'ENTRADA', label: 'ðŸŸ¢ Entrada', cor: 'emerald' },
    { valor: 'SAIDA', label: 'ðŸ”´ SaÃ­da', cor: 'rose' },
];

export default function FormHorariosAcesso() {
    const { id: tenantId } = usarTenant();
    const { horarios, carregando, erro, salvar } = useHorariosEscola(tenantId);
    const [janelas, definirJanelas] = useState<JanelaHorario[]>([]);
    const [salvando, definirSalvando] = useState(false);

    // Carregar janelas do hook ao montar
    useEffect(() => {
        if (horarios.length > 0) {
            definirJanelas(horarios);
        }
    }, [horarios]);

    const adicionarJanela = () => {
        definirJanelas([
            ...janelas,
            {
                horaInicio: '07:00',
                horaFim: '08:30',
                tipoAcesso: 'ENTRADA',
                descricao: '',
            },
        ]);
    };

    const removerJanela = (indice: number) => {
        definirJanelas(janelas.filter((_, i) => i !== indice));
    };

    const atualizarJanela = (indice: number, campo: string, valor: string) => {
        const novasJanelas = [...janelas];
        novasJanelas[indice] = { ...novasJanelas[indice], [campo]: valor };
        definirJanelas(novasJanelas);
    };

    const aoSalvar = async () => {
        // ValidaÃ§Ãµes
        for (let i = 0; i < janelas.length; i++) {
            const j = janelas[i];
            if (j.horaInicio >= j.horaFim) {
                toast.error(`Janela ${i + 1}: Hora de inÃ­cio deve ser anterior Ã  hora de fim.`);
                return;
            }
        }

        definirSalvando(true);
        try {
            await salvar(janelas);
            toast.success('HorÃ¡rios salvos com sucesso!');
        } catch (e) {
            toast.error('Erro ao salvar horÃ¡rios: ' + (e.message || 'Tente novamente'));
        } finally {
            definirSalvando(false);
        }
    };

    return (
        <LayoutAdministrativo
            titulo="HorÃ¡rios de Acesso"
            subtitulo="Configure os perÃ­odos de entrada e saÃ­da da escola"
            acoes={
                <button
                    onClick={aoSalvar}
                    disabled={salvando}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                    {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar HorÃ¡rios
                </button>
            }
        >
            {/* ExplicaÃ§Ã£o */}
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-6 mb-8 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <Clock size={24} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 mb-1">Como funciona?</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Configure abaixo os perÃ­odos de <strong className="text-emerald-600">entrada</strong> e{' '}
                            <strong className="text-rose-600">saÃ­da</strong> da escola. O tablet da portaria usarÃ¡
                            esses horÃ¡rios para registrar automaticamente se o aluno estÃ¡ <em>entrando</em> ou{' '}
                            <em>saindo</em>. Fora dos horÃ¡rios configurados, o registro fica como <strong>indefinido</strong>.
                        </p>
                    </div>
                </div>
            </div>

            {carregando ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <Loader2 size={32} className="animate-spin mr-3" />
                    Carregando horÃ¡rios...
                </div>
            ) : (
                <>
                    {/* Grade de Janelas */}
                    <div className="space-y-4 mb-8">
                        {janelas.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                                <ArrowDownUp size={40} className="mx-auto text-slate-300 mb-4" />
                                <h4 className="text-lg font-bold text-slate-500 mb-2">Nenhum horÃ¡rio configurado</h4>
                                <p className="text-sm text-slate-400 mb-6">
                                    Adicione janelas de horÃ¡rio para configurar perÃ­odos de entrada e saÃ­da.
                                </p>
                                <button
                                    onClick={adicionarJanela}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
                                >
                                    <Plus size={16} />
                                    Adicionar Primeira Janela
                                </button>
                            </div>
                        )}

                        {janelas.map((janela, indice) => (
                            <div
                                key={indice}
                                className={`bg-white rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${janela.tipoAcesso === 'ENTRADA'
                                    ? 'border-emerald-100 hover:border-emerald-200'
                                    : 'border-rose-100 hover:border-rose-200'
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                    {/* NÃºmero da janela */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${janela.tipoAcesso === 'ENTRADA'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-rose-50 text-rose-600'
                                        }`}>
                                        {janela.tipoAcesso === 'ENTRADA' ? <Sun size={20} /> : <Moon size={20} />}
                                    </div>

                                    {/* Tipo */}
                                    <div className="w-full md:w-48">
                                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                            Tipo
                                        </label>
                                        <select
                                            value={janela.tipoAcesso}
                                            onChange={(e) => atualizarJanela(indice, 'tipoAcesso', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none"
                                        >
                                            {TIPO_OPCOES.map((op) => (
                                                <option key={op.valor} value={op.valor}>
                                                    {op.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Hora InÃ­cio */}
                                    <div className="w-full md:w-40">
                                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                            InÃ­cio
                                        </label>
                                        <input
                                            type="time"
                                            value={janela.horaInicio}
                                            onChange={(e) => atualizarJanela(indice, 'horaInicio', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none"
                                        />
                                    </div>

                                    {/* Hora Fim */}
                                    <div className="w-full md:w-40">
                                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                            Fim
                                        </label>
                                        <input
                                            type="time"
                                            value={janela.horaFim}
                                            onChange={(e) => atualizarJanela(indice, 'horaFim', e.target.value)}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none"
                                        />
                                    </div>

                                    {/* DescriÃ§Ã£o */}
                                    <div className="flex-1 w-full md:w-auto">
                                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                            DescriÃ§Ã£o (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={janela.descricao || ''}
                                            onChange={(e) => atualizarJanela(indice, 'descricao', e.target.value)}
                                            placeholder="Ex: Entrada matutino"
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none"
                                        />
                                    </div>

                                    {/* Remover */}
                                    <button
                                        onClick={() => removerJanela(indice)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                                        title="Remover janela"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* BotÃ£o adicionar */}
                    {janelas.length > 0 && (
                        <button
                            onClick={adicionarJanela}
                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                        >
                            <Plus size={16} />
                            Adicionar Janela de HorÃ¡rio
                        </button>
                    )}

                    {/* Preview visual */}
                    {janelas.length > 0 && (
                        <div className="mt-10">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                                Linha do Tempo â€” VisualizaÃ§Ã£o
                            </h3>
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <div className="relative h-12 bg-slate-100 rounded-full overflow-hidden">
                                    {janelas.map((janela, i) => {
                                        const [hI, mI] = janela.horaInicio.split(':').map(Number);
                                        const [hF, mF] = janela.horaFim.split(':').map(Number);
                                        const inicio = (hI * 60 + mI) / (24 * 60) * 100;
                                        const fim = (hF * 60 + mF) / (24 * 60) * 100;
                                        const largura = fim - inicio;

                                        return (
                                            <div
                                                key={i}
                                                className={`absolute top-0 h-full flex items-center justify-center text-[10px] font-bold text-white px-1 ${janela.tipoAcesso === 'ENTRADA'
                                                    ? 'bg-emerald-500'
                                                    : 'bg-rose-500'
                                                    }`}
                                                style={{ left: `${inicio}%`, width: `${largura}%` }}
                                                title={`${janela.horaInicio} - ${janela.horaFim}`}
                                            >
                                                <span className="truncate">
                                                    {janela.horaInicio}â€“{janela.horaFim}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-mono">
                                    <span>00:00</span>
                                    <span>06:00</span>
                                    <span>12:00</span>
                                    <span>18:00</span>
                                    <span>23:59</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {erro && (
                        <div className="mt-6 flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm">
                            <AlertCircle size={16} />
                            NÃ£o foi possÃ­vel carregar os horÃ¡rios do servidor. Mostrando janelas padrÃ£o.
                        </div>
                    )}
                </>
            )}
        </LayoutAdministrativo>
    );
}
