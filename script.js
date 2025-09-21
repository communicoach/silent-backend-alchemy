// Store page-specific functionality in objects
const pages = {
  toneSelection: {
    init() {
      this.setupToneSelector();
    },

    setupToneSelector() {
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
          console.log('Selected Tones:', selectedTones);
        });
      });
    }
  },

  situationRoom: {
    init() {
      this.setupInfoCards();
      this.setupSpeechRecognition();
    },

    setupInfoCards() {
      const infoCards = document.querySelectorAll('.info-card');
      infoCards.forEach(card => {
        card.addEventListener('click', () => {
          card.classList.toggle('active');
        });
      });
    },

    setupSpeechRecognition() {
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
        if (isRecognizing) {
          recognition.stop();
        } else {
          recognition.start();
        }
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
          if (event.results[i].isFinal) {
            finalTranscript += ' ' + transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        textarea.value = finalTranscript + interimTranscript;
        console.log('Updated textarea with transcription');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isRecognizing = false;
        micIcon.classList.remove('listening');
      };
    }
  },

  refinedNarrative: {
    init() {
      this.initializeNarrative();
      this.setupToneControls();
      this.setupEditButtons();
    },

    initializeNarrative() {
      const narrativeContent = document.getElementById('narrativeContent');
      if (narrativeContent) {
        const refinedNarrative = localStorage.getItem('refinedNarrative');
        narrativeContent.textContent = refinedNarrative || 'Your refined narrative will appear here after processing.';
      }
    },

    setupToneControls() {
      const toneControl = document.querySelector('.tone-control');
      if (!toneControl) return;

      this.updateToneDisplay();
    },

    updateToneDisplay() {
      console.log('Updating tone display');
    },

    setupEditButtons() {
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
            editInstruction: 'Coach edit request'
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
        'Simplify language',
        'Add positivity',
        'Make it more formal',
        'Add humor'
      ];

      const selectedEdit = prompt('Select a Quick Edit: ' + editOptions.join(', '));
      if (!selectedEdit || !editOptions.includes(selectedEdit)) return;

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
    },

    enableInlineEdit() {
      const narrativeContent = document.getElementById('narrativeContent');
      if (!narrativeContent) {
        console.log('Narrative content element not found');
        return;
      }

      narrativeContent.contentEditable = true;
      narrativeContent.focus();
      narrativeContent.style.border = '2px solid var(--accent-color)';
      this.showFeedback('Editing enabled - Click outside to save');

      const saveChanges = (event) => {
        if (!narrativeContent.contains(event.target)) {
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
  },

  // ===== Action Arena: Objective Scenario Dossier (OSD) =====
  actionArena: {
    key: 'objectiveScenarioDossier',

    init() {
      this.cacheElements();
      if (!this.els.section) return;
      this.wireEvents();
      this.hydrateExisting();

      // Make OSD globally readable by exercises
      window.getOSD = () => this.get();
    },

    cacheElements() {
      this.els = {
        section: document.getElementById('osdSection'),
        mini: document.getElementById('osdMini'),
        overall: document.getElementById('osdCoverageOverall'),
        gaps: document.getElementById('osdGaps'),
        followups: document.getElementById('osdFollowupsWrap'),
        buildBtn: document.getElementById('buildOsdBtn'),
        rebuildBtn: document.getElementById('rebuildOsdBtn'),
        viewBtn: document.getElementById('viewOsdBtn'),
        modal: document.getElementById('osdModal'),
        modalJson: document.getElementById('osdJson'),
        saveBtn: document.getElementById('saveOsdBtn'),
        closeBtn: document.getElementById('closeOsdBtn')
      };
    },

    wireEvents() {
      this.els.buildBtn?.addEventListener('click', () => this.buildOSD('build'));
      this.els.rebuildBtn?.addEventListener('click', () => this.buildOSD('rebuild'));
      this.els.viewBtn?.addEventListener('click', () => this.openModal());
      this.els.saveBtn?.addEventListener('click', () => this.saveFromModal());
      this.els.closeBtn?.addEventListener('click', () => this.closeModal());

      if (this.els.modal) {
        this.els.modal.addEventListener('click', (event) => {
          if (event.target === this.els.modal) this.closeModal();
        });
      }
    },

    hydrateExisting() {
      const existing = this.get();
      const goal = localStorage.getItem('communicationGoal') || '';

      if (existing) {
        this.renderMini(existing);
        this.toggleBuiltUI(true);
      } else if (goal) {
        this.buildOSD('build');
      }
    },

    get() {
      try {
        return JSON.parse(localStorage.getItem(this.key) || 'null');
      } catch (error) {
        console.warn('[OSD] unable to parse saved OSD', error);
        return null;
      }
    },

    set(osd) {
      localStorage.setItem(this.key, JSON.stringify(osd));
      if (osd?.coverage?.overall != null) {
        localStorage.setItem('osdCoverageOverall', String(osd.coverage.overall));
      }
    },

    toggleBuiltUI(isBuilt) {
      if (!this.els.buildBtn || !this.els.rebuildBtn || !this.els.viewBtn) return;
      this.els.buildBtn.style.display = isBuilt ? 'none' : 'inline-flex';
      this.els.rebuildBtn.style.display = isBuilt ? 'inline-flex' : 'none';
      this.els.viewBtn.style.display = isBuilt ? 'inline-flex' : 'none';
      if (this.els.mini) this.els.mini.style.display = isBuilt ? 'block' : 'none';
    },

    openModal() {
      const osd = this.get();
      if (!osd || !this.els.modal || !this.els.modalJson) return;
      this.els.modalJson.textContent = JSON.stringify(osd, null, 2);
      this.els.modal.style.display = 'flex';
    },

    closeModal() {
      if (this.els.modal) this.els.modal.style.display = 'none';
    },

    saveFromModal() {
      if (!this.els.modalJson) return;
      try {
        const parsed = JSON.parse(this.els.modalJson.textContent);
        this.set(parsed);
        this.renderMini(parsed);
        this.closeModal();
        this.toast('OSD saved.');
      } catch (error) {
        console.error('[OSD] invalid JSON from modal', error);
        this.toast('Invalid JSON — not saved.', true);
      }
    },

    setButtonState(btn, isLoading, busyText) {
      if (!btn) return;
      btn.disabled = isLoading;
      btn.classList.toggle('disabled', isLoading);
      const spinner = btn.querySelector('.spinner');
      if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';

      const labelEl = btn.querySelector('.label');
      if (labelEl) {
        if (!labelEl.dataset.defaultText) {
          labelEl.dataset.defaultText = labelEl.textContent;
        }
        if (isLoading && busyText) {
          labelEl.textContent = busyText;
        } else {
          labelEl.textContent = labelEl.dataset.defaultText;
        }
      } else if (busyText) {
        if (!btn.dataset.defaultText) {
          btn.dataset.defaultText = btn.textContent;
        }
        if (isLoading) {
          btn.textContent = busyText;
        } else {
          btn.textContent = btn.dataset.defaultText;
        }
      }
    },

    async buildOSD(mode = 'build') {
      const triggerBtn = mode === 'rebuild' ? this.els.rebuildBtn : this.els.buildBtn;
      this.setButtonState(triggerBtn, true, mode === 'rebuild' ? 'Rebuilding…' : 'Building…');

      try {
        const refined = localStorage.getItem('refinedNarrative') || '';
        const goal = localStorage.getItem('communicationGoal') || '';
        const raw = localStorage.getItem('rawNarrative') || '';
        const pasted = localStorage.getItem('pastedText') || '';
        const partner = localStorage.getItem('conversationPartner') || '';
        const medium = localStorage.getItem('conversationMedium') || '';

        const osd = this.seedOSD({ refined, goal, raw, pasted, partner, medium });
        osd.coverage = this.computeCoverage(osd, { refined, goal, raw, pasted, partner, medium });
        osd.coverage.followups = await this.generateFollowups(osd, { refined, goal, pasted });

        this.set(osd);
        this.renderMini(osd);
        this.toggleBuiltUI(true);
        this.toast('OSD built.');
      } catch (error) {
        console.error('[OSD] build failed:', error);
        this.toast('Could not build OSD. Check console.', true);
      } finally {
        this.setButtonState(triggerBtn, false);
      }
    },

    seedOSD(ctx) {
      const userActor = {
        name: 'User',
        role: 'self',
        goals: ctx.goal ? [ctx.goal] : [],
        constraints: [],
        style_baseline: '',
        style_variants: [],
        boundaries: [],
        levers: [],
        triggers: [],
        confidence: 0.0
      };

      const otherActor = {
        name: ctx.partner || 'Other Party',
        role: 'manager|client|partner|family|other',
        goals: [],
        constraints: [],
        style_baseline: '',
        style_variants: [],
        boundaries: [],
        levers: [],
        triggers: [],
        confidence: 0.0
      };

      return {
        summary: {
          situation: (ctx.refined || ctx.raw || '').slice(0, 400),
          timeline: '',
          stakes: '',
          facts_vs_inferences: { facts: [], inferences: [] }
        },
        actors: [userActor, otherActor],
        dynamics: {
          power_balance: '',
          frictions: [],
          misalignments: [],
          trust_level: '',
          repair_paths: [],
          risk_map: [],
          opportunity_map: [],
          confidence: 0.0
        },
        context: {
          setting: ctx.medium || '',
          policies_or_rules: [],
          cultural_factors: [],
          constraints_global: [],
          confidence: 0.0
        },
        goals: {
          user_goal: ctx.goal || '',
          others_goals: [],
          alignment_window: '',
          confidence: 0.0
        },
        evidence_digest: {
          key_quotes: [],
          contradiction_examples: [],
          omissions_or_unknowns: [],
          source_artifacts: {
            has_pasted_text: Boolean(ctx.pasted && ctx.pasted.trim().length),
            screenshot_count: 0
          }
        },
        coverage: { fields: {}, overall: 0.0, followups: [] }
      };
    },

    computeCoverage(osd, ctx) {
      const fields = {};
      const pct = (value) => Math.max(0, Math.min(1, value));

      const hasOther = Array.isArray(osd.actors) && osd.actors.length >= 2;
      fields['actors.core_identities'] = {
        score: pct(hasOther ? 0.8 : 0.4),
        gap: hasOther ? '' : 'Other Party not specified.',
        priority: 2
      };

      fields['actors.styles.baseline'] = {
        score: 0.3,
        gap: 'Baseline tone(s) not described.',
        priority: 1
      };

      fields['actors.boundaries'] = {
        score: 0.4,
        gap: 'User boundary slips not specified.',
        priority: 2
      };

      fields['dynamics.power_balance'] = {
        score: 0.5,
        gap: 'Power balance unclear.',
        priority: 3
      };

      fields['context.medium'] = {
        score: ctx.medium ? 1.0 : 0.6,
        gap: ctx.medium ? '' : 'Conversation medium not set.',
        priority: 4
      };

      fields['goals.others_goals'] = {
        score: 0.4,
        gap: 'Other party incentives/goals unclear.',
        priority: 2
      };

      fields['evidence.key_quotes'] = {
        score: ctx.pasted ? 0.7 : 0.3,
        gap: ctx.pasted ? '' : 'Add at least one direct quote.',
        priority: 3
      };

      const weightedScore = Object.values(fields).map(f => f.score * f.priority).reduce((a, b) => a + b, 0);
      const totalPriority = Object.values(fields).reduce((a, f) => a + f.priority, 0) || 1;
      const overall = pct(weightedScore / totalPriority);

      return { fields, overall, followups: [] };
    },

    async generateFollowups(osd, ctx) {
      const low = Object.entries(osd.coverage.fields)
        .filter(([, meta]) => meta.score < 0.6)
        .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0))
        .slice(0, 3)
        .map(([field, meta]) => ({ field, gap: meta.gap || '' }));

      if (!low.length) return [];

      const prompt = `You are a communication analyst. Given this OSD context (summary + goals) and the coverage gaps below,\nreturn ONLY a compact JSON array (no prose) of 1-3 follow-up questions that would best reduce uncertainty.\n\nOSD Summary: ${JSON.stringify({ situation: osd.summary.situation, goal: osd.goals.user_goal }).slice(0, 2000)}\nCoverage Gaps: ${JSON.stringify(low)}\n\nEach item MUST be: { "field": "<fieldKey>", "question": "<short question>", "expected_answer_type": "short_text|short_text_or_quote" }.\nReturn valid JSON only.`;

      try {
        const response = await fetch('http://127.0.0.1:5506/api/chatgpt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        const data = await response.json();
        const text = (data && data.response) ? data.response.trim() : '[]';

        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        const json = JSON.parse(text.slice(start, end + 1));
        return Array.isArray(json) ? json.slice(0, 3) : [];
      } catch (error) {
        console.warn('[OSD] API followups failed, using fallback.', error);
        return low.map(item => ({
          field: item.field,
          question: (item.gap && item.gap.length > 8)
            ? item.gap.replace(/\.$/, '?')
            : `Add one detail to clarify: ${item.field}.`,
          expected_answer_type: 'short_text_or_quote'
        }));
      }
    },

    renderMini(osd) {
      if (!this.els.mini) return;

      const coverage = osd.coverage || { overall: 0, fields: {}, followups: [] };
      this.els.mini.style.display = '';
      if (this.els.overall) {
        this.els.overall.textContent = Math.round((coverage.overall || 0) * 100) + '%';
      }

      if (this.els.gaps) {
        this.els.gaps.innerHTML = '';
        Object.entries(coverage.fields)
          .filter(([, meta]) => meta.score < 0.6)
          .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0))
          .slice(0, 6)
          .forEach(([field, meta]) => {
            const chip = document.createElement('span');
            chip.className = 'style-tag';
            chip.textContent = `${field.replace(/\./g, ' → ')}: ${meta.gap}`;
            this.els.gaps.appendChild(chip);
          });
      }

      if (this.els.followups) {
        this.els.followups.innerHTML = '';
        const followups = Array.isArray(coverage.followups) ? coverage.followups.slice(0, 3) : [];
        if (followups.length) {
          const list = document.createElement('ul');
          list.style.margin = '0.25rem 0 0 1rem';
          followups.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item.question;
            list.appendChild(li);
          });

          const heading = document.createElement('div');
          heading.innerHTML = '<strong>Follow-ups (AI-proposed):</strong>';
          this.els.followups.appendChild(heading);
          this.els.followups.appendChild(list);
        }
      }
    },

    toast(message, isError = false) {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'toast' + (isError ? ' error' : '');
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2200);
    }
  }
};

