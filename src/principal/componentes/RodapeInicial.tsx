import { Link } from 'react-router-dom';

interface RodapeInicialProps {
    temaEscuro: boolean;
}

export function RodapeInicial({ temaEscuro }: RodapeInicialProps) {
    return (
        <footer className={`relative z-10 py-8 text-center flex flex-col items-center justify-center gap-2 transition-colors ${temaEscuro ? 'bg-[#0B0F19] text-slate-500' : 'bg-[#F8FAFC] text-slate-400'}`}>
            <p className="text-slate-400 text-sm font-medium">© {new Date().getFullYear()} SCAE. Desenvolvido com foco na experiência escolar.</p>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                <Link to="/termos-de-uso" className="hover:text-indigo-600 transition-colors">Termos de Uso</Link>
                <span>&bull;</span>
                <Link to="/politica-de-privacidade" className="hover:text-indigo-600 transition-colors">Política de Privacidade</Link>
            </div>
            <div className={`mt-1 text-[10px] font-medium tracking-widest uppercase opacity-30 ${temaEscuro ? 'text-slate-600' : 'text-slate-400'}`}>
                madebycotrim
            </div>
        </footer>
    );
}

