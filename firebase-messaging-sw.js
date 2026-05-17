// ===========================================
// Service Worker för Firebase Cloud Messaging
// Måste ligga i roten av webbplatsen
// ===========================================
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDHQRGJdocTirr2m9XpL3QtZrrJpO_Rhio",
  authDomain: "pikechallange.firebaseapp.com",
  projectId: "pikechallange",
  storageBucket: "pikechallange.firebasestorage.app",
  messagingSenderId: "188227153561",
  appId: "1:188227153561:web:903b68c23f3e19e282d208"
});

const messaging = firebase.messaging();

// Hanterar bakgrundsnotiser – onBackgroundMessage ersätter FCM:s standardvisning (undviker dubletter)
messaging.onBackgroundMessage(function (payload) {
  const title = (payload.data && payload.data.title) || (payload.notification && payload.notification.title) || 'Pike Challenge';
  const body = (payload.data && payload.data.body) || (payload.notification && payload.notification.body) || '';
  const url = (payload.data && payload.data.url) || 'scoreboard.html';
  const options = {
    body: body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: url }
  };
  self.registration.showNotification(title, options);

  // Sätt app-badge (röd prick på ikonen) om det stöds
  if (navigator.setAppBadge) {
    navigator.setAppBadge().catch(function () {});
  }
});

// Klick på notisen öppnar appen
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  // Rensa app-badge när användaren klickar på notisen
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge().catch(function () {});
  }

  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : 'scoreboard.html';
  event.waitUntil(clients.openWindow(url));
});
