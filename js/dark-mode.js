// Dark Mode System with Auto-Detection and Smooth Transitions
// Detects system preference and persists user choice

// Initialize dark mode IMMEDIATELY to prevent flash
(function() {
  // Check for saved preference, otherwise use system preference
  const savedTheme = localStorage.getItem('nfg-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Determine initial theme
  const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
  
  // Apply theme immediately (before page renders)
  if (shouldBeDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  // Add no-transition class temporarily to prevent flash
  document.documentElement.classList.add('no-transition');
  
  // Remove no-transition after a brief moment
  setTimeout(() => {
    document.documentElement.classList.remove('no-transition');
  }, 50);
})();

// Main dark mode functions
const DarkMode = {
  // Get current theme
  getTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  },
  
  // Set theme
  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nfg-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nfg-theme', 'light');
    }
    
    // Update toggle checkbox if it exists
    this.updateToggle();
    
    // Dispatch event for other components (like charts) to update
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme } }));
  },
  
  // Toggle between light and dark
  toggle() {
    const newTheme = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },
  
  // Update toggle checkbox state
  updateToggle() {
    const checkbox = document.getElementById('dark-mode-toggle');
    if (checkbox) {
      checkbox.checked = this.getTheme() === 'light'; // Reversed: checked = light (sun/day)
    }
  },
  
  // Initialize toggle listener
  initToggle() {
    const checkbox = document.getElementById('dark-mode-toggle');
    if (checkbox) {
      // Set initial state
      checkbox.checked = this.getTheme() === 'light';
      
      // Add change listener
      checkbox.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        this.setTheme(newTheme);
      });
    }
  },
  
  // Listen for system theme changes
  watchSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('nfg-theme')) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  },
  
  // Initialize everything
  init() {
    this.initToggle();
    this.watchSystemTheme();
    console.log('[DarkMode] Initialized. Current theme:', this.getTheme());
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DarkMode.init());
} else {
  DarkMode.init();
}

// Export for use in other scripts
window.DarkMode = DarkMode;

