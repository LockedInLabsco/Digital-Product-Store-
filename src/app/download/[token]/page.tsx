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
      <main>
        <section className="py-20">
          <Container>
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-5xl font-bold mb-4">🎉 Download Your Product</h1>
              <p className="text-xl text-gray-600 mb-12">
                Your download link has been sent to your email. Check your inbox!
              </p>

              <div className="border border-gray-200 rounded-lg p-12 bg-gray-50 mb-8">
                <p className="text-gray-600 mb-6">
                  If you don't see the email, check your spam folder or try the download button below.
                </p>

                <Button size="lg" className="mb-6">
                  Download File
                </Button>

                <p className="text-sm text-gray-500">
                  Don't lose your link! Save it somewhere safe.
                </p>
              </div>

              <div className="text-left border border-gray-200 rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
                <ol className="space-y-3 text-gray-700 list-decimal list-inside">
                  <li>Download the file using the button above</li>
                  <li>Extract/open the files on your computer</li>
                  <li>Follow the instructions inside</li>
                  <li>Start using the content right away!</li>
                </ol>
              </div>

              <div className="mt-12">
                <p className="text-gray-600 mb-6">Need help?</p>
                <p className="text-gray-600 text-sm">
                  If you have any issues accessing your download,{' '}
                  <a href="mailto:support@example.com" className="text-black underline hover:no-underline">
                    contact our support team
                  </a>
                </p>
              </div>

              <div className="mt-12 pt-12 border-t border-gray-200">
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
