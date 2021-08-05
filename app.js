require('dotenv').config()
const mongoose = require('mongoose')

require('./models/nftitems')

const filterNFTs = require('./services/nftFilter')

const uri = process.env.DB_URL

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', async () => {
  console.log('nft filter has been started')
  filterNFTs()
})
