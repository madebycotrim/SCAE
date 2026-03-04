import { useState, useEffect } from 'react';
import { usarRegrasHorarios } from '@funcionalidades/configuracao-horarios';
import type { JanelaHorarioAcesso } from '@funcionalidades/configuracao-horarios/types/regrasHorarios.tipos';
import { usarEscola } from '@escola/ProvedorEscola';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, CartaoConteudo } from '@compartilhado/componentes/UI';
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
    { valor: 'ENTRADA', label: '☀️ Entrada', cor: 'emerald' },
    { valor: 'SAIDA', label: '🌙 Saída', cor: 'rose' },
];

export default function FormHorariosAcesso() {
    const { id: idEscola } = usarEscola();
    const { regras, carregando, erro, salvar } = usarRegrasHorarios(idEscola);
    const [janelas, definirJanelas] = useState<JanelaHorarioAcesso[]>([]);
    const [salvando, definirSalvando] = useState(false);

    // Carregar janelas do hook ao montar
    useEffect(() => {
        if (regras.length > 0) {
            definirJanelas(regras);
        }
    }, [regras]);

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
                toast.error(`A Janela ${i + 1} deve ter a hora de início anterior à hora de fim.`);
                return;
            }
        }

        // Validação de sobreposição
        for (let i = 0; i < janelas.length; i++) {
            for (let k = i + 1; k < janelas.length; k++) {
                const j1 = janelas[i];
                const j2 = janelas[k];
                if ((j1.horaInicio < j2.horaFim) && (j1.horaFim > j2.horaInicio)) {
                    toast.error(`A Janela ${i + 1} e a Janela ${k + 1} estão sobrepostas. Ajuste os horários para evitar conflitos no motor de acesso.`);
                    return;
                }
            }
        }

        definirSalvando(true);
        try {
            await salvar(janelas);
            toast.success('Horários salvos com sucesso!');
        } catch (e) {
            toast.error('Erro ao salvar horários: ' + (e instanceof Error ? e.message : 'Tente novamente'));
        } finally {
            definirSalvando(false);
        }
    };

    const AcoesHeader = (
        <Botao
            variante="primario"
            tamanho="lg"
            icone={Save}
            loading={salvando}
            onClick={aoSalvar}
        >
            Salvar Parâmetros
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Regras de Acesso"
            subtitulo="Parametrização técnica das janelas de acesso da unidade"
            acoes={AcoesHeader}
        >
            <div className="space-y-8 pb-12">
                {/* Banner Explicativo */}
                <CartaoConteudo className="bg-indigo-50/50 border-indigo-100 p-8 flex flex-col md:flex-row items-start gap-6 rounded-[2.5rem] shadow-2xl">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 border border-indigo-200 shadow-sm text-indigo-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Protocolo de Operação</h3>
                        <h4 className="text-lg font-bold text-indigo-900 mb-2 uppercase tracking-tight">Inteligência de Fluxo</h4>
                        <p className="text-indigo-800 text-sm leading-relaxed max-w-4xl">
                            Configure as janelas operacionais de <strong>entrada</strong> e <strong>saída</strong>.
                            O motor de regras converte estes dados em telemetria em tempo real, classificando automaticamente as movimentações na portaria.
                        </p>
                    </div>
                </CartaoConteudo>

                {carregando ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                        <Loader2 size={32} className="animate-spin text-indigo-600" />
                        <span className="text-xs font-bold uppercase tracking-widest">Sincronizando Parâmetros...</span>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-4">
                        {janelas.length === 0 && (
                            <CartaoConteudo className="text-center py-16">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 text-slate-400">
                                    <ArrowDownUp size={28} />
                                </div>
                                <h4 className="text-base font-bold text-slate-800 mb-1 uppercase tracking-tight">Vazio Operacional</h4>
                                <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
                                    Nenhuma janela de fluxo foi parametrizada nesta unidade escolar.
                                </p>
                                <Botao
                                    variante="primario"
                                    icone={Plus}
                                    onClick={adicionarJanela}
                                >
                                    Abrir Primeiro Fluxo
                                </Botao>
                            </CartaoConteudo>
                        )}

                        {janelas.map((janela, indice) => (
                            <CartaoConteudo
                                key={indice}
                                className="p-8 hover:shadow-2xl transition-all relative border-l-4 border-l-indigo-500 rounded-[2.5rem] shadow-2xl"
                            >
                                <div className="flex flex-col lg:flex-row items-start lg:items-end gap-6">
                                    {/* Tipo de Janela */}
                                    <div className="w-full lg:w-56">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                            Status do Fluxo
                                        </label>
                                        <select
                                            value={janela.tipoAcesso}
                                            onChange={(e) => atualizarJanela(indice, 'tipoAcesso', e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all cursor-pointer shadow-sm"
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
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                                Início
                                            </label>
                                            <input
                                                type="time"
                                                value={janela.horaInicio}
                                                onChange={(e) => atualizarJanela(indice, 'horaInicio', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="flex-1 lg:w-32">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                                Final
                                            </label>
                                            <input
                                                type="time"
                                                value={janela.horaFim}
                                                onChange={(e) => atualizarJanela(indice, 'horaFim', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Identificação Técnica */}
                                    <div className="flex-1 w-full">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                            Etiqueta de Identificação
                                        </label>
                                        <input
                                            type="text"
                                            value={janela.descricao || ''}
                                            onChange={(e) => atualizarJanela(indice, 'descricao', e.target.value)}
                                            placeholder="Ex: Alunos Matutino"
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                                        />
                                    </div>

                                    <div className="flex justify-end w-full lg:w-auto">
                                        <Botao
                                            variante="ghost"
                                            icone={Trash2}
                                            onClick={() => removerJanela(indice)}
                                            className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent"
                                        />
                                    </div>
                                </div>
                            </CartaoConteudo>
                        ))}

                        {janelas.length > 0 && (
                            <button
                                onClick={adicionarJanela}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-indigo-600 text-xs font-black uppercase tracking-widest hover:bg-indigo-50/50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus size={16} className="group-hover:scale-110 transition-transform" />
                                Adicionar Novo Fluxo Operacional
                            </button>
                        )}

                        {janelas.length > 0 && (
                            <CartaoConteudo className="p-8 rounded-[2.5rem] shadow-2xl bg-white border-slate-200/60">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Clock size={14} className="text-slate-400" />
                                    Visualização de Cobertura Diária
                                </h3>

                                <div className="relative h-14 bg-slate-100 rounded-xl overflow-hidden p-1.5 shadow-inner">
                                    {janelas.map((janela, i) => {
                                        const [hI, mI] = janela.horaInicio.split(':').map(Number);
                                        const [hF, mF] = janela.horaFim.split(':').map(Number);
                                        const inicio = (hI * 60 + mI) / (24 * 60) * 100;
                                        const fim = (hF * 60 + mF) / (24 * 60) * 100;
                                        const largura = Math.max(fim - inicio, 2);

                                        return (
                                            <div
                                                key={i}
                                                className={`absolute top-1.5 bottom-1.5 rounded-lg flex items-center justify-center text-[10px] font-black text-white px-2 overflow-hidden shadow-sm border border-white/20 ${janela.tipoAcesso === 'ENTRADA' ? 'bg-emerald-500' : 'bg-rose-500'
                                                    }`}
                                                style={{ left: `${inicio}%`, width: `${largura}%` }}
                                                title={`${janela.descricao || 'Janela'}: ${janela.horaInicio} - ${janela.horaFim}`}
                                            >
                                                <span className="truncate uppercase tracking-tighter">
                                                    {janela.horaInicio} – {janela.horaFim}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-4 px-1 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                    <span>00:00</span>
                                    <span>06:00</span>
                                    <span>12:00</span>
                                    <span>18:00</span>
                                    <span>23:59</span>
                                </div>
                            </CartaoConteudo>
                        )}

                        {erro && (
                            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4 text-amber-800">
                                <AlertCircle size={20} className="shrink-0 text-amber-600 mt-1" />
                                <div>
                                    <p className="font-bold text-sm uppercase tracking-tight">Desconexão com o Núcleo</p>
                                    <p className="text-sm opacity-80 mt-1">Utilizando regras locais persistidas. A sincronização com o servidor será restaurada automaticamente assim que possível.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </LayoutAdministrativo>
    );
}
