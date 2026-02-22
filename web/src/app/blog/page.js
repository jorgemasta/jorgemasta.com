import {client} from '../../lib/sanity'
import {allPostsQuery} from '../../lib/queries'
import BlogPostPreviewGrid from '../../components/blog-post-preview-grid'
import Container from '../../components/container'

import {responsiveTitle1} from '../../components/typography.module.css'

export const revalidate = 60

export const metadata = {
  title: 'Blog'
}

export default async function BlogPage () {
  const posts = await client.fetch(allPostsQuery)

  return (
    <Container>
      <h1 className={responsiveTitle1}>Blog</h1>
      {posts && posts.length > 0 && <BlogPostPreviewGrid nodes={posts} />}
    </Container>
  )
}
