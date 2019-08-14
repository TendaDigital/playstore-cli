const chalk = require('chalk')

const Pupt = require('../helpers/pupt')
const sleep = require('../helpers/sleep')

/*
 * Configures PricingPlace definitions for the app
 */
module.exports = async (self, app, metadata) => {
  let page = self.page
  let tag = self.tag + chalk.cyan(' :updatePrice')

  console.log(tag, 'Opening form')
  await sleep(1000)
  await page.goto(`${self.PlayURL}#PricingPlace:p=${app.package_name}`)

  console.log(tag, 'Waiting to load')
  await page.waitForSelector('input[name="countryheader"]')

  // Set to all countries
  console.log(tag, 'Filling form')

  try {
    await Pupt.checkRadio(page, 'input[name="countryheader"]', 1)
  } catch (e) {
    console.warn(e)
  }

  // Set to NO for ads
  try {
    await Pupt.checkRadio(page, 'input[name="ads_supported"]', 1)
  } catch (e) {
    console.warn(e)
  }

  // Agree to terms (1)
  try {
    Pupt.check(page, 'fieldset > label:nth-child(3) > div > div input[type="checkbox"]')
  } catch (e) {
    console.warn(e)
  }

  // Agree to terms (2)
  try {
    Pupt.check(page, 'fieldset > label:nth-child(4) > div > div input[type="checkbox"]')
  } catch (e) {
    console.warn(e)
  }

  console.log(tag, 'Saving...')
  await self.saveForm()
}