document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sense>.examples').forEach((el) => {
    el.addEventListener('click', (evt) => {
      evt.currentTarget.classList.toggle('selfshow')
    })
  })
  document.querySelectorAll('.collapse').forEach((el) => {
    el.addEventListener('click', (evt) => {
      evt.currentTarget.classList.toggle('selfshow')
    })
  })
  document.querySelectorAll('.sense>.def').forEach((el) => {
    el.addEventListener('click', (evt) => {
      const sendMessage = window.top.ListenTranslateIframeMessage
      typeof sendMessage === 'function' && sendMessage('sense-def-en', evt.currentTarget.innerText)
    })
  })
  document.querySelectorAll('.sense>deft').forEach((el) => {
    el.addEventListener('click', (evt) => {
      const sendMessage = window.top.ListenTranslateIframeMessage
      typeof sendMessage === 'function' && sendMessage('sense-def-cn', evt.currentTarget.innerText)
    })
  })
})

window.toggle_active = () => {}
