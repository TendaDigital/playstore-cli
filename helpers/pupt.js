const sleep = require('./sleep')

/*
 * Given a input checkbox like radios, selecte the one at `index`
 */
exports.checkRadio = async (page, selector, index = 0) => {
  await page.waitForSelector(selector)
  let el = (await page.$$(selector))[index]
  if (!el) {
    throw new Error(`Could not check Radio with selector '${selector}' at index #${index} `)
  }
  let checked = await page.$$eval(selector, (els, index) => els[index] && els[index].checked, index)

  if (!checked) {
    await el.click()
  }
}

/*
 * Checks a checkbox to the target state. Default is set to true
 */
exports.check = async (page, selector, set = true) => {
  await page.waitForSelector(selector)
  await page.$eval(selector, (c, set) => { c.checked = true }, set)
}

/*
 * Fills in an input element
 */
exports.fill = async (page, selector, value) => {
  await page.waitForSelector(selector)
  // Clear field
  await page.$eval(selector, (el) => el.value = '')
  // Type content
  await page.type(selector, value)
}

/*
 * Checks if a given element is visible
 */
exports.isVisible = async (page, selector) => {
  return await page.evaluate(function (selector) {
    let elem = typeof selector == 'string' ? document.querySelector(selector) : selector
    if (elem) return (elem.offsetWidth > 0 && elem.offsetHeight > 0);
    else return false;
  }, selector);
}

exports.waitVisible = async (page, selector, opts) => {
  await page.waitForFunction((selector) => {
    let el = typeof selector == 'string' ? document.querySelector(selector) : selector
    let isOk = el && (el.offsetWidth > 0 && el.offsetHeight > 0)
    return isOk
  }, opts, selector)
}

/*
 * Verifies if element can be clicked, and click. Returns true if it could be clicked
 */
exports.click = async (page, selector) => {
  if (typeof selector == 'string') {
    await page.waitForSelector(selector)
  }

  if (!await exports.isVisible(page, selector)){
    // console.log('not visible')
    return false
  }

  let el = (typeof selector == 'string' ? await page.$(selector) : selector)
  if (!el) {
    // console.log('not exists')
    return false
  }

  let disabled = await (await el.getProperty('disabled')).jsonValue()
  if (disabled){
    // console.log('disabled', disabled)
    return false
  }

  await el.click()
  // console.log('ok')
  return true
}

/*
 * Waits for a style to change to the specified value
 */
exports.waitStyle = async (page, selector, style, value, opts) => {
  await page.waitForFunction((selector, style, value) => {
    let el = typeof selector == 'string' ? document.querySelector(selector) : selector
    let isOk = el && (el.style[style] == value)
    // console.log('ok:', isOk, selector, style, value)
    return isOk
  }, opts, selector, style, value)
}

exports.$waitByText = async (page, text, ...args) => {
  let timeout = 30000
  let interval = 200
  for (let k = 0; k < timeout; k += interval) {
    await sleep(interval)
    let el = await exports.$byText(page, text, ...args)
    if (el) return el;
  }
  throw new Error(`Timeout on $waitByText for '${text}'`)
}

exports.$byText = async (page, text, type = 'button', restriction = 'body') => {
  // Restriction doesnt exists, skip
  if (!await page.$(restriction)) return null;

  // Find Selector
  let el = await page.evaluateHandle((text, type, restriction) => {
    text = text || ''
    let rot = restriction ? document.querySelector(restriction) : document

    if (!rot) {
      console.log('found nop:', text, type, null)
      return null
    }

    let els = rot.querySelectorAll(type)
    // console.log('found len:', restriction, els.length)

    for (let k in els) {
      let el = els[k]
      // Is visible and includes the text
      let contains = (el.innerHTML || '').toLowerCase().includes(text.toLowerCase())
      if (el.offsetWidth > 0 && el.offsetHeight > 0 && contains) {
        console.log('found:', text, type, el)
        return el
      }
    }

    console.log('found end:', text, type, null)
    return null
  }, text, type, restriction)

  try {
    let val = await el.jsonValue()
    if (!val) return null;
  } catch (e) {
    // console.error('err', e)
  }

  return el
}