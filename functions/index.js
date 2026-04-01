// ===========================================
// Cloud Function: Skicka push-notis vid ny fångst
// ===========================================
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onNewCatch = functions.firestore
  .document("catches/{catchId}")
  .onCreate(async (snap, context) => {
    const catchData = snap.data();
    if (!catchData) return null;

  const species = catchData.speciesName || "Okänd art";
  const length = catchData.lengthCm || 0;
  const member = catchData.memberName || "Okänd";
  const team = catchData.teamName || "Okänt lag";

  const title = `Ny fångst: ${species} ${length} cm`;
  const body = `${member} (${team}) registrerade en ${species} på ${length} cm`;

  // Hämta alla FCM-tokens
  const db = admin.firestore();
  const tokensSnapshot = await db.collection("fcmTokens").get();

  if (tokensSnapshot.empty) {
    console.log("Inga FCM-tokens registrerade.");
    return;
  }

  const tokens = [];
  tokensSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.token) {
      tokens.push(data.token);
    }
  });

  if (tokens.length === 0) return;

  // Skicka till alla tokens (max 500 åt gången)
  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: {
      url: "/scoreboard.html",
    },
    // Webb-push-specifikt (krävs för Safari/iOS)
    webpush: {
      headers: {
        Urgency: "high",
      },
      notification: {
        title: title,
        body: body,
        icon: "/icons/icon-192.png",
        requireInteraction: true,
      },
    },
  };

  const staleTokens = [];

  // Skicka individuellt för att kunna hantera ogiltiga tokens
  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      try {
        await admin.messaging().send({ ...message, token: token });
      } catch (err) {
        // Ta bort ogiltiga tokens
        if (
          err.code === "messaging/invalid-registration-token" ||
          err.code === "messaging/registration-token-not-registered"
        ) {
          staleTokens.push(token);
        }
        throw err;
      }
    })
  );

  // Rensa ogiltiga tokens
  if (staleTokens.length > 0) {
    const batch = db.batch();
    staleTokens.forEach((token) => {
      batch.delete(db.collection("fcmTokens").doc(token));
    });
    await batch.commit();
    console.log(`Rensade ${staleTokens.length} ogiltiga tokens.`);
  }

  const successful = results.filter((r) => r.status === "fulfilled").length;
  console.log(`Notis skickad till ${successful}/${tokens.length} enheter.`);
  return null;
});