const interfaceToggle = {
  init() {
    this.setupToggle();
  },

  setupToggle() {
    const toggleHTML = `
      <div class="toggle-container">
        <span class="toggle-label">Conversational Interface</span>
        <label class="switch">
          <input type="checkbox" id="interface-toggle">
          <span class="slider round"></span>
        </label>
      </div>
    `;

    const headerElement = document.querySelector('header') || document.body.firstChild;
    if (!headerElement) return;

    const toggleContainer = document.createElement('div');
    toggleContainer.innerHTML = toggleHTML;
    headerElement.appendChild(toggleContainer);

    const toggleButton = document.getElementById('interface-toggle');
    if (!toggleButton) return;

    toggleButton.addEventListener('change', function() {
      const currentInterface = document.getElementById('current-interface');
      const conversationalInterface = document.getElementById('conversational-interface');

      if (this.checked) {
        if (currentInterface) currentInterface.style.display = 'none';
        if (conversationalInterface) conversationalInterface.style.display = 'block';
      } else {
        if (currentInterface) currentInterface.style.display = 'block';
        if (conversationalInterface) conversationalInterface.style.display = 'none';
      }
    });
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
    pages.actionArena.init();
  }

  interfaceToggle.init();

  const conversationalInterface = document.getElementById('conversational-interface');
  if (conversationalInterface) {
    conversationalInterface.style.display = 'none';
    const textarea = conversationalInterface.querySelector('textarea');
    const button = conversationalInterface.querySelector('button');
    const messagesContainer = conversationalInterface.querySelector('.messages-container');

    if (button && textarea && messagesContainer) {
      button.addEventListener('click', function() {
        const text = textarea.value.trim();
        if (!text) return;

        const userMessage = document.createElement('div');
        userMessage.className = 'message user';
        userMessage.innerHTML = `<p>${text}</p>`;
        messagesContainer.appendChild(userMessage);

        textarea.value = '';

        setTimeout(() => {
          const coachMessage = document.createElement('div');
          coachMessage.className = 'message coach';
          coachMessage.innerHTML = '<p>Thank you for sharing that. Could you tell me more about how this situation has been affecting you?</p>';
          messagesContainer.appendChild(coachMessage);
        }, 3000);
      });
    }
  }
});

// Export for use in other files if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = pages;
}
