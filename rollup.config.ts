// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = {
  input: 'src/main.ts',
  output: {
    esModule: true,
    file: 'dist/main.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    typescript(),
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ['import', 'module', 'default'],
      browser: false
    }),
    commonjs()
  ],
  external: [
    // Only exclude Node.js built-ins - everything else gets bundled
    'fs',
    'path',
    'util',
    'events',
    'stream',
    'crypto',
    'os',
    'url',
    'assert',
    'buffer'
  ]
}

export default config
