import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo } from '@compartilhado/componentes/UI';
import { bancoLocal } from '@compartilhado/servicos/bancoLocal';
import {
    Users,
    Search,
    Plus,
    Shield,
    UserCheck,
    UserX,
    Edit2,
    Trash2,
    Lock,
    RefreshCw,
    Mail,
    ShieldCheck,
    ShieldAlert,
    UserCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';
import { Registrador } from '@compartilhado/servicos/auditoria';
import type { UsuarioLocal } from '@compartilhado/types/bancoLocal.tipos';
import { api } from '@compartilhado/servicos/api';
import { usuarioServico } from '../servicos/usuario.servico';

const log = criarRegistrador('Usuarios');

import FormUsuarioModal from './FormUsuarioModal';

export default function Usuarios() {
    const { usuarioAtual } = usarAutenticacao();
    const { ehCentral } = usarPermissoes();
    const [usuarios, definirUsuarios] = useState<UsuarioLocal[]>([]);
    const [carregando, definirCarregando] = useState(true);
    const [busca, definirBusca] = useState('');
    const [modalAberto, definirModalAberto] = useState(false);
    const [usuarioEmEdicao, definirUsuarioEmEdicao] = useState<UsuarioLocal | null>(null);

    useEffect(() => {
        carregarUsuarios();
    }, []);

    const carregarUsuarios = async () => {
        try {
            definirCarregando(true);
            const banco = await bancoLocal.iniciarBanco();
            const todos = await banco.getAll('usuarios');
            definirUsuarios(todos);
        } catch (erro) {
            log.error('Erro ao carregar usuários', erro);
            toast.error('Erro ao carregar lista de usuários');
        } finally {
            definirCarregando(false);
        }
    };

    const salvarUsuario = async (dados: any) => {
        try {
            await usuarioServico.salvarUsuario(dados, !!usuarioEmEdicao);

            toast.success(usuarioEmEdicao ? 'Usuário atualizado!' : 'Usuário convidado com sucesso!');
            definirModalAberto(false);
            carregarUsuarios();
        } catch (erro) {
            log.error('Erro ao salvar usuário', erro);
            toast.error('Erro ao salvar dados do usuário');
        }
    };

    const toggleStatus = async (user: UsuarioLocal) => {
        try {
            await usuarioServico.toggleStatus(user);
            toast.success(!user.ativo ? 'Usuário liberado!' : 'Usuário bloqueado!');
            carregarUsuarios();
        } catch (erro) {
            toast.error('Erro ao alterar status');
        }
    };

    const excluirUsuario = async (user: any) => {
        if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o usuário ${user.email}? Esta ação não pode ser desfeita.`)) {
            return;
        }

        try {
            await usuarioServico.excluirUsuario(user.email);
            definirUsuarios(usuarios.filter(u => (u as any).email !== user.email));
            toast.success(`Usuário ${user.email} excluído com sucesso!`);
        } catch (erro) {
            log.error('Erro ao excluir usuário', erro);
            toast.error("Erro ao excluir usuário");
        }
    };

    const abrirEdicao = (usuario: UsuarioLocal) => {
        definirUsuarioEmEdicao(usuario);
        definirModalAberto(true);
    };

    const novoUsuario = () => {
        definirUsuarioEmEdicao(null);
        definirModalAberto(true);
    };

    const usuariosFiltrados = usuarios.filter(u =>
        (u as any).nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
        (u as any).email.toLowerCase().includes(busca.toLowerCase()) ||
        (u as any).papel?.toLowerCase().includes(busca.toLowerCase())
    );

    const PapeisDisponiveis = [
        { id: 'ADMIN', nome: 'Administrador', cor: 'indigo' },
        { id: 'COORDENACAO', nome: 'Coordenação', cor: 'emerald' },
        { id: 'SECRETARIA', nome: 'Secretaria', cor: 'amber' },
        { id: 'PORTEIRO', nome: 'Portaria / Acesso', cor: 'rose' },
        { id: 'VISUALIZACAO', nome: 'Visitante', cor: 'slate' }
    ];

    const AcoesHeader = (
        <Botao
            variante="primario"
            tamanho="lg"
            icone={Plus}
            onClick={novoUsuario}
        >
            Novo Acesso
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Equipe da Escola"
            subtitulo="Gerencie quem pode acessar e operar o sistema na unidade"
            acoes={AcoesHeader}
        >
            <BarraFiltro className="bg-slate-50 border-slate-200/60 shadow-sm p-4 rounded-2xl">
                <div className="flex flex-col gap-2.5 flex-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Buscar Funcionário</label>
                    <InputBusca
                        icone={Search}
                        placeholder="Nome, e-mail ou cargo..."
                        value={busca}
                        onChange={(e) => definirBusca(e.target.value)}
                        className="w-full h-9 rounded-2xl"
                    />
                </div>
                <div className="flex items-center gap-4 ml-6 self-end pb-1">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Cadastrado</span>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">{usuariosFiltrados.length} Pessoas</span>
                    </div>
                </div>
            </BarraFiltro>

            <CartaoConteudo className="bg-white border-slate-200/60 shadow-2xl rounded-2xl overflow-hidden mt-8">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Funcionário</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Permissão de Acesso</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Situação</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregando ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="py-8 px-8 h-20 bg-slate-50/30"></td>
                                    </tr>
                                ))
                            ) : usuariosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40 grayscale">
                                            <UserCircle2 size={48} className="text-slate-400" />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Nenhuma pessoa encontrada</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                usuariosFiltrados.map((u: any) => {
                                    const papelInfo = PapeisDisponiveis.find(p => p.id === u.papel);
                                    const papelNome = papelInfo?.nome || u.papel || 'Visitante';
                                    const papelCor = papelInfo?.cor || 'slate';

                                    return (
                                        <tr key={u.email} className={`hover:bg-slate-50 transition-all group ${!u.ativo ? 'opacity-70 grayscale' : ''}`}>
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-110 ${u.papel === 'ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                        {u.papel === 'ADMIN' ? <ShieldCheck size={20} strokeWidth={2.5} /> : <UserCircle2 size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-indigo-700 transition-colors">
                                                            {u.nome_completo || u.email.split('@')[0]}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">
                                                            <Mail size={10} className="text-slate-300" />
                                                            {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8 text-center">
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${papelCor === 'indigo' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                    papelCor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        papelCor === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            papelCor === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}>
                                                    {papelNome}
                                                </span>
                                            </td>
                                            <td className="py-5 px-8">
                                                <BadgeStatus ativo={u.ativo} pendente={u.pendente} />
                                            </td>
                                            <td className="py-5 px-8 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <Botao
                                                        variante="ghost"
                                                        tamanho="sm"
                                                        icone={Edit2}
                                                        onClick={() => abrirEdicao(u)}
                                                        className="hover:text-indigo-600 font-black text-[10px] tracking-widest"
                                                    >
                                                        EDITAR
                                                    </Botao>

                                                    {u.email !== usuarioAtual?.email && (
                                                        <Botao
                                                            tamanho="sm"
                                                            variante={ehCentral ? 'perigo' : u.ativo ? 'secundario' : 'primario'}
                                                            onClick={() => ehCentral ? excluirUsuario(u) : toggleStatus(u)}
                                                            className={!ehCentral && u.ativo ? 'text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 font-black text-[10px] tracking-widest' : 'font-black text-[10px] tracking-widest'}
                                                        >
                                                            {ehCentral ? 'EXCLUIR' : u.ativo ? 'BLOQUEAR' : 'LIBERAR'}
                                                        </Botao>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </CartaoConteudo>

            {modalAberto && (
                <FormUsuarioModal
                    usuario={usuarioEmEdicao}
                    aoFechar={() => definirModalAberto(false)}
                    aoSalvar={salvarUsuario}
                />
            )}
        </LayoutAdministrativo>
    );
}

function BadgeStatus({ ativo, pendente }: { ativo: boolean, pendente?: boolean }) {
    if (pendente) {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 shadow-sm transition-all hover:scale-110">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Aguardando
            </span>
        );
    }
    if (ativo) {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-sm transition-all hover:scale-110">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Ativo
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 shadow-sm transition-all hover:scale-110">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]"></div> Bloqueado
        </span>
    );
}
