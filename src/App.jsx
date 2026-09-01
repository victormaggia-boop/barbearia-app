import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Landing from './Landing'; // <--- IMPORTAÇÃO DA NOVA LANDING PAGE AQUI
import Booking from './Booking';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Cadastro from './Cadastro';
import SuperAdmin from './SuperAdmin';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* A vitrine de vendas do seu SaaS (Maggia) */}
        <Route path="/" element={<Landing />} />
        
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        
        {/* A ROTA SECRETA (SÓ FUNCIONA COM SEU EMAIL LOGADO) */}
        <Route path="/maggia-admin" element={<SuperAdmin />} />
        
        {/* O link de agendamento que os clientes das barbearias acessam */}
        <Route path="/:slug" element={<Booking />} />
      </Routes>
    </Router>
  );
}