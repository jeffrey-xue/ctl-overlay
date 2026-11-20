import './PrizePool.css';

const PRIZE_POOL_IMAGE_URL = `${import.meta.env.BASE_URL}prize_pool/tws_prizepool.png`;

const PrizePool = () => (
  <main className="prize-pool-page">
    <img className="prize-pool-image" src={PRIZE_POOL_IMAGE_URL} alt="Prize pool" />
  </main>
);

export default PrizePool;
