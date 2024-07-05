import mdict from '../mdict/mdict.js'
let translator;
export async function lookup(file,text){
  if (!translator){
    translator = await mdict([file])
  }
  return translator.lookup(text)
}