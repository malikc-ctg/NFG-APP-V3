import { supabase } from './supabase.js'

const form = document.getElementById('login-form')
const errorEl = document.getElementById('auth-error')
const demoBtn = document.getElementById('signup-demo')

form?.addEventListener('submit', async (e) => {
  e.preventDefault()
  const fd = new FormData(form)
  const email = fd.get('email')
  const password = fd.get('password')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    errorEl.textContent = error.message
    errorEl.classList.remove('hidden')
    return
  }
  window.location.href = './dashboard.html'
})

demoBtn?.addEventListener('click', async () => {
  const email = `demo+${Date.now()}@nfg.test`
  const password = 'Password123!'
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    errorEl.textContent = error.message
    errorEl.classList.remove('hidden')
    return
  }
  alert(`Demo account created:\n${email}\npassword: ${password}`)
})


