import { ReactNode } from 'react';

/**
 * LayoutCentral - Layout minimalista para o painel de gestão global.
 * Foca em largura total e feedback visual limpo.
 */
export function LayoutCentral({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center">
            <main className="flex-1 w-full relative">
                {children}
            </main>
        </div>
    );
}

export default LayoutCentral;
