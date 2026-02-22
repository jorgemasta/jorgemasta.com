'use client'

import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {atomDark} from 'react-syntax-highlighter/dist/esm/styles/prism'

function parseLanguage (language) {
  if (language === 'sh') return 'bash'
  return language
}

export default function Code ({value}) {
  if (!value || !value.code) { return null }
  const {language, code} = value
  return (
    <SyntaxHighlighter
      language={parseLanguage(language) || 'text'}
      customStyle={{marginLeft: '-1.5em', marginRight: '-1.5em'}}
      style={atomDark}
      showInlineLineNumbers
    >
      {code}
    </SyntaxHighlighter>
  )
}
