import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { autenticacao } from '@funcionalidades/autenticacao/servicos/firebase.config';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

import { servicoSincronizacao } from '@compartilhado/servicos/sincronizacao';

const log = criarRegistrador('Auth');

interface AuthContextType {
    usuarioAtual: (User & { token?: string }) | null;
    entrar: (parametros?: Record<string, string>) => Promise<unknown>;
    sair: () => Promise<void>;
}

const ContextoAutenticacao = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useAutenticacao() {
    const contexto = useContext(ContextoAutenticacao);
    if (contexto === undefined) {
        throw new Error('useAutenticacao deve ser usado dentro de ProvedorAutenticacao');
    }
    return contexto;
}

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
    const [usuarioAtual, definirUsuarioAtual] = useState<(User & { token?: string }) | null>(null);
    const [carregando, definirCarregando] = useState(true);

    useEffect(() => {
        const cancelarInscricao = onAuthStateChanged(autenticacao, async (usuario) => {
            if (usuario) {
                // Atualiza token se necessÃ¡rio
                const token = await usuario.getIdToken();
                (usuario as unknown as Record<string, unknown>).token = token;

                // ðŸ”„ Auto-Sync ao Login
                log.info('UsuÃ¡rio autenticado. Iniciando sincronizaÃ§Ã£o automÃ¡tica...');
                servicoSincronizacao.sincronizarTudo().catch(e => log.warn('Erro na auto-sync', e));
            }
            definirUsuarioAtual(usuario);
            definirCarregando(false);
        });

        return cancelarInscricao;
    }, []);

    const entrar = (parametros = {}) => {
        const provedor = new GoogleAuthProvider();
        // Opcional: ForÃ§ar seleÃ§Ã£o de conta e permitir restriÃ§Ã£o de domÃ­nio
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
