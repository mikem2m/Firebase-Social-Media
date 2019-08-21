// Firebase Admin Initialization

var admin = require("firebase-admin");
var serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialnba-9a208-369df.firebaseio.com",
    storageBucket:"socialnba-9a208.appspot.com",
  });
const db = admin.firestore();

module.exports = { admin,db };