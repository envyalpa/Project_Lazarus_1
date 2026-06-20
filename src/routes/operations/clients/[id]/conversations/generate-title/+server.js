import { loadConfig } from '$lib/server/engine-config.js';

export async function POST({ request }) {
  try {
    const { messages } = await request.json();
    if (!messages || messages.length === 0) {
      return Response.json({ title: 'New Conversation' });
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
      return Response.json({ title: 'Untitled Conversation' });
    }

    const history = messages.map(m => `${m.role === 'user' ? 'COMMANDER' : 'EDI'}: ${m.content}`).join('\n');
    const systemPrompt = 'You are a conversation title generator. Based on the following discussion between a commander (user) and EDI (AI), generate a concise descriptive title (max 8 words). Reflect the document type and topic. Output ONLY the title text, nothing else. No quotes, no markdown, no prefixes.';
    const userPrompt = `Conversation:\n${history}\n\nGenerate a short title (max 8 words):`;

    let title = 'Untitled Conversation';

    if (provider === 'google') {
      const cleanModelName = model.startsWith('models/') ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelName}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || title;
      }
    } else if (provider === 'nvidia') {
      const url = (config.nvidiaApiBaseUrl || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '') + '/chat/completions';
      const bodyPayload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
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

      if (res.ok) {
        const data = await res.json();
        title = data.choices?.[0]?.message?.content?.trim() || title;
      }
    } else if (provider === 'openrouter') {
      const url = 'https://openrouter.ai/api/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        title = data.choices?.[0]?.message?.content?.trim() || title;
      }
    } else if (provider === 'groq') {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });
      if (res.ok) {
        const data = await res.json();
        title = data.choices?.[0]?.message?.content?.trim() || title;
      }
    } else if (provider === 'opencode') {
      const url = (config.opencodeBaseUrl || 'https://opencode.ai/zen/go/v1').replace(/\/+$/, '') + '/chat/completions';
      const bodyPayload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      };
      if (config.agentVariant) bodyPayload.reasoning_effort = config.agentVariant;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(bodyPayload)
      });
      if (res.ok) {
        const data = await res.json();
        title = data.choices?.[0]?.message?.content?.trim() || title;
      }
    } else {
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
          ]
        })
      });

      if (res.ok) {
        const data = await res.json();
        title = data.choices?.[0]?.message?.content?.trim() || title;
      }
    }

    return Response.json({ title });

  } catch (error) {
    console.error('Error generating title:', error);
    return Response.json({ title: 'Untitled Conversation' });
  }
}
