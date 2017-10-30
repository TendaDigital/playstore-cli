const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const puppeteer = require('puppeteer')

const PlayApi = require('../')
const MetadataLoader = require('../helpers/MetadataLoader')

module.exports = async (opts) => {
  // Gatter options from cli
  let options = {
    // Metadata
    email: opts.email,
    password: opts.password,
    cookieFile: opts.cookies || path.join(process.cwd(), '/.cookies'),
  }

  // Create a new browser
  let browser = options.browser = await puppeteer.launch({
    devtools: opts.devtools
  })
  
  let play = new PlayApi(options)
  await play.init()

  let app = await play.removeDrafts()

  await browser.close()
}