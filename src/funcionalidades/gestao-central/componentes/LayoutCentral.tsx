import { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * LayoutCentral - Layout minimalista para o painel de gestão global.
 * Foca em largura total e feedback visual limpo.
 */
export function LayoutCentral({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col items-center">
            <Toaster 
                position="top-right" 
                toastOptions={{
                    style: {
                        background: '#ffffff',
                        color: '#0f172a',
                        borderRadius: '0.375rem',
                        border: '1px solid #e2e8f0',
                        fontSize: '13px',
                        padding: '12px 16px',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                    }
                }}
            />
            <main className="flex-1 w-full relative">
                {children}
            </main>
        </div>
    );
}

export default LayoutCentral;
