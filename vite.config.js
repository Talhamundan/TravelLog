// React JSX dönüşümünü Vite içinde doğru şekilde etkinleştirir.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
