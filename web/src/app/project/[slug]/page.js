import {notFound} from 'next/navigation'
import {client} from '../../../lib/sanity'
import {projectBySlugQuery, allProjectSlugsQuery} from '../../../lib/queries'
import Project from '../../../components/project'

export const revalidate = 60
export const dynamicParams = true

export async function generateStaticParams () {
  try {
    const projects = await client.fetch(allProjectSlugsQuery)
    return (projects || []).map(project => ({
      slug: project.slug
    }))
  } catch {
    return []
  }
}

export async function generateMetadata ({params}) {
  const {slug} = await params
  const project = await client.fetch(projectBySlugQuery, {slug})
  if (!project) return {title: 'Not Found'}
  return {
    title: project.title || 'Untitled'
  }
}

export default async function ProjectPage ({params}) {
  const {slug} = await params
  const project = await client.fetch(projectBySlugQuery, {slug})

  if (!project) {
    notFound()
  }

  return <Project {...project} />
}
