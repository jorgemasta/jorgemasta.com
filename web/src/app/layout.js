import {client} from '../lib/sanity'
import {siteSettingsQuery} from '../lib/queries'
import Header from '../components/header'
import '../styles/layout.css'
import styles from '../components/layout.module.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata () {
  try {
    const site = await client.fetch(siteSettingsQuery)
    return {
      title: {
        template: `%s | ${site?.metaTitle || site?.title || 'Jorge Masta'}`,
        default: site?.metaTitle || site?.title || 'Jorge Masta'
      },
      description: site?.description || '',
      keywords: site?.keywords || [],
      manifest: '/manifest.json',
      openGraph: {
        type: 'website',
        title: site?.title || 'Jorge Masta',
        description: site?.description || ''
      },
      twitter: {
        card: 'summary',
        creator: site?.author?.name || ''
      }
    }
  } catch {
    return {
      title: {
        template: '%s | Jorge Masta',
        default: 'Jorge Masta'
      },
      manifest: '/manifest.json'
    }
  }
}

export default async function RootLayout ({children}) {
  let site = null
  try {
    site = await client.fetch(siteSettingsQuery)
  } catch {
    // Sanity API unavailable
  }

  return (
    <html lang='en'>
      <body>
        <Header siteTitle={site.title} />
        <div className={styles.content}>{children}</div>
        <footer className={styles.footer}>
          <div className={styles.footerWrapper}>
            <div className={styles.siteInfo}>
              &copy; {new Date().getFullYear()}, Built with &hearts; by Jorge Masta
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
