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
            className="bg-white rounded shadow-md border border-gray-200 overflow-hidden"
        >
            <div className="p-2 border-b border-gray-100 bg-gray-50">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                        placeholder="Filtrar opções..."
                        value={termo}
                        onChange={(e) => definirTermo(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-1 py-1">
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
                            className={`w-full text-left px-3 py-2 rounded flex items-center justify-between group transition-colors text-sm
                                ${value === opcao.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}
                            `}
                        >
                            <span>{opcao.label}</span>
                            {value === opcao.value && <Check size={16} className="text-blue-600" />}
                        </button>
                    ))
                ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        Nenhuma opção encontrada.
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">{label}</label>}

            <button
                type="button"
                onClick={() => definirAberto(!aberto)}
                className={`w-full bg-white border rounded h-10 px-3 flex items-center justify-between transition-colors
                    ${aberto ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300 hover:border-gray-400'}
                `}
            >
                <span className={`text-sm font-medium ${opcaoSelecionada ? 'text-gray-900' : 'text-gray-400'}`}>
                    {opcaoSelecionada ? opcaoSelecionada.label : placeholder}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${aberto ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {aberto && createPortal(dropdownContent, document.body)}
        </div>
    );
}

