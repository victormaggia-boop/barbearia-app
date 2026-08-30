import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Booking from './Booking';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import Cadastro from './Cadastro'; // Importado

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Booking />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/cadastro" element={<Cadastro />} /> {/* Nova Rota */}
        <Route path="/dashboard" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
