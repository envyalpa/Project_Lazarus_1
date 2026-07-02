<script>
  import { X, Copy, Check, FileText } from '@lucide/svelte';
  
  let { run, results = [], onclose } = $props();

  let copied = $state(false);

  // Generate markdown dynamically
  let markdownText = $derived.by(() => {
    const total = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const gaps = results.filter(r => r.status === 'gaps').length;
    const pending = results.filter(r => r.status === 'pending').length;

    let md = `# Platform Evaluation Report: ${run.run_name}\n\n`;
    md += `**Target Platform:** ${run.platform_name}\n`;
    if (run.client_name) md += `**Client:** ${run.client_name}\n`;
    md += `**Date Generated:** ${new Date().toLocaleDateString()}\n\n`;
    
    md += `## Evaluation Summary\n\n`;
    md += `| Total Cases | Passed | Failed (Issues) | Gaps Identified | Pending |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    md += `| ${total} | **${passed}** | **${failed}** | **${gaps}** | ${pending} |\n\n`;

    // Critical Failures Section
    const criticalFailures = results.filter(r => r.status === 'failed');
    if (criticalFailures.length > 0) {
      md += `## ❌ Failures / Blocking Issues\n\n`;
      md += `The following items failed to meet expected outcomes and are blocking implementation:\n\n`;
      for (const item of criticalFailures) {
        md += `### ${item.stage} — ${item.what_to_test}\n`;
        md += `- **Severity:** ${item.severity}\n`;
        md += `- **Expected Outcome:** ${item.expected_outcome}\n`;
        md += `- **Notes / Findings:** ${item.notes_gap || '*No notes logged*'}\n`;
        if (item.screenshot_path) {
          md += `- **Evidence:** ![Screenshot](http://localhost:5173${item.screenshot_path}) (or local file: \`${item.screenshot_path}\`)\n`;
        }
        md += `\n`;
      }
    }

    // Gaps Section
    const gapsIdentified = results.filter(r => r.status === 'gaps');
    if (gapsIdentified.length > 0) {
      md += `## ⚠️ Gaps & Configuration Issues\n\n`;
      md += `The following items require customized workarounds, configurations, or process adjustments:\n\n`;
      for (const item of gapsIdentified) {
        md += `### ${item.stage} — ${item.what_to_test}\n`;
        md += `- **Severity:** ${item.severity}\n`;
        md += `- **Expected Outcome:** ${item.expected_outcome}\n`;
        md += `- **Notes / Workaround:** ${item.notes_gap || '*No notes logged*'}\n`;
        if (item.screenshot_path) {
          md += `- **Evidence:** ![Screenshot](http://localhost:5173${item.screenshot_path})\n`;
        }
        md += `\n`;
      }
    }

    // Passed Section Summary
    const passedItems = results.filter(r => r.status === 'passed');
    if (passedItems.length > 0) {
      md += `## ✅ Passed Checks\n\n`;
      md += `The platform successfully supported standard requirements for the following processes:\n\n`;
      // Group by stage for clean summaries
      const stages = [...new Set(passedItems.map(p => p.stage))];
      for (const stage of stages) {
        md += `- **${stage}**\n`;
        const stageItems = passedItems.filter(p => p.stage === stage);
        for (const item of stageItems) {
          md += `  - ✓ *${item.what_to_test}*`;
          if (item.notes_gap) md += ` (Note: ${item.notes_gap})`;
          md += `\n`;
        }
      }
      md += `\n`;
    }

    return md;
  });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdownText);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (e) {
      alert('Failed to copy to clipboard.');
    }
  }
</script>

<div data-section="modal-backdrop" class="backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div data-section="modal" class="modal modal-wide" role="dialog" aria-modal="true">
    <div data-label="modal-header" class="modal-header">
      <div class="header-titles">
        <span class="modal-subtitle">Evaluation Report</span>
        <h3 data-label="modal-title" class="modal-header-title">Generate Markdown Summary</h3>
      </div>
      <button type="button" data-label="modal-close" class="close-btn" onclick={onclose}><X size={18} /></button>
    </div>

    <div class="modal-body">
      <p class="report-desc">Below is the structured markdown report compiling all evaluation checks. You can copy this summary directly into project notes, client documents, or emails.</p>
      
      <div class="report-container">
        <textarea readonly class="report-textarea" value={markdownText}></textarea>
      </div>

      <div class="form-footer">
        <button type="button" class="btn ghost-btn" onclick={onclose}>Close</button>
        <button type="button" class="btn copy-btn" class:success={copied} onclick={handleCopy}>
          {#if copied}
            <Check size={16} />
            <span>Copied!</span>
          {:else}
            <Copy size={16} />
            <span>Copy Markdown</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(7, 11, 20, 0.85); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 24px; }
  .modal { background: var(--modal-bg); border: 1px solid var(--modal-border); border-radius: 8px; width: 100%; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0, 200, 255, 0.15); }
  .modal-wide { max-width: 820px; }
  
  .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--modal-border); flex-shrink: 0; }
  .header-titles { display: flex; flex-direction: column; gap: 2px; }
  .modal-subtitle { font-family: var(--font-body); font-size: var(--fs-small); color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px; }
  .modal-header-title { font-family: var(--font-heading); font-size: var(--fs-heading); font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: 1px; margin: 0; }
  
  .close-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: none; border: 1px solid var(--modal-border); border-radius: var(--radius); color: var(--text-dim); cursor: pointer; transition: all 0.2s ease-in-out; }
  .close-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; border-color: transparent; }
  
  .modal-body { padding: 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px; }
  .report-desc { font-family: var(--font-body); font-size: var(--fs-body); color: var(--text-dim); margin: 0; line-height: 1.4; }
  
  .report-container { border: 1px solid var(--border); border-radius: var(--radius); background: rgba(0, 0, 0, 0.2); overflow: hidden; flex: 1; display: flex; min-height: 320px; }
  .report-textarea { width: 100%; border: none; background: none; font-family: var(--font-mono); font-size: var(--fs-small); color: var(--text); padding: 16px; resize: none; outline: none; line-height: 1.5; white-space: pre; }
  
  .form-footer { display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--modal-border); padding-top: 18px; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; border-radius: var(--radius); cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid transparent; }
  .ghost-btn { background: none; border-color: var(--border); color: var(--text-dim); }
  .ghost-btn:hover { background: rgba(255,255,255,0.03); border-color: var(--text-dim); color: var(--text); }
  
  .copy-btn { background: var(--accent-cyan); color: #000; }
  .copy-btn:hover { background: linear-gradient(135deg, var(--accent-cyan), #007bff); color: #fff; }
  .copy-btn.success { background: var(--success); color: #000; border-color: var(--success); }
</style>
