// ===========================================
// Firebase-konfiguration för Pike Challenge
// ===========================================
// Instruktioner:
// 1. Gå till https://console.firebase.google.com
// 2. Skapa ett nytt projekt (eller använd ett befintligt)
// 3. Lägg till en webbapp (Project Settings > General > Your apps)
// 4. Kopiera konfigurationen nedan
// 5. Aktivera Authentication > Sign-in method > Email/Password
// 6. Skapa en Firestore Database (Cloud Firestore > Create database)
// ===========================================

const firebaseConfig = {
   apiKey: "AIzaSyDHQRGJdocTirr2m9XpL3QtZrrJpO_Rhio",
  authDomain: "pikechallange.firebaseapp.com",
  projectId: "pikechallange",
  storageBucket: "pikechallange.firebasestorage.app",
  messagingSenderId: "188227153561",
  appId: "1:188227153561:web:903b68c23f3e19e282d208"
};

// Initiera Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
