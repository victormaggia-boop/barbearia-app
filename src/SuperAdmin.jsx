import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function SuperAdmin() {
  const navigate = useNavigate();
  
  const [autorizado, setAutorizado] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  // E-mail master que tem permissão para acessar essa tela
  const EMAIL_FUNDADOR = 'victormaggia@gmail.com';

  useEffect(() => {
    async function verificarAcessoMaster() {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Se não estiver logado, ou se o email não for o seu, expulsa da página
      if (!session || session.user.email !== EMAIL_FUNDADOR) {
        alert('Acesso restrito: Apenas o Fundador da Maggia tem acesso a esta página.');
        navigate('/admin');
        return;
      }
      
      setAutorizado(true);
      carregarEmpresas();
    }
    verificarAcessoMaster();
  }, [navigate]);

  async function carregarEmpresas() {
    setLoading(true);
    
    // Tiramos o "order" para evitar erros caso a coluna não exista, 
    // e adicionamos um alerta para o sistema "gritar" se o Supabase bloquear algo.
    const { data, error } = await supabase.from('empresas').select('*');
    
    if (error) {
      alert("Erro ao buscar barbearias: " + error.message);
    } else if (data) {
      setEmpresas(data);
    }
    
    setLoading(false);
  }

    // Calcula a data de hoje + 30 dias
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);

    const { error } = await supabase.from('empresas').update({ trial_ate: novaData.toISOString() }).eq('id', id);
    
    if (error) alert("Erro ao renovar: " + error.message);
    else {
      alert("Assinatura renovada com sucesso!");
      carregarEmpresas();
    }
  }

  async function bloquearConta(id, nome) {
    const confirmar = window.confirm(`ATENÇÃO: Deseja BLOQUEAR o acesso da barbearia "${nome}" imediatamente? A tela deles ficará preta cobrando pagamento.`);
    if (!confirmar) return;

    // Para bloquear na hora, colocamos o vencimento para ontem
    const dataPassada = new Date();
    dataPassada.setDate(dataPassada.getDate() - 1); 

    const { error } = await supabase.from('empresas').update({ trial_ate: dataPassada.toISOString() }).eq('id', id);
    
    if (error) alert("Erro ao bloquear: " + error.message);
    else {
      alert("Conta bloqueada! Eles não têm mais acesso ao painel.");
      carregarEmpresas();
    }
  }

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;600&display=swap');
    .bg-maggia { background-color: #0A0F16; }
    .text-gold { color: #C9A24B; }
    .border-gold { border-color: #C9A24B; }
    .font-mono { font-family: 'Space Mono', monospace; }
  `;

  if (!autorizado) return <div className="bg-[#0A0F16] min-h-screen"></div>;

  return (
    <div className="bg-maggia min-h-screen text-white font-sans p-6 md:p-12">
      <style>{brandStyles}</style>
      
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center border-b border-gold/30 pb-6 mb-10">
          <div>
            <div className="font-mono text-[11px] text-gold tracking-widest uppercase mb-1">Central de Comando</div>
            <h1 className="text-3xl font-bold text-white">Gestão Maggia SaaS</h1>
          </div>
          <button onClick={() => navigate('/dashboard')} className="px-5 py-2 font-mono text-[11px] uppercase tracking-widest bg-gold/10 text-gold border border-gold/30 rounded hover:bg-gold hover:text-black transition-colors">
            Voltar ao Meu Painel
          </button>
        </header>

        {loading ? (
          <div className="text-center font-mono text-gray-500 py-10">Carregando carteira de clientes...</div>
        ) : (
          <div className="bg-black/40 border border-gold/20 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gold/20 flex justify-between items-center bg-black/60">
              <h2 className="font-bold text-lg">Suas Barbearias ({empresas.length})</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/80 font-mono text-[10px] text-gray-400 uppercase tracking-wider">
                    <th className="p-4 border-b border-gold/10">Barbearia</th>
                    <th className="p-4 border-b border-gold/10">Data de Cadastro</th>
                    <th className="p-4 border-b border-gold/10">Vencimento</th>
                    <th className="p-4 border-b border-gold/10">Status</th>
                    <th className="p-4 border-b border-gold/10 text-right">Ações Master</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {empresas.map(emp => {
                    const dataCadastro = new Date(emp.created_at).toLocaleDateString('pt-BR');
                    const dataVencimento = new Date(emp.trial_ate);
                    const vencimentoFormatado = dataVencimento.toLocaleDateString('pt-BR');
                    const estaVencido = new Date() > dataVencimento;

                    return (
                      <tr key={emp.id} className="hover:bg-gold/5 transition-colors group border-b border-gold/5">
                        <td className="p-4 font-semibold text-white">
                          {emp.nome}
                          <div className="font-mono text-[10px] text-gray-500 mt-1">/{emp.slug}</div>
                        </td>
                        <td className="p-4 text-gray-400 font-mono text-xs">{dataCadastro}</td>
                        <td className="p-4 font-mono text-xs text-gray-300">{vencimentoFormatado}</td>
                        <td className="p-4">
                          {estaVencido ? (
                            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-red-900/40 text-red-400 border border-red-900">Bloqueado</span>
                          ) : (
                            <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-green-900/40 text-green-400 border border-green-900">Ativo</span>
                          )}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => renovarAssinatura(emp.id, emp.nome)} 
                            className="px-3 py-1.5 font-mono text-[10px] uppercase font-bold bg-green-600/20 text-green-400 border border-green-600/40 rounded hover:bg-green-600 hover:text-white transition-colors">
                            +30 Dias
                          </button>
                          
                          <button 
                            disabled={estaVencido}
                            onClick={() => bloquearConta(emp.id, emp.nome)} 
                            className="px-3 py-1.5 font-mono text-[10px] uppercase font-bold bg-red-600/20 text-red-400 border border-red-600/40 rounded hover:bg-red-600 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            Bloquear
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}