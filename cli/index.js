#!/usr/bin/env node

const chalk = require('chalk')
 
async function run() {

  let argv = require('minimist')(process.argv.slice(2));
  
  argv.email = argv.email || process.env.PLAYSTORE_EMAIL
  argv.password = argv.password || process.env.PLAYSTORE_PASSWORD

  if (argv._.length == 0) {
    console.log()
    console.log(chalk.white(' :: PlayStore CLI Options ::'))
    console.log()
    console.log(chalk.cyan('   --email <email>        '), chalk.dim('Required. The GooglePlay email (or env var PLAYSTORE_EMAIL)'))
    console.log(chalk.cyan('   --password <password>  '), chalk.dim('Required. The GooglePlay password (or env var PLAYSTORE_PASSWORD)'))
    console.log(chalk.cyan('   --cookies [file_path]  '), chalk.dim('Optional. path to save sessions'))
    console.log(chalk.cyan('   --devtools             '), chalk.dim('Optional. Shows Chromium during process. Also, prevents exiting at the end'))
    console.log(chalk.cyan('   --silent               '), chalk.dim('Optional. Prints only response from cli commands'))
    console.log()
    console.log()
    console.log(chalk.white(' :: PlayStore CLI Command List ::'))
    console.log()
    console.log(chalk.cyan(' $ playstore publish'),
                chalk.yellow('--apk=<apk_path> --metadata=<json_or_folder>'))
    console.log(  chalk.dim('   Lists apps on the playstore with the provided account'))
    console.log()
    console.log(chalk.cyan(' $ playstore list'))
    console.log(  chalk.dim('   Lists apps on the playstore with the provided account'))
    console.log()
    console.log(chalk.cyan(` $ playstore info `),
                chalk.yellow('<apk_or_name>'))
    console.log(  chalk.dim('   Shows information about an app'))
    console.log()
    console.log(chalk.cyan(` $ playstore metadata `),
                chalk.yellow('--metadata=<json_or_folder>'))
    console.log(  chalk.dim('   Shows compiled information from metadata'))
    console.log()
    console.log(chalk.cyan(` $ playstore app-version `),
                chalk.yellow('--track=<prod*|beta|alpha>'),
                chalk.yellow('<package_name>'))
    console.log(  chalk.dim('   Prints the latest version of Production Lane'))
    console.log()
    console.log()
  } else {
    let command = argv._[0]
    let commands = ['publish', 'list', 'info', 'metadata', 'cleanup', 'app-version']

    if (!commands.includes(command)) {
      console.log()
      console.log(chalk.red('Invalid command:'), chalk.bold(command))
      console.log()
      process.exit(1)
      return
    }

    let start = Date.now()
    !argv.silent && console.log(chalk.bold(`playstore ${command}`))

    // Call command
    !argv.silent && console.log()
    let res;
    try {
      res = await require('./' + command)(argv)
    } catch (e) {
      res = e
    }
    !argv.silent && console.log()

    if (res instanceof Error) {
      console.error(chalk.white('Failed:'), chalk.red(res.message))
      console.log()
    }
    
    let total = Math.round((Date.now() - start) / 10) / 100
    !argv.silent && console.log(chalk.bold(`Done in ${total}s.`))

    if (res instanceof Error) {
      if (!argv.devtools) {
        process.exit(1)
      }
    } else {
      process.exit()
    }
  }
}

// async function run () {
// }

// Listen for Application wide errors
process.on('unhandledRejection', handleError)
process.on('uncaughtException', handleError)

function handleError(e) {
  console.error()
  console.error(chalk.red('Something went wrong:'))
  console.error(chalk.red.dim(e.stack))
  console.error()
  process.exit(1)
}

// Call run
;(async () => {
  try {
    await run()
  } catch (e) {
    console.error(chalk.red(e.stack))
    process.exit(1)
  }
})();
