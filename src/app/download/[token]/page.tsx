interface DownloadPageProps {
  params: {
    token: string
  }
}

export default function DownloadPage({ params }: DownloadPageProps) {
  return (
    <main>
      <h1>Download Your Product</h1>
      <p>Download token: {params.token}</p>
    </main>
  )
}
