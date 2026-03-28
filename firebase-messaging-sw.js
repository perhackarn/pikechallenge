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

// Hanterar bakgrundsnotiser
messaging.onBackgroundMessage(function (payload) {
  const title = payload.notification.title || 'Pike Challenge';
  const options = {
    body: payload.notification.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.data && payload.data.url ? payload.data.url : '/scoreboard.html' }
  };
  self.registration.showNotification(title, options);
});

// Klick på notisen öppnar appen
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/scoreboard.html';
  event.waitUntil(clients.openWindow(url));
});
