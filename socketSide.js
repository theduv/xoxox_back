const express = require('express')
const https = require('https')
const fs = require('fs')
const cors = require('cors')
const events = require('./src/events')
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
  socket.on('playerJoined', (data) => {
    events.onPlayerJoinRoom(data, socket, rooms, clients, io)
  })
  socket.on('clickBoard', (data) => {
    events.onClickBoard(rooms, data, io)
  })
  socket.on('changeName', (data) => {
    events.onChangeName(data, rooms, io)
  })
  socket.on('sendMessage', (data) => {
    events.onSendMessage(data, rooms, io)
  })
  socket.on('playerDisconnected', (socket) => {
    events.onDisconnect(socket, rooms, clients, io)
  })
})

server.listen(port, () => console.log(`Listening on port ${port}`))
