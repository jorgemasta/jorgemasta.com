import {imageUrlFor} from '../lib/image-url'
import styles from './figure.module.css'

export default function Figure ({value}) {
  if (!value || !value.asset) { return null }
  return (
    <figure className={styles.root}>
      <img
        src={imageUrlFor(value)
          .width(675)
          .auto('format')
          .url()}
        alt={value.alt || ''}
      />
      {value.caption && <figcaption>{value.caption}</figcaption>}
    </figure>
  )
}
