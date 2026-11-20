import './App.css';
import { HashRouter, Route, Routes } from 'react-router-dom';
import PlayerOverlay from './screens/PlayerOverlay';
import PlayerOverlayConfig from './screens/PlayerOverlayConfig';
import UpcomingMatches from './screens/UpcomingMatches';
import PrizePool from './screens/PrizePool';
const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/overlay" element={<PlayerOverlay />} />
        <Route path="/config" element={<PlayerOverlayConfig />} />
        <Route path="/upcoming" element={<UpcomingMatches />} />
        <Route path="/prizepool" element={<PrizePool />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
