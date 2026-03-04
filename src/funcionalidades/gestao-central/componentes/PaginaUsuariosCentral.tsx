import { useState, useEffect } from 'react';
import { Users, Search, Edit2, KeyRound, ShieldAlert, Loader2, AlertTriangle } from 'lucide-react';
import { mascararDadoPessoal } from '@compartilhado/utils/registrarLocal';
import { api } from '@compartilhado/servicos/api';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@compartilhado/componentes/UI';

interface UsuarioCentral {
    id: string;
    email: string;
    nome: string;
    papel: string;
    escolaslug: string | 'GLOBAL';
    ultimoAcesso: string;
}

export function PaginaUsuariosCentral() {
    const [busca, definirBusca] = useState('');
    const [usuarios, definirUsuarios] = useState<UsuarioCentral[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [erro, definirErro] = useState<string | null>(null);

    useEffect(() => {
        const buscarUsuarios = async () => {
            try {
                definirCarregando(true);
                const resposta = await api.obter<{ dados: UsuarioCentral[] }>('/central/usuarios');
                definirUsuarios(resposta.dados);
            } catch (err: any) {
                console.error('Erro ao buscar usuários:', err);
                definirErro(err.message || 'Falha ao carregar contas de usuários.');
            } finally {
                definirCarregando(false);
            }
        };

        buscarUsuarios();
    }, []);

    const filtrados = usuarios.filter(u =>
        u.email.toLowerCase().includes(busca.toLowerCase()) ||
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        u.escolaslug?.toLowerCase().includes(busca.toLowerCase())
    );

    if (carregando) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-slate-500 gap-6">
                <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Autenticando na Federação de Usuários...</p>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="bg-rose-500/5 border border-rose-500/20 p-12 rounded-2xl flex flex-col items-center text-center gap-6 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-900/10">
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Erro no Barramento de Identidade</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{erro}</p>
                </div>
                <Botao variante="perigo" onClick={() => window.location.reload()}>Recarregar Gateway</Botao>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header Técnico */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400 shadow-lg">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Identity Access Management</p>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Usuários do Ecossistema</h2>
                    </div>
                </div>
            </div>

            {/* Barra de Busca / Filtros */}
            <BarraFiltro className="bg-slate-900 border-slate-800 shadow-xl">
                <InputBusca
                    icone={Search}
                    placeholder="Buscar por e-mail institucional, nome ou identificador de unidade..."
                    value={busca}
                    onChange={(e) => definirBusca(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/10 text-white"
                />
            </BarraFiltro>

            {/* Matrix de Dados (Tabela) */}
            <CartaoConteudo className="bg-slate-900 border-slate-800 shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuário / Credencial</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Nível de Acesso</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vinculação (Tenant)</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Última Atividade</th>
                                <th className="py-4 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-50 grayscale">
                                            <Users size={48} className="text-slate-600" />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Nenhum registro encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map((usuario) => (
                                    <tr key={usuario.id} className="hover:bg-indigo-500/5 transition-colors group">
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{usuario.nome}</span>
                                                <span className="text-[10px] font-mono font-bold text-slate-600 group-hover:text-indigo-400 transition-colors">{mascararDadoPessoal(usuario.email, 'email')}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center">
                                            <BadgePapel papel={usuario.papel} />
                                        </td>
                                        <td className="py-5 px-8">
                                            <span className={`text-xs font-bold uppercase tracking-widest ${usuario.escolaslug === 'GLOBAL' ? 'text-indigo-400' : 'text-slate-500'}`}>
                                                {usuario.escolaslug || 'DESVINCULADO'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8">
                                            <span className="text-xs font-mono font-bold text-slate-500">
                                                {usuario.ultimoAcesso ? new Date(usuario.ultimoAcesso).toLocaleDateString('pt-BR') : 'SEM LOGS'}
                                            </span>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                <Botao variante="ghost" tamanho="sm" icone={KeyRound} title="Redefinir Credencial" className="hover:text-amber-400" />
                                                <Botao variante="ghost" tamanho="sm" icone={Edit2} title="Alterar Permissões" className="hover:text-indigo-400" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>
        </div>
    );
}

function BadgePapel({ papel }: { papel: string }) {
    if (papel === 'CENTRAL') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 shadow-lg shadow-indigo-950/20">
                <ShieldAlert size={14} className="animate-pulse" /> MASTER
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700">
            {papel}
        </span>
    );
}
