const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const puppeteer = require('puppeteer')

const PlayApi = require('../')
const MetadataLoader = require('../helpers/MetadataLoader')

module.exports = async (opts) => {
  let metadata = await MetadataLoader(opts.metadata)

  if (!metadata) {
    return new Error('Could not load metadata')
  }

  console.log()
  console.log(chalk.yellow('Loaded Metadata: (json)'))
  console.log(metadata)
  console.log()
}