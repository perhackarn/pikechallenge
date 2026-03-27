// ===========================================
// Delade hjälpfunktioner för Pike Challenge
// ===========================================

// --- Toast-notifieringar ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- Laddningsindikator ---
function setLoading(show) {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

// --- Formatera tid ---
function formatTime(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('sv-SE', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ===========================================
// Poängberäkningar
// ===========================================

/**
 * Centimeterjakten:
 * Topp 7 gäddor (längd) + topp 4 av resterande fiskar (valfri art).
 * Resterande = alla fiskar som INTE redan räknas bland topp-7-gäddorna.
 */
function calculateCentimeterjakten(catches) {
  const pike = catches
    .filter(c => c.isPike)
    .sort((a, b) => b.lengthCm - a.lengthCm);

  const topPike = pike.slice(0, 7);
  const topPikeIds = new Set(topPike.map(c => c.id));

  const remaining = catches
    .filter(c => !topPikeIds.has(c.id))
    .sort((a, b) => b.lengthCm - a.lengthCm);
  const topOther = remaining.slice(0, 4);

  const pikeTotal = topPike.reduce((s, c) => s + c.lengthCm, 0);
  const otherTotal = topOther.reduce((s, c) => s + c.lengthCm, 0);

  return {
    total: pikeTotal + otherTotal,
    pikeCount: topPike.length,
    pikeTotal,
    otherCount: topOther.length,
    otherTotal,
    pikeCatches: topPike,
    otherCatches: topOther
  };
}

/**
 * 700-tävlingen:
 * Summa av ALLA fiskars längd. Första laget till 700 cm vinner.
 */
function calculate700(catches) {
  return catches.reduce((s, c) => s + c.lengthCm, 0);
}

/**
 * Störst gädda:
 * Tyngsta enskilda gäddan (gram), sorterat fallande.
 */
function calculateStorstGadda(catches) {
  return catches
    .filter(c => c.isPike && c.weightGrams > 0)
    .sort((a, b) => b.weightGrams - a.weightGrams);
}

/**
 * 1+1:
 * Per deltagare: längsta gädda + längsta annan art = total.
 */
function calculateOnePlusOne(catches) {
  const members = {};
  catches.forEach(c => {
    if (!members[c.memberId]) {
      members[c.memberId] = {
        memberId: c.memberId,
        memberName: c.memberName,
        teamName: c.teamName,
        pike: [], other: []
      };
    }
    if (c.isPike) members[c.memberId].pike.push(c);
    else members[c.memberId].other.push(c);
  });

  return Object.values(members).map(m => {
    m.pike.sort((a, b) => b.lengthCm - a.lengthCm);
    m.other.sort((a, b) => b.lengthCm - a.lengthCm);
    const lp = m.pike[0];
    const lo = m.other[0];
    return {
      memberId: m.memberId,
      memberName: m.memberName,
      teamName: m.teamName,
      pikeLength: lp ? lp.lengthCm : 0,
      otherLength: lo ? lo.lengthCm : 0,
      otherSpecies: lo ? lo.speciesName : '-',
      total: (lp ? lp.lengthCm : 0) + (lo ? lo.lengthCm : 0)
    };
  }).sort((a, b) => b.total - a.total);
}

// --- Auth-guard ---
function requireAuth(requiredRole) {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) { window.location.href = 'index.html'; return reject(); }
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (!doc.exists) { auth.signOut(); window.location.href = 'index.html'; return reject(); }
        const data = doc.data();
        if (requiredRole && data.role !== requiredRole) {
          window.location.href = data.role === 'admin' ? 'admin.html' : 'dashboard.html';
          return reject();
        }
        resolve({ user, userData: data });
      } catch (e) { console.error(e); reject(e); }
    });
  });
}
