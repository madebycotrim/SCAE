/**
 * GuardaRota — Componente que protege rotas verificando autenticação + papel + escola.
 * Redireciona para login relativo ao slug da escola.
 */
import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from './ContextoPermissoes';

export interface GuardaRotaProps {
    children: ReactNode;
    papeis?: string[];
    desabilitarEscolaCheck?: boolean;
}

export default function GuardaRota({ children, papeis, desabilitarEscolaCheck = false }: GuardaRotaProps) {
    const { usuarioAtual } = usarAutenticacao();
    const { usuario, carregando } = usarPermissoes();
    const { slugEscola } = useParams();

    // Carregando estado de auth/permissões
    if (carregando) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Não autenticado → redirecionar para login da escola ou da Gestão Central
    if (!usuarioAtual) {
        if (desabilitarEscolaCheck || (!slugEscola && papeis?.includes('CENTRAL'))) {
            return <Navigate to="/central/login" replace />;
        }
        return <Navigate to={`/${slugEscola}/login`} replace />;
    }

    // Restrição Absoluta e Hardcoded para o Root/Dono
    if (papeis?.includes('CENTRAL') && usuarioAtual.email !== 'madebycotrim@gmail.com') {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="text-center max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                    <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
                        <span className="text-2xl">🛡️</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Acesso Classificado Root</h2>
                    <p className="text-slate-400 mb-6">Apenas a conta madebycotrim@gmail.com possui permissão para enxergar o Módulo Central.</p>
                    <a href="/" className="inline-block px-6 py-3 bg-[#0d1f3c] text-white rounded-xl font-bold hover:bg-[#0a1628] transition-colors border border-transparent shadow-suave">
                        Sair desta área
                    </a>
                </div>
            </div>
        );
    }

    // Se papéis foram definidos, verificar se o usuário tem permissão
    if (papeis && papeis.length > 0) {
        let temPermissao = false;

        if (usuarioAtual.email === 'madebycotrim@gmail.com') {
            // Bypass global para o root account
            temPermissao = true;
        } else if (usuario) {
            temPermissao = papeis.includes(usuario.papel);
        }

        if (!temPermissao) {
            return (
                <div className="flex items-center justify-center h-screen bg-slate-50">
                    <div className="text-center max-w-md p-8">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🔒</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
                        <p className="text-slate-500 mb-6">Você não tem permissão para acessar esta página.</p>
                        <a href={desabilitarEscolaCheck ? '/central/login' : `/${slugEscola}/admin/painel`} className="inline-block px-6 py-3 bg-[#0d1f3c] text-white rounded-xl font-bold hover:bg-[#0a1628] transition-colors shadow-suave">
                            {desabilitarEscolaCheck ? 'Voltar para Login Central' : 'Voltar ao Painel'}
                        </a>
                    </div>
                </div>
            );
        }
    }

    return children;
}


