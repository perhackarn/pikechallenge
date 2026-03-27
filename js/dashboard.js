// ===========================================
// dashboard.js – Lag-dashboard: registrera fångster
// ===========================================
(async function () {
  let currentUser, teamId, teamName, teamMembers = [];
  try {
    const res = await requireAuth('team');
    currentUser = res;
    teamId = res.userData.teamId;
    teamName = res.userData.teamName;
  } catch (e) { return; }

  document.getElementById('teamTitle').textContent = teamName;

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'index.html');
  });

  // Ladda lagmedlemmar
  async function loadTeam() {
    try {
      const doc = await db.collection('teams').doc(teamId).get();
      if (doc.exists) {
        teamMembers = doc.data().members || [];
        const select = document.getElementById('memberSelect');
        select.innerHTML = '<option value="">Välj lagmedlem...</option>';
        teamMembers.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = m.name;
          select.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Kunde inte ladda lag:', e);
    }
  }
  await loadTeam();

  // Toggle art-val
  const pikeRadio = document.getElementById('speciesPike');
  const otherRadio = document.getElementById('speciesOther');
  const otherGroup = document.getElementById('otherSpeciesGroup');
  const weightGroup = document.getElementById('weightGroup');

  function updateSpeciesUI() {
    const isPike = pikeRadio.checked;
    otherGroup.classList.toggle('hidden', isPike);
    weightGroup.style.display = isPike ? '' : 'none';
    if (isPike) {
      document.getElementById('speciesName').value = '';
    }
  }
  pikeRadio.addEventListener('change', updateSpeciesUI);
  otherRadio.addEventListener('change', updateSpeciesUI);
  updateSpeciesUI();

  // Registrera fångst
  const catchForm = document.getElementById('catchForm');
  catchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('memberSelect').value;
    const member = teamMembers.find(m => m.id === memberId);
    if (!member) {
      showToast('Välj en lagmedlem', 'warning');
      return;
    }

    const isPike = pikeRadio.checked;
    const speciesName = isPike ? 'Gädda' : document.getElementById('speciesName').value.trim();
    const lengthCm = parseFloat(document.getElementById('lengthCm').value);
    const weightGrams = isPike ? parseInt(document.getElementById('weightGrams').value) || 0 : 0;

    if (!isPike && !speciesName) {
      showToast('Ange vilken art', 'warning');
      return;
    }
    if (!lengthCm || lengthCm <= 0) {
      showToast('Ange giltig längd', 'warning');
      return;
    }

    setLoading(true);
    try {
      await db.collection('catches').add({
        teamId: teamId,
        teamName: teamName,
        memberId: member.id,
        memberName: member.name,
        isPike: isPike,
        speciesName: speciesName,
        lengthCm: lengthCm,
        weightGrams: weightGrams,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast(`${speciesName} ${lengthCm} cm registrerad!`, 'success');
      catchForm.reset();
      pikeRadio.checked = true;
      updateSpeciesUI();
    } catch (err) {
      console.error(err);
      showToast('Kunde inte spara: ' + err.message, 'error');
    }
    setLoading(false);
  });

  // ===========================================
  // Realtidslyssnare: lagets fångster
  // ===========================================
  db.collection('catches')
    .where('teamId', '==', teamId)
    .orderBy('timestamp', 'desc')
    .onSnapshot(snapshot => {
      const catches = [];
      snapshot.forEach(doc => catches.push({ id: doc.id, ...doc.data() }));

      renderCatches(catches);
      updateStats(catches);
    }, err => {
      console.error('Firestore query error:', err);
      if (err.code === 'failed-precondition') {
        // Index saknas – visa länk till att skapa det
        showToast('Firestore-index saknas. Kolla konsolen för länk.', 'error');
        console.error('Skapa index via länken i felmeddelandet ovan.');
      } else {
        showToast('Kunde inte ladda fångster: ' + err.message, 'error');
      }
      // Fallback: hämta utan sortering
      db.collection('catches')
        .where('teamId', '==', teamId)
        .get()
        .then(snap => {
          const catches = [];
          snap.forEach(doc => catches.push({ id: doc.id, ...doc.data() }));
          catches.sort((a, b) => {
            const ta = a.timestamp ? (a.timestamp.toMillis ? a.timestamp.toMillis() : 0) : 0;
            const tb = b.timestamp ? (b.timestamp.toMillis ? b.timestamp.toMillis() : 0) : 0;
            return tb - ta;
          });
          renderCatches(catches);
          updateStats(catches);
        });
    });

  function renderCatches(catches) {
    const tbody = document.getElementById('teamCatches');
    document.getElementById('catchCountLabel').textContent = catches.length + ' fångster';

    if (catches.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-sm" style="padding:2rem;">Inga fångster ännu – dags att fiska! 🎣</td></tr>';
      return;
    }

    tbody.innerHTML = catches.map(c => `
      <tr>
        <td>${formatTime(c.timestamp)}</td>
        <td>${escapeHtml(c.memberName)}</td>
        <td><span class="badge ${c.isPike ? 'badge-pike' : 'badge-other'}">${escapeHtml(c.speciesName)}</span></td>
        <td><strong>${c.lengthCm} cm</strong></td>
        <td>${c.isPike && c.weightGrams ? c.weightGrams + ' g' : '-'}</td>
        <td><button class="delete-btn catch-del" data-id="${c.id}" title="Ta bort">🗑️</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.catch-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Ta bort denna fångst?')) return;
        try {
          await db.collection('catches').doc(btn.dataset.id).delete();
          showToast('Fångst borttagen', 'success');
        } catch (err) {
          showToast('Fel: ' + err.message, 'error');
        }
      });
    });
  }

  function updateStats(catches) {
    // Centimeterjakten
    const cm = calculateCentimeterjakten(catches);
    document.getElementById('statCm').textContent = cm.total;

    // 700
    const total700 = calculate700(catches);
    document.getElementById('stat700').textContent = total700;
    const pct = Math.min(100, (total700 / 700) * 100);
    const fill = document.getElementById('progress700Fill');
    fill.style.width = pct + '%';
    fill.textContent = total700 + ' cm';
    if (total700 >= 700) fill.classList.add('reached');
    else fill.classList.remove('reached');
    document.getElementById('progress700Text').textContent = total700 + ' / 700 cm' + (total700 >= 700 ? ' ✅' : '');

    // Antal
    document.getElementById('statCount').textContent = catches.length;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
})();
