/**
 * Custom Dropdown Utility for NFG App
 * Converts standard <select> elements into custom styled dropdowns
 */

class NFGDropdown {
  constructor(selectElement) {
    this.originalSelect = selectElement;
    this.options = Array.from(selectElement.options).map(opt => ({
      value: opt.value,
      text: opt.text,
      selected: opt.selected
    }));
    this.placeholder = selectElement.dataset.placeholder || 'Select an option';
    this.required = selectElement.required;
    this.name = selectElement.name;
    this.id = selectElement.id;
    
    this.createDropdown();
    this.attachEvents();
  }

  createDropdown() {
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'nfg-select-wrapper';
    
    // Create custom dropdown structure
    const dropdown = document.createElement('div');
    dropdown.className = `nfg-select ${this.required ? 'required' : ''}`;
    if (this.id) dropdown.id = `nfg-${this.id}`;
    
    // Hidden input for form submission
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = this.name;
    const selectedOption = this.options.find(opt => opt.selected);
    hiddenInput.value = selectedOption ? selectedOption.value : '';
    
    // Selected display
    const selected = document.createElement('div');
    selected.className = 'nfg-selected';
    
    const selectedText = document.createElement('span');
    selectedText.className = `nfg-selected-text ${!selectedOption ? 'placeholder' : ''}`;
    selectedText.textContent = selectedOption ? selectedOption.text : this.placeholder;
    
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'nfg-arrow');
    arrow.setAttribute('viewBox', '0 0 512 512');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z');
    arrow.appendChild(path);
    
    selected.appendChild(selectedText);
    selected.appendChild(arrow);
    
    // Options container
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'nfg-options';
    
    // Create option elements
    this.options.forEach(option => {
      const optionEl = document.createElement('button');
      optionEl.type = 'button';
      optionEl.className = `nfg-option ${option.selected ? 'selected' : ''}`;
      optionEl.textContent = option.text;
      optionEl.dataset.value = option.value;
      optionsContainer.appendChild(optionEl);
    });
    
    // Assemble dropdown
    dropdown.appendChild(hiddenInput);
    dropdown.appendChild(selected);
    dropdown.appendChild(optionsContainer);
    wrapper.appendChild(dropdown);
    
    // Replace original select with custom dropdown
    this.originalSelect.style.display = 'none';
    this.originalSelect.parentNode.insertBefore(wrapper, this.originalSelect);
    
    // Store references
    this.dropdown = dropdown;
    this.selected = selected;
    this.selectedText = selectedText;
    this.optionsContainer = optionsContainer;
    this.hiddenInput = hiddenInput;
  }

  attachEvents() {
    // Toggle dropdown on click
    this.selected.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    
    // Handle option selection
    this.optionsContainer.querySelectorAll('.nfg-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectOption(option.dataset.value, option.textContent);
        this.close();
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.dropdown.contains(e.target)) {
        this.close();
      }
    });
    
    // Keyboard navigation
    this.dropdown.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  toggle() {
    if (this.dropdown.classList.contains('open')) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    // Close all other dropdowns
    document.querySelectorAll('.nfg-select.open').forEach(dd => {
      if (dd !== this.dropdown) {
        dd.classList.remove('open');
      }
    });
    
    this.dropdown.classList.add('open');
  }

  close() {
    this.dropdown.classList.remove('open');
  }

  selectOption(value, text) {
    this.hiddenInput.value = value;
    this.selectedText.textContent = text;
    this.selectedText.classList.remove('placeholder');
    
    // Update selected class on options
    this.optionsContainer.querySelectorAll('.nfg-option').forEach(opt => {
      if (opt.dataset.value === value) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
    
    // Update original select
    this.originalSelect.value = value;
    
    // Trigger change event on original select
    const event = new Event('change', { bubbles: true });
    this.originalSelect.dispatchEvent(event);
  }

  // Method to update options dynamically (for site dropdowns, etc.)
  updateOptions(newOptions) {
    this.options = newOptions;
    this.optionsContainer.innerHTML = '';
    
    newOptions.forEach(option => {
      const optionEl = document.createElement('button');
      optionEl.type = 'button';
      optionEl.className = `nfg-option ${option.selected ? 'selected' : ''}`;
      optionEl.textContent = option.text;
      optionEl.dataset.value = option.value;
      
      optionEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectOption(option.value, option.text);
        this.close();
      });
      
      this.optionsContainer.appendChild(optionEl);
    });
    
    // Update selected display if a new option is selected
    const selectedOption = newOptions.find(opt => opt.selected);
    if (selectedOption) {
      this.selectOption(selectedOption.value, selectedOption.text);
    }
  }

  // Method to reset dropdown
  reset() {
    this.hiddenInput.value = '';
    this.selectedText.textContent = this.placeholder;
    this.selectedText.classList.add('placeholder');
    this.optionsContainer.querySelectorAll('.nfg-option').forEach(opt => {
      opt.classList.remove('selected');
    });
  }

  // Method to set value programmatically
  setValue(value) {
    const option = this.options.find(opt => opt.value === value);
    if (option) {
      this.selectOption(value, option.text);
    }
  }

  // Method to get current value
  getValue() {
    return this.hiddenInput.value;
  }
}

// Initialize all select elements with data-custom-dropdown attribute
function initCustomDropdowns() {
  document.querySelectorAll('select[data-custom-dropdown="true"]').forEach(select => {
    new NFGDropdown(select);
  });
}

// Auto-initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomDropdowns);
} else {
  initCustomDropdowns();
}

// Export for module use
export { NFGDropdown, initCustomDropdowns };


