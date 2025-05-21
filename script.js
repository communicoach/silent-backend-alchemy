// Store page-specific functionality in objects
const pages = {
    toneSelection: {
        init: function() {
            this.setupToneSelector();
        },

        setupToneSelector: function() {
            const selectedTones = [];
            const toneCards = document.querySelectorAll('.tone-card');

            toneCards.forEach(card => {
                card.addEventListener('click', function() {
                    const tone = this.getAttribute('data-tone');

                    if (selectedTones.includes(tone)) {
                        selectedTones.splice(selectedTones.indexOf(tone), 1);
                        this.classList.remove('selected');
                    } else if (selectedTones.length < 2) {
                        selectedTones.push(tone);
                        this.classList.add('selected');
                    } else {
                        const firstSelectedTone = selectedTones.shift();
                        document.querySelector(`[data-tone="${firstSelectedTone}"]`).classList.remove('selected');
                        selectedTones.push(tone);
                        this.classList.add('selected');
                    }

                    localStorage.setItem('selectedTones', JSON.stringify(selectedTones));
                    console.log("Selected Tones:", selectedTones);
                });
            });
        }
    },

    situationRoom: {
        init: function() {
            this.setupInfoCards();
            this.setupSpeechRecognition();
        },

        setupInfoCards: function() {
            const infoCards = document.querySelectorAll('.info-card');
            infoCards.forEach(card => {
                card.addEventListener('click', () => {
                    card.classList.toggle('active');
                });
            });
        },

        setupSpeechRecognition: function() {
            const micIcon = document.getElementById('micIcon');
            const textarea = document.querySelector('textarea');

            if (!micIcon || !textarea) {
                console.error('Required elements not found');
                return;
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                console.warn('Speech recognition not supported');
                micIcon.style.display = 'none';
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            let isRecognizing = false;

            micIcon.addEventListener('click', () => {
                isRecognizing ? recognition.stop() : recognition.start();
            });

            recognition.onstart = () => {
                isRecognizing = true;
                micIcon.classList.add('listening');
                console.log('Speech recognition started');
            };

            recognition.onend = () => {
                isRecognizing = false;
                micIcon.classList.remove('listening');
                console.log('Speech recognition ended');
            };

            recognition.onresult = (event) => {
                let finalTranscript = textarea.value;
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    event.results[i].isFinal ? finalTranscript += ' ' + transcript : interimTranscript += transcript;
                }

                textarea.value = finalTranscript + interimTranscript;
                console.log('Updated textarea with transcription');
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                isRecognizing = false;
                micIcon.classList.remove('listening');
            };

            const handleSpeechInput = (text) => {
                const narrativeContent = document.getElementById('narrativeContent');
                const coachTextarea = document.getElementById('coachRequestTextarea');
                
                if (coachTextarea) {
                    // If coach textarea exists at all, append text to it
                    coachTextarea.value = (coachTextarea.value || '') + ' ' + text;
                    coachTextarea.focus();
                } else if (state.isEditing && state.selectedText) {
                    const content = narrativeContent.textContent;
                    const newContent = content.replace(state.selectedText, text);
                    narrativeContent.textContent = newContent;
                    state.selectedText = '';
                } else if (state.isEditing) {
                    narrativeContent.textContent += ' ' + text;
                }
            };
        }
    },

    refinedNarrative: {
        init: function() {
            this.initializeNarrative();
            this.setupToneControls();
            this.setupEditButtons();
        },

        initializeNarrative: function() {
            const narrativeContent = document.getElementById('narrativeContent');
            if (narrativeContent) {
                const refinedNarrative = localStorage.getItem('refinedNarrative');
                narrativeContent.textContent = refinedNarrative || 'Your refined narrative will appear here after processing.';
            }
        },

        setupToneControls: function() {
            const toneControl = document.querySelector('.tone-control');
            if (!toneControl) return;
            
            this.updateToneDisplay();
        },

        updateToneDisplay: function() {
            // Add implementation for updateToneDisplay
            console.log('Updating tone display');
        },

        setupEditButtons: function() {
            document.querySelector('.edit-button.coach')?.addEventListener('click', () => this.askCoachEdit());
            document.querySelector('.edit-button.quick')?.addEventListener('click', () => this.showQuickEditOptions());
            document.querySelector('.edit-button.inline')?.addEventListener('click', () => this.enableInlineEdit());
        },

        async askCoachEdit() {
            const narrativeContent = document.getElementById('narrativeContent')?.textContent;
            if (!narrativeContent) return;

            try {
                const response = await fetch('http://localhost:5506/api/edit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: narrativeContent,
                        editInstruction: "Coach edit request"
                    })
                });

                const data = await response.json();
                if (data.response) {
                    this.updateNarrative(data.response);
                    this.showFeedback('Narrative updated by the coach');
                }
            } catch (error) {
                console.error('Error in coach edit:', error);
                this.showFeedback('Error processing coach edit. Please try again.', 'error');
            }
        },

        async showQuickEditOptions() {
            const editOptions = [
                "Simplify language",
                "Add positivity",
                "Make it more formal",
                "Add humor"
            ];

            let selectedEdit = prompt("Select a Quick Edit: " + editOptions.join(', '));
            if (selectedEdit && editOptions.includes(selectedEdit)) {
                const narrativeContent = document.getElementById('narrativeContent')?.textContent;
                if (!narrativeContent) return;

                try {
                    const response = await fetch('http://localhost:5506/api/edit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: narrativeContent,
                            editInstruction: selectedEdit
                        })
                    });

                    const data = await response.json();
                    if (data.response) {
                        this.updateNarrative(data.response);
                        this.showFeedback(`Narrative updated with "${selectedEdit}"`);
                    }
                } catch (error) {
                    console.error('Error in quick edit:', error);
                    this.showFeedback('Error processing quick edit. Please try again.', 'error');
                }
            }
        },

        enableInlineEdit: function() {
            const narrativeContent = document.getElementById('narrativeContent');
            if (!narrativeContent) {
                console.log('Narrative content element not found');
                return;
            }
        
            console.log('Enabling inline edit');
            narrativeContent.contentEditable = true;
            narrativeContent.focus();
            
            narrativeContent.style.border = '2px solid var(--accent-color)';
            this.showFeedback('Editing enabled - Click outside to save');
        
            const saveChanges = (event) => {
                if (!narrativeContent.contains(event.target)) {
                    console.log('Saving changes');
                    narrativeContent.contentEditable = false;
                    narrativeContent.style.border = '';
                    
                    const updatedContent = narrativeContent.textContent;
                    localStorage.setItem('refinedNarrative', updatedContent);
                    
                    document.removeEventListener('click', saveChanges);
                    
                    this.showFeedback('Changes saved successfully');
                }
            };
        
            document.addEventListener('click', saveChanges);
        },
        
        updateNarrative(newNarrative) {
            const narrativeContent = document.getElementById('narrativeContent');
            if (narrativeContent) {
                narrativeContent.textContent = newNarrative;
                localStorage.setItem('refinedNarrative', newNarrative);
                this.updateToneDisplay();
            }
        },

        showFeedback(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }
};

