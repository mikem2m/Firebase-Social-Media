// Importing 3rd Party Libraries
const functions = require('firebase-functions');
const app = require("express")();

const cors = require("cors");
app.use(cors());

// Local Functions Import

const {db} = require('./util/admin');

const { 
    getAllScreams,
    postOneScream,
    getScream, 
    commentOnScream,
    likeScream,
    unlikeScream,
    deleteScream,
} = require('./handlers/screams');

const { 
    signUp,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead,
}= require('./handlers/users');

const FBAuth = require('./util/fbAuth');

// Retrieving all screams
app.get('/screams', getAllScreams);

// Posting a scream
app.post('/scream',FBAuth,postOneScream);

// View a single scream
app.get('/scream/:screamId', getScream);

// Comment on a scream
app.post('/scream/:screamId/comment',FBAuth,commentOnScream);

// Deleting a scream
app.delete('/scream/:screamId',FBAuth,deleteScream);

// Like a scream
app.get('/scream/:screamId/like',FBAuth,likeScream);

// Unlika a scream
app.get('/scream/:screamId/unlike',FBAuth,unlikeScream);

// Signup route
app.post('/signup',signUp);

// Login Route
app.post('/login',login);

// User Profile Picture
app.post('/user/image',FBAuth,uploadImage);

// Edit user Profile
app.post('/user',FBAuth,addUserDetails);

// View user Profile
app.get('/user',FBAuth,getAuthenticatedUser);

// View other Profile
app.get('/user/:handle',getUserDetails);

// Marking Notifications as Read
app.post('/notifications',FBAuth,markNotificationsRead);

// Exporting
exports.api = functions.https.onRequest(app);
// exports.api = functions.region('asia-east2').https.onRequest(app);

// Notifications handling (Using Firebase Trigger)
// Its a database trigger, no need to return data back!

// Notification for liked scream
exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
.onCreate((snapshot)=>{
   return db.doc(`/screams/${snapshot.data().screamId}`).get()
   .then(doc => {
      if(doc.exists && doc.data.userHandle!==snapshot.data().userHandle){
         return db.doc(`/notifications/${snapshot.id}`).set({
             createdAt: new Date().toISOString(),
             recipient: doc.data().userHandle,
             sender: snapshot.data().userHandle,
             type:'like',
             read: false,
             screamId: doc.id
         })
      } 
   })
   .catch(err => {
    console.error(err);  
   })
});

// Delete Notification on Unlike
exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}').onDelete((snapshot)=>{
    return db.doc(`/notifications/${snapshot.id}`).delete()
    .catch(err => {
        console.error(err);
    })
})

// Notification for comments
exports.createNotificationOnComment = functions.firestore.document('comments/{id}').onCreate((snapshot)=>{
    return db.doc(`/screams/${snapshot.data().screamId}`).get()
   .then(doc => {
      if(doc.exists && doc.data.userHandle!==snapshot.data().userHandle){
         return db.doc(`/notifications/${snapshot.id}`).set({
             createdAt: new Date().toISOString(),
             recipient: doc.data().userHandle,
             sender: snapshot.data().userHandle,
             type:'comment',
             read: false,
             screamId: doc.id
         })
      } 
   })
   .catch(err => {
    console.error(err);  
   })
});

// Update Profile Picture
exports.onUserImageChange = functions.firestore.document('/users/{userId}').onUpdate((change)=>{
    if(change.before.data().imageUrl !== change.after.data().imageUrl){
        console.log('image has been changed');
        const batch = db.batch();
        return db.collection('screams').where('userHandle','==',change.before.data().handle).get()
        .then(data => {
        data.forEach(doc => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream,{userImage:change.after.data().imageUrl});
        })
        return batch.commit();
        })
    }else return true;
});

// Delete likes,comments,notifactions when scream is deleted
exports.onScreamDelete = functions.firestore.document('./screams/{screamId}').onDelete((snapshot,context)=>{
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db.collection('comments').where('screamId','==',screamId).get()
    .then(data=>{
        data.forEach(doc => {
           batch.delete(db.doc(`/comments/${doc.id}`));
        })
    return db.collection('likes').where('screamId','==',screamId).get()
    })
    .then(data=>{
        data.forEach(doc=>{
            batch.delete(db.doc(`/likes/${doc.id}`));
        })
    return db.collection('notifications').where('screamId','==',screamId).get()
    })
    .then(data => {
        data.forEach(doc => {
            batch.delete(db.doc(`/notifications/${doc.id}`));
        })
        return batch.commit();
    })
    .catch(err => {
        console.error(err);
    });
});