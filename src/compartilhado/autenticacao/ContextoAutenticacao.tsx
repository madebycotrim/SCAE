import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    signInWithPopup, 
    GoogleAuthProvider, 
    OAuthProvider,
    signOut, 
    User, 
    setPersistence, 
    indexedDBLocalPersistence
} from 'firebase/auth';
import { autenticacao } from '@/compartilhado/servicos/firebase.config';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import toast from 'react-hot-toast';

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
        // 🔥 Garantir a persistência local (IndexedDB) como padrão
        setPersistence(autenticacao, indexedDBLocalPersistence).catch(console.error);

        const cancelarInscricao = onAuthStateChanged(autenticacao, async (usuario) => {
            if (usuario) {
                try {
                    const token = await usuario.getIdToken();
                    (usuario as any).token = token;
                } catch (e) {
                    log.error('Erro ao obter token na inscrição:', e);
                }
            }
            definirUsuarioAtual(usuario);
            definirCarregando(false);
        });

        return cancelarInscricao;
    }, []);

    const entrar = async (parametros: Record<string, string> = {}, provedorNome: 'google' | 'microsoft' = 'google') => {
        const provedor = provedorNome === 'microsoft' 
            ? new OAuthProvider('microsoft.com') 
            : new GoogleAuthProvider();
            
        // Forçar seleção de conta e permitir restrição de domínio
        provedor.setCustomParameters({
            prompt: 'select_account',
            ...parametros
        });
        
        // Garante que a persistência está correta antes de disparar o popup
        await setPersistence(autenticacao, indexedDBLocalPersistence);
        
        // 🔄 Usando POPUP ao invés de Redirect.
        // O COOP (Cross-Origin-Opener-Policy) já foi configurado como 'unsafe-none' no _headers
        // Isso elimina os erros 404 no handler do Firebase (que ocorrem pois não estamos no Firebase Hosting).
        try {
            const resultado = await signInWithPopup(autenticacao, provedor);
            if (resultado && resultado.user) {
                log.info('✅ Login via Popup capturado:', resultado.user.email);
                const token = await resultado.user.getIdToken();
                (resultado.user as any).token = token;
                definirUsuarioAtual(resultado.user);
                toast.success('Acesso validado!');
            }
            return resultado;
        } catch (err: any) {
            log.error('Erro no Google Login Popup:', `${err.code} - ${err.message}`);
            if (err.code === 'auth/unauthorized-domain') {
                toast.error('Domínio não autorizado no Firebase!');
            } else if (err.code === 'auth/popup-closed-by-user') {
                toast.error('O login foi cancelado.');
            } else {
                toast.error('Falha ao autenticar.');
            }
            throw err;
        }
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
