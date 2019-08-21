const { db,admin } = require('../util/admin');
const config = require('../util/config');

// Firebase App initialization
const firebase = require('firebase');
firebase.initializeApp(config);

const {validateSignupData,validateLoginData,reduceUserDetails} = require('../util/validators');

// Sign user up
exports.signUp = (req,res) => {
    const newUser = {
        email:req.body.email,
        password:req.body.password,
        confirmPassword:req.body.confirmPassword,
        handle:req.body.handle,
    };

    const {errors,valid} = validateSignupData(newUser);

    if (!valid){
        return res.status(400).json({errors});
    }

    const noImg = 'noProfile.png';

    // Validate Data
    let token,userId;

    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({handle:'this handle is already taken'})
        }else{
            return firebase.auth().createUserWithEmailAndPassword(newUser.email,newUser.password)
        }
    })
    .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then(idToken => {
        token = idToken;
        const userCredentials = {
            handle:newUser.handle,
            email:newUser.email,
            createdAt:new Date().toISOString(),
            userId:userId,
            imageUrl:`https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        };
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(()=>{
        return res.status(201).json({token});
    })
    .catch(err => {
        console.error(err);
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json({email:'email is already in use'})
        }else{
            return res.status(500).json({general:'Something went wrong, please try again'});
        }
    })
};

// Log user in
exports.login = (req,res)=>{
    const user = {
        email:req.body.email,
        password:req.body.password,
    };

    const {errors,valid} = validateLoginData(user);

    if (!valid){
        return res.status(400).json({errors});
    }

    firebase.auth().signInWithEmailAndPassword(user.email,user.password)
    .then(data => {
        return data.user.getIdToken();
    })
    .then(token => {
        return res.json({token});
    })
    .catch(err => {
        console.error(err);
        if(err.code === 'auth/wrong-password' 
        || err.code === 'auth/user-not-found'){
            return res.status(403).json({general:'Wrong credentials, please try again'})
        }else{
            return res.status(500).json({err:err.code});
        }
    })

};

// Add user details
exports.addUserDetails = (req,res)=>{
    let userDetails = reduceUserDetails(req.body);
    
    db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(()=>{
        return res.json({message:'User Profile Updated'});
    })
    .catch((err)=>{
        console.error(err);
        return res.status(500).json({error:err.code});
    })
};

// Get other user details
exports.getUserDetails = (req,res) => {
    let userData = {};
    db.doc(`/users/${req.params.handle}`).get()
    .then(doc=>{
        if(doc.exists){
            userData.user = doc.data();
            return db.collection('screams').where('userHandle','==',req.params.handle).orderBy('createdAt','desc').get();
        }else{
            return res.status(404).json({error:'User not found'});
        }
    })
    .then(data => {
        userData.screams = [];
        data.forEach(doc => {
            userData.screams.push({
                body:doc.data().body,
                createdAt:doc.data().createdAt,
                userHandle:doc.data().userHandle,
                commentCount:doc.data().commentCount,
                likeCount:doc.data().likeCount,
                userImage:doc.data().userImage,
                screamId:doc.id
            })
        })
        return res.json(userData);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({error:err.code});
    })
};

// Get own user details
exports.getAuthenticatedUser = (req,res)=>{
    let userData = {};

    db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
        if(doc.exists){
            userData.credentials = doc.data();
            return db.collection('likes').where('userHandle','==',req.user.handle).get()
        }
    })
    .then(data => {
        userData.likes = [];
        data.forEach(doc => {
            userData.likes.push(doc.data())
        })
        return db.collection('notifications').where('recipient','==',req.user.handle).orderBy('createdAt','desc').limit(10).get();
    })
    .then(data => {
        userData.notifications = [];
        data.forEach(doc => {
            userData.notifications.push({
                recipient:doc.data().recipient,
                sender:doc.data().sender,
                read:doc.data().read,
                screamId:doc.data().screamId,
                type:doc.data().type,
                createdAt:doc.data().createdAt,
                notificationId:doc.id
            })
        })
        return res.json(userData);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({error:err.code});
    })
};

// Upload user's profile picture 
exports.uploadImage = (req,res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({
        headers:req.headers
    });

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file',(fieldname,file,filename,encoding,mimetype) => {
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
            return res.status(400).json({error:'Wrong file type submitted'});
        }

        // Image.png
        const imageExtension = filename.split('.')[filename.split('.').length -1];
        
        // 12345.png
        imageFileName = `${Math.round(Math.random()*100000000000)}.${imageExtension}`;

        const filepath = path.join(os.tmpdir(),imageFileName);
        imageToBeUploaded = {filepath,mimetype};
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish',()=>{
        admin.storage().bucket().upload(imageToBeUploaded.filepath,{
            resumable: false,
            metadata:{
                metadata:{
                   contentType:imageToBeUploaded.mimetype 
                }
            }
        })
        .then(()=>{
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc(`/users/${req.user.handle}`).update({imageUrl});
        })
        .then(()=>{
            return res.json({message:'Image uploaded successfully'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error:err.code});
        });
    });
    busboy.end(req.rawBody);
};

// Mark Notification Read 
exports.markNotificationsRead = (req,res) => {
    let batch = db.batch();

    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification,{read:true});
    });
    batch.commit()
    .then(()=>{
        return res.json({message:'notifications marked as read'});
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({error:err.code});
    });
};