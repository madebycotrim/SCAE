import { createContext, useContext, useState, ReactNode } from 'react';

interface ContextoBuscaGlobalType {
    termo: string;
    definirTermo: (termo: string) => void;
}

const ContextoBuscaGlobal = createContext<ContextoBuscaGlobalType | undefined>(undefined);

export function ProvedorBuscaGlobal({ children }: { children: ReactNode }) {
    const [termo, definirTermo] = useState('');

    return (
        <ContextoBuscaGlobal.Provider value={{ termo, definirTermo }}>
            {children}
        </ContextoBuscaGlobal.Provider>
    );
}

export function usarTermoBusca() {
    const contexto = useContext(ContextoBuscaGlobal);
    if (!contexto) {
        throw new Error('usarTermoBusca deve ser usado dentro de um ProvedorBuscaGlobal');
    }
    return contexto;
}
