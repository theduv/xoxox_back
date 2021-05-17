const express = require('express')
const https = require('https')
const fs = require('fs')
const cors = require('cors')

const port = process.env.PORT || 4002

const app = express()
app.use(cors())

app.get('/', (req, res) => {
  res.json({ zebi: 'test' })
})

app.listen(port, () => console.log(`Listening on port 4002`))
