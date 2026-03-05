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
    ArrowLeft,
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

        // Timeout pequeno apenas para rolar a tela atÃ© o novo elemento caso a lista esteja grande
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
        // ValidaÃ§Ãµes
        for (let i = 0; i < janelas.length; i++) {
            const j = janelas[i];
            if (j.horaInicio >= j.horaFim) {
                toast.error(`A Janela ${i + 1} precisa terminar depois da hora de inÃ­cio.`);
                return;
            }
        }

        // ValidaÃ§Ã£o de sobreposiÃ§Ã£o
        for (let i = 0; i < janelas.length; i++) {
            for (let k = i + 1; k < janelas.length; k++) {
                const j1 = janelas[i];
                const j2 = janelas[k];
                if ((j1.horaInicio < j2.horaFim) && (j1.horaFim > j2.horaInicio)) {
                    toast.error(`SobreposiÃ§Ã£o detectada entre os horÃ¡rios ${i + 1} e ${k + 1}. Ajuste-os para evitar conflitos na portaria.`);
                    return;
                }
            }
        }

        definirSalvando(true);
        try {
            await salvar(janelas);
            toast.success('HorÃ¡rios salvos com sucesso!');
        } catch (e) {
            toast.error('Erro ao salvar horÃ¡rios: ' + (e instanceof Error ? e.message : 'Tente novamente'));
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
            className="shadow-suave"
        >
            Salvar HorÃ¡rios
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Controle de Portaria"
            subtitulo="Configure as janelas automÃ¡ticas de entrada e saÃ­da. Movimentos registrados nestes intervalos sÃ£o classificados pelo sistema."
            acoes={AcoesHeader}
        >
            <div className="space-y-6 pb-16">

                {erro && !usandoCache && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 text-rose-800 shadow-suave">
                        <AlertCircle size={20} className="shrink-0 text-rose-600 mt-1" />
                        <div>
                            <p className="font-bold text-sm uppercase tracking-tight">Problema de comunicaÃ§Ã£o</p>
                            <p className="text-sm opacity-80 mt-1">Houve um erro indesejado ao carregar as configuraÃ§Ãµes. Tente atualizar a pÃ¡gina.</p>
                        </div>
                    </div>
                )}

                {usandoCache && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4 text-amber-800 shadow-suave">
                        <AlertCircle size={20} className="shrink-0 text-amber-600 mt-1" />
                        <div>
                            <p className="font-bold text-sm uppercase tracking-tight">Modo Offline / Sem ConexÃ£o</p>
                            <p className="text-sm opacity-80 mt-1">O servidor pode estar indisponível. Os horários mostrados vêm do cache local e sincronizarão assim que a rede restabelecer.</p>
                        </div>
                    </div>
                )}

                {carregando ? (
                    <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Sincronizando HorÃ¡rios</span>
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-4 max-w-5xl mx-auto">

                        {janelas.length === 0 && (
                            <CartaoConteudo className="text-center py-20 bg-white border-2 border-dashed border-slate-200/60 rounded-3xl group transition-all hover:bg-slate-50/50">
                                <div className="w-20 h-20 bg-indigo-50/80 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-white shadow-suave text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                                    <Clock size={32} />
                                </div>
                                <h4 className="text-lg font-black text-slate-800 mb-2 tracking-tight">Nenhuma Janela de Acesso Exclusiva</h4>
                                <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto font-medium">
                                    Defina os intervalos exatos em que a portaria registrarÃ¡ formalmente a Entrada ou a SaÃ­da dos alunos.
                                </p>
                                <Botao
                                    variante="primario"
                                    tamanho="lg"
                                    icone={Plus}
                                    onClick={adicionarJanela}
                                    className="shadow-suave shadow-indigo-500/20"
                                >
                                    Adicionar Primeiro HorÃ¡rio
                                </Botao>
                            </CartaoConteudo>
                        )}

                        <div className="grid grid-cols-1 gap-6">
                            {janelas.map((janela, indice) => {
                                const isEntrada = janela.tipoAcesso === 'ENTRADA';
                                const corBgCard = isEntrada ? 'bg-[#FFB800]' : 'bg-indigo-600';
                                const corTextoCard = isEntrada ? 'text-amber-950' : 'text-white';

                                return (
                                    <div
                                        key={indice}
                                        className="relative bg-white rounded-[24px] border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-media transition-all duration-300 flex flex-col md:flex-row overflow-hidden"
                                    >
                                        {/* LADO ESQUERDO (Status visual) */}
                                        <div className={`w-full md:w-[280px] shrink-0 flex flex-col justify-center items-center py-8 relative overflow-hidden transition-colors ${corBgCard} ${corTextoCard}`}>

                                            {/* Watermark Arrow */}
                                            <div className={`absolute -left-4 top-1/2 -translate-y-1/2 pointer-events-none ${isEntrada ? 'opacity-[0.08] mix-blend-color-burn' : 'opacity-[0.04]'
                                                }`}>
                                                {isEntrada ? <ArrowRight size={220} strokeWidth={2} /> : <ArrowLeft size={220} strokeWidth={2} />}
                                            </div>

                                            <div className="relative z-10 flex flex-col items-center">
                                                {/* Ãcone no top */}
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm ${isEntrada
                                                    ? 'bg-[#FFC933] text-amber-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] border border-amber-300/40'
                                                    : 'bg-white/20 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] border border-white/20'
                                                    }`}>
                                                    {isEntrada ? <LogIn size={26} strokeWidth={2} /> : <LogOut size={26} strokeWidth={2} />}
                                                </div>

                                                <span className="text-[11px] font-[900] tracking-[0.25em] uppercase opacity-90 mb-2">
                                                    {isEntrada ? 'ENTRADA' : 'SAÃDA'}
                                                </span>

                                                <div className="flex items-center gap-2.5 font-[900] text-[22px] tracking-tight">
                                                    <span>{janela.horaInicio || '--:--'}</span>
                                                    <ArrowRight size={18} className="opacity-40" strokeWidth={3} />
                                                    <span>{janela.horaFim || '--:--'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* LADO DIREITO (ConfiguraÃ§Ãµes) */}
                                        <div className="flex-1 p-6 md:px-8 md:py-7 flex flex-col justify-center bg-white relative">

                                            {/* Header Interno do Lado Direito */}
                                            <div className="flex justify-between items-center mb-6">
                                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                    CONFIGURAÃ‡Ã•ES DA JANELA
                                                </h5>
                                                <button
                                                    onClick={() => removerJanela(indice)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors absolute top-6 right-6 md:static"
                                                    title="Remover horÃ¡rio"
                                                >
                                                    <Trash2 size={18} strokeWidth={2} />
                                                </button>
                                            </div>

                                            {/* Inputs do FormulÃ¡rio */}
                                            <div className="flex flex-col lg:flex-row gap-5 items-end">

                                                {/* IdentificaÃ§Ã£o */}
                                                <div className="flex-1 min-w-[200px] w-full">
                                                    <label className="block text-[10px] font-bold text-slate-400/80 uppercase tracking-widest mb-2.5 ml-1">
                                                        TÃTULO DO HORÃRIO
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={janela.descricao || ''}
                                                        onChange={(e) => atualizarJanela(indice, 'descricao', e.target.value)}
                                                        placeholder="Ex: Turno Matutino"
                                                        className="w-full px-5 py-3.5 bg-white border border-slate-200/80 rounded-[14px] text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-slate-100 focus:border-slate-300 outline-none transition-all placeholder:text-slate-300/80 placeholder:font-semibold shadow-suave hover:border-slate-300"
                                                    />
                                                </div>

                                                {/* Sentido */}
                                                <div className="w-full lg:w-auto shrink-0">
                                                    <label className="block text-[10px] font-bold text-slate-400/80 uppercase tracking-widest mb-2.5 ml-1">
                                                        SENTIDO
                                                    </label>
                                                    <div className="flex flex-row items-center bg-slate-50 p-1.5 rounded-[16px] border border-slate-200/80 w-[150px] shadow-inner h-[52px]">
                                                        <button
                                                            type="button"
                                                            onClick={() => atualizarJanela(indice, 'tipoAcesso', 'ENTRADA')}
                                                            className={`flex-1 flex justify-center items-center h-full text-[11px] font-[900] rounded-[10px] transition-all ${janela.tipoAcesso === 'ENTRADA'
                                                                ? 'bg-white text-slate-800 shadow-suave border border-slate-200/50'
                                                                : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                        >
                                                            ENTRADA
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => atualizarJanela(indice, 'tipoAcesso', 'SAIDA')}
                                                            className={`flex-1 flex justify-center items-center h-full text-[11px] font-[900] rounded-[10px] transition-all ${janela.tipoAcesso === 'SAIDA'
                                                                ? 'bg-white text-slate-800 shadow-suave border border-slate-200/50'
                                                                : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                        >
                                                            SAÃDA
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Abre Ã s e Fecha Ã s */}
                                                <div className="w-full lg:w-auto shrink-0 flex items-center justify-between gap-3">
                                                    <div className="w-[100px]">
                                                        <label className="block text-[10px] font-bold text-slate-400/80 uppercase tracking-widest mb-2.5 ml-1">
                                                            ABRE Ã€S
                                                        </label>
                                                        <input
                                                            type="time"
                                                            value={janela.horaInicio}
                                                            onChange={(e) => atualizarJanela(indice, 'horaInicio', e.target.value)}
                                                            className={`w-full px-3 py-3.5 bg-white border rounded-[14px] text-[15px] font-mono font-[900] outline-none transition-all text-center shadow-suave ${janela.horaInicio >= janela.horaFim
                                                                ? 'border-rose-400 text-rose-600 focus:ring-4 focus:ring-rose-100 ring-1 ring-rose-400'
                                                                : 'border-slate-200/80 text-slate-800 focus:ring-4 focus:ring-slate-100 focus:border-slate-300 hover:border-slate-300'
                                                                }`}
                                                        />
                                                    </div>

                                                    <div className="w-4 h-px bg-slate-200 shrink-0 mt-[28px]"></div>

                                                    <div className="w-[100px]">
                                                        <label className="block text-[10px] font-bold text-slate-400/80 uppercase tracking-widest mb-2.5 ml-1">
                                                            FECHA Ã€S
                                                        </label>
                                                        <input
                                                            type="time"
                                                            value={janela.horaFim}
                                                            onChange={(e) => atualizarJanela(indice, 'horaFim', e.target.value)}
                                                            className={`w-full px-3 py-3.5 bg-white border rounded-[14px] text-[15px] font-mono font-[900] outline-none transition-all text-center shadow-suave ${janela.horaInicio >= janela.horaFim
                                                                ? 'border-rose-400 text-rose-600 focus:ring-4 focus:ring-rose-100 ring-1 ring-rose-400'
                                                                : 'border-slate-200/80 text-slate-800 focus:ring-4 focus:ring-slate-100 focus:border-slate-300 hover:border-slate-300'
                                                                }`}
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
                                className="w-full mt-8 py-5 border-[2px] border-dashed border-slate-200/80 rounded-[20px] text-slate-400/80 text-[11px] font-[900] uppercase tracking-[0.15em] hover:bg-slate-50 hover:text-slate-500 hover:border-slate-300 transition-all flex items-center justify-center gap-3 bg-white shadow-suave"
                            >
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Plus size={14} strokeWidth={3} />
                                </div>
                                ADICIONAR NOVO BLOCO DE HORÃRIO
                            </button>
                        )}

                    </div>
                )}
            </div>
        </LayoutAdministrativo>
    );
}

