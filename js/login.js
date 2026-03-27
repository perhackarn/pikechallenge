// ===========================================
// login.js – Inloggning & admin-setup
// ===========================================
(function () {
  const loginForm = document.getElementById('loginForm');
  const setupForm = document.getElementById('setupForm');
  const toggleBtn = document.getElementById('toggleSetup');
  let showSetup = false;

  // Kolla om admin redan finns via publikt config-dokument
  async function checkAdmin() {
    try {
      const doc = await db.collection('config').doc('app').get();
      if (!doc.exists || !doc.data().setupComplete) {
        // Ingen admin – visa setup som standard
        showSetup = true;
        loginForm.classList.add('hidden');
        setupForm.classList.remove('hidden');
        toggleBtn.textContent = 'Har redan konto? Logga in';
      }
    } catch (e) {
      console.error('Kunde inte kolla admin:', e);
    }
  }
  checkAdmin();

  // Om redan inloggad, dirigera vidare
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
          const role = doc.data().role;
          window.location.href = role === 'admin' ? 'admin.html' : 'dashboard.html';
        }
      } catch (e) { /* ignore */ }
    }
  });

  // Växla mellan login/setup
  toggleBtn.addEventListener('click', () => {
    showSetup = !showSetup;
    loginForm.classList.toggle('hidden', showSetup);
    setupForm.classList.toggle('hidden', !showSetup);
    toggleBtn.textContent = showSetup
      ? 'Har redan konto? Logga in'
      : 'Första gången? Skapa adminkonto';
  });

  // Inloggning
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    setLoading(true);
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const doc = await db.collection('users').doc(cred.user.uid).get();
      if (!doc.exists) {
        showToast('Kontot saknar roll. Kontakta admin.', 'error');
        await auth.signOut();
        setLoading(false);
        return;
      }
      const role = doc.data().role;
      window.location.href = role === 'admin' ? 'admin.html' : 'dashboard.html';
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        showToast('Fel e-post eller lösenord', 'error');
      } else {
        showToast('Kunde inte logga in: ' + err.message, 'error');
      }
      setLoading(false);
    }
  });

  // Skapa admin-konto
  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('setupEmail').value.trim();
    const pass = document.getElementById('setupPassword').value;
    if (pass.length < 6) {
      showToast('Lösenordet måste vara minst 6 tecken', 'warning');
      return;
    }
    setLoading(true);
    try {
      // Kontrollera att det inte redan finns en admin
      const configDoc = await db.collection('config').doc('app').get();
      if (configDoc.exists && configDoc.data().setupComplete) {
        showToast('Det finns redan ett adminkonto. Logga in istället.', 'warning');
        setLoading(false);
        return;
      }
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await db.collection('users').doc(cred.user.uid).set({
        email: email,
        role: 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // Markera att setup är klar
      await db.collection('config').doc('app').set({
        setupComplete: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('Adminkonto skapat!', 'success');
      window.location.href = 'admin.html';
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        showToast('E-postadressen används redan', 'error');
      } else {
        showToast('Fel: ' + err.message, 'error');
      }
      setLoading(false);
    }
  });
})();
