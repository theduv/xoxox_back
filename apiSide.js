const express = require('express')
const https = require('https')
const cors = require('cors')
const firestore = require('firebase-admin')
const fs = require('fs')

firestore.initializeApp()

const db = firestore.firestore()

const port = process.env.PORT || 4002

const app = express()

app.use(cors())

app.use(express.json())
app.use(express.urlencoded())

app.post('/users/create', (req, res) => {
  const usersDb = db.collection('users')
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
