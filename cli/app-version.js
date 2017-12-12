const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const puppeteer = require('puppeteer')

const PlayApi = require('../')
const MetadataLoader = require('../helpers/MetadataLoader')

module.exports = async (opts) => {
  let pkg = opts._[1]
  if ( !pkg ) return new Error('No package provided. Use', chalk.white('playstore app-version <package_name>'))

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

  let version = await play.getAppVersionName(pkg, opts.track || 'prod')

  if (opts.silent) {
    console.log(version)
  } else {
    console.log('Version:', version, `[${opts.track || 'prod'}]`)
  }

  await browser.close()
}