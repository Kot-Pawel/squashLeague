// ── Leaderboard rendering helpers ─────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function getRankLabel(index) {
  return index < 3 ? RANK_MEDALS[index] : `#${index + 1}`;
}

function getRankClass(index) {
  if (index === 0) return 'stat-card--gold';
  if (index === 1) return 'stat-card--silver';
  if (index === 2) return 'stat-card--bronze';
  return '';
}

function buildStatsHTML(users) {
  if (users.length === 0) {
    return '<p class="text-muted text-center py-4">No player data yet.</p>';
  }
  const maxGames = users[0].games || 1;

  const cards = users.map((u, i) => {
    const pct   = Math.round((u.games / maxGames) * 100);
    const delay = Math.min(i * 60, 600);
    const hasResults = (u.wins + u.losses + u.draws) > 0;
    const wlHtml = hasResults
      ? `<span class="stat-wl">
           <span class="stat-wl__win">${u.wins}W</span>
           <span class="stat-wl__sep">/</span>
           <span class="stat-wl__draw">${u.draws}D</span>
           <span class="stat-wl__sep">/</span>
           <span class="stat-wl__loss">${u.losses}L</span>
         </span>`
      : '';
    return `
      <div class="stat-card ${getRankClass(i)}" style="animation-delay:${delay}ms" data-games="${u.games}">
        <div class="stat-card__rank">${getRankLabel(i)}</div>
        <div class="stat-card__body">
          <div class="stat-card__name">${escapeHTML(u.screenName)}</div>
          <div class="stat-card__bar-wrap">
            <div class="stat-card__bar" style="--pct:${pct}%"></div>
          </div>
        </div>
        <div class="stat-card__count">
          <span class="stat-counter" data-target="${u.games}">0</span>
          <span class="stat-card__label">games</span>
          ${wlHtml}
        </div>
      </div>`;
  }).join('');

  return `<div class="stats-leaderboard">${cards}</div>`;
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/** Animate all .stat-counter elements from 0 → data-target over ~900ms */
function animateCounters(container) {
  const duration = 900;
  container.querySelectorAll('.stat-counter').forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    if (!target) { el.textContent = '0'; return; }
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/** Animate progress bars from 0 → --pct after cards appear */
function animateBars(container) {
  // Small delay so the card entrance animation runs first
  setTimeout(() => {
    container.querySelectorAll('.stat-card__bar').forEach(bar => {
      bar.classList.add('stat-card__bar--animate');
    });
  }, 150);
}

// ── Main DOMContentLoaded ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  const showBtn = document.getElementById('show-player-stats-btn');
  const backBtn = document.getElementById('back-to-main-btn');
  const statsSection = document.getElementById('player-stats-section');
  const statsList = document.getElementById('player-stats-list');
  const mainSections = [
    document.getElementById('availability-section'),
    document.getElementById('find-partner-section'),
    document.getElementById('match-requests-section')
  ];

  // Show stats section, hide main sections
  showBtn.addEventListener('click', async function() {
    mainSections.forEach(sec => sec.style.display = 'none');
    statsSection.style.display = '';
    statsList.textContent = 'Loading...';
    const db = firebase.firestore();
    try {
      // Fetch all users
      const usersSnap = await db.collection('users').get();
      // Fetch all accepted matchRequests
      const matchSnap = await db.collection('matchRequests').where('status', '==', 'accepted').get();
      const gameCount = {};
      const winCount  = {};
      const lossCount = {};
      const drawCount = {};
      matchSnap.forEach(doc => {
        const data = doc.data();
        [data.fromUserId, data.toUserId].forEach(uid => {
          gameCount[uid] = (gameCount[uid] || 0) + 1;
        });
        // Tally wins, losses & draws from recorded results
        if (data.result) {
          const isDraw = data.result.isDraw === true || data.result.winnerId === null;
          if (isDraw) {
            [data.fromUserId, data.toUserId].forEach(uid => {
              drawCount[uid] = (drawCount[uid] || 0) + 1;
            });
          } else if (data.result.winnerId) {
            const winnerId = data.result.winnerId;
            const loserId  = data.fromUserId === winnerId ? data.toUserId : data.fromUserId;
            winCount[winnerId]  = (winCount[winnerId]  || 0) + 1;
            lossCount[loserId]  = (lossCount[loserId]  || 0) + 1;
          }
        }
      });

      // Build an array of users with game counts so we can sort them
      const users = [];
      usersSnap.forEach(doc => {
        const d = doc.data();
        users.push({
          id:         doc.id,
          screenName: d.screenName || d.email || 'Unknown',
          games:      gameCount[doc.id] || 0,
          wins:       winCount[doc.id]  || 0,
          losses:     lossCount[doc.id] || 0,
          draws:      drawCount[doc.id] || 0,
        });
      });

      // Exclude users whose screenName contains the string "testUser"
      const filteredUsers = users.filter(u => !u.screenName.startsWith('testUser'));

      // Sort by games played (descending), then by screenName (ascending) for tie-breaker
      filteredUsers.sort((a, b) => {
        if (b.games !== a.games) return b.games - a.games;
        return a.screenName.localeCompare(b.screenName);
      });

      statsList.innerHTML = buildStatsHTML(filteredUsers);
      animateCounters(statsList);
      animateBars(statsList);
    } catch (err) {
      statsList.textContent = 'Error loading stats: ' + err.message;
    }
  });

  // Back to main sections
  backBtn.addEventListener('click', function() {
    statsSection.style.display = 'none';
    mainSections.forEach(sec => sec.style.display = '');
  });
});