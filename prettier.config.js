/** @type {import('prettier').Config} */
export default {
  printWidth: 100,
  singleQuote: true,
  plugins: ['@shopify/prettier-plugin-liquid'],
  overrides: [
    {
      files: '*.liquid',
      options: {
        parser: 'liquid-html',
        singleQuote: false,
      },
    },
  ],
};
