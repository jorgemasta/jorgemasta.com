import Link from 'next/link'
import Icon from './icon'

import styles from './header.module.css'

const Header = ({siteTitle}) => (
  <div className={styles.root}>
    <div className={styles.wrapper}>
      <div className={styles.branding}>
        <Link href='/' className={styles.zigzag}><span>{siteTitle}</span></Link>
      </div>

      <a className={styles.socialLink} href='https://twitter.com/jorgemasta' aria-label='Visit my Twitter'>
        <Icon symbol='twitter' />
      </a>
      <a className={styles.socialLink} href='https://dev.to/jorgemasta' aria-label='Visit my Dev.to'>
        <Icon symbol='dev' />
      </a>
      <a className={styles.socialLink} href='https://github.com/jorgemasta' aria-label='Visit my GitHub'>
        <Icon symbol='github' />
      </a>
    </div>
  </div>
)

export default Header
