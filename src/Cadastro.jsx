import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Cadastro() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleCadastro(e) {
    e.preventDefault();
    setStatus('');

    if (password !== confirmPassword) {
      return setStatus('Erro: As senhas não coincidem.');
    }

    setLoading(true);
    setStatus('Verificando pré-cadastro...');

    // 1. Busca se o e-mail foi adicionado pelo Dono na aba Equipe
    const { data: membro, error: buscaError } = await supabase
      .from('barbeiros')
      .select('id, empresa_id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (buscaError || !membro) {
      setLoading(false);
      return setStatus('E-mail não autorizado. Solicite ao seu gestor que inclua seu e-mail na aba Equipe.');
    }

    setStatus('Criando credenciais...');

    // 2. Cria a conta no Supabase Authentication
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (authError) {
      setLoading(false);
      return setStatus('Erro no cadastro: ' + authError.message);
    }

    if (authData?.user) {
      // 3. Vincula o ID de autenticação ao perfil do profissional
      const { error: updateError } = await supabase
        .from('barbeiros')
        .update({ user_id: authData.user.id })
        .eq('id', membro.id);

      if (updateError) {
        setLoading(false);
        return setStatus('Erro ao vincular perfil: ' + updateError.message);
      }

      setStatus('Conta ativada com sucesso! Acessando o painel...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    }
  }

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Montserrat:wght@400;600;800;900&display=swap');
    
    .brand-theme {
      --tech-dark: #0A0F16;
      --maggia-gold: #C9A24B;
      --maggia-gold-bright: #E4C066;
      --line: rgba(201,162,75,0.2);
      font-family: 'Montserrat', sans-serif;
    }
    .font-mono { font-family: 'Space Mono', monospace; }
  `;

  return (
    <>
      <style>{brandStyles}</style>
      <div className="brand-theme relative min-h-screen flex flex-col justify-center items-center p-4 overflow-hidden bg-black">
        
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-50 mix-blend-screen"
        >
          <source src="/slogan.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-t from-[var(--tech-dark)] via-black/50 to-[var(--tech-dark)] z-0"></div>

        <div className="w-full max-w-md bg-black/70 border border-[var(--line)] p-8 sm:p-10 rounded-2xl shadow-[0_0_40px_rgba(201,162,75,0.1)] relative z-10 backdrop-blur-xl">
          
          <div className="text-center mb-8 flex flex-col items-center">
            <img src="/logomaggia.JPG" alt="Maggia Logo" className="h-14 object-contain mb-3 rounded-md opacity-90 mix-blend-lighten" />
            <h2 className="font-extrabold text-xl tracking-widest text-white uppercase m-0">Ativação de Conta</h2>
            <p className="font-mono text-[var(--maggia-gold)] tracking-[0.15em] text-[10px] uppercase mt-2">Acesso para Profissionais</p>
          </div>

          <form onSubmit={handleCadastro} className="space-y-5">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-2">E-mail Cadastrado</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full p-3 bg-black/60 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] text-sm"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-2">Crie sua Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-black/60 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] text-sm"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-2">Confirme a Senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 bg-black/60 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 bg-gradient-to-r from-[var(--maggia-gold)] to-[var(--maggia-gold-bright)] text-black font-extrabold text-[12px] tracking-widest uppercase transition-all duration-300 rounded-lg shadow-[0_0_20px_rgba(201,162,75,0.3)] disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Ativar Acesso'}
            </button>
          </form>

          {status && (
            <div className="mt-5 p-3 rounded bg-[rgba(201,162,75,0.1)] border border-[var(--line)] text-center font-mono text-[11px] text-[var(--maggia-gold-bright)]">
              {status}
            </div>
          )}

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/admin')} className="font-mono text-[10px] text-gray-400 hover:text-white uppercase tracking-wider underline bg-transparent border-none cursor-pointer">
              Já tem conta? Fazer Login
            </button>
          </div>
        </div>

        <div className="mt-8 font-mono text-[10px] text-gray-500 tracking-[0.3em] uppercase z-10 text-center relative">
          Maggia · A Magia por trás do seu negócio
        </div>
      </div>
    </>
  );
}