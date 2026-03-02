/**
 * FormHorariosAcesso — Formulário administrativo para configurar janelas de horário.
 * A escola define quando é período de ENTRADA e quando é período de SAÃDA.
 * O hook useTipoAcesso usa esses horários para decidir automaticamente.
 *
 * Acessível via painel admin: /:slugEscola/admin/horarios
 */
import { useState, useEffect } from 'react';
import { usarHorariosEscola } from '@funcionalidades/configuracaoEscola';
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
    { valor: 'ENTRADA', label: '🟢 Entrada', cor: 'emerald' },
    { valor: 'SAIDA', label: '🔴 Saída', cor: 'rose' },
];

export default function FormHorariosAcesso() {
    const { id: tenantId } = usarTenant();
    const { horarios, carregando, erro, salvar } = usarHorariosEscola(tenantId);
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
        // Validações
        for (let i = 0; i < janelas.length; i++) {
            const j = janelas[i];
            if (j.horaInicio >= j.horaFim) {
                toast.error(`Janela ${i + 1}: Hora de início deve ser anterior à hora de fim.`);
                return;
            }
        }

        definirSalvando(true);
        try {
            await salvar(janelas);
            toast.success('Horários salvos com sucesso!');
        } catch (e) {
            toast.error('Erro ao salvar horários: ' + (e.message || 'Tente novamente'));
        } finally {
            definirSalvando(false);
        }
    };

    return (
        <LayoutAdministrativo
            titulo="Configuração de Fluxo"
            subtitulo="Parametrização técnica das janelas de acesso da unidade"
            acoes={
                <button
                    onClick={aoSalvar}
                    disabled={salvando}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar Parâmetros
                </button>
            }
        >
            {/* Banner Explicativo */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8 flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-indigo-200 shadow-sm text-indigo-600">
                    <Clock size={24} />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Protocolo de Automação</h3>
                    <h4 className="text-lg font-semibold text-indigo-900 mb-2">Inteligência de Fluxo</h4>
                    <p className="text-indigo-800 text-sm leading-relaxed max-w-3xl">
                        Configure as janelas operacionais de <strong>entrada</strong> e <strong>saída</strong>.
                        O motor de regras do sistema utiliza estes dados para classificar acessos automaticamente,
                        otimizando a telemetria em tempo real.
                    </p>
                </div>
            </div>

            {carregando ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                    <Loader2 size={32} className="animate-spin text-indigo-600" />
                    <span className="text-sm font-medium">Sincronizando Banco de Dados...</span>
                </div>
            ) : (
                <div className="animate-fade-in">
                    {/* Grade de Janelas */}
                    <div className="space-y-4 mb-8">
                        {janelas.length === 0 && (
                            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-400">
                                    <ArrowDownUp size={28} />
                                </div>
                                <h4 className="text-base font-semibold text-slate-800 mb-1">Nenhuma Configuração</h4>
                                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                                    Nenhuma janela de horário foi parametrizada nesta unidade. Adicione fluxos para iniciar o rastreamento.
                                </p>
                                <button
                                    onClick={adicionarJanela}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <Plus size={16} />
                                    Iniciar Primeira Janela
                                </button>
                            </div>
                        )}

                        {janelas.map((janela, indice) => (
                            <div
                                key={indice}
                                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow relative group"
                            >
                                <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6">
                                    {/* Tipo de Janela */}
                                    <div className="w-full lg:w-48">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Status do Fluxo
                                        </label>
                                        <select
                                            value={janela.tipoAcesso}
                                            onChange={(e) => atualizarJanela(indice, 'tipoAcesso', e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-colors"
                                        >
                                            {TIPO_OPCOES.map((op) => (
                                                <option key={op.valor} value={op.valor}>
                                                    {op.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Horários */}
                                    <div className="flex gap-4 w-full lg:w-auto">
                                        <div className="flex-1 lg:w-32">
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Início
                                            </label>
                                            <input
                                                type="time"
                                                value={janela.horaInicio}
                                                onChange={(e) => atualizarJanela(indice, 'horaInicio', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1 lg:w-32">
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                                Término
                                            </label>
                                            <input
                                                type="time"
                                                value={janela.horaFim}
                                                onChange={(e) => atualizarJanela(indice, 'horaFim', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Identificação Técnica */}
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Identificação
                                        </label>
                                        <input
                                            type="text"
                                            value={janela.descricao || ''}
                                            onChange={(e) => atualizarJanela(indice, 'descricao', e.target.value)}
                                            placeholder="Ex: Acesso Matutino"
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-colors placeholder:text-slate-400"
                                        />
                                    </div>

                                    {/* Action Deck */}
                                    <button
                                        onClick={() => removerJanela(indice)}
                                        className="w-10 h-10 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors shrink-0"
                                        title="Remover Registro"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Button */}
                    {janelas.length > 0 && (
                        <button
                            onClick={adicionarJanela}
                            className="w-full py-3 border border-dashed border-slate-300 rounded-xl text-indigo-600 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            Adicionar Nova Janela
                        </button>
                    )}

                    {/* Timeline Analytics */}
                    {janelas.length > 0 && (
                        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-800 mb-6 flex items-center gap-2">
                                <Clock size={16} className="text-slate-500" />
                                Cobertura Diária
                            </h3>

                            <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden p-1">
                                {janelas.map((janela, i) => {
                                    const [hI, mI] = janela.horaInicio.split(':').map(Number);
                                    const [hF, mF] = janela.horaFim.split(':').map(Number);
                                    const inicio = (hI * 60 + mI) / (24 * 60) * 100;
                                    const fim = (hF * 60 + mF) / (24 * 60) * 100;
                                    const largura = Math.max(fim - inicio, 2);

                                    return (
                                        <div
                                            key={i}
                                            className={`absolute top-1 bottom-1 rounded-md flex items-center justify-center text-[10px] font-medium text-white px-2 overflow-hidden shadow-sm ${janela.tipoAcesso === 'ENTRADA' ? 'bg-emerald-500' : 'bg-rose-500'
                                                }`}
                                            style={{ left: `${inicio}%`, width: `${largura}%` }}
                                            title={`${janela.descricao || 'Janela'}: ${janela.horaInicio} - ${janela.horaFim}`}
                                        >
                                            <span className="truncate">
                                                {janela.horaInicio} – {janela.horaFim}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between mt-3 px-1 text-[11px] text-slate-400 font-medium">
                                <span>00:00</span>
                                <span>06:00</span>
                                <span>12:00</span>
                                <span>18:00</span>
                                <span>23:59</span>
                            </div>
                        </div>
                    )}

                    {erro && (
                        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm font-medium">
                            <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
                            <div>
                                <p>Descompasso com o servidor detectado.</p>
                                <p className="text-amber-700/80 font-normal mt-0.5">Utilizando cache persistido localmente até que a sincronização seja restaurada.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </LayoutAdministrativo>
    );
}

