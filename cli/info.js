const _ = require('lodash')
const path = require('path')
const chalk = require('chalk')
const puppeteer = require('puppeteer')

const PlayApi = require('../')

module.exports = async (opts) => {
  // Validate input
  if ( !opts.email ) return new Error('No Google email provided. Pass in as --email <email>');
  if ( !opts.password ) return new Error('No Google password provided. Pass in as --password <password>');

  let pkg = opts._[1]
  if ( !pkg ) return new Error('No package provided. Use', chalk.white('playstore info <package_name>'))

  // Gatter options from cli
  let options = {
    // Metadata
    email: opts.email,
    password: opts.password,
    cookieFile: opts.cookies || path.join(__dirname, '/.cookies'),
  }

  // Create a new browser
  let browser = options.browser = await puppeteer.launch({
    devtools: opts.devtools
  });
  
  let play = new PlayApi(options)
  await play.init()

  let appInfo = await play.getApp(pkg)

  if (!appInfo) {
    console.log('Not found')
    return
  }

  let apps = [appInfo]

  let colors = {
    draft: chalk.yellow,
    published: chalk.green,
    unpublished: chalk.red,
    unknown: chalk.white,
  }

  for (let app of apps) {
    let color = colors[app.status] || chalk.white
    let pad = 10 - app.status.length
    console.log(color(`[${app.status}]`), ' '.repeat(pad), chalk.dim(app.package_name))
    console.log('  ', ' '.repeat(10), (app.title))
    console.log()
  }
  
  await browser.close()
}