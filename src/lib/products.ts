export const products = [
  {
    id: '1',
    title: 'Email Marketing Guide',
    description: 'Master modern email strategies that convert',
    price: 29,
    slug: 'email-marketing-guide',
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
  {
    id: '2',
    title: 'Content Calendar Template',
    description: 'Plan your content for an entire year',
    price: 19,
    slug: 'content-calendar-template',
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
  {
    id: '3',
    title: 'Social Media Playbook',
    description: 'Proven strategies for growing your audience',
    price: 39,
    slug: 'social-media-playbook',
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
  {
    id: '4',
    title: 'LinkedIn Growth Course',
    description: 'Build your professional brand on LinkedIn',
    price: 49,
    slug: 'linkedin-growth-course',
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
  {
    id: '5',
    title: 'Personal Brand Workbook',
    description: 'Define and communicate your unique value',
    price: 24,
    slug: 'personal-brand-workbook',
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
  {
    id: '6',
    title: 'Sales Email Templates',
    description: 'Ready-to-use email templates that sell',
    price: 34,
    slug: 'sales-email-templates',
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
]

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug)
}

export function getFeaturedProducts(count: number = 3) {
  return products.slice(0, count)
}
