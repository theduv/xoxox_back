const express = require('express')
const https = require('https')
const cors = require('cors')

const fs = require('fs')

const port = process.env.PORT || 4002

const app = express()

app.use(cors())

app.post('/users/create', (req, res) => {
  console.log(req)
  res.json(test: 'test')
})

const server = https.createServer(
  {
    key: fs.readFileSync('./back.xoxox.dev/back.xoxox.dev.key'),
    cert: fs.readFileSync('./back.xoxox.dev/fullchain.cer'),
  },
  app
)

server.listen(port, () => console.log(`Listening on port 4002`))