// Initialize functionality based on current page
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;

    if (currentPage.includes('tone-selection.html')) {
        pages.toneSelection.init();
    } else if (currentPage.includes('situation-room.html')) {
        pages.situationRoom.init();
    } else if (currentPage.includes('refined-narrative.html')) {
        pages.refinedNarrative.init();
    }
});

// Export for use in other files if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = pages;
}

// Add toggle functionality for interfaces
document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('interface-toggle');
    if (toggleSwitch) {
      toggleSwitch.addEventListener('change', function() {
        const currentInterface = document.getElementById('current-interface');
        const conversationalInterface = document.getElementById('conversational-interface');
        
        if (this.checked) {
          // Show conversational interface
          if (currentInterface) currentInterface.style.display = 'none';
          if (conversationalInterface) conversationalInterface.style.display = 'block';
        } else {
          // Show original interface
          if (currentInterface) currentInterface.style.display = 'block';
          if (conversationalInterface) conversationalInterface.style.display = 'none';
        }
      });
    }
    
    // Add basic functionality to the conversational interface
    const conversationalInterface = document.getElementById('conversational-interface');
    if (conversationalInterface) {
      const textarea = conversationalInterface.querySelector('textarea');
      const button = conversationalInterface.querySelector('button');
      const messagesContainer = conversationalInterface.querySelector('.messages-container');
      
      if (button && textarea && messagesContainer) {
        button.addEventListener('click', function() {
          const text = textarea.value.trim();
          if (!text) return;
          
          // Add user message
          const userMessage = document.createElement('div');
          userMessage.className = 'message user';
          userMessage.innerHTML = `<p>${text}</p>`;
          messagesContainer.appendChild(userMessage);
          
          // Clear input
          textarea.value = '';
          
          // Simple response
          setTimeout(() => {
            const coachMessage = document.createElement('div');
            coachMessage.className = 'message coach';
            coachMessage.innerHTML = `<p>Thank you for sharing that. Could you tell me more about how this situation has been affecting you?</p>`;
            messagesContainer.appendChild(coachMessage);
          }, 3000);
        });
      }
    }
  });
// Initialize the interface toggle functionality
const interfaceToggle = {
    init: function() {
      this.setupToggle();
    },
    
    setupToggle: function() {
      // Add toggle HTML to the page (ideally near the top/header)
      const toggleHTML = `
        <div class="toggle-container">
          <span class="toggle-label">Conversational Interface</span>
          <label class="switch">
            <input type="checkbox" id="interface-toggle">
            <span class="slider round"></span>
          </label>
        </div>
      `;
      
      // Find a good spot to inject the toggle (adjust the selector as needed)
      const headerElement = document.querySelector('header') || document.body.firstChild;
      const toggleContainer = document.createElement('div');
      toggleContainer.innerHTML = toggleHTML;
      headerElement.appendChild(toggleContainer);
      
      // Add event listener to the toggle
      const toggleButton = document.getElementById('interface-toggle');
      if (toggleButton){ 
        toggleButton.addEventListener('change', function() { // Use 'change' for checkboxes
            console.log("Toggle clicked, new state:", this.checked);
            const currentInterface = document.getElementById('current-interface');
            const conversationalInterface = document.getElementById('conversational-interface');
            
            if (this.checked) {
              console.log("Showing conversational interface");
              if (currentInterface) currentInterface.style.display = 'none';
              if (conversationalInterface) conversationalInterface.style.display = 'block';
            } else {
              console.log("Showing current interface");
              if (currentInterface) currentInterface.style.display = 'block';
              if (conversationalInterface) conversationalInterface.style.display = 'none';
            }
          });
          console.log("Toggle event listener attached");
        } else {
          console.log("Toggle button not found");
        }
      }
    

  };
  
  // Add this to your existing initialization code
  window.addEventListener('DOMContentLoaded', function() {
    // Your existing initialization code
    
    // Initialize the interface toggle
    interfaceToggle.init();
    
    // Initially hide the conversational interface
    const conversationalInterface = document.getElementById('conversational-interface');
    if (conversationalInterface) conversationalInterface.style.display = 'none';
  });
 