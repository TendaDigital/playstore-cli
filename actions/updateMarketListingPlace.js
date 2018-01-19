const _ = require('lodash')

const Parsers = require('../helpers/parsers')

module.exports = async (self, app, metadata) => {
  if (!metadata) throw new Error('Metadata is required for this action');

  metadata = _.defaults(metadata, {
    language: 'pt-BR',
    title: '', //'NAME',
    fullDescription: '', //'DESCRIPTION',
    shortDescription: '', //'SHORT_DESCRIPTION',
    video: '',//https://www.youtube.com/watch?v=_DUjtL4j4S8?PROMOCIONAL',
    // Details
    contactWebsite: '', //http://CONTATO.SITE.COM',
    contactEmail: '', //'CONTATO@EMAIL.COM',
    contactPhone: '', //'+55 11 999999999',

    // Privacy
    privacyUrl: 'http://PRIVACY.COM/URL-HERE',

    // Images
    icon: null,
    featureGraphic: null,
    phoneScreenshots: [],
  })

  // Set the most important flags to override
  metadata.id = app.id
  // metadata.package_name = app.package_name

  let payload = Parsers.MetadataListingPayload(app, metadata)

  try {
    let res = await self.axios.post('/apps/publish/androidapps', {
      method: 'persist',
      params: JSON.stringify(payload),
      xsrf: self.xsrf,
    })
  } catch (e) {
    console.error(e.response.data.error)
    throw new Error('Failed to save app information')
  }
}