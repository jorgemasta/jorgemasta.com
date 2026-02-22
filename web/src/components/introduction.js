import BlockContent from './block-content'
import styles from './introduction.module.css'

function Introduction ({title = '', description}) {
  return (
    <div className={styles.root}>
      {title && <h1>{title}</h1>}
      {description && <BlockContent blocks={description} />}
    </div>
  )
}

export default Introduction
