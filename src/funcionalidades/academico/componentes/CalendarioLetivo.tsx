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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <CardMetrica
                    label="Dias Não-Letivos"
                    valor={dias.length}
                    icone={CalendarIcon}
                    bg="bg-indigo-50"
                    text="text-indigo-600"
                    border="border-indigo-100"
                />
                <CardMetrica
                    label="Feriados Oficiais"
                    valor={dias.filter(d => d.tipo === 'FERIADO').length}
                    icone={ShieldAlert}
                    bg="bg-rose-50"
                    text="text-rose-600"
                    border="border-rose-100"
                />
                <CardMetrica
                    label="Recessos / Pontes"
                    valor={dias.filter(d => d.tipo === 'RECESSO').length}
                    icone={RefreshCw}
                    bg="bg-amber-50"
                    text="text-amber-600"
                    border="border-amber-100"
                />
                <CardMetrica
                    label="Conselho / Outros"
                    valor={dias.filter(d => d.tipo === 'CONSELHO' || d.tipo === 'OUTROS').length}
                    icone={Layers}
                    bg="bg-emerald-50"
                    text="text-emerald-600"
                    border="border-emerald-100"
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Coluna de Adição - Estilo Discreto */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 sticky top-24 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                                <Plus size={16} />
                            </div>
                            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest leading-none mt-0.5">Novo Registro</h2>
                        </div>

                        <form onSubmit={aoSalvar} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data</label>
                                <input 
                                    type="date" 
                                    value={novaData}
                                    onChange={e => definirNovaData(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-slate-300 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Feriado Local"
                                    value={novaDescricao}
                                    onChange={e => definirNovaDescricao(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-slate-300 outline-none transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tipo de Evento</label>
                                <select 
                                    value={novoTipo}
                                    onChange={e => definirNovoTipo(e.target.value as any)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-slate-300 outline-none transition-all appearance-none cursor-pointer"
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
                                className="w-full py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-slate-900 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {mutationAdicionar.isPending ? 'Processando...' : 'Adicionar Dia'}
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

                {/* Lista de Dias - Visual Limpo */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 tracking-tight">Cronograma de Dias Não-Letivos</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Ano Letivo 2026</span>
                                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Base SEEDF Atualizada</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={aoSincronizar}
                                    disabled={mutationSincronizar.isPending}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[9px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all outline-none active:scale-90 shadow-sm"
                                >
                                    <RefreshCw size={12} className={mutationSincronizar.isPending ? 'animate-spin' : ''} />
                                    Sincronizar Base
                                </button>
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-2xl border border-slate-100">
                                    {Array.isArray(dias) ? dias.length : 0} Dias
                                </span>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-100 border-b border-slate-100">
                                {dias.sort((a,b) => a.data.localeCompare(b.data)).map(dia => (
                                    <div key={dia.data} className="p-5 flex flex-col hover:bg-slate-50/50 transition-colors group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col">
                                                <span className="text-[16px] font-black text-slate-800 leading-none">
                                                    {format(parseISO(dia.data), 'dd')}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {format(parseISO(dia.data), 'MMMM', { locale: ptBR })}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    definirConfirmacao({
                                                        aberto: true,
                                                        titulo: 'Remover Dia',
                                                        mensagem: 'Excluir registro do calendário?',
                                                        variante: 'perigo',
                                                        acao: () => mutationRemover.mutate(dia.data)
                                                    });
                                                }}
                                                className="p-1.5 text-slate-200 hover:text-rose-500 transition-all rounded-2xl"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="space-y-1 mt-auto">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-1 h-1 rounded-full ${
                                                    dia.tipo === 'FERIADO' ? 'bg-rose-400' :
                                                    dia.tipo === 'RECESSO' ? 'bg-amber-400' :
                                                    'bg-slate-400'
                                                }`} />
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {dia.tipo} • {format(parseISO(dia.data), "EEE", { locale: ptBR })}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-slate-700 text-[11px] truncate uppercase tracking-tight">
                                                {dia.descricao || "Evento Sem Descrição"}
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
