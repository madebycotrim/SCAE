import { useState, useEffect } from 'react';
import LayoutAdministrativo from '@compartilhado/componentes/LayoutAdministrativo';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
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
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('Usuarios');
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { servicoSincronizacao } from '@compartilhado/servicos/sincronizacao';
import { Registrador } from '@compartilhado/servicos/auditoria';
import type { UsuarioLocal, PapelUsuario } from '@compartilhado/types/bancoLocal.tipos';
import { api } from '@compartilhado/servicos/api';

import { usarNotificacoes } from '@compartilhado/contextos/ContextoNotificacoes';

import FormUsuarioModal from './FormUsuarioModal';

export default function Usuarios() {
    const { adicionarNotificacao } = usarNotificacoes();
    const { usuarioAtual } = usarAutenticacao();
    const [usuarios, definirUsuarios] = useState([]);
    const [carregando, definirCarregando] = useState(true);
    const [modalAberto, definirModalAberto] = useState(false);
    const [usuarioEmEdicao, definirUsuarioEmEdicao] = useState(null);
    const [busca, definirBusca] = useState('');

    useEffect(() => {
        carregarUsuarios();
    }, []);

    const carregarUsuarios = async () => {
        try {
            definirCarregando(true);
            const listaUsuarios = await bancoLocal.listarUsuarios();
            definirUsuarios(listaUsuarios);
        } catch (e) {
            log.error('Erro ao carregar usuários', e);
            toast.error("Erro ao carregar usuários");
        } finally {
            definirCarregando(false);
        }
    };

    const salvarUsuario = async (dados: any) => {
        if (!dados.email) {
            toast.error("Email é obrigatório");
            return;
        }

        try {
            const novoUsuario: UsuarioLocal = {
                email: dados.email,
                papel: dados.papel.toUpperCase() as PapelUsuario,
                ativo: dados.ativo,
                pendente: !usuarioEmEdicao,
                nome_completo: usuarioEmEdicao?.nome_completo || dados.email.split('@')[0],
                criado_em: usuarioEmEdicao?.criado_em || new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            };

            await bancoLocal.salvarUsuario(novoUsuario);

            // Notificação de Segurança
            if (!usuarioEmEdicao) {
                adicionarNotificacao({
                    titulo: 'Segurança: Novo Usuário',
                    mensagem: `Um novo usuário (${novoUsuario.email}) foi criado com o papel de ${novoUsuario.papel}.`,
                    tipo: 'info',
                    link: '/administrativo/usuarios'
                });
            }

            // Log de Auditoria
            const acaoLog = usuarioEmEdicao ? 'USUARIO_EDITAR' : 'USUARIO_CRIAR';
            await Registrador.registrar(acaoLog, 'usuario', novoUsuario.email, {
                email: novoUsuario.email,
                papel: novoUsuario.papel,
                ativo: novoUsuario.ativo
            });

            toast.success("Usuário salvo com sucesso!");
            definirModalAberto(false);
            carregarUsuarios();
        } catch (erro) {
            log.error('Erro ao salvar usuário', erro);
            toast.error("Erro ao salvar usuário");
        }
    };

    const toggleStatus = async (user: UsuarioLocal) => {
        try {
            const usuarioAtualizado = { ...user, ativo: !user.ativo };
            await bancoLocal.salvarUsuario(usuarioAtualizado);

            if (navigator.onLine) {
                try {
                    const payload = {
                        email: usuarioAtualizado.email,
                        nome_completo: usuarioAtualizado.nome_completo,
                        papel: usuarioAtualizado.papel || (usuarioAtualizado as any).role,
                        ativo: usuarioAtualizado.ativo,
                        criado_por: (usuarioAtualizado as any).criado_por,
                        criado_em: usuarioAtualizado.criado_em
                    };
                    await api.enviar('/usuarios', payload);
                } catch (e) {
                    log.warn('Sync status falhou', e);
                }
            }

            definirUsuarios(usuarios.map(u => (u as any).email === user.email ? usuarioAtualizado : u));

            await Registrador.registrar('USUARIO_STATUS_ALTERAR', 'usuario', user.email, {
                novo_status: usuarioAtualizado.ativo ? 'ATIVO' : 'INATIVO'
            });

            toast.success(`Usuário ${usuarioAtualizado.ativo ? 'ativado' : 'desativado'}!`);
        } catch (erro) {
            log.error('Erro ao alternar status', erro);
            toast.error("Erro ao atualizar status");
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
        (u as any).email.toLowerCase().includes(busca.toLowerCase())
    );

    const PapeisDisponiveis = [
        { id: 'ADMIN', nome: 'Administrador', desc: 'Acesso total ao sistema' },
        { id: 'COORDENACAO', nome: 'Coordenação', desc: 'Gestão pedagógica' },
        { id: 'SECRETARIA', nome: 'Secretaria', desc: 'Gestão de alunos e turmas' },
        { id: 'PORTARIA', nome: 'Portaria', desc: 'Apenas registro de acesso' },
        { id: 'VISUALIZACAO', nome: 'Visitante', desc: 'Apenas visualização' }
    ];

    return (
        <LayoutAdministrativo
            titulo="Gerenciamento de Usuários"
            subtitulo="Controle de acesso e permissões"
            acoes={
                <div className="flex gap-2">
                    <button
                        onClick={novoUsuario}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">Convidar Usuário</span>
                    </button>
                </div>
            }
        >
            {/* Toolbar de Busca */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 sticky top-0 z-20">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar usuário por nome ou e-mail..."
                        value={busca}
                        onChange={(e) => definirBusca(e.target.value)}
                        className="w-full pl-10 pr-4 h-10 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white transition-colors placeholder:text-slate-400"
                    />
                </div>
            </div>

            {usuariosFiltrados.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 mx-auto border border-slate-100">
                        <Users size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum usuário encontrado</h3>
                    <p className="text-slate-500 max-w-sm mx-auto text-sm">
                        Não existem usuários cadastrados com os critérios de busca informados.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-slide-up">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuário</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil de Acesso</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usuariosFiltrados.map((u: any) => {
                                    const roleDesc = PapeisDisponiveis.find(p => p.id === u.papel)?.nome || u.papel || 'Visitante';

                                    let statusBadge = '';
                                    let statusText = '';

                                    if (u.pendente) {
                                        statusBadge = 'bg-amber-50 text-amber-600 border-amber-200';
                                        statusText = 'Pendente';
                                    } else if (u.ativo) {
                                        statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                        statusText = 'Ativo';
                                    } else {
                                        statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                                        statusText = 'Bloqueado';
                                    }

                                    return (
                                        <tr key={u.email} className={`hover:bg-slate-50 transition-colors ${!u.ativo ? 'bg-rose-50/10' : ''}`}>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${u.papel === 'ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                        {u.papel === 'ADMIN' ? <Shield size={14} strokeWidth={2.5} /> : <Users size={14} strokeWidth={2.5} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 text-sm leading-none mb-1">
                                                            {u.nome_completo || u.email.split('@')[0]}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <Lock size={10} />
                                                            {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-sm font-medium text-slate-600">
                                                    {roleDesc}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusBadge}`}>
                                                    {statusText}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => abrirEdicao(u)}
                                                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => toggleStatus(u)}
                                                        disabled={u.email === usuarioAtual?.email}
                                                        className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors flex items-center gap-1.5
                                                            ${u.email === usuarioAtual?.email
                                                                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                : u.ativo
                                                                    ? 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                                                                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                                                            }`}
                                                    >
                                                        {u.ativo ? 'Bloquear' : 'Liberar'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Padronizado */}
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

