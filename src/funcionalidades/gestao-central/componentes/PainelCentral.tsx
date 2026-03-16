import { Building2, Users, AlertOctagon, Activity, Server, Zap } from 'lucide-react';
import { CartaoConteudo } from '@/compartilhado/componentes/UI';

export default function PainelCentral() {
    return (
        <div className="space-y-10 animate-fade-in pb-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-800/60 border border-slate-800/80 p-10 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-slate-700/5 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center border border-slate-700/80 text-slate-400 shadow-xl">
                        <Activity size={32} className="animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1.5">Monitoramento</p>
                        <h2 className="text-3xl font-black text-slate-100 uppercase tracking-tight">SCAE Infraestrutura</h2>
                        <p className="text-slate-600 text-xs font-bold mt-1 uppercase tracking-wider">Telemetria em Tempo Real • 2 Nós Ativos</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="px-6 py-4 bg-slate-800/50 rounded-2xl border border-slate-800/80 flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-400 shadow-[0_0_10px_rgba(100,116,139,0.5)]"></div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Operacional</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MetricCard
                    label="Escolas Ativas"
                    valor="0"
                    sub="Federadas"
                    icone={Building2}
                />
                <MetricCard
                    label="Usuários Master"
                    valor="0"
                    sub="Com Acesso"
                    icone={Users}
                />
                <MetricCard
                    label="Incidentes (24h)"
                    valor="0"
                    sub="Críticos"
                    icone={AlertOctagon}
                />
            </div>

            {/* Serviços */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CartaoConteudo className="bg-slate-800/60 border-slate-800/80 p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <Server size={18} className="text-slate-400" /> Infraestrutura
                        </h3>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">v2.4.0</span>
                    </div>
                    <div className="space-y-6">
                        <StatusItem label="API Gateway (Cloudflare)" status="Online" latency="12ms" />
                        <StatusItem label="Database (D1)" status="Online" latency="8ms" />
                        <StatusItem label="Autenticação (Firebase)" status="Online" latency="45ms" />
                    </div>
                </CartaoConteudo>

                <CartaoConteudo className="bg-slate-800/60 border-slate-800/80 p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-3">
                            <Zap size={18} className="text-slate-400" /> Performance
                        </h3>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">99.9% Uptime</span>
                    </div>
                    <div className="h-32 flex items-end gap-1.5">
                        {[40, 60, 45, 70, 50, 80, 55, 90, 65, 85, 40, 60, 50, 75].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-slate-700/30 rounded-t-sm hover:bg-slate-700/50 transition-colors"
                                style={{ height: `${h}%` }}
                            ></div>
                        ))}
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-6 text-center">Taxa de eventos/segundo</p>
                </CartaoConteudo>
            </div>
        </div>
    );
}

function MetricCard({ label, valor, sub, icone: Icone }) {
    return (
        <CartaoConteudo className="bg-slate-800/60 border-slate-800/80 p-8 group hover:border-slate-700/80 transition-all active:scale-[0.99] shadow-2xl">
            <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-xl border border-slate-700/80 bg-slate-800/30 text-slate-400">
                    <Icone size={24} />
                </div>
            </div>
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">{label}</h3>
            <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black text-slate-100 tracking-tighter group-hover:text-slate-200 transition-colors">{valor}</p>
            </div>
            <p className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-widest">{sub}</p>
        </CartaoConteudo>
    );
}

function StatusItem({ label, status, latency }: { label: string, status: string, latency: string }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-950/30 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{label}</span>
            <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono font-bold text-slate-600">{latency}</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{status}</span>
            </div>
        </div>
    );
}
