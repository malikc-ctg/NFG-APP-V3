import { supabase } from './supabase.js';
import { showToast } from './notifications.js';
import { showLoader, hideLoader } from './loader.js';

// ==========================================
// SIGN UP HANDLER
// ==========================================
document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullname = document.getElementById('fullname').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Clear any previous errors
  const errorDiv = document.getElementById('error-message');
  errorDiv.classList.add('hidden');

  // Validate inputs
  if (!fullname || !email || !password) {
    errorDiv.textContent = 'Please fill in all fields.';
    errorDiv.classList.remove('hidden');
    return;
  }

  if (password.length < 8) {
    errorDiv.textContent = 'Password must be at least 8 characters.';
    errorDiv.classList.remove('hidden');
    return;
  }

  // Show loader
  showLoader('Creating your account...');

  try {
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

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    // 2. Create user profile (role is always 'client' for sign-ups)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        email: email,
        full_name: fullname,
        role: 'client'
      }]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't throw - the auth user exists, we'll handle profile creation issues separately
    }

    hideLoader();

    // 3. Show success message
    showToast('Account created successfully! Redirecting...', 'success');

    // 4. Redirect to dashboard after 1.5 seconds
    setTimeout(() => {
      window.location.href = './dashboard.html';
    }, 1500);

  } catch (error) {
    hideLoader();
    console.error('Sign up error:', error);
    
    errorDiv.textContent = error.message || 'Failed to create account. Please try again.';
    errorDiv.classList.remove('hidden');
    
    showToast('Failed to create account', 'error');
  }
});

