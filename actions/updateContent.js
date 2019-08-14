const chalk = require('chalk')

const Pupt = require('../helpers/pupt')
const sleep = require('../helpers/sleep')

module.exports = async (self, app, metadata) => {
  const page = self.page
  const tag = self.tag + chalk.cyan(' :updateContentCenter')

  console.log(tag, 'Opening content center page')
  await sleep(1000)
  await page.goto(`${self.PlayURL}#AppContentCenterPlace:p=${app.package_name}`)
  await sleep(3000)

  let iniciar = await Pupt.$byText(page, 'iniciar')
  await iniciar.click()

  Pupt.check(page, 'section > div > div:nth-child(2) > section > div > section:nth-child(3) > div > div:nth-child(1) > div > label > div:nth-child(2) > p:nth-child(5) > span:nth-child(1) > input')
  Pupt.check(page, 'section > div > div:nth-child(2) > section > div > section:nth-child(3) > div > div:nth-child(1) > div > label > div:nth-child(2) > p:nth-child(5) > span:nth-child(2) > input')
  Pupt.check(page, 'section > div > div:nth-child(2) > section > div > section:nth-child(3) > div > div:nth-child(1) > div > label > div:nth-child(2) > p:nth-child(5) > span:nth-child(3) > input')

  let proximo = await Pupt.$byText(page, 'próximo')
  await proximo.click()

  Pupt.checkRadio(page, 'section > div > div:nth-child(2) > section > div > section:nth-child(6) > div > div > div:nth-child(4) > label:nth-child(2) > div:nth-child(2) > div > span:nth-child(2) > input', 1)

  let proximo2 = await Pupt.$byText(page, 'próximo')
  await proximo2.click()

  let enviar = await Pupt.$byText(page, 'enviar')
  await enviar.click()

  console.log(tag, 'Done')
}