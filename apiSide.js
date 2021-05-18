const express = require('express')
const https = require('https')
const cors = require('cors')
const fs = require('fs')
const port = process.env.PORT || 4002
const app = express()
const firebase = require('firebase-admin')

const firebaseConfig = {
  apiKey: 'AIzaSyCV6x5w17TeGXCSCfI5YmcoSrYMEXeooBY',
  authDomain: 'xoxox-f9e8a.firebaseapp.com',
  databaseURL:
    'https://xoxox-f9e8a-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'xoxox-f9e8a',
  storageBucket: 'xoxox-f9e8a.appspot.com',
  messagingSenderId: '938849856143',
  appId: '1:938849856143:web:6dbbb4f06b6dfab0785efa',
  measurementId: 'G-N2405MF6NQ',
}

firebase.initializeApp(firebaseConfig)

const firestore = firebase.firestore()

app.use(cors())

app.use(express.json())
app.use(express.urlencoded())

app.post('/users/create', (req, res) => {
  const usersDb = firestore.doc('users')
  const username = req.body.username
  const password = req.body.password

  const newUser = usersDb.doc(username)
  newUser.set({ username, password })

  res.send('test')
})

const server = https.createServer(
  {
    key: fs.readFileSync('./back.xoxox.dev/back.xoxox.dev.key'),
    cert: fs.readFileSync('./back.xoxox.dev/fullchain.cer'),
  },
  app
)

server.listen(port, () => console.log(`Listening on port 4002`))
