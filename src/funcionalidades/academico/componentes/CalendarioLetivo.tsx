import { useState } from 'react';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/compartilhado/servicos/api';
import { Calendar as CalendarIcon, Plus, Trash2, ShieldAlert, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

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
        if (confirm('Deseja importar automaticamente todos os feriados e recessos oficiais da SEEDF para o ano de 2026? Isso não removerá seus registros manuais.')) {
            mutationSincronizar.mutate();
        }
    };

    return (
        <LayoutAdministrativo 
            titulo="Calendário Letivo" 
            subtitulo="Dias não-letivos para cálculo de evasão"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Coluna de Adição */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Plus size={20} />
                            </div>
                            <h2 className="font-black text-slate-800 uppercase tracking-tight">Novo Dia Não-Letivo</h2>
                        </div>

                        <form onSubmit={aoSalvar} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</label>
                                <input 
                                    type="date" 
                                    value={novaData}
                                    onChange={e => definirNovaData(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descrição</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Feriado Nacional de Tiradentes"
                                    value={novaDescricao}
                                    onChange={e => definirNovaDescricao(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</label>
                                <select 
                                    value={novoTipo}
                                    onChange={e => definirNovoTipo(e.target.value as any)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none"
                                >
                                    <option value="FERIADO">Feriado</option>
                                    <option value="RECESSO">Recesso</option>
                                    <option value="CONSELHO">Conselho de Classe</option>
                                    <option value="OUTROS">Outros</option>
                                </select>
                            </div>

                            <button 
                                type="submit"
                                disabled={mutationAdicionar.isPending}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
                            >
                                {mutationAdicionar.isPending ? 'Salvando...' : 'Adicionar ao Calendário'}
                            </button>
                        </form>

                        <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-700">
                            <ShieldAlert size={20} className="shrink-0" />
                            <p className="text-[11px] font-bold leading-relaxed">
                                Dias salvos aqui serão <span className="underline">ignorados</span> pelo motor de detecção de evasão. Fins de semana já são ignorados automaticamente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Lista de Dias */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight">Dias Não-Letivos Configurados</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ano Letivo 2026</p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={aoSincronizar}
                                    disabled={mutationSincronizar.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all outline-none active:scale-90 border border-indigo-100 shadow-sm"
                                >
                                    <RefreshCw size={12} className={mutationSincronizar.isPending ? 'animate-spin' : ''} />
                                    {mutationSincronizar.isPending ? 'Sincronizando...' : 'Sincronizar SEEDF'}
                                </button>
                                <span className="bg-white text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm">
                                    {Array.isArray(dias) ? dias.length : 0} registros
                                </span>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="p-12 text-center text-slate-400">Carregando calendário...</div>
                        ) : !Array.isArray(dias) || dias.length === 0 ? (
                            <div className="p-20 text-center flex flex-col items-center">
                                <CalendarIcon size={48} className="text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold">Nenhum feriado ou recesso cadastrado ainda.</p>
                                <p className="text-[11px] text-slate-300 mt-1 uppercase tracking-widest">O motor usará apenas os dias úteis padrão.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {dias.map(dia => (
                                    <div key={dia.data} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">
                                                    {format(parseISO(dia.data), 'MMM', { locale: ptBR })}
                                                </span>
                                                <span className="text-2xl font-black text-slate-800 leading-none">
                                                    {format(parseISO(dia.data), 'dd')}
                                                </span>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                                        dia.tipo === 'FERIADO' ? 'bg-rose-100 text-rose-600' :
                                                        dia.tipo === 'RECESSO' ? 'bg-amber-100 text-amber-600' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {dia.tipo}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-slate-400">
                                                        {format(parseISO(dia.data), "EEEE", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">
                                                    {dia.descricao || "Sem descrição"}
                                                </h4>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                if (confirm('Remover este dia do calendário?')) {
                                                    mutationRemover.mutate(dia.data);
                                                }
                                            }}
                                            className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </LayoutAdministrativo>
    );
}
