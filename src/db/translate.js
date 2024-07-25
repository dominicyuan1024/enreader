import mdict from '../mdict/mdict.js'
import DB from '@/db/db.js'
let translatorHash, translator, translatorInfo
export async function lookup(dictHash, text) {
  if (translatorHash !== dictHash) {
    const dictInfo = await DB.getRemoteDictInfo(dictHash)
    if (!dictInfo) {
      throw new Error(`get dictInfo failed,hash=${dictHash}`)
    }
    translatorInfo = dictInfo
    const dictFile = await DB.getBookContent(dictHash)
    if (!dictFile) {
      throw new Error(`get dict failed,hash=${dictHash}`)
    }
    translator = await mdict([dictFile.content])
    translatorHash = dictHash
  }
  return translator.lookup(text)
}

export async function generateHtml(content = '', css = '', js = '', style = '') {
  css = css ? css : translatorInfo.css
  const cssEl = css ? `<link href="${css}" rel="stylesheet">` : ''
  js = js ? js : translatorInfo.js
  const jsEl = js ? `<script type="text/javascript" async="" src="${js}"></script>` : ''
  const styleEl = style ? `<style type="text/css">${style}</style>` : ''
  content = content ? content : '404 notfound'
  return `
  <html> 
    <header> 
      ${cssEl}
      ${jsEl}
      ${styleEl}
    </header> 
    <body style="margin:0;padding:0;border:0;background:#fff;">
    ${content}
    </body>
  </html>`
}
