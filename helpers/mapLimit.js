module.exports = async function (arr, func, limit = 2) {
  if (! (arr instanceof Array)) {
    throw new Error('Input collection must be an Array')
  }

  let pending = []
  let all = []

  // Flag indicating something has thrown an error
  let thrown = null

  while (all.length < arr.length || pending.length > 0) {
    // Push to queue limited by total and the `limit`
    while (all.length < arr.length && pending.length < limit) {
      let element = arr[all.length]
      let promise = func(element)

      // Push to both lists
      pending.push(promise)
      all.push(promise)

      // Once this has fulfilled, remove it from pending or set throw error flag
      promise
        .then(v => pending.splice(pending.indexOf(promise), 1))
        .catch(e => { thrown = e })
    }

    // Wait something to finish, then remove it
    if (thrown || pending.length <= 0)
      break

    await Promise.race(pending)
  }

  // Error was thrown, break loop
  if (thrown) {
    throw thrown
  }

  // Map results back
  let res = []
  for (let p of all) res.push(await p);
  return res
}