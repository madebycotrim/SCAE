import { Link } from 'react-router-dom';

interface RodapeInicialProps {
    temaEscuro: boolean;
}

export function RodapeInicial({ temaEscuro }: RodapeInicialProps) {
    return (
        <footer className={`relative z-10 py-8 text-center flex flex-col items-center justify-center gap-2 transition-colors ${temaEscuro ? 'bg-[#0B0F19] text-slate-500' : 'bg-white border-t border-slate-100 text-slate-400'}`}>
            <p className="text-sm font-medium">© {new Date().getFullYear()} SCAE. Desenvolvido por um estudante universitário para melhorar a segurança nas escolas públicas brasileiras.</p>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                <Link to="/termos-de-uso" className="hover:text-slate-700 hover:underline transition-colors">Termos de Uso</Link>
                <span className="text-slate-300">&bull;</span>
                <Link to="/politica-de-privacidade" className="hover:text-slate-700 hover:underline transition-colors">Política de Privacidade</Link>
            </div>
            <div className={`mt-1 text-[10px] font-medium tracking-widest uppercase opacity-30 ${temaEscuro ? 'text-slate-600' : 'text-slate-400'}`}>
                madebycotrim
            </div>
        </footer>
    );
}

