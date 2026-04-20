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
        // 🔥 Correção CRÍTICA do Loop de Login: 
        // Não alterar setPersistence no mount. Isso destrói o estado pendente do signInWithRedirect!
        // Mantemos o padrão estático (indexedDBLocalPersistence) globalmente.
        setPersistence(autenticacao, indexedDBLocalPersistence).catch(console.error);

        let authPronta = false;
        let redirectPronto = false;

        const verificarProntidao = () => {
            if (authPronta && redirectPronto) {
                definirCarregando(false);
            }
        };

        // 🔗 Tratar resultado esperado de redirecionamento
        const tratarRedirect = async () => {
            log.info('🔍 Verificando se há retorno de login pendente...');
            try {
                const resultado = await getRedirectResult(autenticacao);
                if (resultado) {
                    log.info('✅ Login via Redirect capturado:', resultado.user.email);
                    
                    // 🛡️ Injeção manual do token para garantir prontidão
                    const token = await resultado.user.getIdToken();
                    (resultado.user as any).token = token;
                    
                    definirUsuarioAtual(resultado.user);
                    toast.success('Acesso validado!');
                }
            } catch (err: any) {
                log.error('Erro no retorno do Google Login:', `${err.code} - ${err.message}`);
                // Ignorar erro do Firebase se for timeout de redirect vazio
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
                (usuario as any).token = token;
            }
            definirUsuarioAtual(usuario);
            authPronta = true;
            verificarProntidao();
        });

        return cancelarInscricao;
    }, []);

    const entrar = async (parametros: Record<string, string> = {}, provedorNome: 'google' | 'microsoft' = 'google') => {
        const provedor = provedorNome === 'microsoft' 
            ? new OAuthProvider('microsoft.com') 
            : new GoogleAuthProvider();
            
        // Opcional: Forçar seleção de conta e permitir restrição de domínio
        provedor.setCustomParameters({
            prompt: 'select_account',
            ...parametros
        });
        
        // Garante que a persistência está correta antes de disparar o redirect
        await setPersistence(autenticacao, indexedDBLocalPersistence);
        
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
