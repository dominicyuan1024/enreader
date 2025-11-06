import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = dirname(__dirname)

const EPUB_FILE = join(ROOT, 'public', 'books', 'README.epub')

async function updateEpubMetadata(epubPath, title, author) {
  try {
    console.log(`Reading EPUB file: ${epubPath}`)
    const epubBuffer = await readFile(epubPath)
    
    // 解压 EPUB (EPUB 是 ZIP 格式)
    const zip = await JSZip.loadAsync(epubBuffer)
    
    // 查找 content.opf 文件（可能在 OEBPS/ 或 EPUB/ 目录下）
    let opfPath = null
    for (const fileName of Object.keys(zip.files)) {
      if (fileName.endsWith('content.opf') || fileName.endsWith('package.opf')) {
        opfPath = fileName
        break
      }
    }
    
    if (!opfPath) {
      throw new Error('Could not find content.opf file in EPUB')
    }
    
    console.log(`Found OPF file: ${opfPath}`)
    
    // 读取并解析 OPF 文件
    const opfContent = await zip.file(opfPath).async('string')
    
    // 使用正则表达式修改 title 和 author
    // EPUB 的 OPF 文件格式通常是：
    // <dc:title>...</dc:title>
    // <dc:creator>...</dc:creator>
    
    let modifiedOpf = opfContent
    
    // 替换 title
    modifiedOpf = modifiedOpf.replace(
      /<dc:title[^>]*>.*?<\/dc:title>/gi,
      `<dc:title>${title}</dc:title>`
    )
    
    // 替换 author (creator)
    modifiedOpf = modifiedOpf.replace(
      /<dc:creator[^>]*>.*?<\/dc:creator>/gi,
      `<dc:creator>${author}</dc:creator>`
    )
    
    // 如果不存在，添加 title 和 creator
    if (!modifiedOpf.includes('<dc:title>')) {
      // 在 <metadata> 标签内添加
      modifiedOpf = modifiedOpf.replace(
        /(<metadata[^>]*>)/i,
        `$1\n    <dc:title>${title}</dc:title>`
      )
    }
    
    if (!modifiedOpf.includes('<dc:creator>')) {
      modifiedOpf = modifiedOpf.replace(
        /(<dc:title>.*?<\/dc:title>)/i,
        `$1\n    <dc:creator>${author}</dc:creator>`
      )
    }
    
    // 更新 ZIP 中的 OPF 文件
    zip.file(opfPath, modifiedOpf)
    
    // 重新打包成 EPUB
    console.log('Generating updated EPUB...')
    const newEpubBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    })
    
    // 写入文件
    await writeFile(epubPath, newEpubBuffer)
    console.log(`✓ Successfully updated EPUB metadata`)
    console.log(`  Title: ${title}`)
    console.log(`  Author: ${author}`)
    
  } catch (error) {
    console.error('Error updating EPUB metadata:', error.message)
    process.exit(1)
  }
}

// 执行更新
updateEpubMetadata(EPUB_FILE, 'README', 'Dominic Yuan')

