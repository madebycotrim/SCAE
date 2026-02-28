/**
 * GuardaRota — Componente que protege rotas verificando autenticação + papel + tenant.
 * Redireciona para login relativo ao slug da escola.
 */
import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';
import { usePermissoes } from '@compartilhado/autorizacao/ContextoPermissoes';

export interface GuardaRotaProps {
    children: ReactNode;
    papeis?: string[];
}

export default function GuardaRota({ children, papeis }: GuardaRotaProps) {
    const { usuarioAtual } = useAutenticacao();
    const { usuario, carregando } = usePermissoes();
    const { slugEscola } = useParams();

    // Carregando estado de auth/permissões
    if (carregando) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Não autenticado → redirecionar para login da escola
    if (!usuarioAtual) {
        return <Navigate to={`/${slugEscola}/login`} replace />;
    }

    // Se papéis foram definidos, verificar se o usuário tem permissão
    if (papeis && papeis.length > 0 && usuario) {
        const temPermissao = papeis.includes(usuario.papel);
        if (!temPermissao) {
            return (
                <div className="flex items-center justify-center h-screen bg-slate-50">
                    <div className="text-center max-w-md p-8">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🔒</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Restrito</h2>
                        <p className="text-slate-500 mb-6">Você não tem permissão para acessar esta página.</p>
                        <a href={`/${slugEscola}/admin/painel`} className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                            Voltar ao Painel
                        </a>
                    </div>
                </div>
            );
        }
    }

    return children;
}
