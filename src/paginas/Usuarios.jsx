import { useState, useEffect } from 'react';
import LayoutAdministrativo from '../componentes/LayoutAdministrativo';
import ModalUniversal from '../componentes/ModalUniversal';
import { bancoLocal } from '../servicos/bancoLocal';
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
import { useAutenticacao } from '../contexts/ContextoAutenticacao';
import { servicoSincronizacao } from '../servicos/sincronizacao';
import { Registrador } from '../servicos/registrador';

export default function Usuarios() {
    const { usuarioAtual } = useAutenticacao();
    const [usuarios, definirUsuarios] = useState([]);
    const [carregando, definirCarregando] = useState(true);
    const [modalAberto, definirModalAberto] = useState(false);
    const [usuarioEmEdicao, definirUsuarioEmEdicao] = useState(null);
    const [busca, definirBusca] = useState('');

    const [dadosFormulario, definirDadosFormulario] = useState({
        email: '',
        role: 'VISUALIZACAO',
        ativo: true
    });

    useEffect(() => {
        carregarUsuarios();
    }, []);

    const carregarUsuarios = async () => {
        try {
            definirCarregando(true);
            const users = await bancoLocal.listarUsuarios();
            definirUsuarios(users);
        } catch (e) {
            console.error(e);
            toast.error("Erro ao carregar usuários");
        } finally {
            definirCarregando(false);
        }
    };

    const salvarUsuario = async () => {
        if (!dadosFormulario.email) {
            toast.error("Email é obrigatório");
            return;
        }

        try {
            const novoUsuario = {
                email: dadosFormulario.email,
                // role: dadosFormulario.role, // REMOVIDO: Usar apenas 'papel'
                papel: dadosFormulario.role.toUpperCase(), // Backend espera 'ADMIN', 'COORDENACAO', etc.
                ativo: true, // Deve ser ativo para o sistema reconhecer a permissão
                pendente: !usuarioEmEdicao, // Se for novo, marca como pendente de aceite
                nome_completo: usuarioEmEdicao?.nome_completo || dadosFormulario.email.split('@')[0],
                criado_em: usuarioEmEdicao?.criado_em || new Date().toISOString()
            };

            await bancoLocal.salvarUsuario(novoUsuario);

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
            console.error(erro);
            toast.error("Erro ao salvar usuário");
        }
    };

    const toggleStatus = async (user) => {
        try {
            const usuarioAtualizado = { ...user, ativo: !user.ativo };
            await bancoLocal.salvarUsuario(usuarioAtualizado);

            if (navigator.onLine) {
                try {
                    // Reenviar usuário com status atualizado (Sanitizado)
                    const payload = {
                        email: usuarioAtualizado.email,
                        nome_completo: usuarioAtualizado.nome_completo,
                        papel: usuarioAtualizado.papel || usuarioAtualizado.role,
                        ativo: usuarioAtualizado.ativo,
                        criado_por: usuarioAtualizado.criado_por,
                        criado_em: usuarioAtualizado.criado_em
                    };
                    await api.enviar('/usuarios', payload);
                } catch (e) {
                    console.warn('Sync status falhou:', e);
                }
            }

            // Atualiza lista localmente para feedback instantâneo
            definirUsuarios(usuarios.map(u => u.email === user.email ? usuarioAtualizado : u));

            // Log de Auditoria
            await Registrador.registrar('USUARIO_STATUS_ALTERAR', 'usuario', user.email, {
                novo_status: usuarioAtualizado.ativo ? 'ATIVO' : 'INATIVO'
            });

            toast.success(`Usuário ${usuarioAtualizado.ativo ? 'ativado' : 'desativado'}!`);
        } catch (erro) {
            console.error(erro);
            toast.error("Erro ao atualizar status");
        }
    };

    const excluirUsuario = async (user) => {
        if (!window.confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o usuário ${user.email}? Essa ação não pode ser desfeita.`)) {
            return;
        }

        try {
            await bancoLocal.deletarUsuario(user.email);

            // Log de Auditoria
            await Registrador.registrar('USUARIO_EXCLUIR', 'usuario', user.email, {});

            definirUsuarios(usuarios.filter(u => u.email !== user.email));
            toast.success('Usuário excluído com sucesso.');
        } catch (erro) {
            console.error(erro);
            toast.error('Erro ao excluir usuário.');
        }
    };

    const abrirEdicao = (user) => {
        definirUsuarioEmEdicao(user);
        // Mapear 'papel' do banco (ADMIN) para 'role' do form (admin) se necessário, ou usar direto
        definirDadosFormulario({
            email: user.email,
            role: user.papel || user.role || 'VISUALIZACAO',
            ativo: user.ativo
        });
        definirModalAberto(true);
    };

    const novoUsuario = () => {
        definirUsuarioEmEdicao(null);
        definirDadosFormulario({ email: '', role: 'VISUALIZACAO', ativo: true });
        definirModalAberto(true);
    };

    const filteredUsers = usuarios.filter(u => u.email.toLowerCase().includes(busca.toLowerCase()));

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
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-600/20"
                    >
                        <Plus size={20} /> <span className="hidden sm:inline">Convidar Usuário</span>
                    </button>
                </div>
            }
        >
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 sticky top-0 z-20">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar usuário por email..."
                        value={busca}
                        onChange={(e) => definirBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium shadow-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
                {filteredUsers.map((user) => (
                    <div
                        key={user.email}
                        className={`group relative bg-white rounded-3xl border ${user.ativo ? 'border-slate-100' : 'border-slate-100 bg-slate-50/50'} p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
                    >
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className={`
                                w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                                ${user.papel === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}
                            `}>
                                {user.papel === 'ADMIN' ? <Shield size={22} /> : <Users size={22} />}
                            </div>
                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${user.pendente
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : user.ativo
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                                }`}>
                                {user.pendente ? 'Pendente' : (user.ativo ? 'Ativo' : 'Inativo')}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-black text-slate-800 mb-1 truncate leading-tight" title={user.email}>{user.email}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                {PapeisDisponiveis.find(p => p.id === user.papel || p.id === user.role)?.nome || user.papel || user.role || 'Visitante'}
                            </p>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => abrirEdicao(user)}
                                className="flex-1 py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-slate-100 hover:border-indigo-100"
                            >
                                <Edit2 size={16} /> Editar
                            </button>
                            <button
                                onClick={() => toggleStatus(user)}
                                disabled={user.email === usuarioAtual?.email}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border 
                                ${user.email === usuarioAtual?.email
                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                                        : user.ativo
                                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100'
                                    }`}
                            >
                                {user.ativo ? <UserX size={16} /> : <UserCheck size={16} />}
                                {user.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {modalAberto && (
                <ModalUniversal
                    titulo={usuarioEmEdicao ? "Gerenciar Permissões" : "Convidar Novo Usuário"}
                    subtitulo={usuarioEmEdicao ? "Altere o nível de acesso ou status deste usuário." : "Adicione um novo membro à equipe administrativa."}
                    fechavel
                    tamanho="lg"
                    aoFechar={() => definirModalAberto(false)}
                >
                    <div className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Corporativo</label>
                            <input
                                type="email"
                                value={dadosFormulario.email}
                                onChange={(e) => definirDadosFormulario({ ...dadosFormulario, email: e.target.value })}
                                placeholder="usuario@escola.com"
                                className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                            />
                        </div>

                        {/* Roles Grid */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Defina a Função</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {PapeisDisponiveis.map((papel) => (
                                    <button
                                        key={papel.id}
                                        onClick={() => definirDadosFormulario({ ...dadosFormulario, role: papel.id })}
                                        className={`
                                            relative p-4 rounded-xl border-2 text-left transition-all
                                            ${dadosFormulario.role === papel.id
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md transform scale-[1.02]'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-slate-50'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className={`p-1.5 rounded-lg ${dadosFormulario.role === papel.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                {papel.id === 'ADMIN' ? <Shield size={18} /> : <Users size={18} />}
                                            </div>
                                            <span className={`font-black uppercase text-sm tracking-wide ${dadosFormulario.role === papel.id ? 'text-white' : 'text-slate-700'}`}>
                                                {papel.nome}
                                            </span>
                                        </div>
                                        <p className={`text-xs ml-10 leading-tight ${dadosFormulario.role === papel.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                            {papel.desc}
                                        </p>

                                        {/* Check Icon */}
                                        {dadosFormulario.role === papel.id && (
                                            <div className="absolute top-4 right-4 bg-white/20 rounded-full p-1">
                                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer Ações */}
                        <div className="flex gap-4 pt-6 mt-2 border-t border-slate-100">
                            <button
                                onClick={() => definirModalAberto(false)}
                                className="flex-1 py-4 px-6 rounded-xl border border-transparent text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 transition-all uppercase tracking-wide text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvarUsuario}
                                className="flex-[2] py-4 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 uppercase tracking-wide text-xs"
                            >
                                {usuarioEmEdicao ? <UserCheck size={18} className="text-indigo-200" /> : <Plus size={18} className="text-indigo-200" />}
                                {usuarioEmEdicao ? 'Salvar Alterações' : 'Convidar Usuário'}
                            </button>
                        </div>
                    </div>
                </ModalUniversal>
            )}

        </LayoutAdministrativo>
    );
}
