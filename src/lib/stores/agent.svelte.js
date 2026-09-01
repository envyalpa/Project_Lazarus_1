import { notify } from './notification.js';

class AgentStore {
  open = $state(false);
  messages = $state([]);
  loading = $state(false);
  pathname = $state('/');
  pageData = $state({});
  abortController = null;
  pendingAuthorData = $state(null);
  loadingLabel = $state('EDI is processing data...');
  cardAnimIdx = $state(0);

  getNextCardAnim() {
    const idx = this.cardAnimIdx;
    this.cardAnimIdx = (idx + 1) % 3;
    return idx;
  }

  constructor() {
    this.loadHistory();
  }

  loadHistory() {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.sessionStorage.getItem('edi_agent_messages');
        if (saved) {
          this.messages = JSON.parse(saved);
        } else {
          this.messages = [
            {
              sender: 'edi',
              text: "Hello, Commander. I am EDI, the Normandy's onboard AI. How can I assist you with Operations today?"
            }
          ];
        }

        const savedOpen = window.sessionStorage.getItem('edi_agent_open');
        this.open = savedOpen === 'true';
        return;
      } catch (err) {
        console.error('Failed to load EDI history:', err);
      }
    }
    this.messages = [
      {
        sender: 'edi',
        text: "Hello, Commander. I am EDI, the Normandy's onboard AI. How can I assist you with Operations today?"
      }
    ];
  }

  saveHistory() {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('edi_agent_messages', JSON.stringify(this.messages));
        window.sessionStorage.setItem('edi_agent_open', this.open ? 'true' : 'false');
      } catch (err) {
        console.error('Failed to save EDI history:', err);
      }
    }
  }

  toggle() {
    this.open = !this.open;
    this.saveHistory();
  }

  setContext(pathname, pageData) {
    this.pathname = pathname;
    this.pageData = pageData || {};
  }

  resetChat() {
    this.messages = [
      {
        sender: 'edi',
        text: "Hello, Commander. I am EDI, the Normandy's onboard AI. How can I assist you with Operations today?"
      }
    ];
    this.saveHistory();
    notify("EDI conversation history has been reset.");
  }

  async sendAutoFetch(name, wikiLink) {
    this.open = true;
    this.messages.push({ sender: 'user', text: `Auto-fetch author data for: ${name}` });
    this.saveHistory();
    this.loadingLabel = 'EDI is querying Wikipedia and generating an author summary...';
    this.loading = true;

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_fetch_author', name, wikiLink })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      if (data.success) {
        const foundText = data.found
          ? `I've queried Wikipedia for **${name}** and generated an AI biography summary. Review the information below, then Continue to open the editor or Cancel to dismiss.`
          : `I wasn't able to find a Wikipedia page for **${name}**, but I've generated a biography summary from available sources. You can manually add a wiki link and image in the editor.`;

        this.messages.push({
          sender: 'edi',
          text: foundText,
          proposal: {
            actionType: 'auto_fetch_author',
            data: {
              name,
              summary: data.summary || '',
              image_url: data.image_url || '',
              wiki_link: data.wiki_link || '',
              found: data.found
            },
            status: 'pending'
          }
        });
      } else {
        throw new Error(data.error || 'Auto-fetch failed');
      }
    } catch (err) {
      console.error(err);
      this.messages.push({
        sender: 'edi',
        text: `Error fetching author data: ${err.message}`
      });
    } finally {
      this.loading = false;
      this.saveHistory();
    }
  }

  continueAutoFetch(proposalData, index) {
    const msg = this.messages[index];
    if (msg && msg.proposal) msg.proposal.status = 'confirmed';
    this.messages.push({ sender: 'user', text: 'Continue' });
    this.messages.push({ sender: 'edi', text: 'Opening the editor for your review. Remember to click Save to commit the changes.' });
    this.saveHistory();
    this.pendingAuthorData = {
      name: proposalData.name,
      description: proposalData.summary || '',
      image_url: proposalData.image_url || '',
      wiki_link: proposalData.wiki_link || '',
      color: proposalData.color || '--cyan',
      authorId: proposalData.authorId || null
    };
    if (typeof window !== 'undefined') {
      import('$app/navigation').then(nav => {
        nav.goto('/lounge/books');
      });
    }
  }

  cancelAutoFetch(index) {
    this.cancelProposal(index);
    this.pendingAuthorData = null;
  }

  async sendRegenerate(name, wikiLink, charLimit, existingData) {
    this.open = true;
    this.messages.push({ sender: 'user', text: `Regenerate author summary for: ${name}` });
    this.saveHistory();
    this.loadingLabel = 'EDI is regenerating the author summary...';
    this.loading = true;

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_author_summary', name, wikiLink, charLimit })
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      if (data.success) {
        this.messages.push({
          sender: 'edi',
          text: `I've regenerated the biographical summary for **${name}**. Review below and choose to proceed.`,
          proposal: {
            actionType: 'regenerate_author_summary',
            data: {
              summary: data.summary || '',
              existingData
            },
            status: 'pending'
          }
        });
      } else {
        throw new Error(data.error || 'Regenerate failed');
      }
    } catch (err) {
      console.error(err);
      this.messages.push({
        sender: 'edi',
        text: `Error regenerating author summary: ${err.message}`
      });
    } finally {
      this.loading = false;
      this.saveHistory();
    }
  }

  continueRegenerate(proposalData, index) {
    const msg = this.messages[index];
    if (msg && msg.proposal) msg.proposal.status = 'confirmed';
    this.messages.push({ sender: 'user', text: 'Continue' });
    this.messages.push({ sender: 'edi', text: 'Opening the editor for your review. Remember to click Save to commit the changes.' });
    this.saveHistory();
    const { summary, existingData } = proposalData;
    this.pendingAuthorData = {
      name: existingData.name,
      color: existingData.color || '--cyan',
      description: summary || '',
      image_url: existingData.image_url || '',
      wiki_link: existingData.wiki_link || '',
      authorId: existingData.authorId || null
    };
    if (typeof window !== 'undefined') {
      import('$app/navigation').then(nav => {
        nav.goto('/lounge/books');
      });
    }
  }

  async sendMessage(text) {
    if (!text.trim()) return;

    this.messages.push({ sender: 'user', text });
    this.saveHistory();
    this.loading = true;
    this.abortController = new AbortController();

    // Convert message history to format appropriate for LLM context, merging consecutive roles
    const history = [];
    const rawHistory = this.messages.slice(0, -1);
    for (const m of rawHistory) {
      const role = m.sender === 'user' ? 'user' : 'assistant';
      if (history.length > 0 && history[history.length - 1].role === role) {
        history[history.length - 1].content += '\n\n' + m.text;
      } else {
        history.push({ role, content: m.text });
      }
    }

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse',
          message: text,
          history,
          pathname: this.pathname,
          pageData: this.pageData
        }),
        signal: this.abortController.signal
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      if (data.success && data.response) {
        const reply = data.response;
        this.messages.push({
          sender: 'edi',
          text: reply.explanation || "Action parsed.",
          proposal: (reply.action && reply.action !== 'chat' && (!reply.missing_fields || reply.missing_fields.length === 0)) ? {
            actionType: reply.action,
            data: reply.data,
            status: 'pending'
          } : null
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // already handled
      }
      console.error(err);
      this.messages.push({
        sender: 'edi',
        text: `Error processing command: ${err.message}`
      });
    } finally {
      this.abortController = null;
      this.loading = false;
      this.saveHistory();
    }
  }

  stopProcessing() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.loading = false;
    this.messages.push({
      sender: 'edi',
      text: "Request cancelled by Commander."
    });
    this.saveHistory();
  }

  deleteMessage(index) {
    this.messages = this.messages.filter((_, idx) => idx !== index);
    this.saveHistory();
  }

  async retriggerFrom(index, newText) {
    this.messages = this.messages.slice(0, index + 1);
    this.messages[index].text = newText;
    this.saveHistory();

    // Pop the edited user message and re-run via sendMessage
    this.messages.pop();
    await this.sendMessage(newText);
  }

  async confirmProposal(index) {
    const msg = this.messages[index];
    if (!msg || !msg.proposal) return;

    this.loading = true;
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'commit',
          commitAction: msg.proposal.actionType,
          data: msg.proposal.data
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const result = await res.json();
      if (result.success) {
        msg.proposal.status = 'confirmed';
        this.messages.push({
          sender: 'user',
          text: "Confirm"
        });
        this.messages.push({
          sender: 'edi',
          text: "Understood. The action has been successfully committed to the database."
        });
        notify("EDI committed changes successfully.");
        if (typeof window !== 'undefined') {
          setTimeout(async () => {
            const { invalidateAll } = await import('$app/navigation');
            await invalidateAll();
          }, 800);
        }
      } else {
        throw new Error(result.error || "Commit failed");
      }
    } catch (err) {
      this.messages.push({
        sender: 'edi',
        text: `Failed to commit action: ${err.message}`
      });
    } finally {
      this.loading = false;
      this.saveHistory();
    }
  }

  cancelProposal(index) {
    const msg = this.messages[index];
    if (msg && msg.proposal) {
      msg.proposal.status = 'cancelled';
      this.messages.push({
        sender: 'user',
        text: "Cancel"
      });
      this.messages.push({
        sender: 'edi',
        text: "Proposal cancelled."
      });
      this.saveHistory();
    }
  }
}

export const agentStore = new AgentStore();
