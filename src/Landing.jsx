import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Bot, Calendar, TrendingUp, Smartphone, CheckCircle, ArrowRight, Zap, Shield, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- COMPONENTE DA CHUVA MATRIX (PREMIUM & SUTIL) ---
const MatrixBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Ajusta o tamanho do canvas para a tela
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Caracteres binários para um visual tech limpo
    const chars = '01'; 
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      // Fundo semi-transparente para criar o rastro (fading effect)
      ctx.fillStyle = 'rgba(3, 7, 18, 0.1)'; // Mesma cor do bg-[#030712]
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cor do texto (Ciano suave com baixa opacidade)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reseta a gota de forma aleatória para não ficarem alinhadas
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50); // Velocidade suave

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen"
    />
  );
};


export default function Landing() {
  const whatsappVendas = "5513974211857";
  const mensagem = "Olá! Quero saber mais sobre a plataforma Maggia para o meu negócio.";
  const linkZap = `https://wa.me/${whatsappVendas}?text=${encodeURIComponent(mensagem)}`;

  // --- MÁGICA DO CURSOR INTERATIVO ---
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  // Animações
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      
      {/* 1. CHUVA DE CÓDIGOS (Matrix Tech Sutil) */}
      <MatrixBackground />

      {/* 2. LUZ DO CURSOR (Rastreia o Mouse) */}
      <div 
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(6, 182, 212, 0.12), transparent 80%)`
        }}
      ></div>

      {/* 3. BACKGROUND GRID ANIMADO */}
      <div className="absolute inset-0 z-0 opacity-[0.15]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>
      
      {/* 4. ORBS AZUIS FLUTUANTES NO FUNDO */}
      <motion.div animate={{ y: [0, -40, 0], x: [0, 20, 0], scale: [1, 1.1, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none z-0"></motion.div>
      <motion.div animate={{ y: [0, 40, 0], x: [0, -20, 0], scale: [1, 1.2, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none z-0"></motion.div>

      {/* NAVBAR */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-3">
          <div className="relative group p-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-tr from-cyan-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 transition-opacity"></motion.div>
            <img src="/logo.png" alt="Maggia" className="w-10 h-10 object-contain relative z-10" onError={(e) => e.target.style.display = 'none'} />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white">MAGGIA</span>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="flex gap-4">
          <Link to="/login" className="hidden md:flex items-center px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Acesso Restrito
          </Link>
          <a href={linkZap} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-[#030712]/50 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold text-white transition-all backdrop-blur-md hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            Falar com Consultor
          </a>
        </motion.div>
      </nav>

      {/* HERO SECTION */}
      <motion.section initial="hidden" animate="visible" variants={stagger} className="relative z-20 max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Lado Esquerdo - Textos */}
        <div className="text-left">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest uppercase backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <Zap className="w-4 h-4" /> Automação Inteligente para Negócios
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.1] text-white">
            O FUTURO DA SUA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 filter drop-shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              AGENDA É AUTÔNOMO.
            </span>
          </motion.h1>
          
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-300 max-w-xl mb-10 font-light leading-relaxed">
            Um ecossistema <strong className="text-cyan-400 font-medium">white-label</strong> que atende clientes no WhatsApp, organiza horários e gerencia o caixa enquanto você foca em entregar o melhor serviço.
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center gap-6">
            <a href={linkZap} target="_blank" rel="noreferrer" className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-2xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <span className="relative">Automatizar Meu Negócio</span>
              <ArrowRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </div>

        {/* Lado Direito - VÍDEO DA LOGO */}
        <motion.div variants={fadeUp} className="relative w-full aspect-square md:aspect-video lg:aspect-square flex justify-center items-center">
          <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="relative w-full max-w-md rounded-full overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.3)] border border-white/10 bg-[#0a0a0a]">
            <video src="/video-logo.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover scale-105"></video>
            <div className="absolute inset-0 rounded-full border border-cyan-500/30 pointer-events-none"></div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* SHOWCASE DA IA CONVERSANDO REAL */}
      <section className="relative z-20 max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-md bg-indigo-500/10 text-indigo-400 text-sm font-bold tracking-widest uppercase border border-indigo-500/20 backdrop-blur-sm">
            <Play className="w-4 h-4" /> Veja na prática
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">IA CONVERSANDO REAL</h2>
        </div>

        <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="relative mx-auto max-w-3xl rounded-[2rem] p-[2px] bg-gradient-to-b from-cyan-500/50 via-white/10 to-transparent">
          <div className="absolute inset-0 bg-cyan-500/20 blur-3xl pointer-events-none"></div>
          
          <div className="relative bg-[#050505]/90 backdrop-blur-xl rounded-[2rem] p-4 border border-white/5 overflow-hidden">
            <video src="/video-chat.mp4" autoPlay loop muted playsInline className="w-full h-auto rounded-[1.5rem] object-cover border border-white/5 opacity-90 hover:opacity-100 transition-opacity"></video>
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-white/10 to-transparent opacity-30 pointer-events-none rounded-t-[2rem]"></div>
          </div>
        </motion.div>
      </section>

      {/* BENTO GRID (Recursos com Hover Tech) */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px]">
          
          <motion.div variants={fadeUp} className="md:col-span-2 relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-cyan-500/40 transition-all group overflow-hidden">
            <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"></div>
            <div className="relative h-full w-full bg-[#0a0a0a]/80 backdrop-blur-xl rounded-[22px] p-8 border border-white/5 flex flex-col justify-end">
              <Bot className="absolute -top-10 -right-10 w-64 h-64 text-white/[0.02] group-hover:text-cyan-500/[0.1] transition-all group-hover:scale-110 duration-700" />
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl w-fit mb-6 shadow-[0_0_15px_rgba(6,182,212,0)] group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"><Bot className="w-8 h-8 text-cyan-400" /></div>
              <h3 className="text-2xl font-bold text-white mb-2 z-10">Agente IA de Atendimento</h3>
              <p className="text-slate-300 max-w-md z-10">Seu WhatsApp funcionando como uma máquina de vendas 24h que lê a agenda e fecha o horário automaticamente.</p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-blue-500/40 transition-colors group">
            <div className="relative h-full w-full bg-[#0a0a0a]/80 backdrop-blur-xl rounded-[22px] p-8 border border-white/5 flex flex-col justify-end">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl w-fit mb-6 shadow-[0_0_15px_rgba(59,130,246,0)] group-hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all"><Smartphone className="w-8 h-8 text-blue-400" /></div>
              <h3 className="text-xl font-bold text-white mb-2">Sua Identidade</h3>
              <p className="text-slate-300 text-sm">Plataforma exclusiva e cores próprias. O cliente vê a força da sua marca, não a nossa.</p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-indigo-500/40 transition-colors group">
            <div className="relative h-full w-full bg-[#0a0a0a]/80 backdrop-blur-xl rounded-[22px] p-8 border border-white/5 flex flex-col justify-end">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl w-fit mb-6 shadow-[0_0_15px_rgba(99,102,241,0)] group-hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all"><TrendingUp className="w-8 h-8 text-indigo-400" /></div>
              <h3 className="text-xl font-bold text-white mb-2">Painel de Gestão</h3>
              <p className="text-slate-300 text-sm">Métricas em tempo real. Saiba faturamento diário, gerencie sua equipe e repasse comissões.</p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="md:col-span-2 relative p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent hover:from-cyan-500/40 transition-colors group">
            <div className="relative h-full w-full bg-[#0a0a0a]/80 backdrop-blur-xl rounded-[22px] p-8 border border-white/5 flex flex-col justify-end overflow-hidden">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl w-fit mb-6 shadow-[0_0_15px_rgba(6,182,212,0)] group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"><Calendar className="w-8 h-8 text-cyan-400" /></div>
              <h3 className="text-2xl font-bold text-white mb-2 z-10">Sincronização Absoluta</h3>
              <p className="text-slate-300 max-w-md z-10">O agendamento feito pelo site reflete instantaneamente no bot do WhatsApp. Zero colisões e conflitos de horários.</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* PRICING */}
      <section className="relative z-20 max-w-5xl mx-auto px-6 py-24">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-cyan-500/40 via-white/5 to-transparent hover:from-cyan-400/60 transition-colors duration-500 group">
          <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-[2rem] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500"></div>
          
          <div className="relative bg-[#050505]/80 backdrop-blur-2xl rounded-[31px] p-10 md:p-16 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-md bg-cyan-500/10 text-cyan-400 text-sm font-bold tracking-widest uppercase border border-cyan-500/20">
                <Shield className="w-4 h-4" /> Licença Premium
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Assuma o controle do seu negócio hoje.</h2>
              <ul className="space-y-4">
                {['IA Atendente no WhatsApp', 'Sistema White-label Completo', 'Painel Financeiro e de Equipe', 'Suporte Técnico Direto'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-200 font-medium">
                    <CheckCircle className="w-5 h-5 text-cyan-500 flex-shrink-0 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full md:w-auto min-w-[300px] p-8 rounded-3xl bg-white/[0.03] border border-white/10 text-center relative overflow-hidden backdrop-blur-md">
              <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">Investimento</p>
              <div className="text-5xl font-black text-white mb-6 flex justify-center items-end gap-1">
                <span className="text-2xl text-cyan-500">R$</span>97<span className="text-lg text-slate-500 font-normal pb-1">/mês</span>
              </div>
              <a href={linkZap} target="_blank" rel="noreferrer" className="block w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)]">
                Garantir Vaga
              </a>
            </div>
          </div>
        </motion.div>
      </section>
      
      {/* FOOTER */}
      <footer className="border-t border-white/5 mt-12 py-8 text-center text-slate-500 text-sm font-medium tracking-wide z-20 relative bg-[#030712]/50 backdrop-blur-md">
        <p>© {new Date().getFullYear()} MAGGIA TECNOLOGIA & SAAS. DESENVOLVIDO PARA O FUTURO.</p>
      </footer>
    </div>
  );
}