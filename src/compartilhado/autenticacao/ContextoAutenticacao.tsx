import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    onAuthStateChanged, 
    signInWithRedirect, 
    getRedirectResult,
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

        const [carregandoRedirect, definirCarregandoRedirect] = [true, (v: boolean) => {}]; // Apenas controle interno
        
        let authPronta = false;
        let redirectPronto = false;

        const verificarProntidao = () => {
            if (authPronta && redirectPronto) {
                definirCarregando(false);
            }
        };

        // 🔗 Tratar resultado esperado de redirecionamento
        const tratarRedirect = async () => {
            try {
                const resultado = await getRedirectResult(autenticacao);
                if (resultado) {
                    log.info('Login via Redirect bem sucedido:', resultado.user.email);
                    toast.success(`Bem-vindo, ${resultado.user.displayName || 'Usuário'}!`);
                }
            } catch (err: any) {
                log.error('Erro no retorno do Google Login:', `${err.code} - ${err.message}`);
                if (err.code === 'auth/unauthorized-domain') {
                    toast.error('Domínio não autorizado no Firebase!');
                }
            } finally {
                redirectPronto = true;
                verificarProntidao();
            }
        };

        tratarRedirect();

        const cancelarInscricao = onAuthStateChanged(autenticacao, async (usuario) => {
            if (usuario) {
                const token = await usuario.getIdToken();
                Object.defineProperty(usuario, 'token', { value: token, writable: true, configurable: true });
            }
            definirUsuarioAtual(usuario);
            authPronta = true;
            verificarProntidao();
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
        // Usar Redirect para evitar erros de COOP e bloqueio de popups
        return signInWithRedirect(autenticacao, provedor);
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
