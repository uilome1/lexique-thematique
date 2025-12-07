export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-gray-600">Page non trouvée</p>
        <a href="/" className="mt-4 inline-block text-indigo-600 hover:underline">
          Retour à l'accueil
        </a>
      </div>
    </div>
  )
}