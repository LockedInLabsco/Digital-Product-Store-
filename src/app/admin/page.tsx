'use client'

import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'

export default function AdminPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="py-20">
          <Container>
            <div className="max-w-4xl">
              <h1 className="text-5xl font-bold mb-4">Admin Dashboard</h1>
              <p className="text-xl text-gray-600 mb-12">
                Admin features and analytics coming soon.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-2">Orders</h3>
                  <p className="text-gray-600">
                    View and manage customer orders
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-2">Products</h3>
                  <p className="text-gray-600">
                    Add and edit digital products
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-2">Analytics</h3>
                  <p className="text-gray-600">
                    View sales and traffic metrics
                  </p>
                </div>

                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-2">Settings</h3>
                  <p className="text-gray-600">
                    Configure store settings
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
