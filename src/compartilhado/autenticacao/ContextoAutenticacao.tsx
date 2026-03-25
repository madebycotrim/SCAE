import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    signInWithPopup, 
    GoogleAuthProvider, 
    OAuthProvider,
    signOut, 
    User, 
    setPersistence, 
    browserSessionPersistence, 
    indexedDBLocalPersistence 
} from 'firebase/auth';
import { autenticacao } from '@/compartilhado/servicos/firebase.config';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';

import { servicoSincronizacao } from '@/compartilhado/servicos/sincronizacao';

const log = criarRegistrador('Auth');

interface AuthContextType {
    usuarioAtual: (User & { token?: string }) | null;
    entrar: (parametros?: Record<string, string>, provedorNome?: 'google' | 'microsoft') => Promise<unknown>;
    sair: () => Promise<void>;
}

const ContextoAutenticacao = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function usarAutenticacao() {
    const contexto = useContext(ContextoAutenticacao);
    if (contexto === undefined) {
        throw new Error('usarAutenticacao deve ser usado dentro de ProvedorAutenticacao');
    }
    return contexto;
}

export function ProvedorAutenticacao({ children }: { children: ReactNode }) {
    const [usuarioAtual, definirUsuarioAtual] = useState<(User & { token?: string }) | null>(null);
    const [carregando, definirCarregando] = useState(true);

    useEffect(() => {
        // 🔐 Configuração Dinâmica de Persistência
        const configurarPersistencia = async () => {
            const caminho = window.location.pathname;
            const ehQuiosque = caminho.includes('/quiosque');
            
            try {
                if (ehQuiosque) {
                    await setPersistence(autenticacao, indexedDBLocalPersistence);
                } else {
                    await setPersistence(autenticacao, browserSessionPersistence);
                }
            } catch (err) {
                log.error('Erro ao configurar persistência de sessão:', err);
            }
        };

        configurarPersistencia();

        const cancelarInscricao = onAuthStateChanged(autenticacao, async (usuario) => {
            if (usuario) {
                // Atualiza token — preservar referência do objeto User sem mutação via cast
                const token = await usuario.getIdToken();
                Object.defineProperty(usuario, 'token', { value: token, writable: true, configurable: true });
            }
            definirUsuarioAtual(usuario);
            definirCarregando(false);
        });

        return cancelarInscricao;
    }, []);

    const entrar = (parametros: Record<string, string> = {}, provedorNome: 'google' | 'microsoft' = 'google') => {
        const provedor = provedorNome === 'microsoft' 
            ? new OAuthProvider('microsoft.com') 
            : new GoogleAuthProvider();
            
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
