import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setStatus('Autenticando...');
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setStatus('Erro: Acesso Negado. Verifique e-mail e senha.');
    } else {
      navigate('/dashboard');
    }
  }

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Montserrat:wght@400;600;800;900&display=swap');
    
    .brand-theme {
      --tech-dark: #0A0F16;
      --tech-panel: #111822;
      --maggia-gold: #C9A24B;
      --maggia-gold-bright: #E4C066;
      --maggia-neon: #007BFF;
      --paper: #EFE6D8;
      --line: rgba(201,162,75,0.2);
      font-family: 'Montserrat', sans-serif;
    }
    .font-mono { font-family: 'Space Mono', monospace; }
  `;

  return (
    <>
      <style>{brandStyles}</style>
      <div className="brand-theme relative min-h-screen flex flex-col justify-center items-center p-4 overflow-hidden bg-black">
        
        {/* VÍDEO DE FUNDO (Slogan Maggia) */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-60 mix-blend-screen"
        >
          {/* Você precisa salvar seu vídeo como slogan.mp4 dentro da pasta public/ */}
          <source src="/slogan.mp4" type="video/mp4" />
        </video>
        
        {/* Máscara de Escurecimento para garantir leitura */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--tech-dark)] via-black/40 to-[var(--tech-dark)] z-0"></div>

        {/* CONTAINER DO LOGIN (Glassmorphism) */}
        <div className="w-full max-w-md bg-black/60 border border-[var(--line)] p-8 sm:p-10 rounded-2xl shadow-[0_0_40px_rgba(201,162,75,0.1)] relative z-10 backdrop-blur-xl">
          
          <div className="text-center mb-10 flex flex-col items-center">
            {/* Logo Estático caso o vídeo demore a carregar */}
            <img src="/logomaggia.JPG" alt="Maggia Logo" className="h-16 object-contain mb-4 rounded-md opacity-90 mix-blend-lighten" />
            
            <h2 className="font-extrabold text-2xl tracking-widest text-white uppercase m-0">Plataforma</h2>
            <p className="font-mono text-[var(--maggia-gold)] tracking-[0.2em] text-[10px] uppercase mt-2">Tecnologia & SaaS</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-2">E-mail Corporativo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-black/50 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] focus:ring-1 focus:ring-[var(--maggia-gold)] transition-all text-sm"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-gray-400 mb-2">Senha de Acesso</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-black/50 border border-[var(--line)] text-white rounded-lg focus:outline-none focus:border-[var(--maggia-gold)] focus:ring-1 focus:ring-[var(--maggia-gold)] transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-6 bg-gradient-to-r from-[var(--maggia-gold)] to-[var(--maggia-gold-bright)] hover:from-[var(--maggia-gold-bright)] hover:to-[var(--maggia-gold)] text-black font-extrabold text-[13px] tracking-widest uppercase transition-all duration-300 rounded-lg shadow-[0_0_20px_rgba(201,162,75,0.3)] hover:shadow-[0_0_30px_rgba(201,162,75,0.5)]"
            >
              Acessar Sistema
            </button>
          </form>

          {status && (
            <div className="mt-6 p-4 rounded bg-[rgba(201,162,75,0.1)] border border-[var(--line)] text-center font-mono text-[11px] text-[var(--maggia-gold-bright)]">
              {status}
            </div>
          )}
        </div>
        
        {/* Rodapé Corporativo */}
        <div className="mt-10 font-mono text-[10px] text-gray-500 tracking-[0.3em] uppercase z-10 text-center relative">
          Maggia · A Magia por trás do seu negócio
        </div>
      </div>
    </>
  );
}