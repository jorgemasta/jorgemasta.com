import imageUrlBuilder from '@sanity/image-url'
import {client} from './sanity'

const builder = imageUrlBuilder(client)

export function imageUrlFor (source) {
  return builder.image(source)
}
