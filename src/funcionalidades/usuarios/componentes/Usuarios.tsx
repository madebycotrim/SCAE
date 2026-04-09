import { useState } from 'react';
import { usarConsulta } from '@/compartilhado/hooks/usarConsulta';
import LayoutAdministrativo from '@/compartilhado/componentes/LayoutAdministrativo';
import { Botao, BarraFiltro, InputBusca, CartaoConteudo, Esqueleto } from '@/compartilhado/componentes/UI';
import {
    Search,
    Plus,
    Shield,
    UserX,
    Edit2,
    Mail,
    ShieldCheck,
    UserCircle2,
    Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from '../../../compartilhado/autorizacao/ContextoPermissoes';
import type { UsuarioLocal } from '@/compartilhado/types/bancoLocal.tipos';
import { usuarioServico } from '../servicos/usuario.servico';
import FormUsuarioModal from './FormUsuarioModal';
import ModalConfirmacao from '@/compartilhado/componentes/ModalConfirmacao';
import type { UsuarioVisualizacao } from '../tipos/usuario.esquema';

const log = criarRegistrador('Usuarios');

export default function Usuarios() {
    const { usuarioAtual } = usarAutenticacao();
    const { ehCentral, pode } = usarPermissoes();

    const { dados: usuariosBrutos, carregando, carregandoInicial, recarregar: carregarUsuarios } = usarConsulta(
        ['usuarios-online'],
        () => usuarioServico.carregarOnline(),
        { enabled: pode('visualizar', 'usuarios') }
    );

    const usuarios = usuariosBrutos || [];
    const [busca, definirBusca] = useState('');
    const [modalAberto, definirModalAberto] = useState(false);
    const [usuarioEmEdicao, definingUsuarioEmEdicao] = useState<UsuarioVisualizacao | null>(null);
    const [usuarioParaExcluir, definirUsuarioParaExcluir] = useState<UsuarioVisualizacao | null>(null);

    const canAdd = pode('criar', 'usuarios');
    const canEdit = pode('editar', 'usuarios');
    const canDeleteOrToggle = pode('deletar', 'usuarios') || pode('desativar', 'usuarios');

    const salvarUsuario = async (dados: UsuarioVisualizacao) => {
        try {
            await usuarioServico.salvarUsuario(dados, !!usuarioEmEdicao, usuarioEmEdicao || undefined);
            toast.success(usuarioEmEdicao ? 'Usuário atualizado!' : 'Usuário convidado com sucesso!');
            definirModalAberto(false);
            carregarUsuarios();
        } catch (erro) {
            log.error('Erro ao salvar usuário', erro);
            toast.error('Erro ao salvar dados do usuário');
        }
    };

    const toggleStatus = async (user: UsuarioVisualizacao) => {
        try {
            await usuarioServico.toggleStatus(user);
            toast.success(!user.ativo ? 'Usuário liberado!' : 'Usuário bloqueado!');
            carregarUsuarios();
        } catch (erro) {
            toast.error('Erro ao alterar status');
        }
    };

    const excluirUsuario = (user: UsuarioVisualizacao) => {
        definirUsuarioParaExcluir(user);
    };

    const confirmarExclusao = async () => {
        if (!usuarioParaExcluir) return;
        const email = usuarioParaExcluir.email;
        try {
            await usuarioServico.excluirUsuario(email);
            carregarUsuarios();
            toast.success(`Usuário ${email} excluído com sucesso!`);
        } catch (erro) {
            log.error('Erro ao excluir usuário', erro);
            toast.error("Erro ao excluir usuário");
        } finally {
            definirUsuarioParaExcluir(null);
        }
    };

    const abrirEdicao = (usuario: UsuarioVisualizacao) => {
        definingUsuarioEmEdicao(usuario);
        definirModalAberto(true);
    };

    const novoUsuario = () => {
        definingUsuarioEmEdicao(null);
        definirModalAberto(true);
    };

    // Filtros e Papeis
    const usuariosFiltrados = usuarios.filter(u => {
        // Regra de privacidade: madebycotrim é invisível para outros usuários (mesmo admins)
        const ehMadeByCotrim = u.email.toLowerCase().includes('madebycotrim');
        const euSouMadeByCotrim = usuarioAtual?.email?.toLowerCase().includes('madebycotrim');
        
        if (ehMadeByCotrim && !euSouMadeByCotrim) return false;

        return (
            (u.nome_completo || '').toLowerCase().includes(busca.toLowerCase()) ||
            u.email.toLowerCase().includes(busca.toLowerCase()) ||
            (u.papel || '').toLowerCase().includes(busca.toLowerCase())
        );
    });

    const PapeisDisponiveis = [
        { id: 'ADMIN', nome: 'Administrador', cor: 'indigo' },
        { id: 'COORDENACAO', nome: 'Coordenação', cor: 'emerald' },
        { id: 'SECRETARIA', nome: 'Secretaria', cor: 'amber' },
        { id: 'PORTEIRO', nome: 'Portaria / Acesso', cor: 'rose' },
        { id: 'VISUALIZACAO', nome: 'Visitante', cor: 'slate' }
    ];

    // --- Renderização de Segurança ---
    if (!pode('visualizar', 'usuarios')) return null;

    const AcoesHeader = canAdd && (
        <Botao variante="primario" tamanho="sm" icone={Plus} onClick={novoUsuario}>
            Novo Acesso
        </Botao>
    );

    return (
        <LayoutAdministrativo
            titulo="Equipe da Escola"
            subtitulo="Gerencie quem pode acessar e operar o sistema na unidade"
            acoes={AcoesHeader}
            carregando={carregando}
        >
            <BarraFiltro className="bg-slate-50 border-slate-200/60 shadow-suave p-4 rounded-2xl">
                <div className="flex flex-col gap-2 flex-1 w-full text-left">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 leading-none">Buscar Funcionário</label>
                    <InputBusca
                        icone={Search}
                        placeholder="Nome, e-mail ou cargo..."
                        value={busca}
                        onChange={(e) => definirBusca(e.target.value)}
                        className="w-full h-11"
                    />
                </div>
                
                <div className="flex flex-col gap-2 shrink-0">
                    <label className="text-[10px] font-black text-transparent uppercase tracking-[0.2em] ml-1 leading-none">Info</label>
                    <div className="flex items-center gap-4 bg-white border border-slate-200 px-5 h-11 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total</span>
                        <span className="text-[10px] font-black text-eletrico uppercase tracking-widest leading-none">{usuariosFiltrados.length} Registros</span>
                    </div>
                </div>
            </BarraFiltro>

            <CartaoConteudo className="bg-white border-slate-200/60 shadow-md rounded-2xl overflow-hidden mt-8">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Funcionário</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Permissão</th>
                                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">Situação</th>
                                { (canEdit || canDeleteOrToggle) && <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th> }
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {carregandoInicial ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-fade-in">
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <Esqueleto className="w-11 h-11 rounded-2xl" />
                                                <div className="space-y-2">
                                                    <Esqueleto className="w-40 h-3" />
                                                    <Esqueleto className="w-32 h-2 opacity-60" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-center"><Esqueleto className="w-24 h-6 mx-auto rounded-2xl" /></td>
                                        <td className="py-5 px-8"><Esqueleto className="w-20 h-5 rounded-2xl" /></td>
                                        <td className="py-5 px-8 text-right"><Esqueleto className="w-32 h-8 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : usuariosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-40 grayscale">
                                            <UserCircle2 size={48} className="text-slate-400" />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Ninguém encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                usuariosFiltrados.map((u: UsuarioVisualizacao) => {
                                    const papelInfo = PapeisDisponiveis.find(p => p.id === u.papel);
                                    const papelNome = papelInfo?.nome || u.papel || 'Portaria';
                                    const papelCor = papelInfo?.cor || 'slate';

                                    return (
                                        <tr key={u.email} className={`hover:bg-slate-50/50 transition-all group ${!u.ativo ? 'opacity-70 grayscale' : ''}`}>
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-suave transition-transform group-hover:scale-110 ${u.papel === 'ADMIN' ? 'bg-eletrico/10 text-eletrico border-eletrico/20' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                        {u.papel === 'ADMIN' ? <ShieldCheck size={20} strokeWidth={2.5} /> : <UserCircle2 size={20} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm uppercase tracking-tight group-hover:text-eletrico transition-colors">
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
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-200/60 shadow-suave ${papelCor === 'eletrico' ? 'bg-eletrico/10 text-eletrico border-eletrico/20' : 
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
                                                    {canEdit && (
                                                        <Botao
                                                            variante="ghost"
                                                            tamanho="sm"
                                                            icone={Edit2}
                                                            onClick={() => abrirEdicao(u)}
                                                            className="hover:text-eletrico font-black text-[10px] tracking-widest"
                                                        >
                                                            EDITAR
                                                        </Botao>
                                                    )}

                                                    {canDeleteOrToggle && u.email !== usuarioAtual?.email && (
                                                        <Botao
                                                            tamanho="sm"
                                                            variante={ehCentral ? 'perigo' : u.ativo ? 'secundario' : 'primario'}
                                                            onClick={() => ehCentral ? excluirUsuario(u) : toggleStatus(u)}
                                                            className="font-black text-[10px] tracking-widest"
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

            {usuarioParaExcluir && (
                <ModalConfirmacao
                    titulo="Excluir Usuário"
                    mensagem={`Tem certeza que deseja EXCLUIR permanentemente o usuário ${usuarioParaExcluir.email}? Esta ação não pode ser desfeita.`}
                    textoConfirmar="Sim, Excluir"
                    aoConfirmar={confirmarExclusao}
                    aoCancelar={() => definirUsuarioParaExcluir(null)}
                    variante="perigoso"
                />
            )}
        </LayoutAdministrativo>
    );
}

function BadgeStatus({ ativo, pendente }: { ativo: boolean, pendente?: boolean }) {
    if (pendente) {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-2xl text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div> Aguardando
            </span>
        );
    }
    if (ativo) {
        return (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-2xl text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Ativo
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-2xl text-[9px] font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-600"></div> Bloqueado
        </span>
    );
}
