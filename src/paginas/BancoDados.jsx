import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutenticacao } from '../contexts/ContextoAutenticacao';
import LayoutAdministrativo from '../componentes/LayoutAdministrativo';
import { bancoLocal } from '../servicos/bancoLocal';
import {
    Database,
    Table,
    RefreshCw,
    Search,
    Trash2,
    AlertTriangle,
    HardDrive
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BancoDados() {
    const [lojas, definirLojas] = useState([]);
    const [lojaSelecionada, definirLojaSelecionada] = useState('');
    const [dados, definirDados] = useState([]);
    const [carregando, definirCarregando] = useState(false);
    const [termoBusca, definirTermoBusca] = useState('');
    const { usuarioAtual } = useAutenticacao();
    const navegar = useNavigate();

    useEffect(() => {
        if (usuarioAtual && usuarioAtual.email !== 'madebycotrim@gmail.com') {
            toast.error('Acesso negado.');
            navegar('/painel');
        }
    }, [usuarioAtual, navegar]);

    useEffect(() => {
        carregarLojas();
    }, []);

    useEffect(() => {
        if (lojaSelecionada) {
            carregarDadosLoja(lojaSelecionada);
        } else {
            definirDados([]);
        }
    }, [lojaSelecionada]);

    const carregarLojas = async () => {
        try {
            const db = await bancoLocal.iniciarBanco();
            const nomesLojas = Array.from(db.objectStoreNames);
            definirLojas(nomesLojas);
            if (nomesLojas.length > 0 && !lojaSelecionada) {
                definirLojaSelecionada(nomesLojas[0]);
            }
        } catch (erro) {
            console.error('Erro ao carregar lojas:', erro);
            toast.error('Erro ao acessar banco de dados.');
        }
    };

    const carregarDadosLoja = async (nomeLoja) => {
        definirCarregando(true);
        try {
            const db = await bancoLocal.iniciarBanco();
            const registros = await db.getAll(nomeLoja);
            definirDados(registros);
        } catch (erro) {
            console.error(`Erro ao carregar dados da loja ${nomeLoja}:`, erro);
            toast.error(`Erro ao carregar ${nomeLoja}.`);
        } finally {
            definirCarregando(false);
        }
    };

    const limparLoja = async () => {
        if (!lojaSelecionada) return;
        if (!window.confirm(`Tem certeza que deseja limpar TODOS os dados de "${lojaSelecionada}"? Esta ação não pode ser desfeita.`)) return;

        try {
            const db = await bancoLocal.iniciarBanco();
            const tx = db.transaction(lojaSelecionada, 'readwrite');
            await tx.store.clear();
            await tx.done;
            toast.success(`Loja "${lojaSelecionada}" limpa com sucesso.`);
            carregarDadosLoja(lojaSelecionada);
        } catch (erro) {
            console.error('Erro ao limpar loja:', erro);
            toast.error('Erro ao limpar dados.');
        }
    };

    // Filtragem simples
    const dadosFiltrados = dados.filter(item => {
        if (!termoBusca) return true;
        const termo = termoBusca.toLowerCase();
        return Object.values(item).some(val =>
            String(val).toLowerCase().includes(termo)
        );
    });

    // Obter colunas dinamicamente
    const colunas = dados.length > 0 ? Object.keys(dados[0]) : [];

    return (
        <LayoutAdministrativo
            titulo="Banco de Dados Local"
            subtitulo="Visualização e gerenciamento do IndexedDB"
        >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] animate-fade-in">

                {/* Sidebar Lojas */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-black text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Database size={18} className="text-indigo-600" />
                            Tabelas (Stores)
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {lojas.map(loja => (
                            <button
                                key={loja}
                                onClick={() => definirLojaSelecionada(loja)}
                                className={`w-full text-left px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center gap-3 group ${lojaSelecionada === loja
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border border-transparent hover:border-slate-100'
                                    }`}
                            >
                                <Table size={18} className={`transition-colors ${lojaSelecionada === loja ? 'text-white/80' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                                <span className="flex-1">{loja}</span>
                                {lojaSelecionada === loja && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conteúdo Principal */}
                <div className="lg:col-span-3 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">

                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/80 backdrop-blur-md z-20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Table size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 leading-tight">
                                    {lojaSelecionada}
                                </h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    {dados.length} Registros Encontrados
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative group flex-1 sm:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar registros..."
                                    value={termoBusca}
                                    onChange={(e) => definirTermoBusca(e.target.value)}
                                    className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 w-full sm:w-64 transition-all"
                                />
                            </div>

                            <button
                                onClick={() => carregarDadosLoja(lojaSelecionada)}
                                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all"
                                title="Atualizar Tabela"
                            >
                                <RefreshCw size={20} className={carregando ? 'animate-spin' : ''} />
                            </button>

                            <button
                                onClick={limparLoja}
                                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all"
                                title="Esvaziar Tabela"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone Banner */}
                    <div className="px-6 py-2 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-rose-600">
                            <AlertTriangle size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Zona de Perigo</span>
                        </div>
                        <button
                            onClick={async () => {
                                if (window.confirm('ATENÇÃO: Isso apagará TODO o banco de dados local (todas as tabelas). Você perderá dados não sincronizados. Continuar?')) {
                                    try {
                                        const { deleteDB } = await import('idb');
                                        await deleteDB('SCAE_DB');
                                        toast.success('Banco de dados excluído.');
                                        window.location.reload();
                                    } catch (e) {
                                        console.error(e);
                                        toast.error('Erro ao excluir banco.');
                                    }
                                }
                            }}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer transition-colors"
                        >
                            Resetar Banco de Dados Completo
                        </button>
                    </div>

                    {/* Tabela de Dados */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 relative custom-scrollbar">
                        {carregando ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-30">
                                <div className="flex flex-col items-center gap-4 animate-bounce-slight">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                        <RefreshCw className="animate-spin text-white" size={24} />
                                    </div>
                                    <span className="text-sm font-black text-slate-400 uppercase tracking-wider">Carregando...</span>
                                </div>
                            </div>
                        ) : null}

                        {dadosFiltrados.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                    {dados.length === 0 ? (
                                        <HardDrive size={40} className="text-slate-300" />
                                    ) : (
                                        <Search size={40} className="text-slate-300" />
                                    )}
                                </div>
                                <h3 className="text-lg font-black text-slate-700 mb-2">
                                    {dados.length === 0 ? 'Tabela Vazia' : 'Nenhum resultado'}
                                </h3>
                                <p className="text-sm font-medium text-slate-500 max-w-xs">
                                    {dados.length === 0 ? 'Não há registros nesta tabela do banco de dados.' : 'Tente ajustar seus termos de busca.'}
                                </p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {colunas.map(col => (
                                            <th key={col} className="px-6 py-4 border-b border-slate-200 whitespace-nowrap text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {dadosFiltrados.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/50 transition-colors group">
                                            {colunas.map(col => (
                                                <td key={`${idx}-${col}`} className="px-6 py-3 border-r border-transparent last:border-0 text-xs font-medium text-slate-600 whitespace-nowrap max-w-xs truncate font-mono group-hover:text-indigo-900 selection:bg-indigo-100">
                                                    {typeof item[col] === 'object' ? JSON.stringify(item[col]) : String(item[col])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer Status */}
                    <div className="bg-white border-t border-slate-100 py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            IndexedDB: SCAE_DB
                        </div>
                        <span>Total: {dadosFiltrados.length}</span>
                    </div>
                </div>
            </div>
        </LayoutAdministrativo>
    );
}
