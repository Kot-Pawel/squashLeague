/**
 * @jest-environment jsdom
 */

document.addEventListener('DOMContentLoaded', function() {
  const listDiv = document.getElementById('match-requests-list');
  if (!listDiv) return;

  firebase.auth().onAuthStateChanged(async function(user) {
    if (!user) {
      listDiv.innerHTML = 'Please log in to see your match requests.';
      return;
    }
    const db = firebase.firestore();
    const uid = user.uid;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Show matches from up to 7 days ago so players can enter results after the match
    const windowStart = new Date(today);
    windowStart.setDate(today.getDate() - 7);
    const windowStartStr = windowStart.toISOString().slice(0, 10);

    try {
      const snapshot = await db.collection('matchRequests')
        .where('fromUserId', 'in', [uid])
        .where('date', '>=', windowStartStr)
        .get();
      const snapshot2 = await db.collection('matchRequests')
        .where('toUserId', '==', uid)
        .where('date', '>=', windowStartStr)
        .get();

      // Merge and deduplicate
      const requests = {};
      snapshot.forEach(doc => requests[doc.id] = {id: doc.id, ...doc.data()});
      snapshot2.forEach(doc => requests[doc.id] = {id: doc.id, ...doc.data()});
      let allRequests = Object.values(requests);

      // Filter: keep future matches AND past matches within the 5-day result window
      allRequests = allRequests.filter(req => {
        const reqDate = new Date(req.date);
        return reqDate >= windowStart;
      });

      if (allRequests.length === 0) {
        listDiv.innerHTML = 'No match requests yet.';
        return;
      }

      // Sort by date ascending (soonest first)
      allRequests.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
      });

      // Collect unique user IDs to fetch screenNames
      const userIds = new Set();
      allRequests.forEach(req => {
        if (req.fromUserId !== uid) userIds.add(req.fromUserId);
        if (req.toUserId !== uid) userIds.add(req.toUserId);
      });

      // Fetch screenNames in parallel
      const userIdToScreenName = {};
      await Promise.all(Array.from(userIds).map(async userId => {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          userIdToScreenName[userId] = userDoc.exists && userDoc.data().screenName
            ? userDoc.data().screenName
            : userId;
        } catch {
          userIdToScreenName[userId] = userId;
        }
      }));

      // Group by status
      const grouped = {pending: [], accepted: [], rejected: []};
      allRequests.forEach(req => {
        grouped[req.status || 'pending'].push(req);
      });

      function renderResultBadge(req, uid) {
        if (!req.result) return '';
        const myScore = req.result.scores ? req.result.scores[uid] : null;
        const oppScore = req.result.scores
          ? Object.entries(req.result.scores).filter(([k]) => k !== uid).map(([,v]) => v)[0]
          : null;
        const isDraw = req.result.isDraw === true || req.result.winnerId === null;
        const badge = isDraw
          ? '<span class="result-badge result-badge--draw">D</span>'
          : req.result.winnerId === uid
            ? '<span class="result-badge result-badge--win">W</span>'
            : '<span class="result-badge result-badge--loss">L</span>';
        const score = (myScore != null && oppScore != null)
          ? `<span class="result-score">${myScore} – ${oppScore}</span>`
          : '';
        return `${badge}${score}`;
      }

      function renderEnterResultBtn(req) {
        return `<button class="btn btn-sm btn-outline-primary enter-result-btn" data-id="${req.id}"
                  data-fromuserid="${req.fromUserId}" data-touserid="${req.toUserId}">
                  📝 Enter Result
                </button>`;
      }

      function renderRequestRow(req, uid, userIdToScreenName, todayStr) {
        const otherUserId = req.fromUserId === uid ? req.toUserId : req.fromUserId;
        const otherUserName = userIdToScreenName[otherUserId] || otherUserId;
        const isPast = req.date < todayStr;
        const status = req.status || 'pending';

        let actionHtml = '';
        if (status === 'pending' && req.toUserId === uid) {
          actionHtml = `
            <button class="btn btn-sm btn-success accept-match-btn" data-id="${req.id}">Accept</button>
            <button class="btn btn-sm btn-danger reject-match-btn" data-id="${req.id}">Reject</button>`;
        } else if (status === 'accepted' && isPast) {
          actionHtml = req.result
            ? renderResultBadge(req, uid)
            : renderEnterResultBtn(req);
        }

        return `<li class="match-request-row" data-id="${req.id}">
          With: <b>${otherUserName}</b>
          on <b>${req.date}</b> at <b>${req.timeSlot}</b>
          <span class="match-actions">${actionHtml}</span>
        </li>`;
      }

      let html = '';
      for (const status of ['pending', 'accepted', 'rejected']) {
        if (grouped[status].length) {
          html += `<b class="text-capitalize">${status}:</b><ul>`;
          grouped[status].forEach(req => {
            html += renderRequestRow(req, uid, userIdToScreenName, todayStr);
          });
          html += '</ul>';
        }
      }
      listDiv.innerHTML = html;
    } catch (err) {
      listDiv.innerHTML = 'Error loading match requests: ' + err.message;
    }

    

      // ── Accept / Reject ────────────────────────────────────────────────────
      listDiv.querySelectorAll('.accept-match-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          btn.disabled = true;
          btn.textContent = 'Accepting...';
          try {
            await db.collection('matchRequests').doc(btn.dataset.id).set({ status: 'accepted' }, { merge: true });
            btn.textContent = 'Accepted';
            setTimeout(() => window.location.reload(), 500);
          } catch (err) {
            btn.textContent = 'Error';
            btn.disabled = false;
            (window.toast||{show:()=>{}}).show('Failed to accept: ' + err.message, 'error');
          }
        });
      });

      listDiv.querySelectorAll('.reject-match-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          btn.disabled = true;
          btn.textContent = 'Rejecting...';
          try {
            await db.collection('matchRequests').doc(btn.dataset.id).set({ status: 'rejected' }, { merge: true });
            btn.textContent = 'Rejected';
            setTimeout(() => window.location.reload(), 500);
          } catch (err) {
            btn.textContent = 'Error';
            btn.disabled = false;
            (window.toast||{show:()=>{}}).show('Failed to reject: ' + err.message, 'error');
          }
        });
      });

      // ── Enter Result ───────────────────────────────────────────────────────
      listDiv.querySelectorAll('.enter-result-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const reqId       = btn.dataset.id;
          const fromUserId  = btn.dataset.fromuserid;
          const toUserId    = btn.dataset.touserid;
          const actionsSpan = btn.closest('.match-request-row').querySelector('.match-actions');

          // Render inline score form
          actionsSpan.innerHTML = `
            <span class="result-form">
              <label class="result-form__label">You</label>
              <input type="number" min="0" max="99" class="form-control form-control-sm result-input" id="my-score-${reqId}" placeholder="0" style="width:62px;display:inline-block;">
              <span class="result-form__sep">–</span>
              <input type="number" min="0" max="99" class="form-control form-control-sm result-input" id="opp-score-${reqId}" placeholder="0" style="width:62px;display:inline-block;">
              <label class="result-form__label">Opponent</label>
              <button class="btn btn-sm btn-success submit-result-btn" data-id="${reqId}"
                data-fromuserid="${fromUserId}" data-touserid="${toUserId}">Save</button>
              <button class="btn btn-sm btn-secondary cancel-result-btn">Cancel</button>
            </span>`;

          actionsSpan.querySelector('.cancel-result-btn').addEventListener('click', () => {
            actionsSpan.innerHTML = `<button class="btn btn-sm btn-outline-primary enter-result-btn"
              data-id="${reqId}" data-fromuserid="${fromUserId}" data-touserid="${toUserId}">
              📝 Enter Result</button>`;
            // Re-attach listener on the new button
            actionsSpan.querySelector('.enter-result-btn').addEventListener('click', btn.onclick);
          });

          actionsSpan.querySelector('.submit-result-btn').addEventListener('click', async function(e) {
            const saveBtn  = e.currentTarget;
            const myScore  = parseInt(document.getElementById('my-score-' + reqId).value, 10);
            const oppScore = parseInt(document.getElementById('opp-score-' + reqId).value, 10);

            if (isNaN(myScore) || isNaN(oppScore)) {
              (window.toast||{show:()=>{}}).show('Please enter both scores.', 'warning');
              return;
            }

            const winnerId = myScore > oppScore ? uid : (oppScore > myScore ? (fromUserId === uid ? toUserId : fromUserId) : null);
            const isDraw   = myScore === oppScore;
            const scores   = { [uid]: myScore, [fromUserId === uid ? toUserId : fromUserId]: oppScore };

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving…';
            try {
              await db.collection('matchRequests').doc(reqId).set(
                { result: { winnerId, isDraw, scores, recordedAt: firebase.firestore.FieldValue.serverTimestamp(), recordedBy: uid } },
                { merge: true }
              );
              (window.toast||{show:()=>{}}).show('Result saved!', 'success');
              setTimeout(() => window.location.reload(), 600);
            } catch (err) {
              saveBtn.disabled = false;
              saveBtn.textContent = 'Save';
              (window.toast||{show:()=>{}}).show('Failed to save result: ' + err.message, 'error');
            }
          });
        });
      });

  });
});
