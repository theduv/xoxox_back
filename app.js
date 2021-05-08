const express = require('express')
const https = require('https')
const fs = require('fs')
const cors = require('cors')
const util = require('./src/util')

const port = process.env.PORT || 4001

const app = express()
app.use(cors())

const server = https.createServer(
  {
    key: fs.readFileSync('./back.xoxox.dev/back.xoxox.dev.key'),
    cert: fs.readFileSync('./back.xoxox.dev/fullchain.cer'),
  },
  app
)

const io = require('socket.io')(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

let clients = []

let rooms = {}

io.on('connection', (socket) => {
  console.log('playerJoined')
  socket.on('playerJoined', (data) => {
    util.onPlayerJoinRoom(data, socket)
  })
  socket.on('clickBoard', (data) => {
    util.onClickBoard(rooms, data)
  })
  socket.on('changeName', (data) => {
    util.onChangeName(data)
  })
  socket.on('sendMessage', (data) => {
    util.onSendMessage(data)
  })
  socket.on('disconnect', (socket) => {
    util.onDisconnect(socket)
  })
})

server.listen(port, () => console.log(`Listening on port ${port}`))
