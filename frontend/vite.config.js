import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Used ONLY while Vite runs locally in VS Code.
    // A Netlify deployment needs a separately hosted, secured Python API.
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
