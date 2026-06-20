<script>
  import Modal from '$lib/components/operations/Modal.svelte';
  import { Plus, ChevronLeft, ChevronRight, Check, X, CheckCircle2, Circle } from '@lucide/svelte';
  import DatePicker from '$lib/components/operations/DatePicker.svelte';
  import StarRating from './StarRating.svelte';
  import GenreCombobox from './GenreCombobox.svelte';
  import { notify } from '$lib/stores/notification.js';
  import { agentStore } from '$lib/stores/agent.svelte.js';

  let { book = null, genres = [], series = [], seriesBookCounts = {}, mode = 'edit', scrapedData = null, fullscreen = false, ondirty, onupdate, onsaveset, onacceptset, onediupdate, onretry, onrequestclose } = $props();

  let editTitle = $state(book?.title || '');
  let editAuthor = $state(book?.author || '');
  let editSynopsis = $state(book?.synopsis || '');
  let editCoverUrl = $state(book?.cover_url || '');
  let editStatus = $state(book?.status || 'not_started');
  let editRating = $state(book?.rating || null);
  let editStartDate = $state(book?.start_date || '');
  let editEndDate = $state(book?.end_date || '');
  let editGenreIds = $state(book?.genres?.map(g => g.id) || []);
  let editSeriesId = $state(book?.series_id || null);
  let editVolumeNumber = $state(book?.volume_number || 0);
  let editTotalVolumes = $state(book?.total_volumes || 0);
  let editSourceUrl = $state(book?.source_url || '');

  let localGenres = $state([...genres]);
  let appliedScrapedRef = null;
  let localSeries = $state([...series]);
  let showSeriesModal = $state(false);
  let newSeriesName = $state('');
  let covers = $state([]);
  let coverIndex = $state(0);
  let coverError = $state(false);
  let saving = $state(false);
  let synopsisMode = $state('preview');
  let pendingSeries = $state(null);
  let userTouchedTitle = $state(false);
  let metaDone = $state(false);
  let synopsisDone = $state(false);
  let ediHasRun = $state(false);
  let ediProcessing = $derived(correctingSync || generatingSync);
  let synopsisMaxChars = 600;
  let synopsisCharCount = $derived(`${editSynopsis.length} / ${synopsisMaxChars}`);

  let allConfirmed = $derived(ediCorrect.title && ediCorrect.author && ediCorrect.series && ediCorrect.genres && ediCorrect.synopsis);

  function initEdiCorrect() {
    return {
      title: book?.edi_correct_title === 1,
      author: book?.edi_correct_author === 1,
      series: book?.edi_correct_series === 1,
      genres: book?.edi_correct_genres === 1,
      synopsis: book?.edi_correct_synopsis === 1
    };
  }
  let ediCorrect = $state(initEdiCorrect());

  function toTitleCase(str) {
    if (!str) return '';
    const lower = str.toLowerCase();
    const smallWords = /^(a|an|the|and|but|for|or|nor|as|at|by|for|in|of|on|to|up|via|with|from|about|into)$/i;
    return lower.replace(/\b\w+/g, (word, i) =>
      i === 0 || !smallWords.test(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word
    );
  }

  function formatDesc(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em>$1</em>');
  }

  function snapshot() {
    return { title: editTitle, author: editAuthor, synopsis: editSynopsis, cover_url: editCoverUrl, status: editStatus, rating: editRating, start_date: editStartDate, end_date: editEndDate, series_id: editSeriesId, volume_number: editVolumeNumber, total_volumes: editTotalVolumes, source_url: editSourceUrl, genre_ids: [...editGenreIds] };
  }

  let pristine = $state(snapshot());

  let hasChanges = $derived.by(() => {
    const c = snapshot();
    return c.title !== pristine.title || c.author !== pristine.author || c.synopsis !== pristine.synopsis || c.cover_url !== pristine.cover_url || c.status !== pristine.status || c.rating !== pristine.rating || c.start_date !== pristine.start_date || c.end_date !== pristine.end_date || c.series_id !== pristine.series_id || c.volume_number !== pristine.volume_number || c.total_volumes !== pristine.total_volumes || c.source_url !== pristine.source_url || JSON.stringify(c.genre_ids) !== JSON.stringify(pristine.genre_ids);
  });

  let lastDirty = $state(false);
  let prevBook = null;

  $effect(() => {
    const dirty = hasChanges;
    if (dirty !== lastDirty) {
      lastDirty = dirty;
      ondirty?.(dirty);
    }
  });

  $effect(() => {
    if (book && book !== prevBook) {
      prevBook = book;
      editTitle = book.title || ''; editAuthor = book.author || ''; editSynopsis = book.synopsis || ''; editCoverUrl = book.cover_url || ''; editStatus = book.status || 'not_started'; editRating = book.rating || null; editStartDate = book.start_date || ''; editEndDate = book.end_date || ''; editGenreIds = book.genres?.map(g => g.id) || []; editSeriesId = book.series_id || null; editVolumeNumber = book.volume_number || 0; editTotalVolumes = book.total_volumes || 0; editSourceUrl = book.source_url || '';
      ediCorrect = initEdiCorrect();
      pristine = snapshot();
    }
  });

  function handleScrapedSeries(name, volumeNum, totalVols) {
    if (!name) return;
    const existing = localSeries.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      editSeriesId = existing.id;
      if (volumeNum) editVolumeNumber = volumeNum;
      if (totalVols) editTotalVolumes = totalVols;
    } else {
      pendingSeries = { name, volumeNum, totalVols };
    }
  }

  async function handleConfirmPendingSeries() {
    if (!pendingSeries) return;
    const res = await fetch('/api/series', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pendingSeries.name })
    });
    if (res.ok) {
      const s = await res.json();
      localSeries = [...localSeries, s];
      editSeriesId = s.id;
      if (pendingSeries.volumeNum) editVolumeNumber = pendingSeries.volumeNum;
      if (pendingSeries.totalVols) editTotalVolumes = pendingSeries.totalVols;
    }
    pendingSeries = null;
  }

  function handleCancelPendingSeries() {
    pendingSeries = null;
  }

  $effect(() => {
    if (scrapedData && scrapedData !== appliedScrapedRef) {
      appliedScrapedRef = scrapedData;
      const d = scrapedData;
      if (mode === 'create' && d.title) {
        // Auto-create the book immediately with scraped data
        const payload = {
          title: d.title, author: d.author || '', cover_url: d.cover_url || '',
          synopsis: d.synopsis || '', source_url: d.source_url || '',
          genre_ids: d.genre_ids || [], status: 'not_started',
          processed: 0
        };
        if (d.series_name) {
          const existing = localSeries.find(s => s.name.toLowerCase() === d.series_name.toLowerCase());
          if (existing) {
            payload.series_id = existing.id;
            if (d.series_book_number) payload.volume_number = d.series_book_number;
            if (d.series_total_books) payload.total_volumes = d.series_total_books;
          }
        }
        fetch('/lounge/books', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(async (res) => {
          if (res.ok) {
            const created = await res.json();
            agentStore.processNewBook(created.id, created.title, created.author);
          } else if (res.status === 409) {
            const listRes = await fetch('/lounge/books');
            if (listRes.ok) {
              const all = await listRes.json();
              const titleKey = (payload.title || '').split(':')[0].trim().toLowerCase();
              const match = all.find(b => b.title.toLowerCase().includes(titleKey));
              if (match) agentStore.processNewBook(match.id, match.title, match.author);
            }
          }
        });
        onrequestclose?.();
      } else {
        if (d.title) { editTitle = d.title; userTouchedTitle = false; }
        if (d.author) editAuthor = d.author;
        if (d.cover_url) { editCoverUrl = d.cover_url; coverError = false; }
        if (d.genre_ids?.length) {
          if (d.new_genres?.length) localGenres = [...localGenres, ...d.new_genres];
          editGenreIds = [...new Set([...editGenreIds, ...d.genre_ids])];
        }
        covers = d.covers || [];
        coverIndex = 0;
        if (d.source_url) editSourceUrl = d.source_url;
        if (d.title) {
          const cardIdx = agentStore.messages.length;
          agentStore.open = true;
          agentStore.messages.push({
            sender: 'edi',
            type: 'processing-card',
            title: d.title,
            taskLabel: 'Processing',
            status: 'processing',
            statusText: 'Processing',
            message: 'Fetching metadata and generating synopsis...',
            animIdx: agentStore.getNextCardAnim()
          });
          agentStore.saveHistory();
          Promise.all([
            handleGenerateSynopsis().catch(() => {}),
            handleCorrectMetadata(d).catch(() => {})
          ]).then(() => {
            const updated = agentStore.messages[cardIdx];
            if (updated) {
              updated.status = 'complete';
              updated.statusText = 'Complete';
              updated.taskLabel = 'Complete';
              updated.message = 'Metadata corrected and synopsis generated.';
              agentStore.saveHistory();
            }
          });
          handleScrapedSeries(d.series_name, d.series_book_number, d.series_total_books);
        }
      }
    }
  });

  let prevSeriesId = $state(null);

  $effect(() => {
    if (editSeriesId && editSeriesId !== prevSeriesId && mode === 'create') {
      prevSeriesId = editSeriesId;
      const info = seriesBookCounts[editSeriesId];
      if (info && info.maxVolume > 0 && editVolumeNumber === 0) {
        editVolumeNumber = info.maxVolume + 1;
      }
      const seriesObj = localSeries.find(s => s.id === editSeriesId);
      if (seriesObj?.total_volumes > 0 && editTotalVolumes === 0) {
        editTotalVolumes = seriesObj.total_volumes;
      }
    } else if (!editSeriesId) {
      prevSeriesId = null;
    }
  });

  let volumeHint = $derived.by(() => {
    if (!editSeriesId) return null;
    const info = seriesBookCounts[editSeriesId];
    const seriesObj = localSeries.find(s => s.id === editSeriesId);
    if (!info && !seriesObj?.total_volumes) return null;
    const parts = [];
    if (info?.existingCount > 0) parts.push(`Existing: ${info.existingCount} book${info.existingCount > 1 ? 's' : ''}`);
    if (seriesObj?.total_volumes > 0) parts.push(`Recorded total: ${seriesObj.total_volumes}`);
    if (info?.maxVolume > 0) parts.push(`Next expected: #${info.maxVolume + 1}`);
    return parts.length > 0 ? parts.join(' | ') : null;
  });

  let overVolumeWarning = $derived(editTotalVolumes > 0 && editVolumeNumber > editTotalVolumes);

  function setCover(i) {
    if (i < 0) i = covers.length - 1;
    if (i >= covers.length) i = 0;
    coverIndex = i; editCoverUrl = covers[i].url; coverError = false;
  }

  function handleStartDateChange(v) { editStartDate = v; }
  function handleEndDateChange(v) { editEndDate = v; }

  async function handleCreateGenre(name) {
    const res = await fetch('/api/genres', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (res.ok) { const g = await res.json(); localGenres = [...localGenres, g]; editGenreIds = [...editGenreIds, g.id]; }
  }

  function handleCreateSeries() { newSeriesName = ''; showSeriesModal = true; }

  async function handleConfirmSeries() {
    if (!newSeriesName?.trim()) return;
    const res = await fetch('/api/series', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newSeriesName.trim() }) });
    if (res.ok) { const s = await res.json(); localSeries = [...localSeries, s]; editSeriesId = s.id; }
    showSeriesModal = false;
  }

  async function handleSave() {
    saving = true;
    try {
      const payload = { title: editTitle, author: editAuthor, synopsis: editSynopsis, cover_url: editCoverUrl, status: editStatus, rating: editRating, start_date: editStartDate || null, end_date: editEndDate || null, genre_ids: editGenreIds, series_id: editSeriesId || null, volume_number: editSeriesId ? (editVolumeNumber || 0) : 0, total_volumes: editSeriesId ? (editTotalVolumes || 0) : 0, source_url: editSourceUrl, processed: 1, edi_correct_title: ediCorrect.title ? 1 : 0, edi_correct_author: ediCorrect.author ? 1 : 0, edi_correct_series: ediCorrect.series ? 1 : 0, edi_correct_genres: ediCorrect.genres ? 1 : 0, edi_correct_synopsis: ediCorrect.synopsis ? 1 : 0 };
      let updated;
      if (mode === 'create') {
        const res = await fetch('/lounge/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Create failed'); }
        updated = await res.json();
      } else {
        const res = await fetch(`/lounge/books/${book.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Update failed'); }
        updated = await res.json();
      }
      onupdate?.(updated);
      pristine = snapshot();
      lastDirty = false;
      ondirty?.(false);
      notify("Book saved: " + editTitle);
    } catch (e) { notify("Error: " + e.message); } finally { saving = false; }
  }

  let generatingSync = $state(false);
  let correctingSync = $state(false);

  function checkEdiDone() {
    if (metaDone && synopsisDone) {
      ediHasRun = true;
    }
  }

  $effect(() => {
    onediupdate?.({ processing: ediProcessing, done: ediHasRun, allConfirmed });
  });

  $effect(() => {
    onretry?.(handleRetry);
  });

  async function handleCorrectMetadata(d) {
    if (!d?.title) return;
    correctingSync = true;
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'correct_book_metadata',
          rawTitle: d.title,
          rawAuthor: d.author || '',
          rawSeriesName: d.series_name || '',
          rawVolumeNumber: d.series_book_number ?? null,
          rawTotalVolumes: d.series_total_books ?? null,
          rawCategories: d.categories || [],
          sourceUrl: d.source_url || ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.correction) {
          const c = data.correction;
          if (c.title && !userTouchedTitle) editTitle = toTitleCase(c.title);
          if (c.author) editAuthor = c.author;
          if (c.series_name) handleScrapedSeries(c.series_name, c.volume_number, c.total_volumes);
          if (c.genres?.length) {
            applyCorrectedGenres(c.genres.slice(0, 3));
          }
          notify("Metadata corrected by EDI.");
        }
      }
    } catch (err) {
      console.error('Metadata correction error:', err);
    } finally {
      correctingSync = false;
      metaDone = true;
      checkEdiDone();
    }
  }

  async function applyCorrectedGenres(names) {
    const ids = [];
    for (const name of names) {
      const existing = localGenres.find(g => g.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        ids.push(existing.id);
      } else {
        try {
          const res = await fetch('/api/genres', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          });
          if (res.ok) {
            const g = await res.json();
            localGenres = [...localGenres, g];
            ids.push(g.id);
          }
        } catch {}
      }
    }
    if (ids.length > 0) editGenreIds = ids;
  }

  async function handleGenerateSynopsis() {
    if (!editTitle?.trim()) { notify("Please enter a title first."); return; }
    generatingSync = true;
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_book_synopsis', title: editTitle.trim(), author: editAuthor?.trim() || '', charLimit: synopsisMaxChars })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.summary) {
          editSynopsis = data.summary;
          notify("Synopsis generated by EDI.");
        } else {
          throw new Error(data.error || "Synopsis generation failed");
        }
      } else {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`API ${res.status}: ${errText}`);
      }
    } catch (err) {
      notify("Error: " + err.message);
      throw err;
    } finally {
      generatingSync = false;
      synopsisDone = true;
      checkEdiDone();
    }
  }

  async function handleRetry() {
    if (!editTitle?.trim()) return;

    if (ediCorrect.title && ediCorrect.author && ediCorrect.genres && ediCorrect.series && ediCorrect.synopsis) {
      notify("All fields confirmed. Nothing to retry.");
      return { alreadyConfirmed: true };
    }

    metaDone = false;
    synopsisDone = false;
    ediHasRun = false;
    let metadataOk = true;
    let synopsisOk = true;

    const seriesName = editSeriesId ? (localSeries.find(s => s.id === editSeriesId)?.name || '') : '';

    if (!ediCorrect.title || !ediCorrect.author || !ediCorrect.genres || !ediCorrect.series) {
      try {
        await handleCorrectMetadata({
          title: editTitle,
          author: editAuthor,
          series_name: seriesName,
          series_book_number: editVolumeNumber || null,
          series_total_books: editTotalVolumes || null,
          categories: [],
          source_url: editSourceUrl
        });
      } catch {
        metadataOk = false;
      }
    } else {
      metaDone = true;
    }

    if (!ediCorrect.synopsis) {
      try {
        await handleGenerateSynopsis();
      } catch {
        synopsisOk = false;
      }
    } else {
      synopsisDone = true;
    }

    checkEdiDone();
    return { metadataOk, synopsisOk };
  }

  async function handleAcceptAll() {
    ediCorrect.title = true;
    ediCorrect.author = true;
    ediCorrect.series = true;
    ediCorrect.genres = true;
    ediCorrect.synopsis = true;
    await handleSave();
  }

  $effect(() => {
    onsaveset?.(handleSave);
  });

  $effect(() => {
    onacceptset?.(handleAcceptAll);
  });

</script>

{#if fullscreen}
  <div class="minimal-form" data-section="book-detail-form">
    <div class="cover-area">
      {#if editCoverUrl && !coverError}
        <img src={editCoverUrl} alt="Cover" class="cover-img" onerror={() => { coverError = true; }} />
      {:else}
        <div class="cover-placeholder">+ Add Cover</div>
      {/if}
      {#if covers.length > 1}
        <div class="cover-nav">
          <button type="button" class="nav-btn" onclick={() => setCover(coverIndex - 1)}><ChevronLeft size={14} /></button>
          <span class="nav-counter">{coverIndex + 1}/{covers.length}</span>
          <button type="button" class="nav-btn" onclick={() => setCover(coverIndex + 1)}><ChevronRight size={14} /></button>
        </div>
      {/if}
    </div>
    <label class="efield">
      <span class="efield-label">Title</span>
      <input type="text" bind:value={editTitle} class="efield-input" oninput={() => { userTouchedTitle = true; }} />
    </label>
    <label class="efield">
      <span class="efield-label">Author</span>
      <input type="text" bind:value={editAuthor} class="efield-input" />
    </label>
    <div class="efield">
      <span class="efield-label">Rating</span>
      <StarRating value={editRating} onchange={(v) => { editRating = v; }} />
    </div>
    <div class="efield-row">
      <div class="efield date-field">
        <span class="efield-label">Start</span>
        <DatePicker value={editStartDate} onchange={handleStartDateChange} />
      </div>
      <div class="efield date-field">
        <span class="efield-label">End</span>
        <DatePicker value={editEndDate} onchange={handleEndDateChange} />
      </div>
    </div>
  </div>
{:else}
  <div class="edit-form-grid" class:create-mode={mode === 'create'} data-section="book-detail-form">
    <div class="edit-cover-col">
      <div data-section="cover-preview" class="cover-area">
        {#if editCoverUrl && !coverError}
          <img src={editCoverUrl} alt="Cover" class="cover-img" onerror={() => { coverError = true; }} />
        {:else}
          <div class="cover-placeholder">+ Add Cover</div>
        {/if}
        {#if covers.length > 1}
          <div class="cover-nav">
            <button type="button" class="nav-btn" onclick={() => setCover(coverIndex - 1)}><ChevronLeft size={14} /></button>
            <span class="nav-counter">{coverIndex + 1}/{covers.length}</span>
            <button type="button" class="nav-btn" onclick={() => setCover(coverIndex + 1)}><ChevronRight size={14} /></button>
          </div>
        {/if}
      </div>
      <label class="efield">
        <div class="label-row">
          <span class="efield-label">Cover URL</span>
        </div>
        <input type="text" bind:value={editCoverUrl} class="efield-input" placeholder="https://..." oninput={() => { coverError = false; }} />
      </label>
      {#if editSourceUrl}
        <span class="source-url-line">Fetched from: {editSourceUrl}</span>
      {/if}
      <label class="efield">
        <div class="label-row">
          <span class="efield-label">Status</span>
        </div>
        <select bind:value={editStatus} class="efield-input select-input">
          <option value="not_started" style="color:var(--text-dim)">Not Started</option>
          <option value="reading" style="color:var(--cyan)">Reading</option>
          <option value="completed" style="color:var(--success)">Finished</option>
          <option value="not_purchased" style="color:var(--amber)">Not Purchased</option>
        </select>
      </label>
      {#if mode !== 'create'}
        <div class="efield">
          <span class="efield-label">Rating</span>
          <StarRating value={editRating} onchange={(v) => { editRating = v; }} />
        </div>
      {/if}
    </div>

    <div class="edit-fields-col">
      <div class="efield">
        <div class="label-row">
          <button type="button" class="edi-toggle" onclick={() => { ediCorrect.series = !ediCorrect.series; }} title={ediCorrect.series ? 'Confirmed correct' : 'Needs review'}>
            {#if ediCorrect.series}<CheckCircle2 size={17} color="var(--success)" />{:else}<Circle size={17} color="var(--text-dim)" />{/if}
          </button>
          <span class="efield-label">Series</span>
        </div>
        {#if pendingSeries}
          <div class="pending-series-row">
            <span class="pending-series-name">{pendingSeries.name}</span>
            <button type="button" class="pending-series-btn confirm" onclick={handleConfirmPendingSeries} title="Confirm series"><Check size={16} /></button>
            <button type="button" class="pending-series-btn cancel" onclick={handleCancelPendingSeries} title="Cancel"><X size={16} /></button>
          </div>
        {:else}
          <div class="series-select-row">
            <select bind:value={editSeriesId} class="efield-input">
              <option value={null}>None</option>
              {#each localSeries as s (s.id)}
                <option value={s.id}>{s.name}</option>
              {/each}
            </select>
            <button type="button" class="add-series-btn" onclick={handleCreateSeries} title="Add Series"><Plus size={16} /></button>
          </div>
        {/if}
      </div>
      {#if editSeriesId}
        <div class="efield-row">
          <div class="efield vol-field">
            <span class="efield-label">Volume #</span>
            <input type="number" bind:value={editVolumeNumber} min="1" class="efield-input" />
          </div>
          <div class="efield vol-field">
            <span class="efield-label">Total</span>
            <input type="number" bind:value={editTotalVolumes} min="0" class="efield-input" placeholder="5" />
          </div>
        </div>
        {#if volumeHint}
          <span class="volume-hint">{volumeHint}</span>
        {/if}
        {#if overVolumeWarning}
          <span class="volume-warning">Volume exceeds recorded total of {editTotalVolumes}</span>
        {/if}
      {/if}
      <label class="efield">
        <div class="label-row">
          <button type="button" class="edi-toggle" onclick={() => { ediCorrect.title = !ediCorrect.title; }} title={ediCorrect.title ? 'Confirmed correct' : 'Needs review'}>
            {#if ediCorrect.title}<CheckCircle2 size={17} color="var(--success)" />{:else}<Circle size={17} color="var(--text-dim)" />{/if}
          </button>
          <span class="efield-label">Title</span>
        </div>
        <input type="text" bind:value={editTitle} class="efield-input" oninput={() => { userTouchedTitle = true; }} />
      </label>
      <label class="efield">
        <div class="label-row">
          <button type="button" class="edi-toggle" onclick={() => { ediCorrect.author = !ediCorrect.author; }} title={ediCorrect.author ? 'Confirmed correct' : 'Needs review'}>
            {#if ediCorrect.author}<CheckCircle2 size={17} color="var(--success)" />{:else}<Circle size={17} color="var(--text-dim)" />{/if}
          </button>
          <span class="efield-label">Author</span>
        </div>
        <input type="text" bind:value={editAuthor} class="efield-input" />
      </label>
      <div class="efield-row">
        <div class="efield date-field">
          <span class="efield-label">Start</span>
          <DatePicker value={editStartDate} onchange={handleStartDateChange} />
        </div>
        <div class="efield date-field">
          <span class="efield-label">End</span>
          <DatePicker value={editEndDate} onchange={handleEndDateChange} />
        </div>
      </div>
      <div class="efield">
        <div class="label-row">
          <button type="button" class="edi-toggle" onclick={() => { ediCorrect.genres = !ediCorrect.genres; }} title={ediCorrect.genres ? 'Confirmed correct' : 'Needs review'}>
            {#if ediCorrect.genres}<CheckCircle2 size={17} color="var(--success)" />{:else}<Circle size={17} color="var(--text-dim)" />{/if}
          </button>
          <span class="efield-label">Genres</span>
        </div>
        <GenreCombobox genres={localGenres} value={editGenreIds} onchange={(v) => { editGenreIds = v; }} oncreate={handleCreateGenre} />
      </div>
      <div class="efield synopsis-field">
        <div class="synopsis-header">
          <button type="button" class="edi-toggle" onclick={() => { ediCorrect.synopsis = !ediCorrect.synopsis; }} title={ediCorrect.synopsis ? 'Confirmed correct' : 'Needs review'}>
            {#if ediCorrect.synopsis}<CheckCircle2 size={17} color="var(--success)" />{:else}<Circle size={17} color="var(--text-dim)" />{/if}
          </button>
          <span class="efield-label">Synopsis</span>
          <span class="synopsis-charcount">{synopsisCharCount}</span>
          <div class="mode-toggles" style="margin-left: auto;">
            <button type="button" class="mode-btn" class:active={synopsisMode === 'edit'} onclick={() => synopsisMode = 'edit'}>Edit</button>
            <button type="button" class="mode-btn" class:active={synopsisMode === 'preview'} onclick={() => synopsisMode = 'preview'}>Preview</button>
          </div>
        </div>
        {#if synopsisMode === 'edit'}
          <textarea bind:value={editSynopsis} class="efield-input etextarea synopsis-textarea" placeholder="Enter synopsis or let EDI auto-generate it when you fetch from a URL."></textarea>
        {:else}
          <div class="synopsis-preview synopsis-preview-box">{@html formatDesc(editSynopsis || 'No synopsis entered.')}</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if showSeriesModal}
  <Modal open={true} noHeader={true} onclose={() => { showSeriesModal = false; }}>
    <div class="series-modal-content">
      <h3 class="series-modal-title"><Plus size={18} /> Add New Series</h3>
      <label class="series-modal-field">
        <span class="series-modal-label">Series Name</span>
        <input type="text" bind:value={newSeriesName} placeholder="Enter series name" class="efield-input" autofocus onkeydown={(e) => { if (e.key === 'Enter') handleConfirmSeries(); }} />
      </label>
      <div class="series-modal-actions">
        <button type="button" class="efield-btn ghost" onclick={() => { showSeriesModal = false; }}>Cancel</button>
        <button type="button" class="efield-btn primary" onclick={handleConfirmSeries} disabled={!newSeriesName.trim()}>Save</button>
      </div>
    </div>
  </Modal>
{/if}

<style>
  .edit-form-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; min-height: 0; }
  .edit-cover-col { display: flex; flex-direction: column; gap: 10px; }
  .cover-area { position: relative; width: 100%; aspect-ratio: 2/3; max-height: 500px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--bg-card); }
  .cover-img { width: 100%; height: 100%; object-fit: cover; }
  .cover-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: 2px dashed var(--border); border-radius: var(--radius); color: var(--text-muted); font-family: var(--font-body); font-size: var(--fs-body); }
  .cover-nav { position: absolute; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 6px; background: rgba(5, 8, 20, 0.75); backdrop-filter: blur(4px); }
  .nav-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid var(--border); border-radius: var(--radius); background: none; color: var(--text-dim); cursor: pointer; transition: all 0.15s; }
  .nav-btn:hover { border-color: var(--cyan); color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .nav-btn:active { transform: scale(0.92); }
  .nav-counter { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); color: var(--text); min-width: 32px; text-align: center; }
  .source-url-line { font-family: var(--font-caption); font-size: var(--fs-caption); color: var(--text-muted); padding: 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .edit-fields-col { display: flex; flex-direction: column; gap: 12px; }
  .efield { display: flex; flex-direction: column; gap: 4px; }
  .efield-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; line-height: 26px; }
  .efield-input { padding: 10px 14px; background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; color: var(--modal-text); font-family: var(--font-body); font-size: var(--fs-body); outline: none; transition: all 0.2s ease-in-out; box-shadow: inset 0 0 8px rgba(0, 200, 255, 0.2); }
  .efield-input:focus { outline: none; border-color: var(--accent-cyan); box-shadow: inset 0 0 8px rgba(0,200,255,0.2), 0 0 0 2px rgba(0,200,255,0.15); }
  .efield-input::placeholder { color: var(--text-placeholder); }
  .etextarea { resize: vertical; min-height: 60px; }
  .synopsis-field { flex: 1; display: flex; flex-direction: column; }
  .synopsis-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .synopsis-charcount { font-family: var(--font-body); font-size: var(--fs-small); color: var(--text-muted); white-space: nowrap; }
  .synopsis-textarea { min-height: 150px; }
  .synopsis-preview-box { min-height: 150px; }
  .synopsis-field .etextarea { flex: 1; }
  .efield-row { display: flex; gap: 8px; }
  .date-field { flex: 1; }
  .vol-field { flex: 1; }
  .series-select-row { display: flex; gap: 6px; align-items: center; }
  .series-select-row select { flex: 1; }
  .add-series-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 38px; border: 1px dashed var(--cyan-dim); border-radius: 6px; background: none; color: var(--cyan); cursor: pointer; flex-shrink: 0; transition: all 0.2s; }
  .add-series-btn:hover { border-color: var(--cyan); background: rgba(0, 212, 255, 0.08); }
  .pending-series-row { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; }
  .pending-series-name { font-family: var(--font-body); font-size: var(--fs-body); color: var(--cyan); font-style: italic; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pending-series-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid var(--border); border-radius: var(--radius); background: none; cursor: pointer; flex-shrink: 0; transition: all 0.15s; }
  .pending-series-btn.confirm { color: var(--success); border-color: var(--success); }
  .pending-series-btn.confirm:hover { background: rgba(34, 197, 94, 0.1); }
  .pending-series-btn.cancel { color: var(--danger); border-color: var(--danger); }
  .pending-series-btn.cancel:hover { background: rgba(239, 68, 68, 0.1); }
  .efield-btn { padding: 8px 20px; border-radius: var(--radius); font-family: var(--font-body); font-size: var(--fs-body); font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
  .efield-btn.ghost { background: none; border-color: var(--border); color: var(--text-dim); }
  .efield-btn.ghost:hover { border-color: var(--text-dim); color: var(--text); }
  .efield-btn.primary { background: var(--cyan); color: #000; border-color: var(--cyan); }
  .efield-btn.primary:hover { background: linear-gradient(135deg, var(--cyan), #007bff); }
  .efield-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .series-modal-content { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
  .series-modal-title { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 700; color: var(--cyan); text-transform: uppercase; letter-spacing: 1px; margin: 0; display: flex; align-items: center; gap: 8px; }
  .series-modal-label { font-family: var(--font-heading-1); font-size: var(--fs-heading-2); font-weight: 600; color: var(--amber); text-transform: uppercase; letter-spacing: 1px; }
  .series-modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .minimal-form { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 0; }
  .edit-form-grid.create-mode { gap: 10px; }

  .edit-form-grid.create-mode .edit-fields-col { gap: 6px; }
  .edit-form-grid.create-mode .efield-input { padding: 6px 10px; }
  .edit-form-grid.create-mode .synopsis-field .etextarea,
  .edit-form-grid.create-mode .synopsis-preview { min-height: 100px; }
  .edit-form-grid.create-mode .efield { gap: 2px; }
  .mode-toggles { display: flex; gap: 4px; }
  .mode-btn { background: none; border: 1px solid var(--border); border-radius: var(--radius); padding: 2px 8px; font-family: var(--font-body); font-size: var(--fs-small); font-weight: 600; color: var(--text-dim); cursor: pointer; transition: all 0.2s; }
  .mode-btn:hover { color: var(--cyan); border-color: var(--cyan); }
  .mode-btn.active { background: rgba(0, 212, 255, 0.08); border-color: var(--cyan); color: var(--cyan); }
  .synopsis-preview { background: var(--bg-surface); border: 1px solid var(--modal-border); border-radius: 6px; padding: 10px 14px; font-family: var(--font-body); font-size: var(--fs-body); color: var(--modal-text); line-height: 1.5; min-height: 80px; flex: 1; overflow-y: auto; white-space: pre-wrap; }
  .synopsis-preview :global(strong) { color: var(--amber); font-weight: 700; font-style: normal; }
  .synopsis-preview :global(em) { color: var(--cyan); font-weight: 600; font-style: normal; }
  .volume-hint { font-family: var(--font-body); font-size: var(--fs-small); color: var(--text-muted); margin-top: -4px; padding: 0 2px; }
  .volume-warning { font-family: var(--font-body); font-size: var(--fs-small); color: var(--amber); font-weight: 600; margin-top: -4px; padding: 0 2px; }
  .edi-toggle { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: none; background: none; cursor: pointer; padding: 0; flex-shrink: 0; transition: transform 0.15s; }
  .edi-toggle:active { transform: scale(0.85); }
  .label-row { display: flex; align-items: center; gap: 6px; }
  .synopsis-header > .edi-toggle { position: static; }
</style>
