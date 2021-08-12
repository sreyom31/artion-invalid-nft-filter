require('dotenv').config()
const axios = require('axios')
const validUrl = require('valid-url')
const mongoose = require('mongoose')
const NFTITEM = mongoose.model('NFTITEM')

const toLowerCase = (val) => {
  if (val) return val.toLowerCase()
  else return val
}

const storagePath = process.env.STORAGE_API_URL

const filterNFT = async () => {
  try {
    let nft = await NFTITEM.findOne({
      isFiltered: false,
      thumbnailPath: { $ne: '-' },
    })
    let uri = nft.tokenURI
    // first check url type
    if (!validUrl.isUri(uri)) {
      nft.isAppropriate = false
      nft.isFiltered = true
      await nft.save()
      console.log('invalid uri', uri, nft.contractAddress, nft.tokenID)
      return
    }
    // check if uri really exists
    try {
      let response = await axios.get(uri)
      if (response.data == undefined || response.data == null) {
        nft.isAppropriate = false
        nft.isFiltered = true
        await nft.save()
        console.log(
          'no data part defined from response',
          uri,
          nft.contractAddress,
          nft.tokenID,
        )
        return
      }
      let metadata = response.data
      if (!metadata && nft.thumbnailPath == '.') {
        nft.isAppropriate = false
        nft.isFiltered = true
        await nft.save()
        console.log(
          'invalid metadata with thumbnail .',
          uri,
          nft.contractAddress,
          nft.tokenID,
        )
        return
      }
      let imageUrl = metadata.image
      let name = metadata.name
      // now check image url
      try {
        let imageData = await axios.get(imageUrl)
        if (!imageData) {
          nft.isAppropriate = false
          nft.isFiltered = true
          await nft.save()
          console.log(
            'invalid image data',
            uri,
            imageUrl,
            nft.contractAddress,
            nft.tokenID,
          )
          return
        }
        // now check if correctly thumbnailed
        let thumbnail = nft.thumbnailPath
        if (thumbnail == '.') {
          nft.thumbnailPath = '-'
          nft.imageURL = imageUrl
          if (!nft.name) nft.name = name
          // nft.isFiltered = true
          console.log(
            'thumbnail is . while there is image, re-thumb-index',
            nft.contractAddress,
            nft.tokenID,
          )
          await nft.save()
          return
        } else {
          // now check if storage service works
          try {
            let thumbData = await axios.get(`${storagePath}${thumbnail}`)
            if (!thumbData) {
              nft.thumbnailPath = '-'
              nft.imageURL = imageUrl
              if (!nft.name) nft.name = name
              await nft.save()
              console.log(
                'thumbnail wrongly indexed',
                nft.contractAddress,
                nft.tokenID,
              )
              return
            } else {
              nft.imageURL = imageUrl
              if (!nft.name) nft.name = name
              nft.isFiltered = true
              await nft.save()
              console.log(
                'nft is correct in all',
                nft.contractAddress,
                nft.tokenID,
              )
              return
            }
          } catch (error) {
            // nft.thumbnailPath = '-'
            nft.thumbnailPath = 'embed'
            nft.contentType = 'embed'
            nft.imageURL = imageUrl
            if (!nft.name) nft.name = name
            nft.isFiltered = true
            await nft.save()
            console.log(
              'cannot get thumbnail data',
              nft.contractAddress,
              nft.tokenID,
            )
            return
          }
        }
      } catch (error) {
        nft.isAppropriate = false
        nft.isFiltered = true
        await nft.save()
        console.log(
          'cannot get image data response',
          nft.contractAddress,
          nft.tokenID,
        )
        return
      }
    } catch (error) {
      nft.isAppropriate = false
      nft.isFiltered = true
      await nft.save()
      console.log(
        'cannot get response from uri',
        nft.contractAddress,
        nft.tokenID,
      )
      return
    }
  } catch (error) {
    console.log('overall error, shit!')
  }
}

const filterNFTs = async () => {
  const func = async () => {
    await filterNFT()
    try {
      setTimeout(async () => {
        await func()
      }, 1000 * 3)
    } catch (error) {}
  }
  await func()
}

module.exports = filterNFTs
