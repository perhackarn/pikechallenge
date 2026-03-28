// ===========================================
// notifications.js – FCM push-notiser
// ===========================================
// Kräver att firebase-messaging-compat.js laddas FÖRE denna fil.
// Kräver att firebase-config.js redan initierats (firebase.app()).

(function () {
  'use strict';

  // VAPID-nyckel – genereras i Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
  // Användaren MÅSTE sätta sin egen nyckel här:
  const VAPID_KEY = window.PIKE_VAPID_KEY || 'b69Xm2wvM2CrQGspD-gmnJPqlSaT-LgDOnjnpbICFfQ';

  if (!VAPID_KEY) {
    console.warn('[Notifications] VAPID_KEY saknas. Sätt window.PIKE_VAPID_KEY innan notifications.js laddas, eller uppdatera VAPID_KEY i notifications.js.');
    return;
  }

  // Kontrollera att webbläsaren stödjer notiser
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[Notifications] Webbläsaren stödjer inte push-notiser.');
    return;
  }

  const messaging = firebase.messaging();

  // Registrera service worker
  async function registerSW() {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      return registration;
    } catch (err) {
      console.error('[Notifications] Service worker registration failed:', err);
      return null;
    }
  }

  // Spara FCM-token i Firestore
  async function saveToken(token) {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const tokenRef = firebase.firestore().collection('fcmTokens').doc(token);
    await tokenRef.set({
      uid: user.uid,
      token: token,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  // Begär notisbehörighet och spara token
  async function requestPermissionAndToken() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[Notifications] Användaren nekade notiser.');
        return null;
      }

      const registration = await registerSW();
      if (!registration) return null;

      const token = await messaging.getToken({
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        await saveToken(token);
        console.log('[Notifications] Token sparad.');
      }
      return token;
    } catch (err) {
      console.error('[Notifications] Kunde inte hämta token:', err);
      return null;
    }
  }

  // Hantera förgrunds-notiser (medan appen är öppen)
  messaging.onMessage(function (payload) {
    const title = payload.notification.title || 'Pike Challenge';
    const body = payload.notification.body || '';

    // Visa som toast om showToast finns
    if (typeof showToast === 'function') {
      showToast(title + ': ' + body, 'info');
    }

    // Visa webbnotis även i förgrunden
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/icon-192.png'
      });
    }
  });

  // Visa knapp för att aktivera notiser
  function showNotificationButton() {
    // Skapa inte om den redan finns
    if (document.getElementById('enableNotifBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'enableNotifBtn';
    btn.className = 'btn btn-outline notification-btn';
    btn.textContent = 'Aktivera notiser';
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      btn.textContent = 'Aktiverar...';
      const token = await requestPermissionAndToken();
      if (token) {
        btn.textContent = 'Notiser aktiverade';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-outline');
      } else {
        btn.textContent = 'Kunde inte aktivera';
        btn.disabled = false;
      }
    });

    // Lägg till i navbar eller main content
    const navbar = document.querySelector('.navbar nav');
    if (navbar) {
      navbar.appendChild(btn);
    }
  }

  // Kör vid sidladdning
  firebase.auth().onAuthStateChanged(function (user) {
    if (!user) return;

    // Om redan godkänt, uppdatera token tyst
    if (Notification.permission === 'granted') {
      requestPermissionAndToken();
    } else if (Notification.permission !== 'denied') {
      // Visa knapp för att aktivera
      showNotificationButton();
    }
  });
})();
