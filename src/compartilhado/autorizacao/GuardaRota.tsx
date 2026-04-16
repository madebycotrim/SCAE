/**
 * GuardaRota — Componente que protege rotas verificando autenticação + papel + escola.
 * Redireciona para login relativo ao slug da escola.
 */
import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from './ContextoPermissoes';
import { ShieldAlert, UserX, LogOut } from 'lucide-react';
import { Botao } from '../componentes/UI';

export interface GuardaRotaProps {
    children: ReactNode;
    papeis?: string[];
    desabilitarEscolaCheck?: boolean;
}

export default function GuardaRota({ children, papeis, desabilitarEscolaCheck = false }: GuardaRotaProps) {
    const { usuarioAtual, sair: firebaseSair } = usarAutenticacao();
    const { usuario, carregando, ehCentral } = usarPermissoes();
    const { slugEscola } = useParams();

    // 1. Carregando estado de auth/permissões
    if (carregando) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validando Acesso Segurança</span>
                </div>
            </div>
        );
    }

    // 2. Não autenticado (Firebase) ? redirecionar para login
    if (!usuarioAtual) {
        if (desabilitarEscolaCheck || (!slugEscola && papeis?.includes('CENTRAL'))) {
            return <Navigate to="/central/login" replace />;
        }
        return <Navigate to={`/${slugEscola}/login`} replace />;
    }

    const ehRootAcc = ehCentral;

    // 3. Autenticado mas NÃO VINCULADO (SCAE) e NÃO é ROOT
    if (!usuario && !ehRootAcc) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="text-center max-w-md p-10 border border-slate-100 rounded-[2.5rem] shadow-media-suave bg-white">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8 text-rose-500 shadow-inner">
                        <UserX size={36} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">E-mail não autorizado</h2>
                    <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">
                        O email <span className="text-slate-900 font-bold">{usuarioAtual.email}</span> não foi localizado no cadastro desta unidade escolar.<br/>
                        <span className="text-xs mt-4 block text-slate-400 italic">Dica: Entre em contato com a secretaria ou direção para liberar seu acesso.</span>
                    </p>
                    <div className="flex flex-col gap-3">
                        <Botao 
                            variante="secundario" 
                            icone={LogOut} 
                            onClick={() => firebaseSair()}
                            className="font-black text-[11px] uppercase tracking-widest px-8 w-full h-12"
                        >
                            Tentar outra conta
                        </Botao>
                    </div>
                </div>
            </div>
        );
    }

    // 4. Se for Inativo
    if (usuario && !usuario.ativo && !ehRootAcc) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="text-center max-w-sm p-10 bg-white border border-slate-200 rounded-[2.5rem] shadow-suave">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <ShieldAlert size={36} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-3 uppercase tracking-tight">Acesso Bloqueado</h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        Sua permissão de acesso foi desativada por um administrador da escola.
                    </p>
                    <Botao variante="secundario" onClick={() => firebaseSair()} className="w-full">Voltar ao Início</Botao>
                </div>
            </div>
        );
    }

    // 5. Root Bypass
    if (ehRootAcc) return children;

    // 6. Restrição Root para Módulo Central (Hardcoded)
    if (papeis?.includes('CENTRAL') && !ehRootAcc) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="text-center max-w-md p-10 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl">
                    <h2 className="text-xl font-black text-white mb-4 uppercase">Área Restrita Root</h2>
                    <p className="text-slate-400 mb-10 text-sm leading-relaxed">Apenas o desenvolvedor principal possui permissão para enxergar o Módulo Central Global.</p>
                    <Botao variante="primario" onClick={() => window.location.href = '/'}>Sair desta área</Botao>
                </div>
            </div>
        );
    }

    // 7. Verificação de Papéis (RBAC)
    if (papeis && papeis.length > 0 && usuario) {
        const temPermissaoSet = papeis.includes(usuario.papel);
        if (!temPermissaoSet) {
            return (
                <div className="flex items-center justify-center h-screen bg-slate-50">
                    <div className="text-center max-w-md p-10 bg-white border border-slate-200 rounded-[2.5rem] shadow-suave">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                            <ShieldAlert size={36} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 mb-3 uppercase tracking-tight">Permissão Insuficiente</h2>
                        <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">Seu cargo atual ({usuario.papel}) não possui nível de acesso para esta funcionalidade.</p>
                        <Botao 
                            variante="primario" 
                            onClick={() => window.location.href = `/${slugEscola}/admin/painel`}
                            className="w-full h-12 font-black uppercase tracking-widest text-[11px]"
                        >
                            Voltar ao Painel
                        </Botao>
                    </div>
                </div>
            );
        }
    }

    return children;
}
