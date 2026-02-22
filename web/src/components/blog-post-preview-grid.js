import Link from 'next/link'
import BlogPostPreview from './blog-post-preview'

import styles from './blog-post-preview-grid.module.css'

function BlogPostPreviewGrid ({title = '', nodes = [], browseMoreHref = ''}) {
  return (
    <div className={styles.root}>
      {title && <h2 className={styles.headline}>{title}</h2>}
      <ul className={styles.grid}>
        {nodes &&
          nodes.map(node => (
            <li key={node._id}>
              <BlogPostPreview {...node} />
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

export default BlogPostPreviewGrid
