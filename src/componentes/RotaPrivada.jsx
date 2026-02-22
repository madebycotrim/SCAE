import { Navigate } from 'react-router-dom';
import { useAutenticacao } from '../contexts/ContextoAutenticacao';

export default function RotaPrivada({ children }) {
    const { usuarioAtual, carregando } = useAutenticacao();

    if (carregando) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!usuarioAtual) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
