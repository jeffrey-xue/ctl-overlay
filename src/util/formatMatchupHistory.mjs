import { formatScore, getMatchupScores, totalMatchupScores } from './matchupScores.js';

export const formatMatchupHistory = (matchups, bans, currentMatch) => {
  const rows = matchups.filter((m) => m.leftPlayer || m.rightPlayer);
  const leftWidth = Math.max(18, ...rows.map((m) => m.leftPlayer.length));
  const rightWidth = Math.max(13, ...rows.map((m) => m.rightPlayer.length));
  const scoreWidth = 11;
  const totals = totalMatchupScores(rows);
  const country = (team) =>
    team.team.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  const banLines = bans
    .map((teamBans, index) => {
      const players = teamBans.filter(Boolean).join(', ');
      return players
        ? `${country(currentMatch[`team${2 - index}`]).toUpperCase()} bans ${players.toUpperCase()}`
        : '';
    })
    .filter(Boolean);
  const lines = rows.map((matchup) => {
    const scores = getMatchupScores(matchup);
    const score = `${formatScore(scores.leftScore)} - ${formatScore(scores.rightScore)}`;
    const original = scores.adjusted
      ? ` (originally ${formatScore(matchup.leftScore)} - ${formatScore(matchup.rightScore)})`
      : '';
    return `${matchup.leftPlayer.toUpperCase().padEnd(leftWidth)} ${score.padEnd(scoreWidth)}${matchup.rightPlayer.toUpperCase().padStart(rightWidth)}${original}`;
  });

  return `\`\`\`\n${currentMatch.type.replace(/\r?\n/g, ' ')}\n\n${banLines.join('\n')}\n\n${lines.join('\n')}\n\nFinal score: ${country(currentMatch.team1).toUpperCase()} (#${currentMatch.team1.seed || 'SEED'}) ${totals.left} - ${totals.right} ${country(currentMatch.team2).toUpperCase()} (#${currentMatch.team2.seed || 'SEED'})\n\`\`\``;
};
