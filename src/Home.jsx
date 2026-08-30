import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  
  const [nomeDono, setNomeDono] = useState('');
  const [nomeBarbearia, setNomeBarbearia] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Gera o link personalizado (slug) automaticamente enquanto ele digita o nome
  const slugGerado = nomeBarbearia.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  async function handleCriarConta(e) {
    e.preventDefault();
    setLoading(true);
    setErro('');

    if (!slugGerado) {
      setErro('Digite um nome válido para a barbearia.');
      setLoading(false);
      return;
    }

    // 1. Checar se o Link (slug) já existe
    const { data: slugExiste } = await supabase.from('empresas').select('id').eq('slug', slugGerado).maybeSingle();
    if (slugExiste) {
      setErro(`O link /${slugGerado} já está em uso. Tente outro nome.`);
      setLoading(false);
      return;
    }

    // 2. Criar a Conta de Autenticação
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: senha
    });

    if (authError) {
      setErro(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // 3. Criar a Empresa no Banco
    const { data: novaEmpresa, error: erroEmpresa } = await supabase
      .from('empresas')
      .insert([{ nome: nomeBarbearia, slug: slugGerado }])
      .select()
      .single();

    if (erroEmpresa) {
      setErro('Erro ao criar empresa: ' + erroEmpresa.message);
      setLoading(false);
      return;
    }

    // 4. Criar o Perfil do Dono vinculado à Empresa
    const { error: erroPerfil } = await supabase
      .from('barbeiros')
      .insert([{ 
        nome: nomeDono, 
        email: email, 
        cargo: 'dono', 
        empresa_id: novaEmpresa.id,
        user_id: userId
      }]);

    if (erroPerfil) {
      setErro('Erro ao criar perfil: ' + erroPerfil.message);
      setLoading(false);
      return;
    }

    // Sucesso! Joga o dono direto pro painel dele
    navigate('/dashboard');
  }

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,500;1,9..144,600&family=Work+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
    .bg-maggia { background-color: #0A0F16; }
    .text-gold { color: #C9A24B; }
    .text-gold-bright { color: #E4C066; }
    .font-fraunces { font-family: 'Fraunces', serif; }
    .font-mono { font-family: 'Space Mono', monospace; }
  `;

  return (
    <div className="bg-maggia min-h-screen text-white font-sans flex flex-col relative overflow-hidden">
      <style>{brandStyles}</style>

      {/* VÍDEO DE FUNDO */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-20 mix-blend-screen">
        <source src="/slogan.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F16]/80 via-[#0A0F16]/90 to-[#0A0F16] z-0"></div>

      {/* CABEÇALHO */}
      <header className="relative z-10 flex justify-between items-center p-6 lg:px-20 border-b border-[#C9A24B]/20 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/logomaggia.JPG" alt="Maggia Logo" className="h-10 rounded object-contain mix-blend-lighten" />
          <span className="font-fraunces font-bold text-xl tracking-widest text-gold-bright">MAGGIA</span>
        </div>
        <button onClick={() => navigate('/admin')} className="font-mono text-[11px] uppercase tracking-widest text-gold hover:text-white transition-colors border border-gold/30 px-5 py-2.5 rounded hover:bg-gold/10">
          Fazer Login
        </button>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 p-6 lg:px-20 py-12">
        
        {/* TEXTOS DE VENDAS */}
        <div className="flex-1 max-w-2xl text-center lg:text-left">
          <div className="font-mono text-gold tracking-[0.2em] uppercase text-[11px] mb-4">Plataforma de Gestão Completa</div>
          <h1 className="font-fraunces font-black text-4xl lg:text-6xl mb-6 leading-tight">
            A magia por trás de <br/>uma barbearia de <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-200">sucesso.</span>
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto lg:mx-0">
            Abandone o papel e caneta. Tenha agendamento online inteligente, controle financeiro automático e gestão de equipe em uma única plataforma premium.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start font-mono text-xs text-gray-300">
            <div className="flex items-center gap-2"><span className="text-gold">✔</span> Link no Instagram</div>
            <div className="flex items-center gap-2"><span className="text-gold">✔</span> Lembrete WhatsApp</div>
            <div className="flex items-center gap-2"><span className="text-gold">✔</span> Gestão de Comissão</div>
          </div>
        </div>

        {/* FORMULÁRIO DE CADASTRO SaaS */}
        <div className="w-full max-w-md bg-black/60 border border-gold/30 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(201,162,75,0.1)]">
          <h3 className="font-fraunces font-bold text-2xl mb-1 text-white">Criar minha conta</h3>
          <p className="font-mono text-[10px] text-gray-400 tracking-widest uppercase mb-6">Teste grátis agora mesmo</p>
          
          <form onSubmit={handleCriarConta} className="space-y-4">
            <div>
              <label className="block font-mono text-[9px] uppercase text-gray-400 mb-1.5">Seu Nome</label>
              <input type="text" required value={nomeDono} onChange={e => setNomeDono(e.target.value)} placeholder="Ex: Diego Barbearia" className="w-full p-3 bg-black/50 border border-gold/20 rounded text-sm text-white focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase text-gray-400 mb-1.5">Nome da Barbearia</label>
              <input type="text" required value={nomeBarbearia} onChange={e => setNomeBarbearia(e.target.value)} placeholder="Ex: Barber Halley" className="w-full p-3 bg-black/50 border border-gold/20 rounded text-sm text-white focus:outline-none focus:border-gold" />
              {slugGerado && (
                <div className="mt-1 font-mono text-[10px] text-gold/80">Seu link: maggia.com/<span className="text-white font-bold">{slugGerado}</span></div>
              )}
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase text-gray-400 mb-1.5">E-mail</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full p-3 bg-black/50 border border-gold/20 rounded text-sm text-white focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase text-gray-400 mb-1.5">Senha de Acesso</label>
              <input type="password" required value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full p-3 bg-black/50 border border-gold/20 rounded text-sm text-white focus:outline-none focus:border-gold" />
            </div>

            {erro && <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 font-mono text-[10px] text-center">{erro}</div>}

            <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-gradient-to-r from-[#C9A24B] to-[#E4C066] text-black font-extrabold text-[12px] tracking-widest uppercase rounded shadow-[0_0_20px_rgba(201,162,75,0.3)] hover:scale-[1.02] transition-all disabled:opacity-50">
              {loading ? 'Criando sua plataforma...' : 'Começar Agora'}
            </button>
          </form>
        </div>

      </main>
    </div>
  );
}