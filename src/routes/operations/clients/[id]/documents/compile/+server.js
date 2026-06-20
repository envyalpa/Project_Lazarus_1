import { loadConfig, defaults } from '$lib/server/engine-config.js';
import { getClientDossierMarkdown } from '$lib/server/documents-helper.js';
import { getBrandById } from '$lib/server/brand-helper.js';

export async function POST({ params, request }) {
  const clientId = Number(params.id);
  if (!clientId) {
    return Response.json({ error: 'Client ID is required' }, { status: 400 });
  }

  try {
    const { prompt, history, brandId, currentDocument, planStep, stage, persona, mode } = await request.json();
    console.log('[COMPILE API] Received payload:', { stage, planStep, persona, mode });
    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const config = loadConfig();
    const rawProvider = config.agentProvider || 'gemini';
    const rawModel = config.agentModel || 'models/gemini-1.5-flash';
    const provider = rawProvider === 'gemini' ? 'google' : rawProvider;
    const model = rawModel;
    const apiKey = provider === 'google' ? config.googleApiKey
      : provider === 'nvidia' ? config.nvidiaApiKey
      : provider === 'openrouter' ? config.openrouterApiKey
      : provider === 'groq' ? config.groqApiKey
      : provider === 'opencode' ? config.opencodeApiKey
      : config.deepseekApiKey;

    if (!apiKey) {
      return Response.json({ error: `API Key for ${provider} is not configured in settings.` }, { status: 400 });
    }

    // Determine current stage, maintaining backward compatibility
    let currentStage = stage;
    if (!currentStage) {
      currentStage = planStep ? 'plan' : 'execute';
    }

    // Format chat history context for the LLM
    let historyPrompt = '';
    if (history && history.length > 0) {
      historyPrompt = history.map(msg => `${msg.role === 'user' ? 'COMMANDER' : 'EDI'}: ${msg.content}`).join('\n\n');
    }

    // 1. Gather dossier context
    const dossierMarkdown = getClientDossierMarkdown(clientId);

    // 2. Gather brand guidelines
    let brandPrompt = 'No specific brand styling guidelines are active. Output clean, neutral markdown.';
    if (brandId) {
      const brand = getBrandById(Number(brandId));
      if (brand) {
        const colors = JSON.parse(brand.colors_json || '{}');
        const typo = JSON.parse(brand.typography_json || '{}');
        brandPrompt = `Follow these corporate Brand styling constraints:
- Company Brand: ${brand.profile_name}
- Brand Colors: Primary=${colors.primary || '#00d4ff'}, Secondary=${colors.secondary || '#0088ff'}, Background=${colors.background || '#ffffff'}
- Fonts & Typography: Headings=${typo.headingFont || 'Arial'}, Body=${typo.bodyFont || 'Arial'}
- Tables: Header background=${colors.tableHeaderBg || colors.primary}, borders=${colors.tableBorder || '#cccccc'}

Do NOT inject Normandy LifeOS styles (no glowing outline panels or cyan icons) in the generated content. Focus strictly on corporate design consistency for ${brand.profile_name}.`;
      }
    }

    // 3. Define prompt constraints based on the new pipeline
    let systemPrompt = '';
    let userPrompt = '';

    const activePersona = persona || 'consulting';
    let role = '';
    let instruction = '';

    switch (activePersona) {
      case 'marketing':
        role = "World-Class Growth Marketing Expert and Brand Strategist";
        instruction = "Your tone is energetic, persuasive, concise, and heavily focused on ROI, customer psychology, and acquisition channels. Focus on clear value propositions, conversion hooks, metrics, and growth. Avoid generic buzzwords and clichés (like 'in today's digital landscape'). Suggest customer-facing channels, advertising campaigns, content marketing ideas, and branding touchpoints.";
        break;
      case 'reports':
        role = "Lead Business Analyst and Corporate Reporter";
        instruction = "Your tone is dry, extremely precise, objective, and data-driven. Lead with BLUF (Bottom Line Up Front), presenting clear summaries, factual insights, and data-backed performance metrics. Use crisp tables, numerical breakdowns, and concise bullet points. Avoid assumptions and editorializing.";
        break;
      case 'technical':
        role = "Lead Technical Architect and Systems Engineer";
        instruction = "Your tone is analytical, precise, systematic, and developer-friendly. Prioritize technical architectures, clean code conventions, system designs, scalability trade-offs (e.g. latency vs. cost vs. security), concrete data models, schemas, and API definitions. Use markdown code snippets and Mermaid.js diagrams to explain layouts.";
        break;
      case 'operations':
        role = "Operations Architect and Process Engineer";
        instruction = "Your tone is clear, highly instructional, direct, and action-oriented. Focus on creating step-by-step procedures, using imperative active verbs (e.g., Click, Enter, Verify, Select). Include prerequisite checklists, roles and responsibilities, versioning, and clear troubleshooting sections.";
        break;
      case 'pm':
        role = "Principal Product Manager and UX Strategist";
        instruction = "Your tone is user-centric, outcome-oriented, and collaborative. Focus on defining clear user personas, user stories (As a... I want to... So that...), acceptance criteria, wireframe descriptions, functional requirements, and feature prioritization matrices.";
        break;
      case 'legal':
        role = "Corporate Legal and Compliance Counsel";
        instruction = "Your tone is highly formal, conservative, analytical, and risk-averse. Focus on legal compliance, risk identification, liability mitigation, defining clear scopes of work, terms of service, and explicit contractual clauses. Prioritize ambiguity reduction and formal definitions.";
        break;
      case 'consulting':
      default:
        role = "Principal Strategy Consultant and Business Architect";
        instruction = "Your tone is authoritative, highly structured, objective, and boardroom-ready. Organize insights MECE (Mutually Exclusive, Collectively Exhaustive) and present logical strategic arguments. Focus on high-level operational strategy, market positioning, competitive advantages, resource allocation, and risk mitigation.";
        break;
    }

    const isCustomDraftingPrompt = config.documentDraftingPrompt && config.documentDraftingPrompt !== defaults.documentDraftingPrompt;

    if (currentStage === 'recon') {
      systemPrompt = `You are EDI, the Normandy lifeOS onboard AI.
Analyze the raw client dossier and find any matching records, projects, tasks, timeline events, or meeting notes based on the Commander's query.
You MUST respond with a JSON object (no markdown, no backticks, no other text):
{
  "items": [
    {
      "id": "1",
      "title": "e.g. Meeting Note: Daily Standup (12/06)",
      "content": "e.g. Discussed roadmap timelines and marketing setup."
    }
  ]
}`;

      userPrompt = `Client Dossier:
${dossierMarkdown}

Prior Q&A history:
${historyPrompt || 'None'}

Commander's query:
"${prompt}"

Please find matching items and list them in the JSON format:`;

    } else if (currentStage === 'define_templates') {
      systemPrompt = `You are EDI, the Normandy lifeOS onboard AI.
Analyze the selected dossier context and propose 3 to 4 document templates that would be highly relevant to build.
For each template, provide a name, a detailed description, and an icon recommendation.
Icon recommendation MUST be one of: "FileText", "ClipboardList", "BookOpen", "PenTool", "FileCode", "TrendingUp".
You MUST respond with a JSON object (no markdown, no backticks, no other text):
{
  "templates": [
    {
      "name": "e.g. Scoping Document",
      "desc": "e.g. Detailed breakdown of deliverables and architecture based on recent notes.",
      "icon": "FileText"
    }
  ]
}`;

      userPrompt = `Selected Dossier Context:
${prompt}

Propose matching templates in JSON format:`;

    } else if (currentStage === 'plan') {
      systemPrompt = `You are EDI, the Normandy onboard AI, acting as a ${role} for Q4.
Your goal is to guide the user through a structured requirements elicitation process to forge a high-impact document.

CRITICAL RULES:
1. PERSONA: Act as an active strategic advisor, not a passive scribe. ${instruction}
2. FACTS: Extract all background facts, operational roles, channels, and workflows directly from the Client Dossier. Only ask clarifying questions when information is missing, ambiguous, or directly contradictory.
3. CONSTRAINTS: Do not ask questions about list styling, markdown formatting, font choices, or layout details. Focus entirely on business objectives, scope boundaries, and operational rules.
4. TERMINATION: Limit the entire Q&A loop to a maximum of 3 questions. If you have enough info to draft a complete, detailed document or have reached the 3-question limit, you MUST set "done" to true.

You MUST respond ONLY with a JSON object (no markdown, no backticks, no other text):
{
  "question": "The next strategic question (empty if done)",
  "options": [
    "Option A (e.g. Option...)",
    "Option B (e.g. Option...)"
  ],
  "done": false
}`;

      userPrompt = `Client Dossier:
${dossierMarkdown}

Prior Q&A history:
${historyPrompt || 'None'}

Commander's response:
"${prompt}"

Generate the next question and options in JSON:`;

    } else if (currentStage === 'execute') {
      systemPrompt = isCustomDraftingPrompt ? config.documentDraftingPrompt : `You are the Q4 Document Design Engine, acting as a ${role}.
Draft the final document based on the dossier, brand guidelines, and user answers.
Follow these writing guidelines:
${instruction}

CRITICAL FORMATTING & LENGTH RULES:
1. STRICT FORMAT AND LENGTH: You MUST strictly adhere to the format, length, and style requested by the user in their prompt. If the user asks for a simple list, a concise bulleted list, a simple table, or a short summary, do NOT generate extensive documents, strategic summaries, outcomes, or extra sections.
2. USER INSTRUCTION OVERRIDES PERSONA: The user's specific formatting or simplicity request overrides the general persona style. For example, if you are acting as a Marketing Expert but the user asks for a 'simple list', do NOT write full paragraphs of marketing theory or strategic roadmaps. Provide ONLY the simple list of items.
3. CONCISENESS: Output only what is requested. Keep it clean and direct.

Output ONLY the raw document text in markdown format. Do NOT include conversational intros or outros.`;

      userPrompt = `Client Dossier:
${dossierMarkdown}

Style Instructions:
${brandPrompt}

Q&A Planning History:
${historyPrompt || 'None'}

Approved context/plan:
"${prompt}"

Draft the final document now:`;

    } else { // 'refine'
      const activeMode = mode || 'edit';
      if (activeMode === 'plan') {
        systemPrompt = `You are EDI, the Normandy onboard AI, acting as a ${role} in Plan Mode.
Your goal is ONLY to plan the document structure, outline, details, and sections with the Commander.
Do NOT output the full document content, and do NOT perform large drafts.
Focus entirely on outlining concepts, defining sections, listing action items, or discussing content additions.

CRITICAL CONSTRAINTS:
1. RESPONSE LENGTH: Your responses MUST be extremely concise and direct (1-3 lines, maximum of 5 lines in the chat pane).
2. OUTPUT TYPE: Discuss what needs to be changed, added, or removed, and help the user clarify ideas.

Output your strategic planning reply in a conversational tone.`;
      } else {
        systemPrompt = isCustomDraftingPrompt ? config.documentDraftingPrompt : `You are the Q4 Document Design Engine, acting as a ${role} in Edit Mode.
You must update, edit, refine, or rewrite the document blocks based on the user's instructions.
Your response in the chat pane should explain the edit briefly, while the main work is produced in the Editor area.

CRITICAL CONSTRAINTS:
1. RESPONSE LENGTH: Keep your conversational response in the chat pane brief (3-5 lines maximum).
2. EDITING FORMAT: Generate the updated document in markdown format.

Output ONLY the full updated document copy in markdown format. Do NOT include conversational intros or outros in the document body itself.`;
      }

      userPrompt = `Client Dossier context:
${dossierMarkdown}

Style Instructions:
${brandPrompt}

Current Document Copy:
${currentDocument || 'None'}

Refinement instruction:
"${prompt}"

Generate the full updated document now:`;
    }

    console.log('[COMPILE API] Active systemPrompt:', systemPrompt);

    // 4. Interface with LLM APIs for streaming
    if (provider === 'google') {
      const cleanModelName = model.startsWith('models/') ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:streamGenerateContent?key=${apiKey}`;
      
      const contents = [{
        role: 'user',
        parts: [{ text: userPrompt }]
      }];

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: config.agentTemperature !== undefined ? config.agentTemperature : 0.7
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Google API returned status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              
              const textRegex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
              let match;
              let lastIndex = 0;
              
              while ((match = textRegex.exec(buffer)) !== null) {
                let text = match[1];
                try {
                  text = JSON.parse(`"${text}"`);
                } catch (e) {}
                controller.enqueue(new TextEncoder().encode(text));
                lastIndex = textRegex.lastIndex;
              }
              
              if (lastIndex > 0) {
                buffer = buffer.slice(lastIndex);
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });

    } else if (provider === 'nvidia') {
      // NVIDIA Streaming (OpenAI-compatible SSE)
      const url = (config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '') + '/chat/completions';
      const bodyPayload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        temperature: config.agentTemperature !== undefined ? config.agentTemperature : 0.7
      };
      if (model === 'google/diffusiongemma-26b-a4b-it') {
        bodyPayload.chat_template_kwargs = { enable_thinking: true };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        throw new Error(`NVIDIA API returned status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.startsWith('data: ')) {
                  const dataStr = cleanLine.slice(6);
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const text = parsed.choices?.[0]?.delta?.content || '';
                    if (text) {
                      controller.enqueue(new TextEncoder().encode(text));
                    }
                  } catch (e) {}
                }
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });

    } else if (provider === 'openrouter' || provider === 'groq') {
      const urlBase = provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.groq.com/openai/v1';
      const res = await fetch(`${urlBase}/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true,
          temperature: config.agentTemperature !== undefined ? config.agentTemperature : 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`${provider.toUpperCase()} API returned status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.startsWith('data: ')) {
                  const dataStr = cleanLine.slice(6);
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const text = parsed.choices?.[0]?.delta?.content || '';
                    if (text) {
                      controller.enqueue(new TextEncoder().encode(text));
                    }
                  } catch (e) {}
                }
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });

    } else if (provider === 'opencode') {
      const url = (config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1').replace(/\/+$/, '') + '/chat/completions';
      const bodyPayload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        temperature: config.agentTemperature !== undefined ? config.agentTemperature : 0.7
      };
      if (config.agentVariant) bodyPayload.reasoning_effort = config.agentVariant;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        throw new Error(`OpenCode Go API returned status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.startsWith('data: ')) {
                  const dataStr = cleanLine.slice(6);
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const text = parsed.choices?.[0]?.delta?.content || '';
                    if (text) {
                      controller.enqueue(new TextEncoder().encode(text));
                    }
                  } catch (e) {}
                }
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });

    } else {
      // DeepSeek Streaming
      const url = 'https://api.deepseek.com/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: true,
          temperature: config.agentTemperature !== undefined ? config.agentTemperature : 0.7
        })
      });

      if (!res.ok) {
        throw new Error(`DeepSeek API returned status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                const cleanLine = line.trim();
                if (cleanLine.startsWith('data: ')) {
                  const dataStr = cleanLine.slice(6);
                  if (dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const text = parsed.choices?.[0]?.delta?.content || '';
                    if (text) {
                      controller.enqueue(new TextEncoder().encode(text));
                    }
                  } catch (e) {}
                }
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

  } catch (error) {
    console.error('Error compiling document:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
