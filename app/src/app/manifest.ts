import { MetadataRoute } from 'next';
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'REVISOR ARQ',
    short_name: 'REVISOR ARQ',
    description: 'IA entrenada en normativa urbana chilena (LGUC, OGUC, DDU)',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f3ef',
    theme_color: '#171717',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
