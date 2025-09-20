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
    } else if (currentPage.includes('action-arena.html')) {
      pages.actionArena.init(); // ✅ OSD here
    }
  });
// ===== Action Arena: Objective Scenario Dossier (OSD) =====
pages.actionArena = {
    init() {
      this.cache();
      this.wire();
      this.hydrate();
    },
  
    cache() {
      this.btnBuild = document.getElementById('buildOsdBtn');
      this.btnRebuild = document.getElementById('rebuildOsdBtn');
      this.btnView = document.getElementById('viewOsdBtn');
      this.osdMini = document.getElementById('osdMini');
      this.coverageOverall = document.getElementById('osdCoverageOverall');
      this.gaps = document.getElementById('osdGaps');
      this.followupsWrap = document.getElementById('osdFollowupsWrap');
  
      this.modal = document.getElementById('osdModal');
      this.osdJson = document.getElementById('osdJson');
      this.saveBtn = document.getElementById('saveOsdBtn');
      this.closeBtn = document.getElementById('closeOsdBtn');
    },
  
    wire() {
      if (this.btnBuild) this.btnBuild.addEventListener('click', () => this.buildOsd());
      if (this.btnRebuild) this.btnRebuild.addEventListener('click', () => this.buildOsd(true));
      if (this.btnView) this.btnView.addEventListener('click', () => this.openModal());
      if (this.saveBtn) this.saveBtn.addEventListener('click', () => this.saveManualOsd());
      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
      // Close on backdrop click
      if (this.modal) this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    },
  
    hydrate() {
      const osd = this.getOSD();
      if (osd) {
        this.btnBuild?.classList.remove('btn-primary');
        this.btnBuild?.classList.add('btn-outline');
        if (this.btnBuild?.querySelector('.label')) this.btnBuild.querySelector('.label').textContent = 'Build OSD';
        this.btnRebuild?.setAttribute('style', '');
        this.btnView?.setAttribute('style', '');
  
        this.renderMini(osd);
      }
    },
  
    getOSD() {
      try {
        return JSON.parse(localStorage.getItem('objectiveScenarioDossier') || 'null');
      } catch { return null; }
    },
  
    openModal() {
      const osd = this.getOSD();
      if (!osd) return;
      this.osdJson.textContent = JSON.stringify(osd, null, 2);
      this.modal.style.display = 'flex';
    },
  
    closeModal() { this.modal.style.display = 'none'; },
  
    saveManualOsd() {
      try {
        const parsed = JSON.parse(this.osdJson.textContent);
        localStorage.setItem('objectiveScenarioDossier', JSON.stringify(parsed));
        this.renderMini(parsed);
        this.toast('OSD saved.');
      } catch (e) {
        this.toast('Invalid JSON. Not saved.');
      }
    },
  
    async buildOsd(isRebuild = false) {
      const btn = isRebuild ? this.btnRebuild : this.btnBuild;
      const spinner = btn?.querySelector('.spinner');
      const label = btn?.querySelector('.label');
      if (spinner) spinner.style.display = 'inline-block';
      if (label) label.textContent = isRebuild ? 'Rebuilding…' : 'Building…';
  
      try {
        const refinedNarrative = localStorage.getItem('refinedNarrative') || '';
        const communicationGoal = localStorage.getItem('communicationGoal') || '';
        const rawVent = localStorage.getItem('rawNarrative') || '';      // optional, if you store it
        const pasted = localStorage.getItem('pastedText') || '';         // optional, if you store it
  
        const prompt = `
  You are building an Objective Scenario Dossier (OSD) from a user's inputs. 
  Return **valid JSON only** that matches the schema exactly. Do not add explanations.
  
  INPUTS
  - refinedNarrative (first-person): ${refinedNarrative}
  - userGoal: ${communicationGoal}
  - rawVent: ${rawVent}
  - pastedText: ${pasted}
  
  REQUIREMENTS
  - Separate facts vs inferences.
  - Propose fields and coverage scores only if you have signal; otherwise leave gaps and lower scores.
  - Generate up to 3 follow-up questions **only if** coverage is low and answers would materially improve plan quality.
  - Be neutral, specific, and coachable—not clinical.
  
  SCHEMA (fill every key; empty strings/arrays allowed)
  {
    "ids": { "scenarioId": "", "createdAt": "" },
    "summary": {
      "situation": "",
      "timeline": "",
      "stakes": "",
      "facts_vs_inferences": { "facts": [], "inferences": [] }
    },
    "actors": [
      {
        "name": "User",
        "role": "self",
        "goals": [],
        "constraints": [],
        "style_baseline": "",
        "style_variants": [],
        "boundaries": [],
        "levers": [],
        "triggers": [],
        "confidence": 0.0
      },
      {
        "name": "Other Party",
        "role": "manager|client|partner|family|other",
        "goals": [],
        "constraints": [],
        "style_baseline": "",
        "style_variants": [],
        "boundaries": [],
        "levers": [],
        "triggers": [],
        "confidence": 0.0
      }
    ],
    "dynamics": {
      "power_balance": "",
      "frictions": [],
      "misalignments": [],
      "trust_level": "",
      "repair_paths": [],
      "risk_map": [],
      "opportunity_map": [],
      "confidence": 0.0
    },
    "context": {
      "setting": "",
      "policies_or_rules": [],
      "cultural_factors": [],
      "constraints_global": [],
      "confidence": 0.0
    },
    "goals": {
      "user_goal": "",
      "others_goals": [],
      "alignment_window": "",
      "confidence": 0.0
    },
    "evidence_digest": {
      "key_quotes": [],
      "contradiction_examples": [],
      "omissions_or_unknowns": [],
      "source_artifacts": { "has_pasted_text": false, "screenshot_count": 0 }
    },
    "go_no_go": "",        // optional boundary for "not today"
    "cadence": "",         // next touchpoint/cadence guidance
    "coverage": {
      "fields": {},
      "overall": 0.0,
      "followups": []
    }
  }
  
  Return only JSON.
        `;
  
        // Use your existing endpoint; keep server untouched
        const r = await fetch('http://127.0.0.1:5506/api/chatgpt', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        const data = await r.json();
        if (!data || !data.response) throw new Error('No response');
  
        const osd = this.ensureJson(data.response);
        // Compute/normalize overall coverage locally (non-intrusive)
        osd.coverage = osd.coverage || { fields: {}, overall: 0, followups: [] };
        osd.coverage.overall = this.computeOverall(osd.coverage.fields);
  
        // Stamp IDs if missing
        const now = new Date().toISOString();
        osd.ids = osd.ids || {};
        osd.ids.scenarioId = osd.ids.scenarioId || crypto?.randomUUID?.() || ('scn_' + Date.now());
        osd.ids.createdAt = osd.ids.createdAt || now;
  
        localStorage.setItem('objectiveScenarioDossier', JSON.stringify(osd));
        this.renderMini(osd);
        this.btnView?.setAttribute('style', '');
        this.btnRebuild?.setAttribute('style', '');
        this.toast('OSD built.');
      } catch (e) {
        console.error('[OSD] build error:', e);
        this.toast('Could not build OSD.');
      } finally {
        if (spinner) spinner.style.display = 'none';
        if (label) label.textContent = isRebuild ? 'Rebuild' : 'Build OSD';
      }
    },
  
    ensureJson(text) {
      // Strict JSON parsing (strip accidental fences)
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      const raw = (start >= 0 && end > start) ? text.slice(start, end + 1) : text;
      return JSON.parse(raw);
    },
  
    computeOverall(fieldsObj) {
      const entries = Object.entries(fieldsObj || {});
      if (!entries.length) return 0;
      // Weighted by priority if provided; default weight 1
      let num = 0, den = 0;
      for (const [, v] of entries) {
        const score = typeof v.score === 'number' ? v.score : 0;
        const w = typeof v.priority === 'number' ? v.priority : 1;
        num += score * w; den += w;
      }
      const overall = den ? num / den : 0;
      return Math.max(0, Math.min(1, overall));
    },
  
    renderMini(osd) {
      if (!this.osdMini) return;
      this.osdMini.style.display = '';
      if (this.coverageOverall) this.coverageOverall.textContent = `${Math.round((osd.coverage?.overall || 0) * 100)}%`;
      if (this.gaps) {
        this.gaps.innerHTML = '';
        const fields = osd.coverage?.fields || {};
        Object.entries(fields)
          .filter(([, v]) => (v?.gap || '') && (typeof v.score === 'number' && v.score < 0.7))
          .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0))
          .slice(0, 6)
          .forEach(([k, v]) => {
            const chip = document.createElement('span');
            chip.className = 'style-tag'; // reuse tag style
            chip.textContent = `${k.replace(/\./g, ' → ')}: ${v.gap}`;
            this.gaps.appendChild(chip);
          });
      }
      if (this.followupsWrap) {
        const items = osd.coverage?.followups || [];
        if (!items.length) {
          this.followupsWrap.innerHTML = '';
        } else {
          this.followupsWrap.innerHTML = `
            <div><strong>Follow‑ups (AI‑proposed):</strong></div>
            <ul style="margin:0.25rem 0 0 1rem;">
              ${items.slice(0,3).map(f => `<li>${f.question}</li>`).join('')}
            </ul>
          `;
        }
      }
    },
  
    toast(msg, duration = 2200) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(() => t.remove(), duration);
    }
  };
  

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
 
