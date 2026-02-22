import {client} from '../../lib/sanity'
import {allProjectsQuery} from '../../lib/queries'
import {filterOutDocsWithoutSlugs} from '../../lib/helpers'
import Container from '../../components/container'
import ProjectPreviewGrid from '../../components/project-preview-grid'

import {responsiveTitle1} from '../../components/typography.module.css'

export const revalidate = 60

export const metadata = {
  title: 'Projects'
}

export default async function PortfolioPage () {
  const projects = await client.fetch(allProjectsQuery)
  const projectNodes = (projects || []).filter(filterOutDocsWithoutSlugs)

  return (
    <Container>
      <h1 className={responsiveTitle1}>Projects</h1>
      {projectNodes.length > 0 && <ProjectPreviewGrid nodes={projectNodes} />}
    </Container>
  )
}
