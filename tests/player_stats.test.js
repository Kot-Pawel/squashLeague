// Test for counting games played per user

function countGames(matchRequests) {
  const gameCount = {};
  matchRequests.forEach(data => {
    [data.fromUserId, data.toUserId].forEach(uid => {
      gameCount[uid] = (gameCount[uid] || 0) + 1;
    });
  });
  return gameCount;
}

test('countGames counts games for each user', () => {
  const matches = [
    { fromUserId: 'u1', toUserId: 'u2', status: 'accepted' },
    { fromUserId: 'u2', toUserId: 'u3', status: 'accepted' },
    { fromUserId: 'u1', toUserId: 'u3', status: 'accepted' }
  ];
  const acceptedMatches = matches.filter(m => m.status === 'accepted');
  const result = countGames(acceptedMatches);
  expect(result).toEqual({
    u1: 2, // played with u2 and u3
    u2: 2, // played with u1 and u3
    u3: 2  // played with u1 and u2
  });
});