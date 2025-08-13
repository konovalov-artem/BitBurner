import path from 'node:path'
import fs from 'node:fs'

const sourceFileName = 'NetscriptDefinitions.d.ts'
const targetFileName = 'global.d.ts'

const sourceFilePath = path.resolve(__dirname, sourceFileName)
const outputFilePath = path.resolve(__dirname, targetFileName)

let originalContent = fs.readFileSync(sourceFilePath, 'utf8')

originalContent = originalContent.replace(
  /^\s*declare\s+(?=(interface|type|enum|class|const))/gm,
  ''
)

const wrappedContent = `// 🌐 This file is auto-generated. Do not edit manually.
declare global {
${originalContent
  .split('\n')
  .map((line) => '  ' + line)
  .join('\n')}
}

export {};
`

fs.writeFileSync(outputFilePath, wrappedContent, 'utf8')

console.log(`✅ ${targetFileName} generated.`)
