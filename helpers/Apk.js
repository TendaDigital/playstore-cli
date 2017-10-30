const path = require('path')
const chalk = require('chalk')
const execSync = require('child_process').execSync

exports.isSigned = async (apkPath) => {
  try {
    let bin = path.join(__dirname, '../bin/jarsigner')
    let res = execSync(`${bin} -verify ${apkPath}`).toString()
    
    if (res.includes('jar verified.')) {
      return true
    } else if (res.includes('jar is unsigned.')) {
      return false
    } else {
      console.log('could not identify if jar is signed or not:', res)
    }
  } catch (e) {
    if (e.message.includes('command not found')) {
      console.error(chalk.red('Could not verify APK because `jarsigner` was not found. Is it in your $PATH?'))
      return false
    }
    
    throw e
  }
}

exports.info = async (apkPath) => {
  try {
    let bin = path.join(__dirname, '../bin/aapt')
    let res = execSync(`${bin} dump badging ${apkPath} | grep package:\\ name`).toString()

    let exp = /name='(\S+)' versionCode='(\S+)' versionName='(\S+)' platformBuildVersionName='(\S+)'/g
    let matched = exp.exec(res)
    if (!matched) {
      return null
    }

    return {
      package_name: matched[1],
      version_code: matched[2],
      version_name: matched[3],
      platform_build_version_name: matched[4],
    }
  } catch (e) {
    if (e.message.includes('command not found')) {
      console.error(chalk.red('Could not verify APK because `jarsigner` was not found. Is it in your $PATH?'))
      return false
    }
    
    throw e
  } 
}