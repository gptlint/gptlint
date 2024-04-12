import Image from 'next/image'
import { useRouter } from 'next/router'
import { useTheme } from 'next-themes'
import { useMounted } from 'nextra/hooks'
import { type DocsThemeConfig, useConfig } from 'nextra-theme-docs'
import React from 'react'

const siteHost = 'gptlint.dev'
const siteUrl = `https://${siteHost}`
// const siteSocialUrl = `${siteUrl}/social.png`; // TODO
const siteDesc = `Use LLMs to enforce best practices across your codebase.`
const siteTitle = 'GPTLint'

const config: DocsThemeConfig = {
  logo: function Logo() {
    const theme = useTheme()
    const mounted = useMounted()
    const isDarkMode = theme.resolvedTheme === 'dark'

    return (
      <>
        {mounted && isDarkMode ? (
          <Image
            src='/logo-darkmode-horizontal.png'
            alt='gptlint logo'
            width='838'
            height='256'
            style={{ height: 48, maxHeight: 48, width: 'auto' }}
          />
        ) : (
          <Image
            src='/logo-horizontal.png'
            alt='gptlint logo'
            width='838'
            height='256'
            style={{ height: 48, maxHeight: 48, width: 'auto' }}
          />
        )}
      </>
    )
  },
  project: {
    link: 'https://github.com/gptlint/gptlint'
  },
  editLink: {
    content: 'Edit this page on GitHub →'
  },
  feedback: {
    content: 'Question? Give us feedback →'
  },
  chat: {
    link: 'https://twitter.com/transitive_bs',
    icon: (
      <svg width='24' height='24' viewBox='0 0 248 204'>
        <path
          fill='currentColor'
          d='M221.95 51.29c.15 2.17.15 4.34.15 6.53 0 66.73-50.8 143.69-143.69 143.69v-.04c-27.44.04-54.31-7.82-77.41-22.64 3.99.48 8 .72 12.02.73 22.74.02 44.83-7.61 62.72-21.66-21.61-.41-40.56-14.5-47.18-35.07a50.338 50.338 0 0 0 22.8-.87C27.8 117.2 10.85 96.5 10.85 72.46v-.64a50.18 50.18 0 0 0 22.92 6.32C11.58 63.31 4.74 33.79 18.14 10.71a143.333 143.333 0 0 0 104.08 52.76 50.532 50.532 0 0 1 14.61-48.25c20.34-19.12 52.33-18.14 71.45 2.19 11.31-2.23 22.15-6.38 32.07-12.26a50.69 50.69 0 0 1-22.2 27.93c10.01-1.18 19.79-3.86 29-7.95a102.594 102.594 0 0 1-25.2 26.16z'
        />
      </svg>
    )
  },
  docsRepositoryBase: 'https://github.com/gptlint/gptlint/tree/main/docs',
  head: function useHead() {
    const config = useConfig()
    const { asPath } = useRouter()
    const isIndex = asPath === '/'
    const title =
      config?.title && !isIndex ? `${config.title} - ${siteTitle}` : siteTitle

    return (
      <>
        <meta httpEquiv='Content-Language' content='en' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0' />
        <meta name='robots' content='index,follow' />

        <meta name='description' content={siteDesc} />
        <meta property='og:description' content={siteDesc} />
        <meta name='twitter:description' content={siteDesc} />

        <meta property='og:site_name' content={siteTitle} />
        <meta name='apple-mobile-web-app-title' content={siteTitle} />

        {/* <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={siteSocialUrl} />
        <meta name="og:image" content={siteSocialUrl} /> */}

        <meta property='twitter:domain' content={siteHost} />
        <meta name='twitter:site:domain' content={siteHost} />

        <meta name='twitter:url' content={siteUrl} />

        <meta property='og:title' content={title} />
        <meta name='twitter:title' content={title} />
        <title>{title}</title>

        <link rel='shortcut icon' href='/favicon.ico' />
        <link rel='apple-touch-icon' href='/favicon.png' />
        <link
          rel='icon'
          type='image/png'
          sizes='1200x1200'
          href='/favicon.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='180x180'
          href='/favicon-180x180.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='64x64'
          href='/favicon-64x64.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='32x32'
          href='/favicon-32x32.png'
        />
        <link
          rel='icon'
          type='image/png'
          sizes='16x16'
          href='/favicon-16x16.png'
        />

        <style>
          {`
ul ul.nx-mt-6, ul ul._mt-6 {
  margin-top: 0;
}

ul.contains-task-list {
  margin-top: 1rem;
  margin-left: 0.75rem;
}

ul li._my-2, ul li.task-list-item {
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

img {
  display: inline-block !important;
}

aside ul li button {
  font-weight: 700;
}
`}
        </style>
      </>
    )
  },
  sidebar: {
    toggleButton: true
  },
  footer: {
    component: null
  }
}

export default config
