import MParser from './mdict-parser.js'
import MRenderer from './mdict-renderer.js'
export default async function (fileList) {
  const resources = await new Promise((res, rej) => {
    MParser(fileList).then(resources=>{
        res(resources)
    }).catch(rej)
  })
  return MRenderer(resources)
}
