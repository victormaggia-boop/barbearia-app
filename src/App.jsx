import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './Home';
import Booking from './Booking';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Cadastro from './Cadastro';
import SuperAdmin from './SuperAdmin'; // <--- IMPORTAÇÃO AQUI

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        
        {/* A ROTA SECRETA (SÓ FUNCIONA COM SEU EMAIL LOGADO) */}
        <Route path="/maggia-admin" element={<SuperAdmin />} />
        
        <Route path="/:slug" element={<Booking />} />
      </Routes>
    </Router>
  );
}