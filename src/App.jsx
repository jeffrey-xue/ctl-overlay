import './App.css';
import { HashRouter, Route, Routes } from 'react-router-dom';
import PlayerOverlay from './screens/PlayerOverlay';
import PlayerOverlayConfig from './screens/PlayerOverlayConfig';
import UpcomingMatches from './screens/UpcomingMatches';
import Roster from './screens/Roster';
import MatchSummary from './screens/MatchSummary';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/overlay" element={<PlayerOverlay />} />
        <Route path="/config" element={<PlayerOverlayConfig />} />
        <Route path="/upcoming" element={<UpcomingMatches />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/matchups" element={<MatchSummary />} />{' '}
      </Routes>
    </HashRouter>
  );
};

export default App;
