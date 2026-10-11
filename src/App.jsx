import './App.css';
import { HashRouter, Route, Routes } from 'react-router-dom';
import PlayerOverlay from './screens/PlayerOverlay';
import PlayerOverlayConfig from './screens/PlayerOverlayConfig';
import UpcomingMatches from './screens/UpcomingMatches';
const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/overlay" element={<PlayerOverlay />} />
        <Route path="/config" element={<PlayerOverlayConfig />} />
        <Route path="/upcoming" element={<UpcomingMatches />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
