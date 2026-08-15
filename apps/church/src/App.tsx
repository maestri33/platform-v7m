import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import Home from './pages/Home';
import Sobre from './pages/Sobre';
import Cultos from './pages/Cultos';
import NovaCasa from './pages/NovaCasa';
import Contato from './pages/Contato';
import Dizimo from './pages/Dizimo';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="sobre" element={<Sobre />} />
        <Route path="cultos" element={<Cultos />} />
        <Route path="nova-casa" element={<NovaCasa />} />
        <Route path="contato" element={<Contato />} />
        <Route path="dizimo" element={<Dizimo />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
