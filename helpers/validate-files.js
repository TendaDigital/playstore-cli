const _ = require('lodash')
const fs = require('fs')
const ImageSize = require('image-size')

/*
 * Given image paths, and props (the validation rules)
 */
module.exports = async (files, props) => {
  // [Helper] Pretty print sizes for errors
  const sizeStr = size => `[${size.width}x${size.height}]`

  if (!files) throw new Error(`File must be provided for upload. None given`);

  files.forEach(file => {
    if (!fs.existsSync(file))
      throw new Error(`File does not exists ${file}`)
  })

  // Read image sizes from files
  let sizes = files.map(file => ImageSize(file))

  if (sizes.length > 1 && !props.multiple) {
    throw new Error(`Only one image is valid to be used in '${type}'`)
  }

  for (let size of sizes) {
    if (props.sizes) {
      if (!_.find(props.sizes, {width: size.width, height: size.height})) {
        let sizes = props.sizes.map(sizeStr).join()
        throw new Error(`Invalid size: ${sizeStr(size)} Possibles: ${sizes}`)
      }
    }

    if (props.min) {
      if (props.min.width > size.width || props.min.height > size.height) {
        throw new Error(`Invalid size: ${sizeStr(size)} must be > ${sizeStr(props.min)}`)
      }
    }

    if (props.max) {
      if (props.max.width < size.width || props.max.height < size.height) {
        throw new Error(`Invalid size: ${sizeStr(size)} must be < ${sizeStr(props.max)}`)
      }
    }
  }
}