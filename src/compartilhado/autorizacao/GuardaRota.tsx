/**
 * GuardaRota — Componente que protege rotas verificando autenticação + papel + tenant.
 * Redireciona para login relativo ao slug da escola.
 */
import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usarPermissoes } from './ContextoPermissoes';

export interface GuardaRotaProps {
    children: ReactNode;
    papeis?: string[];
    desabilitarTenantCheck?: boolean;
}

export default function GuardaRota({ children, papeis, desabilitarTenantCheck = false }: GuardaRotaProps) {
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

    // Não autenticado → redirecionar para login da escola ou do AGM
    if (!usuarioAtual) {
        if (desabilitarTenantCheck || (!slugEscola && papeis?.includes('AGM'))) {
            return <Navigate to="/agm/login" replace />;
        }
        return <Navigate to={`/${slugEscola}/login`} replace />;
    }

    // Restrição Absoluta e Hardcoded para o Root/Dono
    if (papeis?.includes('AGM') && usuarioAtual.email !== 'madebycotrim@gmail.com') {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="text-center max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                    <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
                        <span className="text-2xl">🛑</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Acesso Classificado Root</h2>
                    <p className="text-slate-400 mb-6">Apenas a conta madebycotrim@gmail.com possui permissão para enxergar o Módulo AGM.</p>
                    <a href="/" className="inline-block px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors border border-slate-700">
                        Sair desta área
                    </a>
                </div>
            </div>
        );
    }

    // Se papéis foram definidos, verificar se o usuário tem permissão
    if (papeis && papeis.length > 0 && usuario) {
        let temPermissao = papeis.includes(usuario.papel);

        // Bypass implícito absoluto: Root é inerentemente AGM independentemente de ser ADMIN nas permissões locais.
        if (papeis.includes('AGM') && usuarioAtual.email === 'madebycotrim@gmail.com') {
            temPermissao = true;
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
                        <a href={desabilitarTenantCheck ? '/agm/login' : `/${slugEscola}/admin/painel`} className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                            {desabilitarTenantCheck ? 'Voltar para Login AGM' : 'Voltar ao Painel'}
                        </a>
                    </div>
                </div>
            );
        }
    }

    return children;
}
