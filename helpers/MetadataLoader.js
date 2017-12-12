const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

const Apk = require('./Apk')

const isDirectory = source => fs.lstatSync(source).isDirectory()
const getDirectories = source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

const isFile = source => fs.lstatSync(source).isFile()
const getFiles = source =>
  fs.readdirSync(source).map(name => path.join(source, name)).filter(isFile)


module.exports = async (pathOrJson) => {
  // Try loading as a path
  let metadata = null

  try {
    metadata = JSON.parse(pathOrJson)
  } catch (e) {}

  if (!metadata) {
    if (!pathOrJson) {
      pathOrJson = path.join(process.cwd(), 'metadata/android')
      console.log(chalk.yellow('No metadata provided, using:'), chalk.green(pathOrJson))
    }

    // Join path to Cwd if not absolute
    if (!path.isAbsolute(pathOrJson)) {
      pathOrJson = path.join(process.cwd(), pathOrJson)
    }

    // Try loading as path
    if (!fs.existsSync(pathOrJson)){
      throw new Error('Path does not exists: ' + pathOrJson)
    }

    // Builds metadata
    metadata = {}
    
    let rootDir = pathOrJson
    let languagesPath = getDirectories(rootDir)
    
    for (let dir of languagesPath) {
      let lang = path.basename(dir)
      
      console.log('Loading Language:', chalk.green(lang))
      metadata.language = lang

      metadata.title = await loadTextOrDefault(dir, 'title.txt')
      metadata.video = await loadTextOrDefault(dir, 'video.txt')
      metadata.fullDescription = await loadTextOrDefault(dir, 'full_description.txt')
      metadata.shortDescription = await loadTextOrDefault(dir, 'short_description.txt')

      metadata.contactEmail = await loadTextOrDefault(dir, 'email.txt')
      metadata.contactPhone = await loadTextOrDefault(dir, 'phone.txt')
      metadata.contactWebsite = await loadTextOrDefault(dir, 'website.txt')

      metadata.privacyUrl = await loadTextOrDefault(dir, 'privacy_url.txt')

      let dirImages = path.join(dir, 'images')
      metadata.icon = await loadFilePathByMatch(dirImages, 'icon.*', null)
      metadata.featureGraphic = await loadFilePathByMatch(dirImages, 'featureGraphic.*', null)
      metadata.phoneScreenshots = await loadFilePathsOrDefault(dirImages, 'phoneScreenshots', [])

      // Avoids multiple languages
      break
    }

    metadata.apk = await loadFilePathByMatch(rootDir, '*.apk', null)
    metadata.package_name = await loadTextOrDefault(rootDir, 'package-name.txt')
  }

  if (!metadata) {
    throw new Error('No valid metadata provided')
  }

  // Validate
  let errors = []

  if (!metadata.package_name) {
    // Try loading from Apk
    if (metadata.apk) {
      let apkInfo = await Apk.info(metadata.apk)
      if (apkInfo) {
        metadata.package_name = apkInfo.package_name
      }
    }

    if (!metadata.package_name) {
      errors.push(`'package_name' was not set and could not be loaded from missing apk`)
    }
  }

  let mustBeSet = [
    'package_name',
    'title', 'video', 'fullDescription', 'shortDescription',
    'contactEmail', 'contactPhone', 'contactWebsite',
    'privacyUrl',
    'icon', 'featureGraphic'
  ]
  for (let key of mustBeSet) {
    if (!metadata[key]) {
      errors.push(`'${key}' is not set and must be present`)
    }
  }

  if (metadata.phoneScreenshots.length < 2) {
    errors.push('phoneScreenshots must contain at least 2 images')
  }

  if (!metadata.apk) {
    errors.push(`'*.apk' must be present in release metadata folder (outside language folder)`)
  }

  if (errors.length > 0) {
    console.log()
    console.log('=====================================')
    console.log(chalk.yellow('There are errors in metadata:'))
    for (let err of errors) {
      console.log(chalk.red(`> ${err}`))
    }
    console.log('=====================================')
    return null
  }

  return metadata


  // return await Apk.info(pathOrJson)

  // {
  //   package_name: 'com.test.tendadigital.lol',
  //   language: 'pt-BR',
  //   title: 'Package Title WORKS',
  //   fullDescription: 'FULL DESCRIPTION WORKS',
  //   shortDescription: 'SHORT DESCRIPTION WORKS',
  //   video: 'https://www.youtube.com/watch?v=_DUjtL4j4S8?WORKS',
    
  //   // Details
  //   contactWebsite: 'http://CONTATO.SITE.WORKS.COM',
  //   contactEmail: 'CONTATO@WORKS.COM',
  //   contactPhone: '+55 11 999999999',

  //   // Privacy
  //   privacyUrl: 'http://PRIVACY.COM/WORKS',

  //   // Images
  //   icon: path.join(__dirname, 'tests/icon.png'),
  //   // icon: path.join(__dirname, 'screenshot_run_1.png'),
  //   featureGraphic: path.join(__dirname, 'tests/featureGraphic.png'),
  //   phoneScreenshots: [
  //     path.join(__dirname, 'tests/screenshot.png'),
  //     path.join(__dirname, 'tests/screenshot.png'),
  //   ],

  //   // Apk
  //   apk: path.join(__dirname, './tests/app.apk'),
  // }
  
}

async function loadTextOrDefault(dir, name, def = '') {
  try {
    return fs.readFileSync(path.join(dir, name)).toString()
  } catch (e){}

  return def
}

async function loadFilePathsOrDefault(dir, name, def = []) {
  try {
    return getFiles(path.join(dir, name))
  } catch (e){}

  return def
}

async function loadFilePathByMatch(dir, name, def = null) {
  let files = getFiles(dir)

  let radical = name.replace('*', '')

  for (let file of files) {
    let basename = path.basename(file)
    
    if (name.endsWith('*')){
      if (basename.startsWith(radical))
        return file
    }

    if (name.startsWith('*')){
      if (basename.endsWith(radical))
        return file
    }
  }
  
  return def
}