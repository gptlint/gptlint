import '../style.css'

import type { AppProps } from 'next/app'
import { Analytics } from '@vercel/analytics/react'

// eslint-disable-next-line @typescript-eslint/naming-convention
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />

      <Analytics />
    </>
  )
}
