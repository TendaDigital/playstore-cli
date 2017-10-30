const _ = require('lodash')
const fs = require('fs')
const Mustache = require('mustache')
const puppeteer = require('puppeteer')
const LogSession = require('draftlog-session')

const sleep = ms => new Promise((res, rej) => setTimeout(res, ms))


const Methods = {
  'fill': {
    props: ['selector', 'text'],
    run: async (context, {selector, text}) => {
      // context.log.status = `fill ${selector}: ${text}`
      const field = await context.page.$(selector)
      if (!field)
        throw new Error(`Could not locate field by selector'${selector}'`)
      await field.type(text)
    }
  },

  'click': {
    props: ['selector'],
    run: async (context, {selector}) => {
      // context.log.status = `clicking ${selector}`
      await context.page.click(selector)
    }
  },

  'screenshot': {
    props: ['path'],
    run: async (context, {path}) => {
      if (!path) {
        let screenshot = context.screenshot = context.screenshot || {}
        screenshot[context.group] = (screenshot[context.group] + 1) || 1
        path = `screenshot_${context.group}_${screenshot[context.group]}.png`
      }
      // context.log.status = `saving screenshot to ${path}`
      await context.page.screenshot({path});
    }
  },

  'goto': {
    props: ['path'],
    run: async (context, {path}) => {
      await context.page.goto(path);
    }
  },

  'viewport': {
    props: ['width', 'height', 'scale', 'mobile'],
    run: async (context, params) => {
      // Aliases
      params.isMobile = !!params.mobile
      params.deviceScaleFactor = params.scale

      // Parse integers
      params.width = parseInt(params.width)
      params.height = parseInt(params.height)
      params.deviceScaleFactor = parseInt(params.deviceScaleFactor) || undefined
      await context.page.setViewport(params)
    }
  },

  'wait-for': {
    props: ['selector'],
    run: async (context, {selector}) => {
      await context.page.waitForSelector(selector)
    }
  },

  'wait': {
    props: ['time'],
    run: (context, {time}) => {
      if (time.endsWith('min'))
        time = parseInt(time) * 1000 * 60
      else if (time.endsWith('ms'))
        time = parseInt(time) * 1
      else if (time.endsWith('s'))
        time = parseInt(time) * 1000
      else
        time = parseInt(time) * 1 // Defaults to ms

      // Updates every 100ms
      // context.log.startProgress(time / 100, 'Waiting...')
      // context.log.progress()
      let finished = false
      let interval = setInterval(() => {
        if (finished)
          return clearInterval(interval)

        // context.log.progress()
      }, 100)

      return new Promise((res, rej) => setTimeout(() => { finished = true; res() }, time))
    }
  },

  'enter': {
    props: [],
    run: async (context) => {
      await context.page.keyboard.press('Enter')
    }
  },

  'press': {
    props: ['key'],
    run: async (context, {key}) => {
      await context.page.keyboard.press(key)
    }
  },

  'finish-if-url': {
    props: ['kind', 'url'],
    run: async (context, {kind='startsWith', url}) => {
        let currentUrl = await context.page.url()
        if (currentUrl[kind](url))
          context.finishGroup()
      },
  },

  'finish-if-url-not': {
    props: ['kind', 'url'],
    run: async (context, {kind='startsWith', url}) => {
        let currentUrl = await context.page.url()
        if (!currentUrl[kind](startsWith))
          context.finishGroup()
      },
  },

  'load-cookies': {
    props: ['file'],
    run: async (context, {file='./cookies'}) => {
      // console.log('cookiefile:', file)
      if (!fs.existsSync(file))
        return

      try {
        let cookies = JSON.parse(fs.readFileSync(file))
        await context.page.setCookie(...cookies)
      } catch (e) { console.log('could not load cookies. Loggin in') }
    },
  },

  'save-cookies': {
    props: ['file'],
    run: async (context, {file='./cookies'}) => {
      // console.log('cookiefile:', file)
      let cookies = JSON.stringify(await context.page.cookies())
      fs.writeFileSync(file, cookies)
    },
  },
}

const EmptyWords = [ 'also', 'with', 'and' ]

exports.interpretCommand = async (input, context) => {
  if (_.isFunction(input)) {
    return await input(context)
  }

  if (_.isObject(input)) {
    throw new Error('Invalid input: Cannot be an Object/Array')
  }

  // Custom string. Interpret as custom syntax

  // Step 1: Replace template
  let compiled = Mustache.render(input, context)

  // Step 2: Remove any uncecessary words and cleanup spaces
  EmptyWords.forEach(word => {
    compiled = compiled.replace(new RegExp(word, 'g'), '')
  })

  compiled = compiled.replace(/\s{2,}/g, ' ')
  // Join parameters  "  =  " => "="
  compiled = compiled.replace(/\s*=\s*/g, '=')

  // Step 3: Parses and Matches parameters
  let parts = compiled.split(' ')
  let methodName = parts.shift()
  let rawParams = parts

  // Step 4: Find method
  let method = Methods[methodName]
  if (!method)
    throw new Error(`Could not find automator method: ${methodName}`)

  // Step 5: Parse params
  let index = 0
  let params = {}
  rawParams.forEach(param => {
    let matched = param.match(/^(\w+)=(\S+)/)
    if (matched) {
      let name = matched[1]
      let value = matched[2]
      params[name] = value
    } else {
      let name = method.props[index++]
      params[name || index] = param
    }
  })

  // Step 6: Call Step
  await method.run(context, params)
}

exports.run = async (name, context, groups) => {
  if (_.isArray(groups)) {
    return await exports.runGroup(name, context, groups)
  }

  // context.groupSession = new LogSession(Object.keys(groups).length)
  // context.groupSession.log('Executing Group')

  for (let group in groups) {
    // context.groupSession.step = `group: ${group}`
    await exports.runGroup(group, context, groups[group])
  }

  // context.groupSession.finish()
}

exports.runGroup = async (name, context, steps) => {
  context.browser = context.browser || await puppeteer.launch(context);
  context.page = context.page || await context.browser.newPage()

  // Save group name to context
  context.group = name

  // Expose Session
  // context.log = new LogSession(steps.length, context.groupSession)

  // Expose context finish method
  let finished = false
  let previousCall = context.finishGroup
  context.finishGroup = () => {
    context.finishGroup = previousCall
    finished = true
  }

  for (let step of steps) {
    if (finished) {
      // context.log.log('exited by command')
      break
    }

    // context.log.step = `step: ${step}`
    // console.log(`step: ${step}`)
    await exports.interpretCommand(step, context)
  }

  // context.log.finish()
}