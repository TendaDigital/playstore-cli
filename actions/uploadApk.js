const chalk = require('chalk')

const Apk = require('../helpers/Apk')
const Pupt = require('../helpers/pupt')
const sleep = require('../helpers/sleep')

/*
 * Creates a new app version and publishes apk
 */
module.exports = async (self, app, metadata) => {
  const page = self.page
  const tag = self.tag + chalk.cyan(' :uploadApk')

  // Validate Apk
  if (!metadata.apk) throw new Error('Metadata must contain `apk` path to use');
  if (!await Apk.isSigned(metadata.apk)) throw new Error('Apk must be signed before uploading to GooglePlay')

  // Verify Lane
  const lane = metadata.lane || 'beta'
  const LANES = ['beta'] // Only beta for now
  if (!LANES.includes(lane)) {
    throw new Error(`Lane '${lane}' is not valid`);
  }

  //// Click correct lane button
  console.log(tag, 'Opening releases page')
  await sleep(2000)
  await page.goto(`${self.PlayURL}#ManageReleasesPlace:p=${app.package_name}&appid=${app.id}`)
  await sleep(4000)

  // let laneSelector = 'section > div > div > div > div > button'
  // let laneSelectorIndex = LANES.indexOf(lane)
  // await page.waitForSelector(laneSelector)
  // let el = (await page.$$(laneSelector))[laneSelectorIndex]
  // if (!el) throw new Error(`Could not find selector for lane`);

  // console.log(tag, `Opening ${chalk.green(lane)} deployment`)
  // await el.click()


  // 'section > div:nth-child(7) > div:nth-child(1) > div:nth-child(1) > div > button'

  // Manage specified Lane
  console.log(tag, 'Opening Production lane')
  await Pupt.click(page, '[aria-label="Gerenciar produção"]')

  await sleep(5000)

  // Try Editing old one, or create new version
  // const $EDIT_VERSION = 'section > div:nth-child(8) > div > button'
  let editVersion = await Pupt.$byText(page, 'editar versão')
  // console.log(tag, 'editVersion', editVersion)
  if (editVersion) {
    await editVersion.click()
  } else {
    const $CREATE_VERSION = 'section > div:nth-child(5) > div > div > button'
    await Pupt.click(page, $CREATE_VERSION)
  }

  // Accept PlayApp Signing
  const $CONTINUE_PLAY_APP_SIGN = 'section > div > div > div:nth-child(2) > div:nth-child(3) > form > div:nth-child(4) > div:nth-child(1) > div:nth-child(1) > button:nth-child(1)'
  if (await Pupt.click(page, $CONTINUE_PLAY_APP_SIGN)) {
    console.log(tag, 'Adopting GooglePlay App Signing')
    const $COMPLETED_APP_SIGN = 'section > div:nth-child(4) > section > div > div > div'
    await Pupt.waitStyle(page, $COMPLETED_APP_SIGN, 'display', '')
  }

  const $APK_LISTING = 'section > div:nth-child(4) > div > div:nth-child(1) > div > div:nth-child(4) > div > div'
  let apkAlreadyUploaded = await Pupt.isVisible(page, $APK_LISTING)

  if (!apkAlreadyUploaded) {
    // Upload APK
    const $UPLOAD_APK = 'section > div:nth-child(4) > div > div:nth-child(1) > div > div > div > div > input[type="file"]'
    await page.waitForSelector($UPLOAD_APK)
    const uploadButton = await page.$($UPLOAD_APK)
    if (!uploadButton) {
      console.log(tag, chalk.red('NOT FOUND:', $UPLOAD_APK))
      // throw new Error('Could not find input on APK upload button')
    } else {
      console.log(tag, 'found!', metadata.apk)
      await uploadButton.uploadFile(metadata.apk)
    }

    // Wait upload to complete
    const $UPLOAD_BOX = 'section > div:nth-child(4) > div > div:nth-child(1) > div > div:nth-child(2)'
    const $LOADING = $UPLOAD_BOX + ' > div:nth-child(3)'
    const $FAILED  = $UPLOAD_BOX + ' > div:nth-child(4)'
    // const $BOX_SUCCESS = $UPLOAD_BOX + ' > div:nth-child(3)'

    // Wait upload to complete
    await Pupt.waitStyle(page, $LOADING, 'display', 'none', {timeout: 120000})

    // Check if failed box was shown (indicating an error occurred)
    if (await Pupt.isVisible(page, $FAILED)) {
      let error = await page.$eval($FAILED + ' p', el => el.innerHTML)
      throw new Error('Failed to upload: ' + error)
    }
  } else {
    console.log(tag, 'Apk already uploaded. Skipping...')
  }

  // Fill in release notes
  await sleep(5000)
  const $RELEASE_NOTES = 'section > div:nth-child(4) > div > div:nth-child(6) > div > div:nth-child(2) > div:nth-child(2) > textarea'
  const NOTE = 'Initial version of ' + metadata.title
  await Pupt.fill(page, $RELEASE_NOTES, `<${metadata.language}>\r\n${NOTE}\r\n</${metadata.language}>`)

  // console.log(tag, 'sleeping...')
  // await sleep(10000)
  // console.log(tag, 'sleeping... ok')

  // const $SUCCES = 'section > div:nth-child(4) > div > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(2)'
  // const $FAILED = 'section > div:nth-child(4) > div > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3)'

  // await sleep(1000)
  // await page.waitForSelector($UPLOAD_APK)
  const save = await Pupt.$byText(page, 'salvar')
  const saved = await Pupt.$byText(page, 'salvo')
  if (save){
    // Save
    console.log(tag, 'Not saved, saving...')
    await save.click()
    if (!await save.getProperty('disabled')) {
      // console.log(tag, chalk.red('Could not save!'))
      throw new Error('Could not save!')
    }
  }

  let revise = await Pupt.$byText(page, 'revisar')
  if (revise) {
    // Wait save to finish
    // console.log(tag, 'Waiting to be saved...')
    // let id = await revise.getProperty('aria-label')
    // id = String(id).replace('JSHandle:', '')
    // await page.waitForSelector(`#${id}:not([disabled])`)

    await sleep(5000)

    // Submit revision
    revise = await Pupt.$byText(page, 'revisar')
    console.log(tag, 'Submiting revision...')
    await revise.click()

    await sleep(5000)

    let $ALERT_BOX = 'section > div > div[role="alert"]'
    if (await Pupt.isVisible(page, $ALERT_BOX)) {
      let el = await page.$eval($ALERT_BOX, (el) => el.innerHTML);
      throw new Error('Failed to publish revision: ' + el)
    }
  } else {
    // console.error(tag, chalk.red('Could not find save or revise button'))
    throw new Error('Could not find save or revise button')
  }

  // Update app package
  app.package_name = metadata.package_name

  console.log(tag, 'Done')
}
