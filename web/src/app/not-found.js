import Container from '../components/container'

export const metadata = {
  title: '404: Not found'
}

export default function NotFound () {
  return (
    <Container>
      <h1>NOT FOUND</h1>
      <p>You just hit a route that doesn&apos;t exist... the sadness.</p>
    </Container>
  )
}
