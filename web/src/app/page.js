import {client} from '../lib/sanity'
import {siteSettingsQuery, homepageQuery, latestPostsQuery, latestProjectsQuery} from '../lib/queries'
import {filterOutDocsWithoutSlugs, filterOutDocsPublishedInTheFuture} from '../lib/helpers'
import Container from '../components/container'
import BlogPostPreviewList from '../components/blog-post-preview-list'
import ProjectPreviewGrid from '../components/project-preview-grid'
import Introduction from '../components/introduction'

export async function generateMetadata () {
  try {
    const site = await client.fetch(siteSettingsQuery)
    return {
      title: site?.title || 'Jorge Masta'
    }
  } catch {
    return {title: 'Jorge Masta'}
  }
}

export default async function IndexPage () {
  const [homepage, posts, projects] = await Promise.all([
    client.fetch(homepageQuery),
    client.fetch(latestPostsQuery, {limit: 3}),
    client.fetch(latestProjectsQuery, {limit: 3})
  ])

  const postNodes = (posts || [])
    .filter(filterOutDocsWithoutSlugs)
    .filter(filterOutDocsPublishedInTheFuture)

  const projectNodes = (projects || [])
    .filter(filterOutDocsWithoutSlugs)
    .filter(filterOutDocsPublishedInTheFuture)

  return (
    <Container>
      <Introduction
        title={homepage?.title}
        description={homepage?.description}
      />
      {postNodes.length > 0 && (
        <BlogPostPreviewList
          title='Latest blog posts'
          nodes={postNodes}
          browseMoreHref='/blog/'
        />
      )}
      {projectNodes.length > 0 && (
        <ProjectPreviewGrid
          title='Latest projects'
          nodes={projectNodes}
          browseMoreHref='/portfolio/'
        />
      )}
    </Container>
  )
}
