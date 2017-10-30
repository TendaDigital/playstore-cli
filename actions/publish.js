const chalk = require('chalk')

const Apk = require('../helpers/Apk')
const Pupt = require('../helpers/pupt')
const sleep = require('../helpers/sleep')

/*
 * Creates a new app version and publishes apk
 */
module.exports = async (self, app, metadata) => {
  const page = self.page
  const tag = self.tag + chalk.cyan(' :publish')

  // Click correct lane button
  console.log(tag, 'Opening releases page')
  await sleep(2000)
  await page.goto(`${self.PlayURL}#ManageReleasesPlace:p=${app.package_name}`)
  await sleep(2000)

  // Manage specified Lane
  const $MANAGE_BETA ='section > div:nth-child(7) > div:nth-child(2) > div:nth-child(1) > div > button'
  await Pupt.click(page, $MANAGE_BETA)

  // Finds one to edit
  let editVersion = await Pupt.$byText(page, 'editar versão')
  if (editVersion) {
    await editVersion.click()
  } else {
    throw new Error('No version available for publishing')
  }

  let revise = await Pupt.$waitByText(page, 'revisar')

  // Submit revision
  revise = await Pupt.$byText(page, 'revisar')
  console.log(tag, 'Publishing 1/3')
  await revise.click()

  console.log(tag, 'Publishing 2/3')
  let launch = await Pupt.$waitByText(page, 'iniciar lançamento para')

  // Check it's not disabled
  if (!await Pupt.click(page, launch)) {
    throw new Error('Could not load Launch window. Launch button is disabled')
  }

  console.log(tag, 'Publishing 3/3')
  await sleep(1000)
  let confirm = await Pupt.$waitByText(page, 'confirmar')

  console.log(tag, chalk.green('!!!!!!!!!!!!!!!!!!!!!!!'))
  console.log(tag, chalk.green('!!!!!!!!!!!!!!!!!!!!!!!'))
  console.log(tag, chalk.green('!!!!!!!!!!!!!!!!!!!!!!!'))
  console.log(tag, chalk.green('!!!!!!!! YAYYYY !!!!!!! (didnt clicked, but went ok :D'))
  console.log(tag, chalk.green('!!!!!!!!!!!!!!!!!!!!!!!'))
  console.log(tag, chalk.green('!!!!!!!!!!!!!!!!!!!!!!!'))
  console.log(tag, chalk.green('!!!!!!!!!!!!!!!!!!!!!!!'))
  // if (!await Pupt.click(page, confirm)) {
    // throw new Error('App could not be published because confirmation didnt succeeded')
  // }

  console.log(tag, 'Done ')
}