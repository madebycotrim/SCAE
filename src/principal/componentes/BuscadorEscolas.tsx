import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Search, X, Building, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Interface para resultados da busca vindo da API
interface EscolaResultado {
    id: string;
    nome: string;
    slug: string;
    cidade: string;
}

interface BuscadorEscolasProps {
    temaEscuro: boolean;
    aoSelecionarEscola: (slug: string) => void;
    aoAbrirModalContato: () => void;
}

export function BuscadorEscolas({ temaEscuro, aoSelecionarEscola, aoAbrirModalContato }: BuscadorEscolasProps) {
    const [termoBusca, definirTermoBusca] = useState('');
    const [estaFocado, definirEstaFocado] = useState(false);
    const [indiceFocado, definirIndiceFocado] = useState(-1);
    const [resultados, definirResultados] = useState<EscolaResultado[]>([]);
    const [carregando, definirCarregando] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Efeito para busca dinâmica (debounce simples)
    useEffect(() => {
        if (termoBusca.length < 3) {
            definirResultados([]);
            return;
        }

        const delayBusca = setTimeout(async () => {
            definirCarregando(true);
            try {
                const apiUrl = import.meta.env.VITE_API_URL || '/api';
                const resposta = await fetch(`${apiUrl}/escola/buscar?q=${encodeURIComponent(termoBusca)}`);
                if (resposta.ok) {
                    const dados = await resposta.json();
                    // Mapear resposta da API para o formato esperado pelo componente
                    const escolasMapeadas = (dados.dados || []).map((e: { id: string; nome: string }) => ({
                        id: e.id,
                        nome: e.nome,
                        slug: e.id,
                        cidade: '', // Campo não disponível na busca pública
                    }));
                    definirResultados(escolasMapeadas);
                } else {
                    definirResultados([]);
                }
            } catch (error) {
                console.error('Erro ao buscar escolas:', error);
                definirResultados([]);
            } finally {
                definirCarregando(false);
            }
        }, 500);

        return () => clearTimeout(delayBusca);
    }, [termoBusca]);

    useEffect(() => {
        const lidarComCliqueFora = (evento: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(evento.target as Node)) {
                definirEstaFocado(false);
            }
        };
        document.addEventListener('mousedown', lidarComCliqueFora);
        return () => document.removeEventListener('mousedown', lidarComCliqueFora);
    }, []);

    const aoPressionarTecla = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const slug = termoBusca.trim().toLowerCase().replace(/\s+/g, '-');
            if (slug) aoSelecionarEscola(slug);
        } else if (e.key === 'Escape') {
            definirEstaFocado(false);
            const input = dropdownRef.current?.querySelector('input');
            if (input) input.blur();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="w-full max-w-2xl mx-auto relative z-50"
            ref={dropdownRef}
        >
            <div className={`relative flex items-center rounded-2xl border-[1.5px] transition-all duration-300 group overflow-hidden ${estaFocado
                ? 'border-slate-400 shadow-sm'
                : temaEscuro ? 'border-slate-700/60 bg-[#0B0F19]/60 shadow-lg hover:border-slate-500/50' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300'
                } ${estaFocado && temaEscuro ? 'bg-[#111827]' : estaFocado ? 'bg-white' : 'backdrop-blur-xl'}`}
            >
                {/* Background animado no hover/foco */}
                <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${estaFocado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${temaEscuro ? 'bg-slate-800/50' : 'bg-slate-50/50'}`}></div>

                <div className={`pl-6 relative z-10 transition-colors duration-300 ${estaFocado ? 'text-slate-500' : temaEscuro ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400 group-hover:text-slate-500'}`}>
                    <Search className="w-6 h-6" />
                </div>
                <input
                    id="search-input"
                    type="text"
                    className={`w-full bg-transparent py-5 px-4 text-lg outline-none font-medium relative z-10 transition-colors ${temaEscuro ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                    placeholder="Busque sua escola digitando pelo menos 3 letras..."
                    value={termoBusca}
                    onChange={(e) => definirTermoBusca(e.target.value)}
                    onFocus={() => definirEstaFocado(true)}
                    onKeyDown={aoPressionarTecla}
                    autoComplete="off"
                />

                <div className="pr-3 flex items-center gap-2 relative z-10">
                    {termoBusca && (
                        <button
                            onClick={() => { definirTermoBusca(''); document.getElementById('search-input')?.focus(); }}
                            className={`p-2 rounded-full transition-all duration-300 ${temaEscuro ? 'hover:bg-slate-800 text-slate-400 hover:text-white hover:rotate-90' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700 hover:rotate-90'}`}
                            aria-label="Limpar busca"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        className="bg-[#0d1f3c] hover:bg-[#0a1628] text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 active:translate-y-0 overflow-hidden relative group/btn"
                        onClick={() => {
                            const slug = termoBusca.trim().toLowerCase().replace(/\s+/g, '-');
                            if (slug) aoSelecionarEscola(slug);
                        }}
                    >
                        <span className="relative z-10">Acessar</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] skew-x-[-30deg] group-hover/btn:translate-x-[150%] transition-transform duration-700 ease-in-out"></div>
                    </button>
                </div>
            </div>

            {/* Dropdown Results - Only for search matches in DB in the future */}
            <AnimatePresence>
                {estaFocado && termoBusca.length > 2 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute top-[calc(100%+12px)] left-0 w-full rounded-2xl border shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden ${temaEscuro ? 'bg-[#111827] border-slate-700/80 shadow-sky-500/5' : 'bg-white border-slate-100'}`}
                    >
                        <div className="max-h-[350px] overflow-y-auto overscroll-contain pb-2">
                            {resultados.length > 0 ? (
                                <ul className="py-2">
                                    {resultados.map((escola, indice) => {
                                        const estaSelecionado = indice === indiceFocado;
                                        return (
                                            <li key={escola.id}>
                                                <button
                                                    onClick={() => aoSelecionarEscola(escola.slug)}
                                                    onMouseEnter={() => definirIndiceFocado(indice)}
                                                    className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors group border-b border-transparent last:border-none 
                                                        ${estaSelecionado
                                                            ? (temaEscuro ? 'bg-sky-500/10 border-sky-500/20' : 'bg-sky-50 border-sky-100')
                                                            : (temaEscuro ? 'hover:bg-slate-800/80' : 'hover:bg-slate-50 hover:border-slate-100')}`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-sm
                                                                ${estaSelecionado
                                                                ? (temaEscuro ? 'bg-sky-500/20 border border-sky-500/40 text-sky-400 scale-110 shadow-sky-500/20' : 'bg-sky-100 border border-sky-200 text-sky-700 scale-110 shadow-sky-200/50')
                                                                : (temaEscuro ? 'bg-slate-800/80 border border-slate-700 text-slate-400 group-hover:text-sky-400 group-hover:bg-sky-500/10 group-hover:border-sky-500/30' : 'bg-slate-50 border border-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:border-sky-100 group-hover:text-sky-600')}`}
                                                        >
                                                            <Building className={`w-6 h-6 transition-transform duration-300 ${estaSelecionado ? 'rotate-3' : 'group-hover:rotate-3'}`} />
                                                        </div>
                                                        <div>
                                                            <p className={`font-bold text-lg transition-colors
                                                                ${estaSelecionado
                                                                    ? (temaEscuro ? 'text-white' : 'text-sky-900')
                                                                    : (temaEscuro ? 'text-slate-200 group-hover:text-white' : 'text-slate-800 group-hover:text-sky-700')}`}
                                                            >
                                                                {escola.nome}
                                                            </p>
                                                            <p className={`text-sm font-medium flex items-center gap-1.5 mt-0.5
                                                                ${estaSelecionado
                                                                    ? (temaEscuro ? 'text-sky-300' : 'text-sky-600')
                                                                    : (temaEscuro ? 'text-slate-500' : 'text-slate-500')}`}
                                                            >
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                {escola.cidade}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={`w-5 h-5 transition-all
                                                        ${estaSelecionado
                                                            ? (temaEscuro ? 'text-sky-400 translate-x-1' : 'text-sky-600 translate-x-1')
                                                            : (temaEscuro ? 'text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1' : 'text-slate-300 group-hover:text-sky-500 group-hover:translate-x-1')}`}
                                                    />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="py-12 px-6 text-center flex flex-col items-center">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${temaEscuro ? 'bg-slate-800/80 ring-1 ring-slate-700' : 'bg-slate-50 ring-1 ring-slate-100'}`}>
                                        <AlertCircle className={`w-6 h-6 ${temaEscuro ? 'text-slate-500' : 'text-slate-300'}`} />
                                    </div>
                                    <p className={`font-medium text-lg ${temaEscuro ? 'text-slate-300' : 'text-slate-600'}`}>Nenhum resultado encontrado</p>
                                    <p className={`text-sm mt-2 max-w-sm mx-auto ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Se sua escola já utiliza o SCAE, digite o código fornecido pela instituição e clique em Acessar.
                                    </p>
                                    <button
                                        onClick={() => { definirEstaFocado(false); aoAbrirModalContato(); }}
                                        className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm
                                            ${temaEscuro
                                                ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 hover:border-sky-500/50'
                                                : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-100 hover:border-sky-200'}`}
                                    >
                                        Indique o SCAE para sua escola!
                                    </button>
                                </div>
                            )}
                        </div>

                        {resultados.length > 0 && (
                            <div className={`px-6 py-3 border-t flex items-center justify-between
                                ${temaEscuro ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}
                            >
                                <span className={`text-xs font-semibold uppercase tracking-wider ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {resultados.length} resultado(s)
                                </span>
                                <div className={`flex items-center gap-1.5 text-xs font-medium ${temaEscuro ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <span>Navegar</span>
                                    <kbd className={`px-1.5 py-0.5 border rounded font-sans shadow-sm ${temaEscuro ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>↓</kbd>
                                    <kbd className={`px-1.5 py-0.5 border rounded font-sans shadow-sm ${temaEscuro ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>↑</kbd>
                                    <span className="ml-1">Selecionar</span>
                                    <kbd className={`px-1.5 py-0.5 border rounded font-sans shadow-sm ${temaEscuro ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>↵</kbd>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

