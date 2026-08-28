import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  
  // Aqui está a ferramenta que faz o redirecionamento:
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setStatus('Autenticando...');
    
    // Comunicação de segurança com o Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setStatus('Erro: Acesso Negado. Verifique e-mail e senha.');
    } else {
      // Assim que der certo, ele te joga para a tela de gestão instantaneamente!
      navigate('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-[url('/bg-barbearia.png')] bg-cover bg-center bg-fixed bg-black/70 bg-blend-overlay flex flex-col justify-center items-center">
      <div className="max-w-md w-full bg-barber-dark border border-barber-accent p-8 sm:p-10 rounded-sm shadow-2xl">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif tracking-widest text-barber-light uppercase mb-2">Área Restrita</h2>
          <p className="text-barber-accent tracking-[0.2em] text-xs uppercase">Painel de Gestão</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-serif tracking-widest uppercase text-barber-light/70 mb-2">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-transparent border-b border-barber-accent/60 text-barber-light placeholder-barber-light/40 focus:outline-none focus:border-barber-light transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-serif tracking-widest uppercase text-barber-light/70 mb-2">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-transparent border-b border-barber-accent/60 text-barber-light placeholder-barber-light/40 focus:outline-none focus:border-barber-light transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-6 bg-barber-accent hover:bg-barber-light hover:text-barber-dark text-barber-light font-serif tracking-widest uppercase transition-all duration-300 border border-barber-accent"
          >
            Entrar no Sistema
          </button>
        </form>

        {status && (
          <div className="mt-6 p-4 border border-barber-light text-center font-serif text-sm">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

