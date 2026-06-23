'use client'

import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Button from '@/src/components/Button'

const productDetails: Record<string, any> = {
  'email-marketing-guide': {
    title: 'Email Marketing Guide',
    price: 29,
    description: 'Master modern email strategies that convert',
    longDescription:
      'This comprehensive guide covers everything you need to know about email marketing in 2024. From building your list to crafting compelling copy and optimizing for conversions.',
    features: [
      '50+ email templates',
      'Step-by-step strategy guide',
      'Copywriting formulas',
      'Segmentation tactics',
      'Analytics breakdown',
    ],
    format: 'PDF + Email Templates',
  },
  'content-calendar-template': {
    title: 'Content Calendar Template',
    price: 19,
    description: 'Plan your content for an entire year',
    longDescription:
      'A fully editable content calendar template to help you plan, organize, and execute your content strategy. Includes planning worksheets and content pillars.',
    features: [
      '12-month template',
      'Multiple content types',
      'Social media columns',
      'Planning worksheets',
      'Color-coded categories',
    ],
    format: 'Google Sheets + Notion Template',
  },
  'social-media-playbook': {
    title: 'Social Media Playbook',
    price: 39,
    description: 'Proven strategies for growing your audience',
    longDescription:
      'A complete playbook for growing on social media. Covers hashtag strategy, posting frequency, content pillars, and engagement tactics.',
    features: [
      'Platform-specific guides',
      'Content frameworks',
      'Hashtag strategies',
      'Growth metrics guide',
      'Sample content calendar',
    ],
    format: 'PDF + Swipe File',
  },
  'linkedin-growth-course': {
    title: 'LinkedIn Growth Course',
    price: 49,
    description: 'Build your professional brand on LinkedIn',
    longDescription:
      'Step-by-step course to build authority and grow your LinkedIn audience. Includes profile optimization, content strategy, and engagement tactics.',
    features: [
      'Profile optimization checklist',
      '30-day challenge',
      'Content templates',
      'Video tutorials',
      'Private community access',
    ],
    format: 'Video Course + Worksheets',
  },
  'personal-brand-workbook': {
    title: 'Personal Brand Workbook',
    price: 24,
    description: 'Define and communicate your unique value',
    longDescription:
      'A complete workbook to help you define, build, and communicate your personal brand. Includes exercises, worksheets, and actionable strategies.',
    features: [
      'Brand discovery exercises',
      'Messaging frameworks',
      'Visual guidelines',
      'Bio templates',
      'Brand strategy worksheet',
    ],
    format: 'Workbook PDF + Digital Worksheets',
  },
  'sales-email-templates': {
    title: 'Sales Email Templates',
    price: 34,
    description: 'Ready-to-use email templates that sell',
    longDescription:
      'A collection of proven email templates for sales outreach. Copy-paste ready with customization tips and best practices.',
    features: [
      '25+ templates',
      'Cold outreach sequences',
      'Follow-up emails',
      'Case study emails',
      'Swipe file included',
    ],
    format: 'Email Templates + Docs',
  },
}

interface ProductPageProps {
  params: {
    slug: string
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  const product = productDetails[params.slug]

  if (!product) {
    return (
      <>
        <Navbar />
        <main>
          <Container>
            <div className="py-20 text-center">
              <h1 className="text-4xl font-bold mb-4">Product Not Found</h1>
              <p className="text-gray-600 mb-8">
                The product you're looking for doesn't exist.
              </p>
              <Link href="/products">
                <Button>Back to Products</Button>
              </Link>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="py-20">
          <Container>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
              {/* Left: Product Info */}
              <div>
                <Link
                  href="/products"
                  className="text-gray-600 hover:text-black mb-4 inline-block"
                >
                  ← Back to Products
                </Link>
                <h1 className="text-5xl font-bold mb-4">{product.title}</h1>
                <p className="text-2xl font-bold mb-6">${product.price}</p>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {product.longDescription}
                </p>

                <Button className="w-full md:w-auto mb-8" onClick={() => {}}>
                  Buy Now
                </Button>

                <div className="border-t border-gray-200 pt-8">
                  <p className="text-sm text-gray-600 mb-6">
                    Format: <strong>{product.format}</strong>
                  </p>
                </div>
              </div>

              {/* Right: Features */}
              <div>
                <div className="border border-gray-200 rounded-lg p-8">
                  <h3 className="text-2xl font-bold mb-6">What You Get</h3>
                  <ul className="space-y-4">
                    {product.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-black font-bold">✓</span>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 bg-gray-50 rounded-lg p-6">
                  <p className="text-sm text-gray-600">
                    <strong>Instant Access:</strong> Download immediately after purchase
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
