import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    client: 'src/client.js',
  },
  format: ['esm', 'cjs'],
  target: 'node22',
  clean: true,
  splitting: false,
  sourcemap: true,
  dts: true,
  treeshake: true,
  minify: false,
  external: ['eventsource-client'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
  outDir: 'dist',
});
