const express = require('express')
const https = require('https')
const fs = require('fs')

const port = process.env.PORT || 4002

const app = express()

app.post('/', (req, res) => {
  res.json({ username: req.body.username })
})

const server = https.createServer(
  {
    key: fs.readFileSync('./back.xoxox.dev/back.xoxox.dev.key'),
    cert: fs.readFileSync('./back.xoxox.dev/fullchain.cer'),
  },
  app
)

server.listen(port, () => console.log(`Listening on port 4002`))
