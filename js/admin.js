// ===========================================
// admin.js – Adminpanel: hantera lag & fångster
// ===========================================
(async function () {
  // Auth-guard
  let currentUser;
  try {
    currentUser = await requireAuth('admin');
  } catch (e) { return; }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'index.html');
  });

  // ===========================================
  // Tab-navigation
  // ===========================================
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ===========================================
  // LÄG-HANTERING
  // ===========================================
  const teamModal = document.getElementById('teamModal');
  const teamForm = document.getElementById('teamForm');
  const membersContainer = document.getElementById('membersContainer');

  document.getElementById('addTeamBtn').addEventListener('click', () => {
    teamForm.reset();
    membersContainer.innerHTML = '<div class="form-group"><input type="text" class="member-input" required placeholder="Namn på medlem 1"></div>';
    teamModal.classList.add('active');
  });

  document.getElementById('cancelTeamBtn').addEventListener('click', () => {
    teamModal.classList.remove('active');
  });

  teamModal.addEventListener('click', (e) => {
    if (e.target === teamModal) teamModal.classList.remove('active');
  });

  // Lägg till fler medlemmar i formuläret
  document.getElementById('addMemberBtn').addEventListener('click', () => {
    const count = membersContainer.querySelectorAll('.member-input').length + 1;
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `<input type="text" class="member-input" required placeholder="Namn på medlem ${count}">`;
    membersContainer.appendChild(div);
  });

  // Spara lag
  teamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('teamName').value.trim();
    const email = document.getElementById('teamEmail').value.trim();
    const password = document.getElementById('teamPassword').value;
    const memberInputs = membersContainer.querySelectorAll('.member-input');
    const members = [];
    memberInputs.forEach(input => {
      const n = input.value.trim();
      if (n) members.push({ id: generateId(), name: n });
    });

    if (members.length === 0) {
      showToast('Lägg till minst en lagmedlem', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Skapa Firebase Auth-användare via sekundär app-instans
      const secondaryApp = firebase.initializeApp(firebaseConfig, 'secondary-' + Date.now());
      const secondaryAuth = secondaryApp.auth();
      const cred = await secondaryAuth.createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;
      await secondaryAuth.signOut();
      await secondaryApp.delete();

      // Skapa lagdokument
      const teamRef = db.collection('teams').doc();
      await teamRef.set({
        name: name,
        members: members,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Skapa användardokument som kopplar auth till lag
      await db.collection('users').doc(uid).set({
        email: email,
        role: 'team',
        teamId: teamRef.id,
        teamName: name,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      teamModal.classList.remove('active');
      showToast(`Lag "${name}" skapat!`, 'success');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        showToast('E-postadressen används redan', 'error');
      } else {
        showToast('Kunde inte skapa lag: ' + err.message, 'error');
      }
    }
    setLoading(false);
  });

  function generateId() {
    return Math.random().toString(36).substring(2, 10);
  }

  // Realtidslyssnare: lag
  db.collection('teams').orderBy('createdAt').onSnapshot(snapshot => {
    const list = document.getElementById('teamsList');
    const filterSelect = document.getElementById('filterTeam');

    if (snapshot.empty) {
      list.innerHTML = '<div class="empty-state"><div class="icon">—</div><p>Inga lag tillagda ännu</p></div>';
      return;
    }

    list.innerHTML = '';
    // Uppdatera filter-dropdown
    const currentFilter = filterSelect.value;
    filterSelect.innerHTML = '<option value="">Alla lag</option>';

    snapshot.forEach(doc => {
      const team = doc.data();
      const id = doc.id;

      // Filter dropdown
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = team.name;
      filterSelect.appendChild(opt);

      // Lagkort
      const card = document.createElement('div');
      card.className = 'team-card';
      card.innerHTML = `
        <div class="team-name">
          <span>${escapeHtml(team.name)}</span>
          <button class="delete-btn" title="Ta bort lag" data-id="${id}" data-name="${escapeHtml(team.name)}">&times;</button>
        </div>
        <div class="members">
          ${(team.members || []).map(m => `<span class="member-tag">${escapeHtml(m.name)}</span>`).join('')}
        </div>
      `;
      list.appendChild(card);
    });

    filterSelect.value = currentFilter;

    // Radera lag
    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        if (!confirm(`Vill du verkligen ta bort laget "${name}"? Alla lagets fångster kommer också tas bort.`)) return;
        setLoading(true);
        try {
          // Ta bort lagets fångster
          const catchSnap = await db.collection('catches').where('teamId', '==', id).get();
          const batch = db.batch();
          catchSnap.forEach(doc => batch.delete(doc.ref));
          batch.delete(db.collection('teams').doc(id));
          await batch.commit();

          // Ta bort user-dokument kopplat till laget
          const userSnap = await db.collection('users').where('teamId', '==', id).get();
          const batch2 = db.batch();
          userSnap.forEach(doc => batch2.delete(doc.ref));
          await batch2.commit();

          showToast(`Lag "${name}" borttaget`, 'success');
        } catch (err) {
          console.error(err);
          showToast('Kunde inte ta bort lag: ' + err.message, 'error');
        }
        setLoading(false);
      });
    });
  });

  // ===========================================
  // FÅNGSTER
  // ===========================================
  const filterTeam = document.getElementById('filterTeam');
  let allCatches = [];

  db.collection('catches').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
    allCatches = [];
    snapshot.forEach(doc => {
      allCatches.push({ id: doc.id, ...doc.data() });
    });
    renderCatches();
  });

  filterTeam.addEventListener('change', renderCatches);

  function renderCatches() {
    const tbody = document.getElementById('catchesBody');
    let filtered = allCatches;
    if (filterTeam.value) {
      filtered = allCatches.filter(c => c.teamId === filterTeam.value);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-sm" style="padding:2rem;">Inga fångster</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(c => `
      <tr>
        <td>${formatTime(c.timestamp)}</td>
        <td>${escapeHtml(c.teamName)}</td>
        <td>${escapeHtml(c.memberName)}</td>
        <td><span class="badge ${c.isPike ? 'badge-pike' : 'badge-other'}">${escapeHtml(c.speciesName)}</span></td>
        <td>${c.lengthCm} cm</td>
        <td>${c.isPike && c.weightGrams ? c.weightGrams + ' g' : '-'}</td>
        <td><button class="delete-btn catch-del" data-id="${c.id}" title="Ta bort">&times;</button></td>
      </tr>
    `).join('');

    // Radera fångst
    tbody.querySelectorAll('.catch-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Ta bort denna fångst?')) return;
        try {
          await db.collection('catches').doc(btn.dataset.id).delete();
          showToast('Fångst borttagen', 'success');
        } catch (err) {
          showToast('Kunde inte ta bort: ' + err.message, 'error');
        }
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
})();
