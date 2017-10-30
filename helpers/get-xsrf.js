const axios = require('axios')

/*
 * Loads the Xsrf token from a page. Must have cookies with authenticated user
 */
module.exports = async (cookies) => {
  // Fetches console and parses xsrf token
  let res = await axios({
    method: 'GET',
    url: 'https://play.google.com/apps/publish',
    headers: { 'cookie': cookies }
  })

  // Try finding xsrf token in content
  let xsrfMatches = res.data.match(/"XsrfToken":"{\\"1\\":\\"(\S+)\\"}"/i)
  
  if (!xsrfMatches) {
    throw new Error('Could not locate xsrf token in play console')
  }

  // Return xsrf
  return xsrfMatches[1]
}