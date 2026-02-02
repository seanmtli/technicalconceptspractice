// Content source registry for attribution

export interface ContentSource {
  name: string;
  baseUrl: string;
  description: string;
}

export const CONTENT_SOURCES: Record<string, ContentSource> = {
  'technically-dev': {
    name: 'Technically',
    baseUrl: 'https://technically.dev/posts',
    description: 'Technical explainers for software concepts',
  },
};
