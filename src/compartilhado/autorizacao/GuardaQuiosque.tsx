/**
 * GuardaQuiosque — protege a rota do tablet (sessão permanente).
 * Verifica se há um usuário autenticado com sessão persistente.
 * Redireciona para login da escola com slug.
 */
import { Outlet, Navigate, useParams } from 'react-router-dom';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';

export default function GuardaQuiosque({ children }: { children?: React.ReactNode }) {
    const { usuarioAtual } = usarAutenticacao();
    const { slugEscola } = useParams();

    // Sem sessão ativa → redirecionar para login da escola
    if (!usuarioAtual) {
        return <Navigate to={`/${slugEscola}/login`} replace />;
    }

    // Sessão ativa → renderizar conteúdo do quiosque
    return children || <Outlet />;
}
