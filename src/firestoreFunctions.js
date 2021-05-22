const admin = require('firebase-admin')
const serviceAccount = require('../firestoreTokens.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})
const db = admin.firestore()

/* addUserToRoom()
 ** adds user to an existing room in firestore
 ** room is a string to the target room
 ** user is the UID of the user
 */

const addUserToRoom = (room, user) => {
  db.collection('rooms')
    .doc(room)
    .update({
      players: admin.firestore.FieldValue.arrayUnion(user),
    })
}

/* createRoom()
 ** creates a new room in firestore
 ** room is a string, name of the new room
 ** owner is the uid of the owner / creator
 */

const createRoom = (room, owner) => {
  db.collection('rooms').doc(room).set({
    owner: owner,
    players: [],
  })
}

module.exports = {
  addUserToRoom,
  createRoom,
}
