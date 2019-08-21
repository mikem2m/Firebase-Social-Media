let db = {
    users:[
        {
        userId:'123456',
        email:'user@gmail.com',
        handle:'user',
        createdAt:'2019-03-15T10:59:52.798Z',
        imageUrl:'image/blabla/blabla',
        bio:'hello, my name is user. Nice to meet you',
        website: 'https://user.com',
        location: 'Bali,Indonesia',
        }
    ],
    screams:[
        {
        userHandle:'user',
        body:'this is the scream body',
        createdAt:'"2019-08-01T06:50:37.454Z"',
        likeCount: 5,
        commentCount: 2,
        }
    ],
    comments:[
        {
        userHandle:'user',
        screamId:'12345',
        body:'nice one mate!',
        createdAt:'2019-03-15T10:59:52.798Z',
        }
    ],
    notifications: [
        {
        recipient:'user',
        sender:'john',
        read: 'true' || 'false',
        screamId: 'blablabla',
        type: 'like' || 'comment',
        createdAt:'2019-03-15T10:59:52.798Z',        
        }
    ],
};

// Redux Data
const userDetails = {
    credentials:{
        userId:'123456',
        email:'user@gmail.com',
        handle:'user',
        createdAt:'2019-03-15T10:59:52.798Z',
        imageUrl:'image/blabla/blabla',
        bio:'hello, my name is user. Nice to meet you',
        website: 'https://user.com',
        location: 'Bali,Indonesia',
    },
    likes:[
        {
        userHandle:'user',
        screamId:'blablabla',
        },
        {
        userHandle:'user',
        screamId:'blablabla2',
        }
    ]
};