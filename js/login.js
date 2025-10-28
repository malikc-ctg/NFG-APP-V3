import { supabase } from './supabase.js'
import { toast } from './notifications.js'
import { showLoader, hideLoader } from './loader.js'

// Handle login form submission
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  const remember = document.getElementById('remember').checked
  
  const errorDiv = document.getElementById('error-message')
  const submitBtn = document.getElementById('login-btn')
  
  // Clear previous errors
  errorDiv.classList.add('hidden')
  
  // Validate
  if (!email || !password) {
    errorDiv.textContent = 'Please enter both email and password'
    errorDiv.classList.remove('hidden')
    return
  }
  
  // Disable button and show loader
  submitBtn.disabled = true
  submitBtn.innerHTML = `
    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Logging in...</span>
  `
  showLoader()
  
  try {
    console.log('[Login] Attempting login for:', email)
    
    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })
    
    if (error) {
      console.error('[Login] Error:', error)
      throw error
    }
    
    console.log('[Login] ✅ Login successful:', data.user?.id)
    
    // Store remember me preference
    if (remember) {
      localStorage.setItem('nfg-remember', 'true')
    } else {
      localStorage.removeItem('nfg-remember')
    }
    
    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('user_id', data.user.id)
      .single()
    
    if (profileError) {
      console.warn('[Login] Could not fetch profile:', profileError)
    } else {
      console.log('[Login] User role:', profile?.role)
    }
    
    toast.success(`Welcome back${profile?.full_name ? ', ' + profile.full_name : ''}!`, 'Login Successful')
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = './dashboard.html'
    }, 1000)
    
  } catch (error) {
    console.error('[Login] Error:', error)
    hideLoader()
    
    // Re-enable button
    submitBtn.disabled = false
    submitBtn.innerHTML = '<span>Log In</span>'
    
    // Show error
    let errorMessage = 'Invalid email or password'
    
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please try again.'
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'Please verify your email address before logging in.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    errorDiv.textContent = errorMessage
    errorDiv.classList.remove('hidden')
    toast.error(errorMessage, 'Login Failed')
  }
})

// Check if user is already logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    console.log('[Login] User already logged in, redirecting...')
    window.location.href = './dashboard.html'
  }
})

