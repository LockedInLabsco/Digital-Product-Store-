'use client'

import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Link from 'next/link'
import Button from '@/src/components/Button'

interface DownloadPageProps {
  params: {
    token: string
  }
}

export default function DownloadPage({ params }: DownloadPageProps) {
  return (
    <>
      <Navbar />
      <main className="bg-cream">
        <section className="py-20">
          <Container>
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="font-serif text-5xl mb-4 text-ink">Download Your Product</h1>
              <p className="text-xl text-ink/60 mb-12">
                Your download link has been sent to your email. Check your inbox!
              </p>

              <div className="border border-ink/10 rounded-sm p-12 bg-offwhite mb-8">
                <p className="text-ink/60 mb-6">
                  If you don&apos;t see the email, check your spam folder or try the download button below.
                </p>

                <Button size="lg" className="mb-6">
                  Download File
                </Button>

                <p className="text-sm text-ink/45">
                  Don&apos;t lose your link! Save it somewhere safe.
                </p>
              </div>

              <div className="text-left border border-ink/10 rounded-sm p-8">
                <h2 className="font-serif text-2xl mb-4 text-ink">Getting Started</h2>
                <ol className="space-y-3 text-ink/65 list-decimal list-inside">
                  <li>Download the file using the button above</li>
                  <li>Extract/open the files on your computer</li>
                  <li>Follow the instructions inside</li>
                  <li>Start using the content right away!</li>
                </ol>
              </div>

              <div className="mt-12">
                <p className="text-ink/60 mb-6">Need help?</p>
                <p className="text-ink/60 text-sm">
                  If you have any issues accessing your download,{' '}
                  <a href="mailto:support@example.com" className="text-ink underline hover:no-underline">
                    contact our support team
                  </a>
                </p>
              </div>

              <div className="mt-12 pt-12 border-t border-ink/10">
                <Link href="/products">
                  <Button variant="outline">
                    Browse More Products
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
