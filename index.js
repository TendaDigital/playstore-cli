const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const axios = require('axios')
const puppeteer = require('puppeteer')

const draftlog = require('draftlog').into(console)
// const LogSession = require('draftlog-session')

const Pupt = require('./helpers/pupt')
const sleep = require('./helpers/sleep')
const Parsers = require('./helpers/parsers')
const GetXsrf = require('./helpers/get-xsrf')
const mapLimit = require('./helpers/mapLimit')
const executor = require('./helpers/puptExecutor')


module.exports = class PlayApi {
  constructor(config) {
    if (!config) throw new Error('config must be an object');
    if (!config.email) throw new Error(`Missing 'email' parameter`)
    if (!config.password) throw new Error(`Missing 'password' parameter`)
    if (!config.browser) throw new Error(`Missing 'browser' parameter with puppeteer instance`);

    this.tag = chalk.yellow(`[PlayApi]`)
    this.config = config
    this.PlayURL = 'https://play.google.com/apps/publish/'
  }

  async init() {
    // Avoid re-initializing
    if (this.initialized) return;
    this.initialized = true

    let config = this.config

    this.browser = config.browser
    this.page = config.page || await this.browser.newPage()

    !this.config.silent && console.log(this.tag, 'Logging In with', chalk.green(this.config.email))
    await this.login({ email: this.config.email, password: this.config.password })

    // Create axios instance
    this.axios = axios.create({
      baseURL: 'https://play.google.com/',
      timeout: 10000,
      headers: {
        'content-type': 'application/javascript; charset=UTF-8',
        'x-gwt-module-base': 'https://ssl.gstatic.com/play-apps-publisher-rapid/fox/074adb9a16dafb48275500223c3f0df1/fox/gwt/',
        'x-gwt-permutation': '46943F73EC56AB6C8219700574F79376',
        'cookie': this.cookies,
      },
    });
  }

  /*
   * Login to Play Console using credentials, try reusing cookies to improve speed
   */
  async login({email, password}, silent) {
    await executor.run('Login', {
      email,
      password,
      page: this.page,
      cookiePath: path.join(process.cwd(), `.cookie[${email}]`),
    }, [
      'load-cookies {{{cookiePath}}}',
      'goto https://play.google.com/apps/publish/',
      'finish-if-url startsWith https://play.google.com/apps/publish/',
      'fill input[name="identifier"] {{email}}',
      'enter',
      'wait 1s',
      'wait-for input[name="password"]',
      'fill input[name="password"] {{password}}',
      'enter',
      'wait 5s',
      'save-cookies {{{cookiePath}}}',
    ])

    // Load cookies
    let cookies = await this.page.cookies()
    this.cookies = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    
    // Load Xsrf
    !this.config.silent && console.log(this.tag, 'Confirming Login (xsrf token)')
    this.xsrf = await GetXsrf(this.cookies)
  }

  /*
   * Load All apps from the store
   */
  async getApps() {
    let res = await this.axios.post('/apps/publish/androidapps', {
      method: 'fetchIndex',
      params: JSON.stringify({}),
      xsrf: this.xsrf,
    })

    this.assertResponseError(res.data, 'Could not fetch apps')

    return res.data.result[1].map(app => Parsers.AppInfo(app))
  }

  /*
   * Load All apps from the store and returns the app by the specified identifier
   */
  async getApp(package_name) {
    let apps = await this.getApps()

    return _.find(apps, {package_name}) || null
  }

    /*
   * Load version code from 
   */
  async getAppVersionName(package_name, track) {
    let res = await this.axios.post('/apps/publish/appreleases', {
      method: 'getReleaseTracksSummary',
      params: JSON.stringify({'1': package_name }),
      xsrf: this.xsrf,
    })

    track = {
      'prod' : '0',
      'beta' : '1',
      'alpha': '2',
    }[track] || '0'

    this.assertResponseError(res.data, `App '${package_name}' could not be found`)

    let resp = _.get(res.data.result, `1.${track}.5.1.1`)
    return resp
  }

  /*
   * Removes an app by it's package name
   */
  async delete(package_name) {
    let res = await this.axios.post('/apps/publish/androidapps', {
      method: 'delete',
      params: JSON.stringify({"1": package_name}),
      xsrf: this.xsrf,
    })

    this.assertResponseError(res.data, `App '${package_name}' could not be deleted`)
  }

  /*
   * Creates an app and return it's id (tmp.***)
   * Metadata can be assigned, and might be use to reuse draft packages with the same name
   */
  async create(metadata) {
    let tag = this.tag + ' ' + chalk.cyan(':create')
    
    let title = (metadata && metadata.title) || ''
    let package_name = _.isString(metadata) ? metadata : metadata.package_name

    if (!_.isString(package_name)) {
      throw new Error('package_name provided is not a string')
    }

    // Check if app already exists
    let apps = await this.getApps()

    // Check by the app package_name or app name on drafts
    let app = _.find(apps, {package_name}) || 
              _.find(apps, {title: title, status: 'draft'}) ||
              _.find(apps, {title: package_name, status: 'draft'})
    
    if (app && app.status != 'draft') {
      throw new Error(`App '${package_name}' already existis and is not in draft mode`)
    }

    if (app) {
      console.log(tag, 'Reusing app:', chalk.dim(title), chalk.green(app.package_name))
    } else {
      let res = await this.axios.post('/apps/publish/androidapps', {
        method: 'create',
        params: JSON.stringify({'1':{'2':{'1':[{'1':'pt-BR','2': title || package_name }]}}}),
        xsrf: this.xsrf,
      })

      this.assertResponseError(res.data, `App '${package_name}' could not be created`)

      // Get the created temporary package name
      package_name = res.data.result[7][1][1]
      app = await this.getApp(package_name)
      console.log(tag, 'App created:', chalk.dim(title), chalk.green(app.package_name))
    }

    // Update if metadata is already assigned
    if (_.isObject(metadata)) {
      await this.update(app, metadata)
    }

    // Fetch the newly created app information
    return app
  }

  /*
   * Updates an app metadata in draft mode
   */
  async update(app, metadata) {
    let page = this.page

    let tag = this.tag + chalk.cyan(' :update')

    try {

      // --------------------- MarketListingPlace
      console.log(tag, 'Updating app', chalk.green('information'))
      await require('./actions/updateMarketListingPlace')(this, app, metadata)

      // --------------------- MarketListingPlace (Images)
      console.log(tag, 'Updating app', chalk.green('images'))
      await require('./actions/uploadMarketListingPlaceImages')(this, app, metadata)

      // --------------------- PricingPlace
      console.log(tag, 'Updating app', chalk.green('pricing'))
      await require('./actions/updatePricingPlace')(this, app, metadata)

      // --------------------- ManageReleasesPlace
      console.log(tag, 'Updating app', chalk.green('APK'))
      await require('./actions/uploadApk')(this, app, metadata)

      // --------------------- ManageReleasesPlace
      console.log(tag, 'Updating app', chalk.green('Classification'))
      await require('./actions/updateClassification')(this, app, metadata)

      // --------------------- PublishPlace
      console.log(tag, chalk.green('Publishing app'))
      await require('./actions/publish')(this, app, metadata)

      // await page.goto(`${this.PlayURL}#MarketListingPlace:p=${package_name}`)

      // await fill(metadata.name, 'gwt-TextBox LV0HAAD-fn-d')
    } catch (e) {
      console.error(e)
      console.error(tag, chalk.red('failed'), e.message)
      await this.crashReport(e, {app, metadata})
      throw e
    }
    return true
  }

  async crashReport(e, context) {
    const page = this.page

    let folder = path.join(process.cwd(), 'crashes')
    let name = path.join(folder, `crash-${Date.now()}`)
    if (!fs.existsSync(folder)){
      fs.mkdirSync(folder);
    }

    // Report print screen
    await page.screenshot({fullPage: true, path: name + '.png'})

    // Report error as txt
    let str = '===== Crash Report =====\n\n' +
              '\n\n> date: '+ (new Date()).toString() +
              '\n\n> error: ' + e.stack +
              '\n\n> context: ' + JSON.stringify(context, null, 2);
    fs.writeFileSync(name + '.txt', str)

    // Write html of file
    fs.writeFileSync(name + '.html', await page.content())

    try {
      await page.emulateMedia('screen')
      await page.pdf({path: name + '.pdf'})
    } catch (e) {
      // console.log('failed on pdf generation. maybe not in headless mode?')
    }

    console.error(this.tag, chalk.red('Saved report in'), chalk.yellow(name+'.png'))
  }

  /*
   * Handles page listening to notifications of error/info/success
   */
  async preWaitForNotification() {
    const page = this.page
    const $NOTIFICATION = `div[data-notification-type]`
    
    await page.evaluate(() => {
      let a = document.querySelector('div[data-notification-type]')
      a && a.removeAttribute('data-notification-type')
    })
  }
  async waitForNotification() {
    const page = this.page
    const $NOTIFICATION = `div[data-notification-type]`
    const $NOTIFICATION_ERROR = `div[data-notification-type="ERROR"]`

    // Upload to input
    await page.waitForSelector($NOTIFICATION)

    // Check error
    if (await page.$($NOTIFICATION_ERROR)) {
      throw new Error(`Failed to upload image ${type}`)
    }
  }

  /*
   * Saves the page and waits for notification. If Button is already in saved state, skip
   */
  async saveForm() {
    const page = this.page
    const $SAVE = 'header > div > div > div > div > span > button:first-child'
    
    // Clear notification (if any)
    await this.preWaitForNotification()

    // Submit form
    await sleep(1000)
    // let notModified = await page.$eval($SAVE, btn => btn.disabled)
    // if (notModified) return;
    // console.log('saving..')
    if (!await Pupt.click(page, await Pupt.$byText(page, 'salvar rascunho'))) {
      // console.log('didnt save')
      return
    }
    // console.log('saved..')

    // Click and Wait for notification on finish
    // await page.click($SAVE)
    await this.waitForNotification()
  }

  /*
   * Removes all apps that are in 'draft' mode
   */
  async removeDrafts() {
    let apps = await this.getApps()
    let drafts = _.filter(apps, {status: 'draft'})

    // Skipt if no draft
    if (drafts && drafts.length == 0)
      return

    let tag = this.tag + ` Removing ${chalk.green(drafts.length)} drafts:`
    let total = 0
    let progress = console.draft(tag)

    await mapLimit(drafts, async (draft) => {
      progress(tag, '#'.repeat(total) + chalk.dim('#'))
      await this.delete(draft.package_name)
      progress(tag, '#'.repeat(++total))
    }, 4)

    progress(tag, '#'.repeat(total), chalk.green('ok'))
  }

  /*
   * Check for errors inside response data
   */
  assertResponseError(data, msg = 'Failed to fetch from Google Play Services') {
    // Get response's data instead of response itself
    if ('data' in data) data = data.data

    if (!data) {
      throw new Error(msg)
    }

    if (data.error) {
      throw new Error(msg + `: code #${data.error.code}`)
    }
  }
}