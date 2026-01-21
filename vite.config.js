import { defineConfig } from 'vite';

export default defineConfig(() => {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
  return { base: repo ? `/${repo}/` : '/' };
});
