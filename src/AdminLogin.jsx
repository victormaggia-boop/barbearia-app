import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('LOGIN'); 
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('NOVA_SENHA');
        setStatus('Digite sua nova senha abaixo.');
      } else if (event === 'SIGNED_IN' && view === 'LOGIN') {
        navigate('/dashboard');
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, [navigate, view]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setStatus('Autenticando...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setStatus('Erro: ' + error.message);
    else navigate('/dashboard');
    setLoading(false);
  }

  async function handleRecuperarSenha(e) {
    e.preventDefault();
    setLoading(true);
    setStatus('Enviando link...');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/admin',
    });
    if (error) setStatus('Erro: ' + error.message);
    else setStatus('Link enviado! Verifique sua caixa de entrada e spam.');
    setLoading(false);
  }

  async function handleAtualizarSenha(e) {
    e.preventDefault();
    setLoading(true);
    setStatus('Atualizando...');
    const { error } = await supabase.auth.updateUser({ password: password });
    if (error) {
      setStatus('Erro: ' + error.message);
    } else {
      setStatus('Senha atualizada com sucesso!');
      setTimeout(() => navigate('/dashboard'), 1500);
    }
    setLoading(false);
  }

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Montserrat:wght@400;600;800;900&display=swap');
    .brand-theme {
      --tech-dark: #0A0F16; --maggia-gold: #C9A24B; --maggia-gold-bright: #E4C066; --line: rgba(201,162,75,0.2);
      font-family: 'Montserrat', sans-serif;
    }
    .font-mono { font-family: 'Space Mono', monospace; }
  `;

  return (
    <>
      <style>{brandStyles}</style>
      <div className="brand-theme relative min-h-screen flex flex-col justify-center items-center p-4 overflow-hidden bg-black">
        
        {/* VÍDEO DE FUNDO - Verifique se a extensão é .mp4 ou .MP4 e ajuste abaixo */}
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-50 mix-blend-screen">
          <source src="/slogan.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--tech-dark)] via-black/50 to-[var(--tech-dark)] z-0"></div>

        <div className="w-full max-w-md bg-black/70 border border-[var(--line)] p-8 sm:p-10 rounded-2xl shadow-[0_0_40px_rgba(201,162,75,0.1)] relative z-10 backdrop-blur-xl">
          
          <div className="text-center mb-8 flex flex-col items-center">
            {/* LOGO - Verifique se a extensão é .jpg, .png ou .JPG e ajuste abaixo */}
            <img src="/logo.jpg" alt="Maggia Logo" className="h-14 object-contain mb-3 rounded-md opacity-90 mix-blend-lighten" />
            <h2 className="font-extrabold text-xl tracking-widest text-white uppercase m-0">Plataforma</h2>
            <p className="font-mono text-[var(--maggia-gold)] tracking-[0.15em] text-[10px] uppercase mt-2">Tecnologia & SaaS</p>
          </div>

          {/* MODO 1: LOGIN NORMAL */}
          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-2">E-mail Corporativo</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-black/60 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] text-sm" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400">Senha de Acesso</label>
                  <button type="button" onClick={() => setView('RECUPERAR')} className="font-mono text-[9px] text-[var(--maggia-gold)] hover:text-[var(--maggia-gold-bright)] uppercase tracking-wider bg-transparent border-none cursor-pointer">
                    Esqueceu a senha?
                  </button>
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-black/60 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] text-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 mt-4 bg-gradient-to-r from-[var(--maggia-gold)] to-[var(--maggia-gold-bright)] text-black font-extrabold text-[12px] tracking-widest uppercase transition-all duration-300 rounded-lg shadow-[0_0_20px_rgba(201,162,75,0.3)] hover:scale-[1.02] disabled:opacity-50">
                {loading ? 'Carregando...' : 'Acessar Sistema'}
              </button>
            </form>
          )}

          {/* MODO 2: PEDIR LINK DE RECUPERAÇÃO */}
          {view === 'RECUPERAR' && (
            <form onSubmit={handleRecuperarSenha} className="space-y-5">
              <div className="text-center text-sm text-gray-400 mb-4">
                Digite seu e-mail para receber o link de redefinição de senha.
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-2">Seu E-mail</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-black/60 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] text-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 mt-4 bg-gradient-to-r from-[var(--maggia-gold)] to-[var(--maggia-gold-bright)] text-black font-extrabold text-[12px] tracking-widest uppercase transition-all duration-300 rounded-lg shadow-[0_0_20px_rgba(201,162,75,0.3)] hover:scale-[1.02] disabled:opacity-50">
                {loading ? 'Enviando...' : 'Enviar Link'}
              </button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => setView('LOGIN')} className="font-mono text-[10px] text-gray-400 hover:text-white uppercase tracking-wider underline bg-transparent border-none cursor-pointer">
                  ← Voltar para o Login
                </button>
              </div>
            </form>
          )}

          {/* MODO 3: DEFINIR NOVA SENHA */}
          {view === 'NOVA_SENHA' && (
            <form onSubmit={handleAtualizarSenha} className="space-y-5">
              <div className="text-center text-sm text-[var(--maggia-gold)] font-bold mb-4">
                Acesso liberado! Digite sua nova senha de acesso.
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-2">Nova Senha</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-black/60 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] text-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 mt-4 bg-gradient-to-r from-[var(--maggia-gold)] to-[var(--maggia-gold-bright)] text-black font-extrabold text-[12px] tracking-widest uppercase transition-all duration-300 rounded-lg shadow-[0_0_20px_rgba(201,162,75,0.3)] hover:scale-[1.02] disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar e Acessar'}
              </button>
            </form>
          )}

          {status && (
            <div className={`mt-5 p-3 rounded border text-center font-mono text-[11px] ${status.includes('Erro') ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-[rgba(201,162,75,0.1)] border-[var(--line)] text-[var(--maggia-gold-bright)]'}`}>
              {status}
            </div>
          )}

        </div>

        {/* LOGO DE FUNDO TIPO MARCA D'ÁGUA */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none opacity-[0.03] z-0">
          <h1 className="text-[15vw] font-serif font-black text-white m-0 tracking-tighter">MAGGIA</h1>
        </div>

        <div className="mt-8 font-mono text-[10px] text-gray-500 tracking-[0.3em] uppercase z-10 text-center relative">
          Maggia · A Magia por trás do seu negócio
        </div>
      </div>
    </>
  );
}