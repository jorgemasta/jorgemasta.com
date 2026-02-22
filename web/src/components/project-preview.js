import Link from 'next/link'
import {cn, buildImageObj} from '../lib/helpers'
import {imageUrlFor} from '../lib/image-url'
import BlockContent from './block-content'

import styles from './project-preview.module.css'
import {responsiveTitle3} from './typography.module.css'

function ProjectPreview (props) {
  return (
    <Link className={styles.root} href={`/project/${props.slug.current}`}>
      <div className={styles.leadMediaThumb}>
        {props.mainImage && props.mainImage.asset && (
          <img
            src={imageUrlFor(buildImageObj(props.mainImage))
              .width(600)
              .height(Math.floor((9 / 16) * 600))
              .url()}
            alt={props.mainImage.alt}
          />
        )}
      </div>
      <h3 className={cn(responsiveTitle3, styles.title)}>{props.title}</h3>
      {props.excerpt && (
        <div className={styles.excerpt}>
          <BlockContent blocks={props.excerpt} />
        </div>
      )}
    </Link>
  )
}

export default ProjectPreview
