/**
 * Tela de Autenticação para o Portal do Titular (LGPD)
 * Exige apenas Matrícula e Telefone válido vinculado ao aluno (cadastrado no quiosque ou online).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usarTenant } from '@tenant/provedorTenant';
import { portalService } from '../servicos/portal.service';
import { Shield, Fingerprint, LogIn, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { criarRegistrador } from '@compartilhado/utils/registrarLocal';

const log = criarRegistrador('PortalTitular');

export default function TelaLoginPortal() {
    const { nomeEscola, id: slugEscola } = usarTenant();
    const navegar = useNavigate();

    const [matricula, definirMatricula] = useState('');
    const [telefone, definirTelefone] = useState('');
    const [carregando, definirCarregando] = useState(false);

    // Máscara Simples de Telefone (11) 99999-9999
    const formatarTelefone = (valor: string) => {
        const d = valor.replace(/\\D/g, '');
        if (d.length <= 2) return d;
        if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
    };

    const lidarComBusca = async (e: React.FormEvent) => {
        e.preventDefault();

        if (matricula.trim() === '' || telefone.trim().length < 14) {
            toast.error('Preencha a matrícula e o telefone completo.');
            return;
        }

        definirCarregando(true);
        try {
            await portalService.autenticar(telefone, matricula);
            toast.success('Identidade confirmada.');
            navegar(`/${slugEscola}/portal-titular/painel`);
        } catch (error) {
            toast.error('Credenciais inválidas. Verifique com a secretaria.');
            log.error('Falha na autenticação do portal do titular', error);
        } finally {
            definirCarregando(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">

            {/* Header / Brand */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-4 relative">
                    <Shield className="text-indigo-600 w-8 h-8" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center border-2 border-slate-50">
                        <Fingerprint className="text-emerald-600 w-3 h-3" />
                    </div>
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Portal do Titular</h1>
                <p className="text-slate-500 font-medium text-sm mt-1">{nomeEscola}</p>
                <div className="mt-3 inline-block bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                    <p className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
                        Acesso Restrito: Pais e Responsáveis
                    </p>
                </div>
            </div>

            {/* Login Card */}
            <form onSubmit={lidarComBusca} className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                            Matrícula do Aluno
                        </label>
                        <input
                            type="text"
                            value={matricula}
                            onChange={e => definirMatricula(e.target.value.replace(/\\D/g, ''))} // Numeric
                            placeholder="Apenas números ex: 12345"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                            Seu Telefone / WhatsApp
                        </label>
                        <input
                            type="tel"
                            value={telefone}
                            onChange={e => definirTelefone(formatarTelefone(e.target.value))}
                            placeholder="(61) 90000-0000"
                            maxLength={15}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            required
                        />
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                            Usado para verificar a sua autoridade legal via cruzamento de banco de dados.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        type="submit"
                        disabled={carregando}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                        {carregando ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <LogIn size={18} />
                                Consultar Dados
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => navegar(`/${slugEscola}/login`)}
                        className="w-full flex items-center justify-center gap-2 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold py-3 border border-slate-200 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Voltar ao Início
                    </button>
                </div>

            </form>

            {/* Footer */}
            <p className="text-center text-xs text-slate-400 mt-8 max-w-xs leading-relaxed">
                Este ambiente é protegido pelos termos da Lei Geral de Proteção de Dados (Art 18. Lei Nº 13.709/2018).
            </p>

        </div>
    );
}

