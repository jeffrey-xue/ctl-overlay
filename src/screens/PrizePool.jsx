import { useEffect, useState } from 'react';
import { useInterval } from '../hooks/useInterval';
import { fetchProxied } from '../util/fetchProxied';
import './PrizePool.css';

const PRIZE_POOL_IMAGE_URL = `${import.meta.env.BASE_URL}prize_pool/tws_prizepool.png`;
const GRAPHIC_IMAGES = {
  prizepool: PRIZE_POOL_IMAGE_URL,
  lowerBracket: `${import.meta.env.BASE_URL}bracket_schedule/lowerplayoffbracketlayout.png`,
  upperBracket: `${import.meta.env.BASE_URL}bracket_schedule/upperplayoffbracketlayout.png`,
};
const DEFAULT_GRAPHIC_VIEW = 'prizepool';
const GRAPHIC_CHANNEL = 'ctl-overlay-graphic';
const BOUNTY_ID = 220919;
const START = 250;
const GOALS = [1500, 2000];
const POLL_MS = 15000; // polling is the antichrist but not my api so

const money = (dollars) =>
  `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function prizeState(balanceCents) {
  const balance = balanceCents / 100;
  const nextGoal = GOALS.find((g) => g > balance);
  const fill = Math.min(1, Math.max(0, (balance - START) / (GOALS.at(-1) - START)));
  return { balance, nextGoal, fill };
}

const PrizePool = () => {
  const [data, setData] = useState(null);
  const [graphicView, setGraphicView] = useState(DEFAULT_GRAPHIC_VIEW);

  const load = async () => {
    const json = await fetchProxied(
      `https://api.matcherino.com/__api/bounties/clr?bountyId=${BOUNTY_ID}&pageId=0&lastDonationId=0`
    );
    const body = Array.isArray(json.body) ? json.body[0] : json.body;
    if (typeof body?.balance === 'number') setData(body);
  };

  useEffect(() => {
    const channel = new BroadcastChannel(GRAPHIC_CHANNEL);
    channel.onmessage = ({ data: view }) => {
      if (GRAPHIC_IMAGES[view]) setGraphicView(view);
    };
    return () => channel.close();
  }, []);
  useEffect(() => {
    if (graphicView === DEFAULT_GRAPHIC_VIEW) load();
  }, [graphicView]);
  useInterval(load, graphicView === DEFAULT_GRAPHIC_VIEW ? POLL_MS : null);

  const { balance, nextGoal, fill } = prizeState(data?.balance ?? 0);
  const donors = (data?.topDonors ?? []).slice(0, 5);
  const latest = (data?.newTransactions ?? [])
    .filter((t) => t.action === 'donate')
    .reduce((a, b) => (!a || b.id > a.id ? b : a), null);

  return (
    <main className="prize-pool-page">
      <div className="prize-pool-canvas">
        <img
          className="prize-pool-image"
          src={GRAPHIC_IMAGES[graphicView]}
          alt={
            graphicView === 'lowerBracket'
              ? 'Lower bracket'
              : graphicView === 'upperBracket'
                ? 'Upper bracket'
                : 'Prize pool'
          }
        />
        {graphicView === DEFAULT_GRAPHIC_VIEW && data && (
          <>
            <div className="pp-total">
              <span className="pp-amount">{money(balance)}</span>
              {nextGoal ? (
                <span className="pp-goal">
                  <span>FUNDED - {money(nextGoal - balance)}</span>
                  <span>AWAY FROM THE</span>
                  <span className="pp-goal-thin">NEXT GOAL</span>
                </span>
              ) : (
                <span className="pp-goal">
                  <span>FULLY FUNDED</span>
                  <span className="pp-goal-thin">WHOA YOU ACTUALLY</span>
                  <span className="pp-goal-thin">DID IT ???</span>
                </span>
              )}
            </div>
            <div className="pp-bar">
              <div className="pp-bar-fill" style={{ width: `${fill * 100}%` }} />
            </div>
            <ol className="pp-donors">
              {donors.map((d, i) => (
                <li key={d.display_name} className={i === 0 ? 'pp-donor pp-donor-top' : 'pp-donor'}>
                  <span className="pp-donor-name" data-text={`${i + 1}. ${d.display_name}`}>
                    {i + 1}. {d.display_name}
                  </span>
                  <span className="pp-donor-line" />
                  <span className="pp-donor-dash" />
                  <span className="pp-donor-dash" />
                  <span className="pp-donor-dash" />
                  <span className="pp-donor-amount">{money(d.amount / 100)}</span>
                </li>
              ))}
            </ol>
            {latest && (
              <ol className="pp-donors pp-recent">
                <li key={latest.id} className="pp-donor pp-latest-row">
                  <span
                    className="pp-donor-name"
                    data-text={latest.displayName || latest.userName || 'Anonymous'}
                  >
                    {latest.displayName || latest.userName || 'Anonymous'}
                  </span>
                  <span className="pp-donor-line" />
                  <span className="pp-donor-dash" />
                  <span className="pp-donor-dash" />
                  <span className="pp-donor-dash" />
                  <span className="pp-donor-amount">{money(latest.amount / 100)}</span>
                </li>
              </ol>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default PrizePool;

/*
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡀⠀⠀⠀⠀⠀⠄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⡿⠇⠀⠀⠀⠀⢻⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡇⠀⠀⠀⠀⡸⣞⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠃⠀⠀⠀⢀⣧⢿⣽⡀
⠀⢴⣿⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⣼⣞⡿⣞⡅
⠀⠀⠈⠓⢤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⠀⠀⠀⣰⣟⢾⣽⢫⡿
⠀⠀⠀⠀⠀⠙⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣠⢤⣶⡻⣞⣿⣺⢯⣽⣳⡀
⢠⣄⡀⠀⠀⠀⠀⠙⢦⡀⠀⠀⠀⠀⣀⣠⣤⣿⣽⣻⢾⣽⣷⣾⣽⣻⣞⣷⣳⡄
⠈⢻⣿⣶⣄⡀⠀⠀⠀⣉⣲⣴⢶⣞⡿⣽⣞⡷⣯⢿⡽⣞⣿⠟⠋⠁⠉⠈⠳⣟⣆
⠀⠀⢻⣿⣿⣿⣿⢶⣾⣿⡽⣯⣟⡾⣽⡷⣯⣟⡽⡾⣽⡯⠁⠀⠀⠀⠀⠀⠀⢮⣭⣦⡀
⠀⠀⠉⢞⣿⣿⢯⡿⣿⣯⣟⣷⣯⢿⣳⣟⡷⣽⣼⣻⣽⠀⠀⠀⠀⠀⠀⠀⢀⣼⡯⡗⠋⠤
⠀⠀⠀⢾⣿⣿⣯⣽⣾⣿⣾⣗⡿⣯⡷⣯⣟⡷⣞⣼⣿⣀⠀⠀⠀⠀⢀⣠⡿⣏⡗⠈⠐⠈⠅
⠀⠀⢀⣼⠛⠏⠉⠉⠽⢟⢿⣿⣿⣿⣿⣷⣻⢾⡽⣞⡷⠄⡹⣶⢿⣻⢿⣻⡽⢯⣼⢦⠶⠁⠈
⠀⠀⣸⣯⠇⠀⠀⠀⠀⠀⠁⣽⣿⣿⣿⣷⣯⣿⣽⣛⡦⠀⠀⢩⣿⣹⢯⣷⢻⣟⠺⢣⡖⣘⠤⠓
⠀⠀⢈⣿⡃⠁⠀⠀⠀⢀⣤⣾⣟⢿⣻⣿⣿⣟⡾⣽⡳⠄⠎⢳⣯⢯⣟⡾⢯⣞⣯⣓⠉⢀⠀⠀⡄⢢⡀
⠀⠀⣸⣷⣷⣶⣳⣶⣺⣿⣿⣳⢯⣟⣿⣿⣳⢯⠛⠅⠃⠀⠀⣴⣿⡿⣬⢶⠾⠙⣊⣥⠾⡒⠊⢁⢠⠣⣌
⠀⠀⢺⡽⣾⡽⣯⣟⣿⡿⣯⣿⣿⣾⢿⣿⠳⢏⣈⢠⠀⠀⣰⢿⡿⣽⣉⡶⠌⠋⠉⣀⡀⠁⠀⠀⠀⣘⡐⣂
⠀⠀⠘⣽⣳⣟⣳⣟⣾⣽⣿⣿⣿⣿⣿⣦⣜⡻⡽⠆⠧⣴⡟⣯⢟⡳⣭⠲⠄⠐⠀⠀⠀⠈⠁⠉⠑⢊⡕⢃⠄
⠀⠀⠀⠹⣿⣾⣿⣯⣿⣾⣿⣿⣿⣿⣿⣿⣿⣿⣾⢧⠀⠹⠾⡵⡞⡽⢢⣃⠐⠀⠀⠄⡐⠀⠀⠀⡘⢦⠘⣌
⠀⠀⠀⠐⠹⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢯⡏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠒⡈⠀⡀⠄⡑⠢⣉⠴⣈⣆
⠀⠀⠀⠀⠀⣀⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⢯⣏⡴⣶⣵⣢⢤⢠⡀⡄⢠⠐⡰⢌⡱⠀⡁⡀⠆⡥⠆⡥⣛⡽⣾
⠀⠀⡀⠔⠉⠀⠀⢽⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣼⣻⢷⣯⡽⣞⣷⣻⡼⣡⢋⡔⠣⠜⡐⢐⠠⡓⣤⣙⣲⣽⣻⢷
⠀⠀⠀⠀⠀⠀⠀⠘⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡿⣽⣞⣷⣻⡴⣣⢜⡱⣊⡕⣊⠠⡙⡰⣭⢷⣯⣿⢿

i fucking hate react
*/
