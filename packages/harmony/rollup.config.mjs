import svgr from '@svgr/rollup'
import json from 'rollup-plugin-json'
import postcss from 'rollup-plugin-postcss'
import rollupTypescript from 'rollup-plugin-typescript2'
import ttypescript from 'ttypescript'

import pkg from './package.json' assert { type: 'json' }

const external = [
  ...Object.keys(pkg.devDependencies),
  ...Object.keys(pkg.peerDependencies),
  '@emotion/react/jsx-runtime',
  '@emotion/cache',
  '@emotion/is-prop-valid'
]

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      preserveModules: true
    }
  ],
  plugins: [
    json(),
    postcss({
      minimize: true,
      extract: 'harmony.css',
      modules: true
    }),
    svgr(),
    rollupTypescript({
      typescript: ttypescript,
      clean: true
    })
  ],
  external
}
