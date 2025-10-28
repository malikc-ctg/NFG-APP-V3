import { supabase } from './supabase.js';
import { showToast } from './notifications.js';
import { showLoader, hideLoader } from './loader.js';

console.log('🔵 Signup.js loaded');

// ==========================================
// SIGN UP HANDLER
// ==========================================
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('🔵 Sign-up form submitted');

  const fullname = document.getElementById('fullname').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  console.log('🔵 Form data:', { fullname, email, passwordLength: password.length });

  // Clear any previous errors
  const errorDiv = document.getElementById('error-message');
  errorDiv.classList.add('hidden');

  // Validate inputs
  if (!fullname || !email || !password) {
    console.log('❌ Validation failed: Missing fields');
    errorDiv.textContent = 'Please fill in all fields.';
    errorDiv.classList.remove('hidden');
    return;
  }

  // Enhanced password validation to match Supabase requirements
  if (password.length < 8) {
    console.log('❌ Validation failed: Password too short');
    errorDiv.textContent = 'Password must be at least 8 characters.';
    errorDiv.classList.remove('hidden');
    return;
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    console.log('❌ Validation failed: No lowercase letter');
    errorDiv.textContent = 'Password must contain at least one lowercase letter.';
    errorDiv.classList.remove('hidden');
    return;
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    console.log('❌ Validation failed: No uppercase letter');
    errorDiv.textContent = 'Password must contain at least one uppercase letter.';
    errorDiv.classList.remove('hidden');
    return;
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    console.log('❌ Validation failed: No number');
    errorDiv.textContent = 'Password must contain at least one number.';
    errorDiv.classList.remove('hidden');
    return;
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};"':|,.<>?/`~]/.test(password)) {
    console.log('❌ Validation failed: No special character');
    errorDiv.textContent = 'Password must contain at least one special character (!@#$%^&* etc).';
    errorDiv.classList.remove('hidden');
    return;
  }

  // Show loader
  console.log('🔵 Showing loader...');
  showLoader('Creating your account...');

  try {
    console.log('🔵 Starting Supabase signup...');
    
    // 1. Create the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullname
        }
      }
    });

    console.log('🔵 Supabase auth response:', { authData, authError });

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    console.log('✅ User created:', authData.user.id);

    // Note: user_profile is created automatically via database trigger
    console.log('🔵 User profile created automatically via trigger');

    console.log('🔵 Hiding loader...');
    hideLoader();

    // 3. Show success message
    console.log('🔵 Showing success message...');
    showToast('Account created successfully! Let\'s get you set up...', 'success');

    // 4. Redirect to onboarding after 1.5 seconds
    console.log('🔵 Redirecting to onboarding in 1.5s...');
    setTimeout(() => {
      window.location.href = './onboarding.html';
    }, 1500);

  } catch (error) {
    console.error('❌ Sign up error:', error);
    
    hideLoader();
    
    // Better error messages
    let errorMessage = 'Failed to create account. Please try again.';
    
    if (error.message) {
      if (error.message.includes('weak password') || error.message.includes('Password should contain')) {
        errorMessage = 'Password must include: uppercase, lowercase, number, and special character.';
      } else if (error.message.includes('already registered') || error.message.includes('already exists')) {
        errorMessage = 'This email is already registered. Try logging in instead.';
      } else if (error.message.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('Database error')) {
        errorMessage = 'Server error. Please try again in a moment.';
      } else {
        errorMessage = error.message;
      }
    }
    
    errorDiv.textContent = errorMessage;
    errorDiv.classList.remove('hidden');
    
    showToast(errorMessage, 'error');
  }
});

