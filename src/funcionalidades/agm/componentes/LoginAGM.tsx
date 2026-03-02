import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { usarAutenticacao } from '@compartilhado/autenticacao/ContextoAutenticacao';

export default function LoginAGM() {
    const [email, definirEmail] = useState('');
    const [senha, definirSenha] = useState('');
    const [loading, definirLoading] = useState(false);
    const [erro, definirErro] = useState('');

    const navigate = useNavigate();
    const { entrar } = usarAutenticacao();

    const lidarComLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (email.trim().toLowerCase() !== 'madebycotrim@gmail.com') {
            definirErro('Acesso Classificado. Apenas o E-mail Mestre Root (Fabricante) pode autenticar-se na malha.');
            return;
        }

        definirLoading(true);
        definirErro('');

        try {
            // Em ambiente real, garantimos via Claim que é root/agm
            await entrar({ login_hint: email });
            navigate('/agm/painel');
        } catch (err: any) {
            definirErro('Acesso negado. Credenciais inválidas ou sem permissão AGM.');
        } finally {
            definirLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <ShieldAlert className="text-indigo-500 mx-auto mb-4" size={40} />
                    <h1 className="text-2xl font-semibold text-white tracking-tight">SCAE Server</h1>
                    <p className="text-slate-400 mt-2 text-sm">Painel Central de Administração (AGM)</p>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-lg">
                    <form onSubmit={lidarComLogin} className="space-y-5">
                        {erro && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm text-center">
                                {erro}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail do Administrador</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => definirEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                                placeholder="root@scae.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha Mestra</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={(e) => definirSenha(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                                <KeyRound className="absolute right-3 top-3.5 text-slate-500" size={16} />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center mt-6 text-sm"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Acessar Central'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
