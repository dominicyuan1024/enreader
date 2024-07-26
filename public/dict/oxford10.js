const sendMessage = window.top.ListenTranslateIframeMessage
let _selectedDefEn = ''
let _selectedDefCn = ''
function clickToolHandle() {
  if (typeof sendMessage !== 'function') {
    return
  }
  hideTool()
  sendMessage('sense-def', {
    defEN: _selectedDefEn,
    defCN: _selectedDefCn
  })
}
function showTool(x = 0, y = 0) {
  let toolEl = document.querySelector('#selftool')
  if (!toolEl) {
    toolEl = document.createElement('div')
    toolEl.id = 'selftool'
    document.body.appendChild(toolEl)
  }
  toolEl.classList.add('show')
  toolEl.style.left = x - toolEl.offsetWidth / 2 + 'px'
  toolEl.style.top = y - toolEl.offsetHeight - 3 + 'px'
  toolEl.removeEventListener('click', clickToolHandle)
  toolEl.addEventListener('click', clickToolHandle)
}
function hideTool() {
  const toolEl = document.querySelector('#selftool')
  toolEl && toolEl.classList.remove('show')
}
// document.addEventListener('DOMContentLoaded', () => {}
const sl = ['.sense>.examples', '.collapse', 'chn', '.idioms']
sl.forEach((item) => {
  document.querySelectorAll(item).forEach((el) => {
    el.addEventListener('click', (evt) => {
      evt.stopPropagation()
      evt.currentTarget.classList.toggle('selfshow')
      hideTool()
    })
  })
})

document.body.addEventListener('click', (evt) => {
  if (evt.target.id === 'selftool') {
    return
  }
  hideTool()
})

document.querySelectorAll('.sense .def').forEach((el) => {
  el.style.textDecoration = 'underline'
  const relTextDec = window.getComputedStyle(el, null).getPropertyValue('text-decoration')
  if (relTextDec.indexOf('underline') < 0) {
    return
  }
  el.addEventListener('click', (evt) => {
    evt.stopPropagation()
    if (typeof sendMessage !== 'function') {
      return
    }
    let enEl = evt.currentTarget.cloneNode(true)
    enEl.querySelectorAll('chn').forEach((el) => {
      el.innerHtml = ''
      el.innerText = ''
    })
    _selectedDefEn = enEl.innerText
    let cnEl = evt.currentTarget.parentNode.querySelector('.def+deft')
    if (!cnEl) {
      cnEl = evt.currentTarget.querySelector('chn')
    }
    _selectedDefCn = cnEl ? cnEl.innerText : ''
    const { pageX, pageY } = evt
    showTool(pageX, pageY)
  })
})

window.toggle_active = () => {}
