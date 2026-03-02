import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Opcao {
    label: string;
    value: string | number;
}

interface SelectComBuscaProps {
    options: Opcao[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

/**
 * Componente de seleção customizado com busca integrada.
 * Utiliza portais para evitar problemas de overflow/z-index.
 */
export function SelectComBusca({ options, value, onChange, placeholder = "Selecione...", label, className }: SelectComBuscaProps) {
    const [aberto, definirAberto] = useState(false);
    const [termo, definirTermo] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Atualizar coordenadas ao abrir e manter atualizado
    useEffect(() => {
        if (aberto && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current!.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + window.scrollY + 8,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            };

            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);

            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            };
        }
    }, [aberto]);

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target as Node);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);

            if (isOutsideContainer && isOutsideDropdown) {
                definirAberto(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const opcoesFiltradas = options.filter(opcao =>
        opcao.label.toLowerCase().includes(termo.toLowerCase())
    );

    const opcaoSelecionada = options.find(o => o.value === value);

    const dropdownContent = (
        <div
            ref={dropdownRef}
            style={{
                position: 'absolute',
                top: coords.top,
                left: coords.left,
                width: coords.width,
                zIndex: 9999
            }}
            className="bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
            <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500 placeholder:text-slate-300 transition-colors"
                        placeholder="Filtrar opções..."
                        value={termo}
                        onChange={(e) => definirTermo(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                {opcoesFiltradas.length > 0 ? (
                    opcoesFiltradas.map((opcao) => (
                        <button
                            key={opcao.value}
                            type="button"
                            onClick={() => {
                                onChange(opcao.value);
                                definirAberto(false);
                                definirTermo('');
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between group transition-colors
                                ${value === opcao.value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            <span className="font-black text-sm">{opcao.label}</span>
                            {value === opcao.value && <Check size={16} className="text-indigo-700" />}
                        </button>
                    ))
                ) : (
                    <div className="p-4 text-center text-slate-400 text-sm font-medium">
                        Nenhuma opção encontrada.
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative" ref={containerRef}>
            {label ? <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label> : null}

            <button
                type="button"
                onClick={() => definirAberto(!aberto)}
                className={className || `w-full px-4 h-12 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold flex items-center justify-between transition-colors shadow-sm focus:outline-none focus:border-indigo-600 hover:border-slate-400
                    ${aberto ? 'border-indigo-600 ring-2 ring-indigo-50' : ''}
                `}
            >
                <span className={`block truncate ${className ? '' : (opcaoSelecionada ? 'text-slate-950 font-black' : 'text-slate-400')}`}>
                    {opcaoSelecionada ? opcaoSelecionada.label : placeholder}
                </span>
                <ChevronDown size={className ? 16 : 18} className={`flex-shrink-0 ml-1 transition-transform duration-200 ${className ? '' : 'text-slate-900'} ${aberto ? (className ? 'rotate-180' : 'rotate-180 text-indigo-600') : ''}`} />
            </button>

            {aberto && createPortal(dropdownContent, document.body)}
        </div>
    );
}
