const _ = require('lodash')
const path = require('path')
const puppeteer = require('puppeteer')

const PlayApi = require('./play-api')

async function run() {

  let options = {
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
  }

  // Create a new browser
  let browser = options.browser = await puppeteer.launch({
    devtools: true
  });
  
  let play = new PlayApi(options)

  await play.init()
  await play.removeDrafts()
  
  let metadata = {
    package_name: 'com.test.tendadigital.lol',
    language: 'pt-BR',
    title: 'Package Title WORKS',
    fullDescription: 'FULL DESCRIPTION WORKS',
    shortDescription: 'SHORT DESCRIPTION WORKS',
    video: 'https://www.youtube.com/watch?v=_DUjtL4j4S8?WORKS',
    
    // Details
    contactWebsite: 'http://CONTATO.SITE.WORKS.COM',
    contactEmail: 'CONTATO@WORKS.COM',
    contactPhone: '+55 11 999999999',

    // Privacy
    privacyUrl: 'http://PRIVACY.COM/WORKS',

    // Images
    icon: path.join(__dirname, 'tests/icon.png'),
    // icon: path.join(__dirname, 'screenshot_run_1.png'),
    featureGraphic: path.join(__dirname, 'tests/featureGraphic.png'),
    phoneScreenshots: [
      path.join(__dirname, 'tests/screenshot.png'),
      path.join(__dirname, 'tests/screenshot.png'),
    ],

    // Apk
    apk: path.join(__dirname, './tests/app.apk'),
  }

  let app = await play.create(metadata)

  // await browser.close()
  // process.exit(0)
}

// Listen for Application wide errors
process.on('unhandledRejection', handleError)
process.on('uncaughtException', handleError)

function handleError(e) {
  console.error('Fatal Error')
  console.error(e.stack)

  console.error('Exiting.')
  process.exit(1)
}

// Call run
;(async () => {
  try {
    await run()
  } catch (e) {
    console.error(e.stack)
    process.exit(1)
  }
})();
