import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Edit this constant to match your GitHub username and repo name, e.g. '/<repo-name>/'
const base = '/personal-website/';

export default defineConfig({
  plugins: [react()],
  base,
}); 