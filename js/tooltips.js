/**
 * Tooltip System
 * Provides tooltip functionality throughout the app
 */

/**
 * Initialize tooltips for elements with data-tooltip attribute
 */
export function initTooltips() {
  // Find all elements with data-tooltip attribute
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  
  tooltipElements.forEach(element => {
    // Skip if already initialized
    if (element.dataset.tooltipInitialized === 'true') {
      return;
    }
    
    element.dataset.tooltipInitialized = 'true';
    
    const tooltipText = element.dataset.tooltip;
    const tooltipPosition = element.dataset.tooltipPosition || 'top';
    const tooltipTitle = element.dataset.tooltipTitle;
    const tooltipDescription = element.dataset.tooltipDescription;
    
    // Create tooltip wrapper if it doesn't exist
    if (!element.parentElement.classList.contains('tooltip-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'tooltip-wrapper';
      element.parentNode.insertBefore(wrapper, element);
      wrapper.appendChild(element);
    }
    
    const wrapper = element.parentElement;
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = `tooltip tooltip-${tooltipPosition}`;
    
    if (tooltipTitle || tooltipDescription) {
      // Rich tooltip with title and description
      tooltip.classList.add('tooltip-rich');
      if (tooltipTitle) {
        const title = document.createElement('div');
        title.className = 'tooltip-title';
        title.textContent = tooltipTitle;
        tooltip.appendChild(title);
      }
      if (tooltipDescription) {
        const desc = document.createElement('div');
        desc.className = 'tooltip-description';
        desc.textContent = tooltipDescription;
        tooltip.appendChild(desc);
      }
    } else {
      // Simple tooltip with just text
      tooltip.textContent = tooltipText;
    }
    
    wrapper.appendChild(tooltip);
    
    // Handle touch devices (show on tap, hide on outside tap)
    let touchTimeout = null;
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      wrapper.dataset.tooltipVisible = 'true';
      
      // Hide after 3 seconds
      clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => {
        wrapper.dataset.tooltipVisible = 'false';
      }, 3000);
    });
    
    // Hide tooltip when clicking outside (touch devices)
    document.addEventListener('touchstart', (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.dataset.tooltipVisible = 'false';
      }
    }, { passive: true });
  });
}

/**
 * Add a tooltip to an element programmatically
 */
export function addTooltip(element, text, position = 'top', title = null, description = null) {
  if (!element) return;
  
  element.setAttribute('data-tooltip', text);
  element.setAttribute('data-tooltip-position', position);
  if (title) element.setAttribute('data-tooltip-title', title);
  if (description) element.setAttribute('data-tooltip-description', description);
  
  initTooltips();
}

/**
 * Create a help icon with tooltip
 */
export function createHelpIcon(text, title = null, description = null) {
  const helpIcon = document.createElement('span');
  helpIcon.className = 'help-tooltip';
  helpIcon.setAttribute('data-tooltip', text);
  helpIcon.setAttribute('data-tooltip-position', 'top');
  if (title) helpIcon.setAttribute('data-tooltip-title', title);
  if (description) helpIcon.setAttribute('data-tooltip-description', description);
  helpIcon.textContent = '?';
  helpIcon.setAttribute('aria-label', text);
  
  // Initialize tooltip for this element
  initTooltips();
  
  return helpIcon;
}

/**
 * Update tooltip text
 */
export function updateTooltip(element, text) {
  if (!element) return;
  
  element.setAttribute('data-tooltip', text);
  const tooltip = element.parentElement?.querySelector('.tooltip');
  if (tooltip) {
    tooltip.textContent = text;
  }
}

/**
 * Remove tooltip
 */
export function removeTooltip(element) {
  if (!element) return;
  
  element.removeAttribute('data-tooltip');
  element.removeAttribute('data-tooltip-position');
  element.removeAttribute('data-tooltip-title');
  element.removeAttribute('data-tooltip-description');
  element.dataset.tooltipInitialized = 'false';
  
  const wrapper = element.parentElement;
  const tooltip = wrapper?.querySelector('.tooltip');
  if (tooltip) {
    tooltip.remove();
  }
  if (wrapper?.classList.contains('tooltip-wrapper') && wrapper.children.length === 1) {
    // Only the element remains, unwrap it
    wrapper.parentNode.insertBefore(element, wrapper);
    wrapper.remove();
  }
}

// Auto-initialize tooltips when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initTooltips();
      // Re-initialize after dynamic content is added
      const observer = new MutationObserver(() => {
        initTooltips();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  } else {
    initTooltips();
    // Re-initialize after dynamic content is added
    const observer = new MutationObserver(() => {
      initTooltips();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

