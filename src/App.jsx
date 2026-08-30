import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './Home'; // <--- Importamos a nova Landing Page
import Booking from './Booking';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Cadastro from './Cadastro';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* A Nova Landing Page de Vendas */}
        <Route path="/" element={<Home />} />
        
        {/* Rotas Internas do Sistema */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        
        {/* Rota Dinâmica da Barbearia (Agenda do Cliente) */}
        <Route path="/:slug" element={<Booking />} />
      </Routes>
    </Router>
  );
}