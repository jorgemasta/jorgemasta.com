import {notFound} from 'next/navigation'
import {format} from 'date-fns'
import {client} from '../../../../../lib/sanity'
import {postBySlugQuery, allPostSlugsQuery} from '../../../../../lib/queries'
import {toPlainText} from '../../../../../lib/helpers'
import BlogPost from '../../../../../components/blog-post'

export const revalidate = 60
export const dynamicParams = true

export async function generateStaticParams () {
  try {
    const posts = await client.fetch(allPostSlugsQuery)
    return (posts || []).map(post => ({
      year: format(new Date(post.publishedAt), 'yyyy'),
      month: format(new Date(post.publishedAt), 'MM'),
      slug: post.slug
    }))
  } catch {
    return []
  }
}

export async function generateMetadata ({params}) {
  const {slug} = await params
  const post = await client.fetch(postBySlugQuery, {slug})
  if (!post) return {title: 'Not Found'}
  return {
    title: post.title || 'Untitled',
    description: toPlainText(post.excerpt)
  }
}

export default async function BlogPostPage ({params}) {
  const {slug} = await params
  const post = await client.fetch(postBySlugQuery, {slug})

  if (!post) {
    notFound()
  }

  return <BlogPost {...post} />
}
