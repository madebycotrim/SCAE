import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RodapeInicialProps {
    temaEscuro: boolean;
}

export function RodapeInicial({ temaEscuro }: RodapeInicialProps) {
    const ano = new Date().getFullYear();

    return (
        <footer className={`relative z-20 w-full pt-16 pb-8 border-t transition-colors duration-500 ${temaEscuro ? 'bg-[#0B0F19] border-slate-800/60' : 'bg-white border-slate-100'}`}>
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col items-center justify-center text-center">
                    
                    {/* Brand / Logo Sutil */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-2 mb-8 group cursor-default"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 ${temaEscuro ? 'bg-slate-800' : 'bg-[#0d1f3c]'}`}>
                            <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                        <span className={`text-lg font-bold tracking-tight ${temaEscuro ? 'text-white' : 'text-slate-900'}`}>
                            Catraki<span className="text-sky-500">.</span>
                        </span>
                    </motion.div>

                    {/* Texto Principal */}
                    <div className="max-w-2xl mb-8">
                        <p className={`text-sm font-medium leading-relaxed ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>
                            &copy; {ano} Catraki. Desenvolvido por um estudante universitário para melhorar a segurança nas escolas públicas brasileiras. 
                            Um projeto independente dedicado à inovação na gestão escolar pública.
                        </p>
                    </div>

                    {/* Links Legais */}
                    <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 mb-10">
                        <Link 
                            to="/termos-de-uso" 
                            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:tracking-[0.25em] ${temaEscuro ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Termos de Uso
                        </Link>
                        <span className={`hidden sm:block w-1 h-1 rounded-full ${temaEscuro ? 'bg-slate-800' : 'bg-slate-200'}`}></span>
                        <Link 
                            to="/politica-de-privacidade" 
                            className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:tracking-[0.25em] ${temaEscuro ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Política de Privacidade
                        </Link>
                    </div>

                    {/* Assinatura */}
                    <div className="flex items-center gap-3">
                        <div className={`h-px w-8 ${temaEscuro ? 'bg-slate-800/60' : 'bg-slate-100'}`}></div>
                        <a 
                            href="https://github.com/madebycotrim" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:text-sky-500 ${temaEscuro ? 'text-slate-600' : 'text-slate-300'}`}
                        >
                            madebycotrim
                        </a>
                        <div className={`h-px w-8 ${temaEscuro ? 'bg-slate-800/60' : 'bg-slate-100'}`}></div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
