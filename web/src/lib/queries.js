export const siteSettingsQuery = `
  *[_type == "siteSettings"][0]{
    title,
    metaTitle,
    description,
    keywords,
    author->{ name }
  }
`

export const homepageQuery = `
  *[_type == "homepage"][0]{
    title,
    "description": description
  }
`

export const latestPostsQuery = `
  *[_type == "post" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc)[0...$limit]{
    _id,
    title,
    publishedAt,
    slug,
    mainImage,
    "excerpt": excerpt
  }
`

export const allPostsQuery = `
  *[_type == "post" && defined(slug.current) && defined(publishedAt)] | order(publishedAt desc){
    _id,
    title,
    publishedAt,
    slug,
    mainImage,
    "excerpt": excerpt
  }
`

export const postBySlugQuery = `
  *[_type == "post" && slug.current == $slug][0]{
    _id,
    title,
    publishedAt,
    slug,
    mainImage,
    "excerpt": excerpt,
    body[]{ ..., _type == "image" => { ..., asset-> } },
    categories[]->{ _id, title },
    authors[]{ _key, person->{ name, image } }
  }
`

export const latestProjectsQuery = `
  *[_type == "sampleProject" && defined(slug.current) && defined(publishedAt) && publishedAt <= now()] | order(publishedAt desc)[0...$limit]{
    _id,
    title,
    publishedAt,
    slug,
    mainImage,
    "excerpt": excerpt
  }
`

export const allProjectsQuery = `
  *[_type == "sampleProject" && defined(slug.current) && defined(publishedAt)] | order(publishedAt desc)[0...12]{
    _id,
    title,
    slug,
    mainImage,
    "excerpt": excerpt
  }
`

export const projectBySlugQuery = `
  *[_type == "sampleProject" && slug.current == $slug][0]{
    _id,
    title,
    publishedAt,
    slug,
    mainImage,
    body,
    categories[]->{ _id, title },
    members[]{ _key, person->{ name, image }, roles },
    relatedProjects[]->{ _id, title, slug }
  }
`

export const allPostSlugsQuery = `
  *[_type == "post" && defined(slug.current) && defined(publishedAt)]{
    publishedAt,
    "slug": slug.current
  }
`

export const allProjectSlugsQuery = `
  *[_type == "sampleProject" && defined(slug.current) && defined(publishedAt)]{
    "slug": slug.current
  }
`
