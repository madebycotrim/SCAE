import { ReactNode, useEffect } from 'react';
import { setPersistence, browserSessionPersistence } from 'firebase/auth';
import { autenticacao } from '@/compartilhado/servicos/firebase.config';

export function LayoutCentral({ children }: { children: ReactNode }) {
    useEffect(() => {
        // Configura a sessão da Central para expirar ao fechar a guia/janela
        // Nota: Isso não afeta o Tablet se ele estiver em outra URL/Configuração de persistência local
        if (autenticacao) {
            setPersistence(autenticacao, browserSessionPersistence).catch(console.error);
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-black selection:text-white flex flex-col">
            {/* Área de Conteúdo Principal - Sem Cabeçalho (Visual Imersivo) */}
            <main className="flex-1 relative overflow-hidden flex flex-col">
                {/* Decoradores de Fundo */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-100/30 blur-[150px] rounded-full pointer-events-none -mr-96 -mt-96 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-200/20 blur-[120px] rounded-full pointer-events-none -ml-48 -mb-48 opacity-50"></div>

                <div className="flex-1 overflow-auto relative z-10 scroll-smooth custom-scrollbar">
                    <div className="py-12 px-6 lg:px-12 max-w-[1400px] mx-auto w-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default LayoutCentral;
