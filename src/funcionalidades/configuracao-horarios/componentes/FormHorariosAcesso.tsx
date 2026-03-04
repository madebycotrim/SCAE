import { useState, useEffect } from 'react';
import { usarRegrasHorarios } from '@funcionalidades/configuracao-horarios';
import type { JanelaHorarioAcesso } from '@funcionalidades/configuracao-horarios/types/regrasHorarios.tipos';
import { usarEscola } from '@escola/ProvedorEscola';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { Botao, CartaoConteudo } from '@compartilhado/componentes/UI';
import toast from 'react-hot-toast';
import {
    Plus,
    Trash2,
    Clock,
    Save,
    AlertCircle,
    Loader2,
    LogIn,
    LogOut,
    ArrowRight,
} from 'lucide-react';

export default function FormHorariosAcesso() {
    const { id: idEscola } = usarEscola();
    const { regras, carregando, erro, salvar, usandoCache } = usarRegrasHorarios(idEscola);
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

        // Timeout pequeno apenas para rolar a tela até o novo elemento caso a lista esteja grande
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
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
                toast.error(`A Janela ${i + 1} precisa terminar depois da hora de início.`);
                return;
            }
        }

        // Validação de sobreposição
        for (let i = 0; i < janelas.length; i++) {
            for (let k = i + 1; k < janelas.length; k++) {
                const j1 = janelas[i];
                const j2 = janelas[k];
                if ((j1.horaInicio < j2.horaFim) && (j1.horaFim > j2.horaInicio)) {
                    toast.error(`Sobreposição detectada entre os horários ${i + 1} e ${k + 1}. Ajuste-os para evitar conflitos na portaria.`);
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
            className="shadow-sm"
        >
            Salvar Horários
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Controle de Portaria"
            subtitulo="Configure as janelas automáticas de entrada e saída. Movimentos registrados nestes intervalos são classificados pelo sistema."
            acoes={AcoesHeader}
        >
            <div className="space-y-6 pb-16">

                {erro && !usandoCache && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 text-rose-800 shadow-sm">
                        <AlertCircle size={20} className="shrink-0 text-rose-600 mt-1" />
                        <div>
                            <p className="font-bold text-sm uppercase tracking-tight">Problema de comunicação</p>
                            <p className="text-sm opacity-80 mt-1">Houve um erro indesejado ao carregar as configurações. Tente atualizar a página.</p>
                        </div>
                    </div>
                )}

                {usandoCache && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 text-amber-800 shadow-sm">
                        <AlertCircle size={20} className="shrink-0 text-amber-600 mt-1" />
                        <div>
                            <p className="font-bold text-sm uppercase tracking-tight">Modo Offline / Sem Conexão</p>
                            <p className="text-sm opacity-80 mt-1">O servidor pode estar indisponível. Os horários mostrados vêm do cache local e sincronizarão assim que a rede restabelecer.</p>
                        </div>
                    </div>
                )}

                {carregando ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sincronizando Horários</span>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">

                        {janelas.length === 0 && (
                            <CartaoConteudo className="text-center py-20 bg-white border-2 border-dashed border-slate-200/60 rounded-3xl group transition-all hover:bg-slate-50/50">
                                <div className="w-20 h-20 bg-indigo-50/80 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-white shadow-sm text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                                    <Clock size={32} />
                                </div>
                                <h4 className="text-lg font-black text-slate-800 mb-2 tracking-tight">Nenhuma Janela de Acesso Exclusiva</h4>
                                <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto font-medium">
                                    Defina os intervalos exatos em que a portaria registrará formalmente a Entrada ou a Saída dos alunos.
                                </p>
                                <Botao
                                    variante="primario"
                                    tamanho="lg"
                                    icone={Plus}
                                    onClick={adicionarJanela}
                                    className="shadow-sm shadow-indigo-500/20"
                                >
                                    Adicionar Primeiro Horário
                                </Botao>
                            </CartaoConteudo>
                        )}

                        <div className="grid grid-cols-1 gap-5">
                            {janelas.map((janela, indice) => {
                                const isEntrada = janela.tipoAcesso === 'ENTRADA';

                                return (
                                    <div
                                        key={indice}
                                        className="relative bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col md:flex-row"
                                    >
                                        {/* Bloco Lateral de Status (Visual do Cartão) */}
                                        <div className={`p-6 md:w-64 shrink-0 flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden transition-colors ${isEntrada
                                                ? 'bg-amber-400 text-amber-950'
                                                : 'bg-indigo-600 text-white'
                                            }`}>
                                            {/* Watermark do Ícone */}
                                            <div className="absolute -left-4 -bottom-4 opacity-10 pointer-events-none">
                                                {isEntrada ? <LogIn size={100} strokeWidth={1.5} /> : <LogOut size={100} strokeWidth={1.5} />}
                                            </div>

                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-inner shadow-black/10 backdrop-blur-sm ${isEntrada ? 'bg-white/20' : 'bg-white/10'
                                                    }`}>
                                                    {isEntrada ? <LogIn size={24} /> : <LogOut size={24} />}
                                                </div>
                                                <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-90 mb-1">
                                                    {isEntrada ? 'Entrada' : 'Saída'}
                                                </span>
                                                <div className="flex items-center gap-2 font-mono font-black text-xl tracking-tight">
                                                    <span>{janela.horaInicio || '--:--'}</span>
                                                    <ArrowRight size={14} className="opacity-50" />
                                                    <span>{janela.horaFim || '--:--'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bloco de Interação/Inputs */}
                                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center bg-slate-50/30">

                                            <div className="flex justify-between items-start mb-6">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    Configurações da Janela
                                                </h5>

                                                <button
                                                    onClick={() => removerJanela(indice)}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                    title="Remover horário"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">

                                                {/* Label / Descrição */}
                                                <div className="sm:col-span-12 lg:col-span-5">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                                        Identificação
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={janela.descricao || ''}
                                                        onChange={(e) => atualizarJanela(indice, 'descricao', e.target.value)}
                                                        placeholder="Ex: Turno Matutino"
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300 placeholder:font-medium shadow-sm"
                                                    />
                                                </div>

                                                {/* Seletor Entrada/Saída Minimal */}
                                                <div className="sm:col-span-6 lg:col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                                        Sentido
                                                    </label>
                                                    <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-inner h-[46px]">
                                                        <button
                                                            type="button"
                                                            onClick={() => atualizarJanela(indice, 'tipoAcesso', 'ENTRADA')}
                                                            className={`flex-1 flex items-center justify-center text-xs font-bold rounded-lg transition-all ${janela.tipoAcesso === 'ENTRADA'
                                                                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
                                                                    : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                        >
                                                            IN
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => atualizarJanela(indice, 'tipoAcesso', 'SAIDA')}
                                                            className={`flex-1 flex items-center justify-center text-xs font-bold rounded-lg transition-all ${janela.tipoAcesso === 'SAIDA'
                                                                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50'
                                                                    : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                        >
                                                            OUT
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Início / Fim Inputs */}
                                                <div className="sm:col-span-6 lg:col-span-4 flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                                            Abre às
                                                        </label>
                                                        <input
                                                            type="time"
                                                            value={janela.horaInicio}
                                                            onChange={(e) => atualizarJanela(indice, 'horaInicio', e.target.value)}
                                                            className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all shadow-sm text-center"
                                                        />
                                                    </div>
                                                    <div className="w-4 h-px bg-slate-300 shrink-0 mt-5"></div>
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
                                                            Fecha às
                                                        </label>
                                                        <input
                                                            type="time"
                                                            value={janela.horaFim}
                                                            onChange={(e) => atualizarJanela(indice, 'horaFim', e.target.value)}
                                                            className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all shadow-sm text-center"
                                                        />
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {janelas.length > 0 && (
                            <button
                                onClick={adicionarJanela}
                                className="w-full mt-6 py-6 border-2 border-dashed border-slate-200/80 rounded-3xl text-slate-400 text-[11px] font-black uppercase tracking-[0.1em] hover:bg-slate-50 hover:text-indigo-500 hover:border-indigo-200 transition-all flex items-center justify-center gap-3 group shadow-sm bg-white/50"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-300">
                                    <Plus size={16} />
                                </div>
                                Adicionar Novo Bloco de Horário
                            </button>
                        )}

                    </div>
                )}
            </div>
        </LayoutAdministrativo>
    );
}
