const _ = require('lodash')
const chalk = require('chalk')

const sleep = require('../helpers/sleep')
const ValidateFiles = require('../helpers/validate-files')

/*
 * Uploads an image to an app
 */
module.exports = async (self, app, metadata) => {
  let tag = self.tag + chalk.cyan(' :uploadImages')
  let page = self.page

  console.log(tag, 'Opening form')
  await sleep(1000)
  await page.goto(`${self.PlayURL}#MarketListingPlace:p=${app.package_name}`)

  console.log(tag, 'Waiting to load')
  const $BASE = 'section > div:nth-child(4) > div:nth-of-type(4) > div:nth-of-type(2)'
  await page.waitForSelector($BASE)
  
  let types = ['icon', 'featureGraphic', 'phoneScreenshots']
  for (let type of types){
    if (metadata[type]) {
      console.log(tag, 'Uploading image', chalk.green(type))
      await uploadMarketListingPlaceImage(self, type, metadata[type])
    }
  }

  console.log(tag, 'Saving...')
  await sleep(1000)
  // await self.preWaitForNotification()
  await self.saveForm()
  // await self.waitForNotification()

  console.log(tag, 'Finished uploads')
}

/*
 * With the page already opened at the desired app MarketListingPlace,
 * Upload a single image type to the form.
 */
async function uploadMarketListingPlaceImage(self, type, files) {
  const page = self.page
  const BASE = 'section > div:nth-child(4) > div:nth-of-type(4) > div:nth-of-type(2)'

  const Types = {
    icon: {
      sizes: [{width: 512, height: 512}],
      selector: `${BASE} > div:nth-of-type(3) > div:nth-child(1) input[type="file"]`,
    },
    featureGraphic: {
      sizes: [{width: 1024, height: 500}],
      selector: `${BASE} > div:nth-of-type(3) > div:nth-child(2) input[type="file"]`
    },
    phoneScreenshots: {
      multiple: true,
      min: {width: 400, height: 400},
      max: {width: 3000, height: 3000},
      selector: `${BASE} > div:nth-of-type(2) input[type="file"]`,
    }
  }

  // Find kidn of upload, then verify it's valid
  let props = Types[type]
  if (!props) throw new Error(`Unkknown type of image being uploaded: '${type}'`);

  // Transform to array and validate files
  files = _.isArray(files) ? files : [files]
  await ValidateFiles(files, props)

  // Find file input handle and put file in it
  await page.waitForSelector(props.selector)
  let input = await page.$(props.selector)
  if (!input) {
    throw new Error(`Unable to find input: '${type}', ${props.selector}`);
  }

  // Clear notification and upload
  for (let file of files) {
    // Clear notification (if any)
    await self.preWaitForNotification()
    await input.uploadFile(file)
    await sleep(100)

    // Wait for notification on finish
    await self.waitForNotification()
  }
}