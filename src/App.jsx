import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Booking from './Booking';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Cadastro from './Cadastro';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Futura Landing Page da Maggia */}
        <Route path="/" element={
          <div style={{ backgroundColor: '#0A0F16', minHeight: '100vh', color: '#C9A24B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
            <h2>MAGGIA - SaaS</h2>
            <p style={{ color: '#9C9182', marginTop: '10px' }}>Página de vendas em construção...</p>
            <p style={{ fontSize: '10px', marginTop: '20px' }}>Para acessar o sistema, adicione /admin ou /seu-slug na URL.</p>
          </div>
        } />
        
        {/* Rotas de Sistema */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        
        {/* Rota Dinâmica da Barbearia (Deve ser sempre a última rota) */}
        <Route path="/:slug" element={<Booking />} />
      </Routes>
    </Router>
  );
}