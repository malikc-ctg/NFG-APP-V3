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

  if (password.length < 8) {
    console.log('❌ Validation failed: Password too short');
    errorDiv.textContent = 'Password must be at least 8 characters.';
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

    // 2. Create user profile (role is always 'client' for sign-ups)
    console.log('🔵 Creating user profile...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        email: email,
        full_name: fullname,
        role: 'client'
      }]);

    if (profileError) {
      console.error('❌ Profile creation error:', profileError);
      // Don't throw - the auth user exists, we'll handle profile creation issues separately
    } else {
      console.log('✅ Profile created successfully');
    }

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
    
    errorDiv.textContent = error.message || 'Failed to create account. Please try again.';
    errorDiv.classList.remove('hidden');
    
    showToast('Failed to create account', 'error');
  }
});

