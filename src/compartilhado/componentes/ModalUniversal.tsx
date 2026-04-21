import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Info } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalUniversalProps {
    aberto?: boolean;
    fechavel?: boolean;
    aoFechar: () => void;
    titulo: string;
    subtitulo?: string;
    icone?: React.ElementType;
    children: ReactNode;
    tamanho?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';
    cor?: string;
}

export default function ModalUniversal({
    aberto = true,
    fechavel = false,
    aoFechar,
    titulo,
    subtitulo,
    icone: Icone = Info,
    children,
    tamanho = 'md',
    cor = 'indigo'
}: ModalUniversalProps) {
    if (!aberto) return null;

    const larguras = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        auto: 'w-auto max-w-[95vw]' // Adaptável ao conteúdo
    };

    const cores = {
        indigo: { bg: 'bg-blue-50/30', text: 'text-blue-600', border: 'border-blue-100/50', ring: 'border-blue-100' },
        blue: { bg: 'bg-blue-50/30', text: 'text-blue-600', border: 'border-blue-100/50', ring: 'border-blue-100' },
        red: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', ring: 'border-rose-200' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'border-emerald-200' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', ring: 'border-amber-200' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', ring: 'border-rose-200' },
        violet: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', ring: 'border-slate-200' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', ring: 'border-slate-200' }
    };

    const tema = cores[cor] || cores.indigo;

    // Fechar com ESC e Bloquear Scroll
    useEffect(() => {
        if (aberto) {
            // Bloquear scroll
            document.body.style.overflow = 'hidden';

            // Listener para ESC
            const handleEsc = (e) => {
                if (e.key === 'Escape') aoFechar();
            };
            window.addEventListener('keydown', handleEsc);

            return () => {
                document.body.style.overflow = 'unset';
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [aberto, aoFechar]);

    return createPortal(
        <div
            className="fixed inset-0 bg-slate-900/40 z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) aoFechar();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-titulo"
            aria-describedby={subtitulo ? "modal-subtitulo" : undefined}
        >
            <div className={`
                bg-white rounded-xl shadow-xl w-full ${larguras[tamanho] || larguras.md} 
                flex flex-col max-h-[90vh] border border-slate-200 overflow-hidden
                animate-in fade-in zoom-in-95 duration-200 relative
            `}>
                {/* Header Universal - Sticky */}
                <div className={`
                    shrink-0 p-5 flex items-center gap-4 border-b border-slate-100 
                    ${tema.bg} relative z-20
                `}>
                    <div className={`
                        w-10 h-10 rounded-xl bg-white border border-slate-200 shrink-0 
                        ${tema.text} flex items-center justify-center
                    `}>
                        <Icone size={20} strokeWidth={2} aria-hidden="true" />
                    </div>

                    <div className="flex-1 pt-0.5 min-w-0">
                        <h2 id="modal-titulo" className="text-lg font-bold text-slate-800 leading-tight tracking-tight truncate">
                            {titulo}
                        </h2>
                        {subtitulo && (
                            <p id="modal-subtitulo" className="text-sm text-slate-400 mt-0.5 leading-relaxed font-medium truncate">
                                {subtitulo}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={aoFechar}
                        aria-label="Fechar diálogo"
                        className="
                            group shrink-0 p-2 rounded-lg transition-all duration-150
                            text-slate-400 hover:text-slate-900 hover:bg-slate-100
                        "
                        title="Fechar (ESC)"
                    >
                        <X size={18} strokeWidth={2} aria-hidden="true" />
                    </button>
                </div>

                {/* Conteúdo Scrollável */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar scroll-smooth relative z-10 bg-white">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}



