// ===========================================
// scoreboard.js – Publik resultattavla (realtid)
// ===========================================
(function () {
  // Tab-navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Samla alla lag
  let teamsMap = {};
  db.collection('teams').onSnapshot(snap => {
    teamsMap = {};
    snap.forEach(doc => {
      teamsMap[doc.id] = { id: doc.id, ...doc.data() };
    });
  });

  // Lyssna på alla fångster och beräkna allt
  db.collection('catches').onSnapshot(snapshot => {
    const allCatches = [];
    snapshot.forEach(doc => allCatches.push({ id: doc.id, ...doc.data() }));

    // Gruppera per lag
    const byTeam = {};
    allCatches.forEach(c => {
      if (!byTeam[c.teamId]) byTeam[c.teamId] = [];
      byTeam[c.teamId].push(c);
    });

    renderCentimeterjakten(byTeam);
    render700(byTeam);
    renderStorstGadda(allCatches);
    renderOnePlusOne(allCatches);
  });

  // ===========================================
  // CENTIMETERJAKTEN
  // ===========================================
  function renderCentimeterjakten(byTeam) {
    const list = document.getElementById('cmRankList');
    const results = Object.entries(byTeam).map(([teamId, catches]) => {
      const score = calculateCentimeterjakten(catches);
      const teamName = catches[0]?.teamName || teamsMap[teamId]?.name || 'Okänt lag';
      return { teamId, teamName, ...score };
    }).sort((a, b) => b.total - a.total);

    // Inkludera lag utan fångster
    Object.values(teamsMap).forEach(t => {
      if (!results.find(r => r.teamId === t.id)) {
        results.push({ teamId: t.id, teamName: t.name, total: 0, pikeCount: 0, pikeTotal: 0, otherCount: 0, otherTotal: 0 });
      }
    });

    if (results.length === 0) {
      list.innerHTML = '<li class="no-data">Inga lag registrerade ännu</li>';
      return;
    }

    list.innerHTML = results.map((r, i) => {
      const pikeCatches = (r.pikeCatches || []);
      const otherCatches = (r.otherCatches || []);
      const hasCatches = pikeCatches.length > 0 || otherCatches.length > 0;

      let detailHtml = '';
      if (hasCatches) {
        const rows = [
          ...pikeCatches.map(c => `<tr><td><span class="badge badge-pike">Gädda</span></td><td>${c.lengthCm} cm</td><td>${c.weightGrams ? c.weightGrams + ' g' : '-'}</td><td>${escapeHtml(c.memberName)}</td></tr>`),
          ...otherCatches.map(c => `<tr><td><span class="badge badge-other">${escapeHtml(c.speciesName)}</span></td><td>${c.lengthCm} cm</td><td>${c.weightGrams ? c.weightGrams + ' g' : '-'}</td><td>${escapeHtml(c.memberName)}</td></tr>`)
        ];
        detailHtml = `
          <div class="rank-detail-panel">
            <table>
              <thead><tr><th>Art</th><th>Längd</th><th>Vikt</th><th>Fångad av</th></tr></thead>
              <tbody>${rows.join('')}</tbody>
            </table>
          </div>`;
      }

      return `
      <li class="rank-item ${hasCatches ? 'rank-expandable' : ''}" ${hasCatches ? 'data-expand' : ''}>
        <div class="rank-position">${i + 1}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(r.teamName)} ${hasCatches ? '<span class="expand-arrow">▸</span>' : ''}</div>
          <div class="rank-detail">
            Gäddor: ${r.pikeCount}/7 (${r.pikeTotal} cm) + Övriga: ${r.otherCount}/4 (${r.otherTotal} cm)
          </div>
        </div>
        <div class="rank-score">${r.total}<small> cm</small></div>
      </li>
      ${detailHtml}`;
    }).join('');

    // Klicka för att expandera/kollapsa
    list.querySelectorAll('[data-expand]').forEach(item => {
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => {
        const panel = item.nextElementSibling;
        if (panel && panel.classList.contains('rank-detail-panel')) {
          panel.classList.toggle('open');
          const arrow = item.querySelector('.expand-arrow');
          if (arrow) arrow.textContent = panel.classList.contains('open') ? '▾' : '▸';
        }
      });
    });
  }

  // ===========================================
  // 700-TÄVLINGEN
  // ===========================================
  function render700(byTeam) {
    const grid = document.getElementById('sevenGrid');
    const results = Object.entries(byTeam).map(([teamId, catches]) => {
      const total = calculate700(catches);
      const teamName = catches[0]?.teamName || teamsMap[teamId]?.name || 'Okänt lag';
      return { teamId, teamName, total, reached: total >= 700 };
    });

    // Inkludera lag utan fångster
    Object.values(teamsMap).forEach(t => {
      if (!results.find(r => r.teamId === t.id)) {
        results.push({ teamId: t.id, teamName: t.name, total: 0, reached: false });
      }
    });

    results.sort((a, b) => b.total - a.total);

    if (results.length === 0) {
      grid.innerHTML = '<div class="no-data">Inga lag registrerade ännu</div>';
      return;
    }

    grid.innerHTML = results.map(r => {
      const pct = Math.min(100, (r.total / 700) * 100);
      return `
        <div class="seven-hundred-item ${r.reached ? 'reached-700' : ''}">
          <div class="team-name">
            <span>${r.reached ? '✓ ' : ''}${escapeHtml(r.teamName)}</span>
            <span>${r.total} / 700 cm</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${r.reached ? 'reached' : ''}" style="width:${pct}%">
              ${r.total > 0 ? r.total + ' cm' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===========================================
  // STÖRST GÄDDA
  // ===========================================
  function renderStorstGadda(allCatches) {
    const list = document.getElementById('biggestRankList');
    const results = calculateStorstGadda(allCatches);

    if (results.length === 0) {
      list.innerHTML = '<li class="no-data">Inga gäddor registrerade med vikt ännu</li>';
      return;
    }

    list.innerHTML = results.slice(0, 20).map((c, i) => `
      <li class="rank-item">
        <div class="rank-position">${i + 1}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(c.memberName)}</div>
          <div class="rank-detail">${escapeHtml(c.teamName)} · ${c.lengthCm} cm · ${formatTime(c.timestamp)}</div>
        </div>
        <div class="rank-score">${c.weightGrams}<small> g</small></div>
      </li>
    `).join('');
  }

  // ===========================================
  // 1+1
  // ===========================================
  function renderOnePlusOne(allCatches) {
    const list = document.getElementById('opoRankList');
    const results = calculateOnePlusOne(allCatches);

    if (results.length === 0 || results.every(r => r.total === 0)) {
      list.innerHTML = '<li class="no-data">Inga resultat ännu</li>';
      return;
    }

    const filtered = results.filter(r => r.total > 0);
    list.innerHTML = filtered.slice(0, 20).map((r, i) => `
      <li class="rank-item">
        <div class="rank-position">${i + 1}</div>
        <div class="rank-info">
          <div class="rank-name">${escapeHtml(r.memberName)}</div>
          <div class="rank-detail">
            ${escapeHtml(r.teamName)} · Gädda ${r.pikeLength} cm + ${escapeHtml(r.otherSpecies)} ${r.otherLength} cm
          </div>
        </div>
        <div class="rank-score">${r.total}<small> cm</small></div>
      </li>
    `).join('');
  }

  // Utility
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
})();
