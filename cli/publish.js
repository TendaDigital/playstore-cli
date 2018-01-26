const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const puppeteer = require('puppeteer')

const PlayApi = require('../')
const MetadataLoader = require('../helpers/MetadataLoader')

module.exports = async function (opts) {
  // Try loading as a path
  let metadata = await MetadataLoader(opts.metadata)

  if (!metadata) {
    return new Error('Could not load metadata')
  }

  console.log()
  console.log(chalk.yellow('Publishing using Metadata: (json)'))
  console.log(metadata)
  console.log()

  // Gatter options from cli
  let options = {
    // Metadata
    email: opts.email,
    password: opts.password,
    cookieFile: opts.cookies || path.join(process.cwd(), '/.cookies'),

    // Silent mode
    silent: opts.silent,
  }

  // Create a new browser
  let browser = options.browser = await puppeteer.launch({
    devtools: opts.devtools
  })
  
  let play = new PlayApi(options)
  await play.init()

  let app = await play.create(metadata)

  await browser.close()
}