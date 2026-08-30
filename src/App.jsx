import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Booking from './Booking';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Cadastro from './Cadastro';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div style={{ backgroundColor: '#0A0F16', minHeight: '100vh', color: '#C9A24B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
            <h2>MAGGIA - SaaS</h2>
            <p style={{ color: '#9C9182', marginTop: '10px' }}>Página de vendas em construção...</p>
          </div>
        } />
        
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        
        {/* ESTA É A ROTA QUE ESTÁ FALTANDO LÁ NA VERCEL */}
        <Route path="/:slug" element={<Booking />} />
      </Routes>
    </Router>
  );
}