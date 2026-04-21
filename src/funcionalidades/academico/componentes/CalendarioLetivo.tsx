import { useState } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { CardMetrica } from '@/compartilhado/componentes/UI';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { Calendar as CalendarIcon, Plus, Trash2, ShieldAlert, RefreshCw, Info, Layers } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';

interface DiaCalendario {
    data: string;
    escola_id: string;
    descricao: string;
    tipo: 'FERIADO' | 'RECESSO' | 'CONSELHO' | 'OUTROS';
}

export default function CalendarioLetivo() {
    const queryClient = useQueryClient();
    const [novaData, definirNovaData] = useState('');
    const [novaDescricao, definirNovaDescricao] = useState('');
    const [novoTipo, definirNovoTipo] = useState<DiaCalendario['tipo']>('FERIADO');
    const [confirmacao, definirConfirmacao] = useState<{aberto: boolean, acao: () => void, titulo: string, mensagem: string, variante?: 'perigo' | 'padrao'} | null>(null);

    const { data: dias = [], isLoading } = useQuery({
        queryKey: ['calendario'],
        queryFn: () => api.obter<DiaCalendario[]>('/academico/calendario')
    });

    const mutationAdicionar = useMutation({
        mutationFn: (novo: Partial<DiaCalendario>) => api.enviar('/academico/calendario', novo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendario'] });
            definirNovaData('');
            definirNovaDescricao('');
            toast.success('Dia adicionado ao calendário');
        },
        onError: () => toast.error('Falha ao adicionar dia')
    });

    const mutationSincronizar = useMutation({
        mutationFn: () => api.enviar('/academico/calendario?acao=sincronizar_seedf', {}),
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ['calendario'] });
            toast.success(`${res.total} dias sincronizados com o calendário SEEDF`);
        },
        onError: () => toast.error('Falha ao sincronizar calendário')
    });

    const mutationRemover = useMutation({
        mutationFn: (data: string) => api.remover(`/academico/calendario?data=${data}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendario'] });
            toast.success('Dia removido');
        },
        onError: () => toast.error('Falha ao remover dia')
    });

    const aoSalvar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!novaData) return;
        mutationAdicionar.mutate({ data: novaData, descricao: novaDescricao, tipo: novoTipo });
    };

    const aoSincronizar = () => {
        definirConfirmacao({
            aberto: true,
            titulo: 'Sincronizar SEEDF',
            mensagem: 'Deseja importar automaticamente todos os feriados e recessos oficiais da SEEDF para o ano de 2026? Isso não removerá seus registros manuais.',
            acao: () => mutationSincronizar.mutate()
        });
    };

    return (
        <LayoutAdministrativo 
            titulo="Calendário Letivo" 
            subtitulo="Configuração de dias não-letivos e feriados institucionais"
        >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <CardMetrica
                    label="Dias Não-Letivos"
                    valor={dias.length}
                    icone={CalendarIcon}
                    variante="indigo"
                />
                <CardMetrica
                    label="Feriados Oficiais"
                    valor={dias.filter(d => d.tipo === 'FERIADO').length}
                    icone={ShieldAlert}
                    variante="laranja"
                />
                <CardMetrica
                    label="Recessos / Pontes"
                    valor={dias.filter(d => d.tipo === 'RECESSO').length}
                    icone={RefreshCw}
                    variante="azul"
                />
                <CardMetrica
                    label="Conselho / Outros"
                    valor={dias.filter(d => d.tipo === 'CONSELHO' || d.tipo === 'OUTROS').length}
                    icone={Layers}
                    variante="verde"
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Coluna de Adição - Estilo Discreto */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-slate-200 p-8 rounded-2xl sticky top-24 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center border border-slate-700 shadow-lg">
                                <Plus size={18} />
                            </div>
                            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] leading-none">Novo Registro</h2>
                        </div>

                        <form onSubmit={aoSalvar} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Data do Evento</label>
                                <input 
                                    type="date" 
                                    value={novaData}
                                    onChange={e => definirNovaData(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:bg-white outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Descrição Oficial</label>
                                <input 
                                    type="text" 
                                    placeholder="EX: FERIADO LOCAL"
                                    value={novaDescricao}
                                    onChange={e => definirNovaDescricao(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:bg-white outline-none transition-all placeholder:text-slate-200 uppercase"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Natureza do Dia</label>
                                <select 
                                    value={novoTipo}
                                    onChange={e => definirNovoTipo(e.target.value as any)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="FERIADO">Feriado</option>
                                    <option value="RECESSO">Recesso</option>
                                    <option value="CONSELHO">Conselho</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>

                            <button 
                                type="submit"
                                disabled={mutationAdicionar.isPending}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {mutationAdicionar.isPending ? 'Sincronizando...' : 'Publicar Registro'}
                            </button>
                        </form>

                        <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-200/50 flex gap-3 text-slate-400 italic">
                            <Info size={14} className="shrink-0 mt-0.5" />
                            <p className="text-[10px] font-medium leading-relaxed">
                                Dias salvos serão desconsiderados no cálculo de frequência escolar.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lista de Dias - Visual SaaS High-End */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-10 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50">
                            <div>
                                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-2 leading-none">Cronograma Operacional</h3>
                                <div className="flex items-center gap-3 mt-3">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] bg-slate-100 px-3 py-1 rounded-full">Ciclo 2026</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">Sincronia SEEDF Ativa</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <button 
                                    onClick={aoSincronizar}
                                    disabled={mutationSincronizar.isPending}
                                    className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all outline-none active:scale-90 shadow-xl"
                                >
                                    <RefreshCw size={14} className={mutationSincronizar.isPending ? 'animate-spin' : ''} />
                                    Importar Base SEEDF
                                </button>
                                <div className="text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] px-5 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                                    <Layers size={14} className="text-indigo-500" />
                                    {Array.isArray(dias) ? dias.length : 0} Registros
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="p-12 text-center text-slate-400 text-xs font-medium">Carregando dados oficiais...</div>
                        ) : !Array.isArray(dias) || dias.length === 0 ? (
                            <div className="p-24 text-center flex flex-col items-center justify-center">
                                <CalendarIcon size={32} className="text-slate-100 mb-4" />
                                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum evento cadastrado</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-100/50 border-b border-slate-100/50">
                                {dias.sort((a,b) => a.data.localeCompare(b.data)).map(dia => (
                                    <div key={dia.data} className="p-8 flex flex-col hover:bg-white hover:z-10 hover:shadow-2xl transition-all duration-300 group cursor-default">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex flex-col">
                                                <span className="text-[28px] font-black text-slate-900 leading-none tracking-tighter">
                                                    {format(parseISO(dia.data), 'dd')}
                                                </span>
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
                                                    {format(parseISO(dia.data), 'MMMM', { locale: ptBR })}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    definirConfirmacao({
                                                        aberto: true,
                                                        titulo: 'Remover Registro',
                                                        mensagem: `Deseja excluir permanentemente o dia ${format(parseISO(dia.data), 'dd/MM')} do calendário?`,
                                                        variante: 'perigo',
                                                        acao: () => mutationRemover.mutate(dia.data)
                                                    });
                                                }}
                                                className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-all rounded-xl border border-transparent hover:border-rose-100 opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="space-y-4 mt-auto">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-2 h-2 rounded-full shadow-lg ${
                                                    dia.tipo === 'FERIADO' ? 'bg-rose-500 shadow-rose-500/20' :
                                                    dia.tipo === 'RECESSO' ? 'bg-amber-500 shadow-amber-500/20' :
                                                    'bg-indigo-500 shadow-indigo-500/20'
                                                }`} />
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                                    dia.tipo === 'FERIADO' ? 'text-rose-600' :
                                                    dia.tipo === 'RECESSO' ? 'text-amber-600' :
                                                    'text-indigo-600'
                                                }`}>
                                                    {dia.tipo} • {format(parseISO(dia.data), "EEEE", { locale: ptBR })}
                                                </span>
                                            </div>
                                            <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight leading-relaxed group-hover:text-indigo-600 transition-colors">
                                                {dia.descricao || "IDENTIFICAÇÃO PENDENTE"}
                                            </h4>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
            {confirmacao?.aberto && (
                <ModalConfirmacao
                    titulo={confirmacao.titulo}
                    mensagem={confirmacao.mensagem}
                    aoConfirmar={() => {
                        confirmacao.acao();
                        definirConfirmacao(null);
                    }}
                    aoCancelar={() => definirConfirmacao(null)}
                    variante={confirmacao.variante}
                />
            )}
        </LayoutAdministrativo>
    );
}
