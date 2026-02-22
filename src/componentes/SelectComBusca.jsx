import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';

export default function SelectComBusca({ options, value, onChange, placeholder = "Selecione...", label }) {
    const [aberto, definirAberto] = useState(false);
    const [termo, definirTermo] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Atualizar coordenadas ao abrir e manter atualizado
    useEffect(() => {
        if (aberto && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current.getBoundingClientRect();
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
        const handleClickOutside = (event) => {
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target);
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);

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
                        type="text"
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder:text-slate-300"
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
                            <span className="font-bold text-sm">{opcao.label}</span>
                            {value === opcao.value && <Check size={16} className="text-indigo-600" />}
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
            {label && <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>}

            <button
                type="button"
                onClick={() => definirAberto(!aberto)}
                className={`w-full bg-slate-50 border-2 rounded-xl py-3 px-4 flex items-center justify-between transition-all
                    ${aberto ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-white' : 'border-slate-200 hover:border-indigo-300 hover:bg-white'}
                `}
            >
                <span className={`text-base font-bold ${opcaoSelecionada ? 'text-slate-700' : 'text-slate-400'}`}>
                    {opcaoSelecionada ? opcaoSelecionada.label : placeholder}
                </span>
                <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${aberto ? 'rotate-180 text-indigo-500' : ''}`} />
            </button>

            {aberto && createPortal(dropdownContent, document.body)}
        </div>
    );
}
