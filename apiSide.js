const express = require('express')
const https = require('https')
const cors = require('cors')
const fs = require('fs')
const sha = require('js-sha512')
const port = process.env.PORT || 4002
const app = express()
const admin = require('firebase-admin')
const serviceAccount = require('./firestoreTokens.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

app.use(cors())

app.use(express.json())
app.use(express.urlencoded())

const addUser = async (username, password) => {
  const usersDb = db.collection('users').doc(username)

  const encryptedPassword = sha.sha512(password)
  await usersDb.set({ username, password: encryptedPassword })
}

const getUsers = async (res) => {
  const usersDb = db.collection('users')

  const usersList = await usersDb.get()

  let usersListArray = usersList.docs.map((doc) => {
    return doc.data()
  })
  console.log(usersListArray)
  res.json(usersListArray)
}

app.post('/users/create', (req, res) => {
  const username = req.body.username
  const password = req.body.password

  addUser(username, password)
})

app.get('/users/get', (req, res) => {
  getUsers(res)
})

const server = https.createServer(
  {
    key: fs.readFileSync('./back.xoxox.dev/back.xoxox.dev.key'),
    cert: fs.readFileSync('./back.xoxox.dev/fullchain.cer'),
  },
  app
)

server.listen(port, () => console.log(`Listening on port 4002`))
