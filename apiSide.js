const express = require('express')
const https = require('https')
const cors = require('cors')
const fs = require('fs')
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

const test = async (username, password) => {
  const usersDb = db.collection('users').doc(username)

  await usersDb.set({ password })
}

app.post('/users/create', (req, res) => {
  const username = req.body.username
  const password = req.body.password

  test(username, password)
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
