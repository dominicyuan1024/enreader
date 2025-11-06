import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = dirname(__dirname)

const EPUB_FILE = join(ROOT, 'public', 'books', 'README.epub')

async function verifyMetadata() {
  try {
    const epubBuffer = await readFile(EPUB_FILE)
    const zip = await JSZip.loadAsync(epubBuffer)
    const opfContent = await zip.file('OEBPS/content.opf').async('string')
    
    const titleMatch = opfContent.match(/<dc:title[^>]*>(.*?)<\/dc:title>/i)
    const authorMatch = opfContent.match(/<dc:creator[^>]*>(.*?)<\/dc:creator>/i)
    
    console.log('Current EPUB Metadata:')
    console.log('  Title:', titleMatch ? titleMatch[1].trim() : 'Not found')
    console.log('  Author:', authorMatch ? authorMatch[1].trim() : 'Not found')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

verifyMetadata()

