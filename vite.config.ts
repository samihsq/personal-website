import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Using root path since we have a custom domain
const base = '/';

export default defineConfig({
  plugins: [react()],
  base,
}); 