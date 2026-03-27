# Pike Challenge – Fisketävlingsapp

Webbapp för att hantera en fisketävling med lag- och individuella grenar. All data lagras i Firebase med realtidsuppdatering.

## Tävlingsgrenar

| Gren | Typ | Beskrivning |
|------|-----|-------------|
| **Centimeterjakten** | Lag | Summa av de 7 längsta gäddorna + 4 valfria fiskar (längd) |
| **700** | Lag | Första laget som når 700 cm total fångstlängd |
| **Störst gädda** | Individuell | Tyngsta enskilda gäddan (gram) |
| **1+1** | Individuell | Längsta gädda + längsta valfri art per deltagare |

## Kom igång

### 1. Skapa Firebase-projekt

1. Gå till [Firebase Console](https://console.firebase.google.com)
2. Klicka **Skapa projekt** (eller välj ett befintligt)
3. Under **Project Settings > General > Your apps**, klicka **Lägg till app > Webb** (`</>`)
4. Kopiera konfigurationsobjektet

### 2. Konfigurera appen

Öppna `js/firebase-config.js` och fyll i din Firebase-konfiguration:

```javascript
const firebaseConfig = {
  apiKey: "din-api-key",
  authDomain: "ditt-projekt.firebaseapp.com",
  projectId: "ditt-projekt-id",
  storageBucket: "ditt-projekt.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 3. Aktivera Firebase-tjänster

I Firebase Console:

- **Authentication > Sign-in method**: Aktivera **Email/Password**
- **Firestore Database**: Klicka **Create database** och välj en region (t.ex. `europe-west1`)

### 4. Säkerhetsregler (Firestore)

Kopiera innehållet i `firestore.rules` till **Firestore > Rules** i Firebase Console.

### 5. Publicera på GitHub Pages

1. Skapa ett nytt repository på GitHub
2. Pusha koden:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/DITT-ANVÄNDARNAMN/Pikechallenge.git
   git push -u origin main
   ```
3. Aktivera GitHub Pages:
   - Gå till **Settings > Pages** i ditt repository
   - Under **Source**, välj **Deploy from a branch**
   - Välj branch `main` och mapp `/ (root)`, klicka **Save**
   - Appen publiceras på `https://DITT-ANVÄNDARNAMN.github.io/Pikechallenge/`

4. **Viktigt:** Lägg till GitHub Pages-domänen i Firebase:
   - Gå till [Firebase Console](https://console.firebase.google.com) > **Authentication > Settings > Authorized domains**
   - Klicka **Add domain** och lägg till `DITT-ANVÄNDARNAMN.github.io`

### Lokal utveckling

Appen kräver ingen build-process. Öppna med valfri lokal webbserver:

```bash
# Med Python
python -m http.server 8080

# Med Node.js (npx)
npx serve .

# Med VS Code
# Installera tillägget "Live Server" och högerklicka index.html > Open with Live Server
```

## Användning

### Första gången
1. Öppna appen i webbläsaren
2. Klicka **"Första gången? Skapa adminkonto"**
3. Skapa ditt adminkonto med epost och lösenord

### Skapa lag (Admin)
1. Logga in som admin
2. Klicka **"+ Lägg till lag"**
3. Fyll i lagnamn, inloggnings-email, lösenord och lagmedlemmar
4. Laget kan nu logga in med sin email och lösenord

### Registrera fångster (Lag)
1. Logga in med lagets email och lösenord
2. Välj vilken medlem som fångade fisken
3. Välj art (Gädda eller annan), ange längd och vikt
4. Klicka **"Registrera fångst"**

### Resultattavla
- Öppen för alla utan inloggning via `scoreboard.html`
- Uppdateras i realtid när fångster registreras
- Flikar för varje tävlingsgren

## Filstruktur

```
Pikechallenge/
├── index.html          # Inloggningssida
├── admin.html          # Adminpanel (lag & fångster)
├── dashboard.html      # Lag-dashboard (registrera fångster)
├── scoreboard.html     # Publik resultattavla
├── 404.html            # GitHub Pages 404-sida
├── .nojekyll           # Förhindrar Jekyll-processning
├── firestore.rules     # Firestore-säkerhetsregler
├── css/
│   └── style.css       # Gemensam stilmall
└── js/
    ├── firebase-config.js  # Firebase-konfiguration
    ├── utils.js            # Delade funktioner & poängberäkning
    ├── login.js            # Inloggningslogik
    ├── admin.js            # Adminlogik
    ├── dashboard.js        # Dashboard-logik
    └── scoreboard.js       # Resultattavla-logik
```

## Teknisk stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (inget ramverk)
- **Backend**: Firebase (Authentication + Cloud Firestore)
- **Hosting**: GitHub Pages
- **Realtid**: Firestore `onSnapshot`-lyssnare
- **Mobilvänlig**: Responsiv design som fungerar på telefoner
