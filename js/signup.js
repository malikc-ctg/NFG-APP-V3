import { supabase } from './supabase.js'
import { toast } from './notifications.js'
import { showLoader, hideLoader } from './loader.js'

// Handle sign up form submission
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const fullname = document.getElementById('fullname').value.trim()
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  
  const errorDiv = document.getElementById('error-message')
  const submitBtn = document.getElementById('signup-btn')
  
  // Clear previous errors
  errorDiv.classList.add('hidden')
  
  // Validate
  if (!fullname || !email || !password) {
    errorDiv.textContent = 'Please fill in all fields'
    errorDiv.classList.remove('hidden')
    return
  }
  
  if (password.length < 8) {
    errorDiv.textContent = 'Password must be at least 8 characters'
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
    <span>Creating account...</span>
  `
  showLoader()
  
  try {
    console.log('[Signup] Creating account for:', email)
    
    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullname,
        }
      }
    })
    
    if (authError) {
      console.error('[Signup] Auth error:', authError)
      throw authError
    }
    
    console.log('[Signup] ✅ Auth user created:', authData.user?.id)
    
    // 2. Check if user_profiles record was created automatically (via trigger)
    // If not, create it manually
    const { data: profileCheck, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single()
    
    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('[Signup] Profile check error:', profileCheckError)
    }
    
    if (!profileCheck) {
      // Create profile manually
      console.log('[Signup] Creating user profile...')
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          email: email,
          full_name: fullname,
          role: 'client', // Default role for sign-ups
          status: 'active'
        })
      
      if (profileError) {
        console.error('[Signup] Profile creation error:', profileError)
        throw new Error('Failed to create user profile')
      }
      
      console.log('[Signup] ✅ Profile created')
    } else {
      console.log('[Signup] ✅ Profile already exists (created by trigger)')
    }
    
    // 3. Success!
    console.log('[Signup] ✅ Sign up complete!')
    toast.success('Account created successfully! Redirecting...', 'Welcome to NFG!')
    
    // Redirect to dashboard after a brief delay
    setTimeout(() => {
      window.location.href = './dashboard.html'
    }, 1500)
    
  } catch (error) {
    console.error('[Signup] Error:', error)
    hideLoader()
    
    // Re-enable button
    submitBtn.disabled = false
    submitBtn.innerHTML = '<span>Create Account</span>'
    
    // Show error
    let errorMessage = 'Failed to create account. Please try again.'
    
    if (error.message.includes('already registered')) {
      errorMessage = 'This email is already registered. Try logging in instead.'
    } else if (error.message.includes('invalid email')) {
      errorMessage = 'Please enter a valid email address.'
    } else if (error.message.includes('weak password')) {
      errorMessage = 'Password is too weak. Please use a stronger password.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    errorDiv.textContent = errorMessage
    errorDiv.classList.remove('hidden')
    toast.error(errorMessage, 'Sign Up Failed')
  }
})

// Check if user is already logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    console.log('[Signup] User already logged in, redirecting...')
    window.location.href = './dashboard.html'
  }
})

