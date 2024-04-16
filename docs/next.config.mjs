import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  staticImage: true,
  latex: false,
  defaultShowCopyCode: true
})

export default withNextra({
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true
  },
  rewrites() {
    return [
      {
        source: '/guide',
        destination: '/guide/quick-start'
      },
      {
        source: '/extend',
        destination: '/extend/rule-guidelines'
      },
      {
        source: '/project',
        destination: '/project/how-it-works'
      },
      {
        source: '/rules',
        destination: '/rules/index'
      }
    ]
  }
})
