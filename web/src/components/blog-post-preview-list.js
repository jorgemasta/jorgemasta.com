import Link from 'next/link'
import BlogPostPreview from './blog-post-preview'

import styles from './blog-post-preview-list.module.css'

function BlogPostPreviewList ({title = '', nodes = [], browseMoreHref = ''}) {
  if (!nodes || nodes.length === 0) return null
  return (
    <div className={styles.root}>
      {title && <h2 className={styles.headline}>{title}</h2>}
      <ul className={styles.grid}>
        {nodes.map(node => (
          <li key={node._id}>
            <BlogPostPreview {...node} isInList />
          </li>
        ))}
      </ul>
      {browseMoreHref && (
        <div className={styles.browseMoreNav}>
          <Link href={browseMoreHref}>Browse more</Link>
        </div>
      )}
    </div>
  )
}

export default BlogPostPreviewList
