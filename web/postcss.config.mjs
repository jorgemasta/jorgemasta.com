const config = {
  plugins: {
    'postcss-import': {},
    'postcss-preset-env': {
      stage: 0,
      features: {
        'nesting-rules': {
          edition: '2021',
        },
      },
    },
  },
}

export default config
