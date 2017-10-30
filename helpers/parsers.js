/*
 * Converts the status number to a string
 */
exports.AppStatus = (num) => {
  return {
    '1': 'published',
    '2': 'unpublished',
    '5': 'draft',
  }[num] || 'unknown'
}

/*
 * Converts PlayStore app info data to human readable data
 */
exports.AppInfo = (app) => {
  return {
    id: app['1'],
    title: app['3'],
    status: exports.AppStatus(app['5']),
    package_name: app['2'],
    app_image: app['6'] || null
  }
}

exports.MetadataListingPayload = (app, metadata) => {
  let lang = {
    '1': metadata.language,
    '2': metadata.title,
    '3': metadata.fullDescription,
    '4': metadata.shortDescription,
    '7': {
      '5': metadata.video,
    }
  }

  return {
    '1': {
      '1': app.package_name,
      '2': {
        '1': [ lang ],
        '2': {
          // Type of application (Apps=0, Games=1) Subtype: Education=31
          '1': 0, '2': 31
        },
        '3': {
          '1': metadata.contactWebsite,
          '2': metadata.contactEmail,
          '3': metadata.contactPhone,
        },
        '4': {
          '1': metadata.privacyUrl, '2': 0
        }
      },
      '4': { '1': {} }, '7': 5, '11': {},
      '17': metadata.id,
      '18': { '1': false, '2': false }
    },
    '2': 2
  }
}