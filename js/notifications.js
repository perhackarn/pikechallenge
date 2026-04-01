// ===========================================
// notifications.js – FCM push-notiser
// ===========================================
// Kräver att firebase-messaging-compat.js laddas FÖRE denna fil.
// Kräver att firebase-config.js redan initierats (firebase.app()).

(function () {
  'use strict';

  // VAPID-nyckel – genereras i Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
  // Användaren MÅSTE sätta sin egen nyckel här:
  const VAPID_KEY = window.PIKE_VAPID_KEY || 'BL1lFvYp3uzs0GSJ_0SZarRxcnr2wmesDkTy16bqi0xrkLqRg1VJdgd0sYz5wKJ_eGOqqg6zXKnc402NmSQe0lY';

  if (!VAPID_KEY) {
    console.warn('[Notifications] VAPID_KEY saknas. Sätt window.PIKE_VAPID_KEY innan notifications.js laddas, eller uppdatera VAPID_KEY i notifications.js.');
    return;
  }

  // Kolla om det är iOS
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  // Kontrollera att webbläsaren stödjer notiser
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[Notifications] Webbläsaren stödjer inte push-notiser.');
    // På iOS som inte är installerad som PWA – visa installationsguide
    if (isIOS && !isStandalone) {
      showIOSInstallPrompt();
    }
    return;
  }

  console.log('[Notifications] Init. Permission:', Notification.permission);

  var messaging;
  try {
    messaging = firebase.messaging();
  } catch (err) {
    console.error('[Notifications] Kunde inte initiera messaging:', err);
    return;
  }

  // Registrera service worker
  async function registerSW() {
    try {
      // Bestäm bas-URL dynamiskt (fungerar på GitHub Pages och lokalt)
      const basePath = new URL('.', window.location.href).pathname;
      const swUrl = basePath + 'firebase-messaging-sw.js';
      const registration = await navigator.serviceWorker.register(swUrl);
      // Vänta tills service workern är aktiv
      if (registration.installing) {
        await new Promise(resolve => {
          registration.installing.addEventListener('statechange', function () {
            if (this.state === 'activated') resolve();
          });
        });
      } else if (registration.waiting) {
        await new Promise(resolve => {
          registration.waiting.addEventListener('statechange', function () {
            if (this.state === 'activated') resolve();
          });
        });
      }
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

    try {
      const tokenRef = firebase.firestore().collection('fcmTokens').doc(token);
      await tokenRef.set({
        uid: user.uid,
        token: token,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.error('[Notifications] Kunde inte spara token:', err);
    }
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
    var title = (payload.notification && payload.notification.title) || 'Pike Challenge';
    var body = (payload.notification && payload.notification.body) || '';

    // Visa som toast i appen (ingen extra webbnotis – service workern hanterar det)
    if (typeof showToast === 'function') {
      showToast(title + ': ' + body, 'info');
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

  // Visa iOS-installationsguide
  function showIOSInstallPrompt() {
    function render() {
      if (document.getElementById('iosInstallPrompt')) return;
      var navbar = document.querySelector('.navbar nav');
      if (!navbar) return;

      var btn = document.createElement('button');
      btn.id = 'iosInstallPrompt';
      btn.className = 'btn btn-outline notification-btn';
      btn.textContent = 'Aktivera notiser';
      btn.addEventListener('click', function () {
        var banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1B2A4A;color:#fff;padding:1.2rem;text-align:center;z-index:9999;font-size:0.95rem;line-height:1.5;box-shadow:0 -2px 10px rgba(0,0,0,0.3)';
        banner.innerHTML = '<strong>F\u00f6r att f\u00e5 notiser p\u00e5 iPhone:</strong><br>' +
          '1. Tryck p\u00e5 <strong>Dela-knappen</strong> (fyrkant med pil upp\u00e5t)<br>' +
          '2. V\u00e4lj <strong>\u201cL\u00e4gg till p\u00e5 hemsk\u00e4rmen\u201d</strong><br>' +
          '3. \u00d6ppna appen d\u00e4rifr\u00e5n och aktivera notiser<br><br>' +
          '<button onclick="this.parentElement.remove()" style="background:#3B7DD8;color:#fff;border:none;padding:0.5rem 1.5rem;border-radius:6px;font-size:0.9rem;cursor:pointer">OK, jag f\u00f6rst\u00e5r</button>';
        document.body.appendChild(banner);
      });
      navbar.appendChild(btn);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }

  // Kör vid sidladdning – visa knappen direkt
  function init() {
    console.log('[Notifications] Init knapp. Permission:', Notification.permission);
    if (Notification.permission === 'granted') {
      // Redan godkänt – försök uppdatera token tyst
      requestPermissionAndToken();
    } else if (Notification.permission === 'denied') {
      console.log('[Notifications] Notiser blockerade av användaren.');
    } else {
      showNotificationButton();
    }
  }

  // Vänta på att DOM:en är klar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
