/****************************************************
 * server.js - Node + Express for CommuniCoach
 *
 * Includes:
 *  - /api/chatgpt => Processes user’s raw narrative 
 *    and refines it into first-person text using
 *    your tone guidance instructions
 *  - /api/edit    => Optional text refinement endpoint
 *  - /session     => Ephemeral route for Realtime (new doc approach)
 ****************************************************/
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5506;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

if (!OPENAI_API_KEY) {
  console.error('OpenAI API key missing from .env');
  process.exit(1);
}

// CORS for your front-end on 127.0.0.1:5507
app.use(cors({
  origin: [
    'http://127.0.0.1:5507',
    'http://localhost:5507'
  ],
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

app.use(express.json());


/****************************************************
 * /api/chatgpt => processes the user’s raw text
 * with custom tone guidance to produce
 * a refined, first-person narrative
 ****************************************************/
app.post('/api/chatgpt', async (req, res) => {
  try {
    const { prompt, selectedTones } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt must be a non-empty string' });
    }

    // Build the tone guidance string from user’s selection
    let toneGuidanceText = 'No specific tone guidance provided.';
    if (selectedTones && Array.isArray(selectedTones) && selectedTones.length > 0) {
      // If you stored a single string of combined tone guidance, 
      // or an array of lines, combine them here
      toneGuidanceText = selectedTones.join('\n');
    }

    // This system message ensures we preserve the user’s “first-person narrative” instructions
    const systemMsg = `
You are transforming the user's raw, emotionally vulnerable thoughts into a refined first-person narrative. 
You speak **as the user**—never from an external point of view.

Your goal is not just to organize their thoughts, but to help them uncover meaning, clarity, and self-compassion. This is not editing. It is alchemy.

Use the following principles:

1. Preserve the speaker’s authentic voice and emotional depth.
2. Organize chaotic, fragmented, or nonlinear thoughts into a natural, coherent flow—without over-sanitizing or simplifying.
3. Retain specific memories or personal details that carry emotional weight.
4. Allow contradictions, grief, anger, or longing to coexist without judgment.
5. Surface **latent emotional truths**—ideas that were implied but not fully spoken—gently and insightfully.
6. Reflect emotional and psychological patterns that the user may not have consciously named.
7. Add structure only when it enhances clarity or self-understanding. Never flatten nuance.

TONE GUIDANCE:
${toneGuidanceText}

The final result should feel like the same person speaking—but as if they had just taken a deep breath, seen themselves clearly, and found the exact words they didn’t know they needed.
`;


    const resp = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4000,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiText = resp.data?.choices?.[0]?.message?.content?.trim() || '(No response)';
    return res.json({ response: aiText });

  } catch (err) {
    console.error('[/api/chatgpt] error:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to communicate with GPT-4',
      details: err.message
    });
  }
});


/****************************************************
 * /api/edit => optional refinement or partial edits
 ****************************************************/
app.post('/api/edit', async (req, res) => {
  try {
    const { prompt, editInstruction } = req.body;
    if (!prompt || !editInstruction) {
      return res.status(400).json({ error: 'Prompt & editInstruction required' });
    }

    // You can keep it simpler here, or also embed some portion
    // of the refinement instructions if wanted.
    const systemMsg = `You are a communication coach. The user wants: ${editInstruction}
`;

    const r = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemMsg },
          {
            role: 'user',
            content: `Original text: ${prompt}\n\nPlease apply the edit instruction above.`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const edited = r.data.choices?.[0]?.message?.content?.trim() || '(No edit)';
    return res.json({ response: edited });

  } catch (err) {
    console.error('[/api/edit] error:', err.response?.data || err.message);
    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
});

/****************************************************
 * /api/osd => builds an Objective Scenario Dossier (JSON only)
 ****************************************************/
app.post('/api/osd', async (req, res) => {
  try {
    const {
      rawNarrative = '',
      refinedNarrative = '',
      goal = '',
      pastedText = ''
    } = req.body || {};

    const systemMsg = `You are an analyst generating a structured "Objective Scenario Dossier" (OSD).
Return STRICT JSON only (no markdown fences, no prose outside the JSON). 
Use keys exactly as provided. All confidence values are 0.0–1.0 numbers. 
Only include followups if coverage is low.`;

    const userMsg = `
From the following inputs, create an OSD that matches this schema exactly:

{
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
  "coverage": {
    "fields": {},
    "overall": 0.0,
    "followups": []
  }
}

INPUTS:
- RAW: ${rawNarrative}
- REFINED: ${refinedNarrative}
- GOAL: ${goal}
- PASTED: ${pastedText}

COVERAGE RULES:
- Populate coverage.fields with ~5–10 salient keys (e.g., "actors.styles.baseline") each as:
  { "score": 0..1, "gap": "", "priority": 1..4 }.
- Compute "coverage.overall" as the weighted average (priority = weight).
- Include "gap" when something is unknown/unclear (short and specific).
- Add "followups" only if coverage.overall < 0.8 OR any priority-4 field < 0.7. Max 3 followups.
- Keep questions short/specific with "field" and "expected_answer_type".
`;

    const r = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1',
        temperature: 0.3,
        max_tokens: 1400,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: userMsg }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let text = r.data?.choices?.[0]?.message?.content?.trim() || '{}';
    // Strip markdown fences defensively
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/,'').trim();
    }

    const osd = JSON.parse(text);
    return res.json({ osd });

  } catch (err) {
    console.error('[/api/osd] error:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to build OSD',
      details: err.message
    });
  }
});

/****************************************************
 * GET /session => ephemeral Realtime token (WebRTC)
 ****************************************************/
app.get('/session', async (req, res) => {
  console.log('[/session] ephemeral token request...');
  try {
    const openaiResp = await axios.post(
      'https://api.openai.com/v1/realtime/sessions',
      {
        model: 'gpt-4o-realtime-preview',   // ✅ Fixed model name
        voice: 'verse',
        modalities: ['audio', 'text']
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1',
          'Content-Type': 'application/json'
        }
      }
    );

    const data = openaiResp.data || {};
    return res.json({
      model: data.model,  // This will now be the correct model name
      client_secret: { 
        value: data?.client_secret?.value,
        expires_at: data?.client_secret?.expires_at,
        expires_in: data?.client_secret?.expires_in
      }
    });
  } catch (err) {
    console.error('[/session] ephemeral error:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Failed to create ephemeral session',
      details: err.message
    });
  }
});


/****************************************************
 * Start server
 ****************************************************/
app.listen(PORT, () => {
  console.log(`CommuniCoach server listening on http://localhost:${PORT}`);
});



