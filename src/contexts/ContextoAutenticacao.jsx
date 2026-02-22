import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { autenticacao } from '../servicos/firebase';

import { servicoSincronizacao } from '../servicos/sincronizacao';

const ContextoAutenticacao = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAutenticacao() {
    return useContext(ContextoAutenticacao);
}

export function ProvedorAutenticacao({ children }) {
    const [usuarioAtual, definirUsuarioAtual] = useState(null);
    const [carregando, definirCarregando] = useState(true);

    useEffect(() => {
        const cancelarInscricao = onAuthStateChanged(autenticacao, async (usuario) => {
            if (usuario) {
                // Atualiza token se necessário
                const token = await usuario.getIdToken();
                usuario.token = token;

                // 🔄 Auto-Sync ao Login
                console.log('Usuário autenticado. Iniciando sincronização automática...');
                servicoSincronizacao.sincronizarTudo().catch(e => console.warn('Erro na auto-sync:', e));
            }
            definirUsuarioAtual(usuario);
            definirCarregando(false);
        });

        return cancelarInscricao;
    }, []);

    const entrar = (parametros = {}) => {
        const provedor = new GoogleAuthProvider();
        // Opcional: Forçar seleção de conta e permitir restrição de domínio
        provedor.setCustomParameters({
            prompt: 'select_account',
            ...parametros
        });
        return signInWithPopup(autenticacao, provedor);
    };

    const sair = () => {
        return signOut(autenticacao);
    };

    const valor = {
        usuarioAtual,
        entrar,
        sair
    };

    return (
        <ContextoAutenticacao.Provider value={valor}>
            {!carregando && children}
        </ContextoAutenticacao.Provider>
    );
}
