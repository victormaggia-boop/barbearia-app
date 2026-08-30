import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Booking from './Booking';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Cadastro from './Cadastro';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Futura Landing Page da Maggia vai ficar aqui no "/" */}
        <Route path="/" element={<div className="bg-black min-h-screen text-white flex items-center justify-center font-mono">Página Inicial da Maggia em construção...</div>} />
        
        {/* Rotas de Sistema */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        
        {/* Rota Dinâmica da Barbearia (Ex: /barber-halley) - DEVE FICAR POR ÚLTIMO */}
        <Route path="/:slug" element={<Booking />} />
      </Routes>
    </Router>
  );
}