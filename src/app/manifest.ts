import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VerdePro — PWA Giardinieri',
    short_name: 'VerdePro',
    description: 'Gestione interventi, calcolo conto live, agenda e concimazioni per giardinieri professionisti',
    start_url: '/',
    display: 'standalone',
    background_color: '#022c22',
    theme_color: '#022c22',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
