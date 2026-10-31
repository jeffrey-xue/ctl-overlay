export const formatScore = (score) => String(score ?? '').trim() || '0';

export const getMatchupScores = (matchup) => {
  const left = Number(matchup.leftScore);
  const right = Number(matchup.rightScore);
  const valid = (score) => String(score ?? '').trim() !== '' && Number.isFinite(Number(score));
  const canCounterpick = valid(matchup.leftScore) && valid(matchup.rightScore) && left !== right;
  const adjusted = Boolean(matchup.counterpickBought) && canCounterpick;
  return {
    canCounterpick,
    adjusted,
    leftScore: adjusted ? (left < right ? 7 : 6) : matchup.leftScore,
    rightScore: adjusted ? (right < left ? 7 : 6) : matchup.rightScore,
  };
};

export const totalMatchupScores = (matchups) =>
  matchups.reduce(
    (totals, matchup) => {
      const scores = getMatchupScores(matchup);
      for (const side of ['left', 'right']) {
        const score = Number(scores[`${side}Score`]);
        totals[side] += Number.isFinite(score) ? score : 0;
      }
      return totals;
    },
    { left: 0, right: 0 }
  );
