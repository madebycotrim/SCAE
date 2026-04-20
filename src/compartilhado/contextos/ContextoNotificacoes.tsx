import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { criarRegistrador } from '@/compartilhado/utils/registrarLocal';
import { usarAutenticacao } from '@/compartilhado/autenticacao/ContextoAutenticacao';
import { dispararToast } from '@/compartilhado/componentes/NotificacaoPremium';
import { storageEscola } from '../utils/utilidades-slug';

const log = criarRegistrador('Notificacoes');

export interface Notificacao {
    id: string;
    titulo: string;
    mensagem: string;
    tipo: 'info' | 'success' | 'warning' | 'error';
    link: string | null;
    lida: boolean;
    timestamp: string;
}

interface ContextoNotificacoesType {
    notificacoes: Notificacao[];
    naoLidas: number;
    adicionarNotificacao: (dados: string | Partial<Notificacao>) => void;
    marcarComoLida: (id: string) => void;
    marcarTodasComoLidas: () => void;
    removerNotificacao: (id: string) => void;
    limparTodas: () => void;
}

const ContextoNotificacoes = createContext<ContextoNotificacoesType | undefined>(undefined);

export function ProvedorNotificacoes({ children }: { children: ReactNode }) {
    const { usuarioAtual } = usarAutenticacao();
    const [notificacoes, definirNotificacoes] = useState<Notificacao[]>([]);
    const [naoLidas, definirNaoLidas] = useState(0);

    const chaveDependencia = usuarioAtual?.email || 'visitante';

    // Carregar notificações ao iniciar ou mudar de escola/usuário
    useEffect(() => {
        const salvas = storageEscola.get<Notificacao[]>('notificacoes', []);
        definirNotificacoes(salvas);
    }, [chaveDependencia]);

    // Atualizar contador e salvar com blindagem de slug
    useEffect(() => {
        const count = notificacoes.filter(n => !n.lida).length;
        definirNaoLidas(count);
        storageEscola.set('notificacoes', notificacoes);
    }, [notificacoes, chaveDependencia]);

    const adicionarNotificacao = useCallback((dados: string | Partial<Notificacao>) => {
        const conteudo = typeof dados === 'string' ? { titulo: 'Novo Aviso', mensagem: dados } : dados;

        const nova: Notificacao = {
            id: crypto.randomUUID(),
            titulo: conteudo.titulo || 'Notificação',
            mensagem: conteudo.mensagem || '',
            tipo: (conteudo.tipo as 'info' | 'success' | 'warning' | 'error') || 'info',
            link: conteudo.link || null,
            lida: false,
            timestamp: new Date().toISOString()
        };

        definirNotificacoes(anterior => {
            const novaLista = [nova, ...anterior];
            if (novaLista.length > 50) return novaLista.slice(0, 50);
            return novaLista;
        });

        dispararToast(nova.titulo, nova.mensagem, nova.tipo);
    }, []);

    const marcarComoLida = (id: string) => {
        definirNotificacoes(prev => prev.map(n =>
            n.id === id ? { ...n, lida: true } : n
        ));
    };

    const marcarTodasComoLidas = () => {
        definirNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    };

    const removerNotificacao = (id: string) => {
        definirNotificacoes(anterior => anterior.filter(n => n.id !== id));
    };

    const limparTodas = () => {
        definirNotificacoes([]);
    };

    const value = {
        notificacoes,
        naoLidas,
        adicionarNotificacao,
        marcarComoLida,
        marcarTodasComoLidas,
        removerNotificacao,
        limparTodas
    };

    return (
        <ContextoNotificacoes.Provider value={value}>
            {children}
        </ContextoNotificacoes.Provider>
    );
}

export function usarNotificacoes() {
    const context = useContext(ContextoNotificacoes);
    if (!context) {
        throw new Error('usarNotificacoes deve ser usado dentro de um ProvedorNotificacoes');
    }
    return context;
}
