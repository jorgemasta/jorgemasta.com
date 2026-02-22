import {PortableText} from '@portabletext/react'
import portableTextComponents from './portable-text-components'

const BlockContent = ({blocks}) => (
  <PortableText value={blocks} components={portableTextComponents} />
)

export default BlockContent
