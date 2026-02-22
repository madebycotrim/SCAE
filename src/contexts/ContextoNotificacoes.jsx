import { createContext, useContext, useState, useEffect } from 'react';

const ContextoNotificacoes = createContext();

export function ProvedorNotificacoes({ children }) {
    const [notificacoes, definirNotificacoes] = useState([]);
    const [naoLidas, definirNaoLidas] = useState(0);

    // Carregar notificações do localStorage ao iniciar
    useEffect(() => {
        const salvas = localStorage.getItem('notificacoes');
        if (salvas) {
            try {
                const parsed = JSON.parse(salvas);
                definirNotificacoes(parsed);
            } catch (e) {
                console.error('Erro ao carregar notificações:', e);
            }
        }
    }, []);

    // Atualizar contador e salvar
    useEffect(() => {
        const count = notificacoes.filter(n => !n.lida).length;
        definirNaoLidas(count);
        localStorage.setItem('notificacoes', JSON.stringify(notificacoes));
    }, [notificacoes]);

    const adicionarNotificacao = (dados) => {
        // Suporta string simples ou objeto
        const conteudo = typeof dados === 'string' ? { titulo: 'Novo Aviso', mensagem: dados } : dados;

        const nova = {
            id: crypto.randomUUID(),
            titulo: conteudo.titulo || 'Notificação',
            mensagem: conteudo.mensagem || '',
            tipo: conteudo.tipo || 'info', // info, success, warning, error
            link: conteudo.link || null,
            lida: false,
            timestamp: new Date().toISOString()
        };

        definirNotificacoes(prev => [nova, ...prev]);

        // Tocar som suave se desejar (opcional)
    };

    const marcarComoLida = (id) => {
        definirNotificacoes(prev => prev.map(n =>
            n.id === id ? { ...n, lida: true } : n
        ));
    };

    const marcarTodasComoLidas = () => {
        definirNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    };

    const removerNotificacao = (id) => {
        definirNotificacoes(prev => prev.filter(n => n.id !== id));
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

export function useNotificacoes() {
    const context = useContext(ContextoNotificacoes);
    if (!context) {
        throw new Error('useNotificacoes deve ser usado dentro de um ProvedorNotificacoes');
    }
    return context;
}
