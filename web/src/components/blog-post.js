import {format, formatDistance, differenceInDays} from 'date-fns'
import {buildImageObj} from '../lib/helpers'
import {imageUrlFor} from '../lib/image-url'
import BlockContent from './block-content'
import Container from './container'

import styles from './blog-post.module.css'

function BlogPost (props) {
  const {body, authors, categories, title, mainImage, publishedAt} = props
  return (
    <article className={styles.root}>
      {mainImage && mainImage.asset && (
        <div className={styles.mainImage}>
          <img
            src={imageUrlFor(buildImageObj(mainImage))
              .width(1200)
              .height(Math.floor((9 / 16) * 1200))
              .fit('crop')
              .auto('format')
              .url()}
            alt={mainImage.alt}
          />
        </div>
      )}
      <Container>
        <div className={styles.mainContent}>
          <h1 className={styles.title}>{title}</h1>
          {publishedAt && (
            <div className={styles.publishedAt}>
              {differenceInDays(new Date(publishedAt), new Date()) > 3
                ? formatDistance(new Date(publishedAt), new Date())
                : format(new Date(publishedAt), 'MMMM do, yyyy')}
            </div>
          )}
          {body && <BlockContent blocks={body} />}
        </div>
      </Container>
    </article>
  )
}

export default BlogPost
