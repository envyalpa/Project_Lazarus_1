import db from '../db.js';

const stmts = {
  getAll: db.prepare('SELECT * FROM people ORDER BY created_at DESC'),
  getById: db.prepare('SELECT * FROM people WHERE id = ?'),
  create: db.prepare('INSERT INTO people (name, balance, relationship, icon, color, show_in_summary, include_in_split) VALUES (@name, 0, @relationship, @icon, @color, @show_in_summary, @include_in_split)'),
  update: db.prepare('UPDATE people SET name = @name, balance = 0, relationship = @relationship, icon = @icon, color = @color, show_in_summary = @show_in_summary, include_in_split = @include_in_split WHERE id = @id'),
  remove: db.prepare('DELETE FROM people WHERE id = ?')
};

function computeAllBalances() {
  const people = stmts.getAll.all();
  const peopleMap = new Map();
  const splitParticipants = new Set(['Me']);
  const dependents = new Set();

  for (const p of people) {
    peopleMap.set(p.name, {
      ...p,
      paidByAmount: 0,
      paidBackDirect: 0,
      paidBackSplit: 0,
      initialAmount: 0,
      splitAmount: 0,
      totalSpent: 0,
      contributions: {}
    });
    
    if (p.include_in_split === 1) {
      splitParticipants.add(p.name);
    } else {
      dependents.add(p.name);
    }
  }

  const txns = db.prepare("SELECT * FROM transactions WHERE type IN ('expense', 'transfer')").all();

  for (const t of txns) {
    const amount = t.amount;
    const payer = peopleMap.has(t.paid_by) ? t.paid_by : 'Me';
    
    if (peopleMap.has(t.paid_by)) {
      peopleMap.get(t.paid_by).initialAmount += amount;
    }
    
    if (t.type === 'expense') {
      let targets = [];
      if (t.paid_for) {
        targets = t.paid_for.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        targets = [payer];
      }
      
      const rawTargetShare = amount / Math.max(1, targets.length);
      const transactionShares = {};
      for (const sp of splitParticipants) {
        transactionShares[sp] = 0;
      }
      
      for (const target of targets) {
        if (splitParticipants.has(target)) {
          transactionShares[target] = (transactionShares[target] || 0) + rawTargetShare;
        } else if (dependents.has(target) || peopleMap.has(target)) {
          const spCount = splitParticipants.size;
          const spShare = rawTargetShare / spCount;
          for (const sp of splitParticipants) {
            transactionShares[sp] = (transactionShares[sp] || 0) + spShare;
          }
          
          const depObj = peopleMap.get(target);
          if (depObj) {
            depObj.totalSpent += rawTargetShare;
            depObj.contributions[payer] = (depObj.contributions[payer] || 0) + rawTargetShare;
          }
        } else {
          if (target === 'Me') {
            transactionShares['Me'] = (transactionShares['Me'] || 0) + rawTargetShare;
          } else {
            const spCount = splitParticipants.size;
            const spShare = rawTargetShare / spCount;
            for (const sp of splitParticipants) {
              transactionShares[sp] = (transactionShares[sp] || 0) + spShare;
            }
          }
        }
      }
      
      if (payer !== 'Me') {
        const payerObj = peopleMap.get(payer);
        if (payerObj) {
          const meShare = transactionShares['Me'] || 0;
          payerObj.paidByAmount += meShare;
          payerObj.splitAmount += meShare;
        }
      } else {
        for (const [name, share] of Object.entries(transactionShares)) {
          if (name !== 'Me') {
            const personObj = peopleMap.get(name);
            if (personObj) {
              personObj.paidBackSplit += share;
            }
          }
        }
      }
    } else if (t.type === 'transfer') {
      if (t.paid_to && peopleMap.has(t.paid_to) && payer === 'Me') {
        const toObj = peopleMap.get(t.paid_to);
        if (toObj) {
          toObj.paidBackDirect += amount;
        }
      }
      if (t.paid_to && !peopleMap.has(t.paid_to) && payer !== 'Me') {
        const fromObj = peopleMap.get(payer);
        if (fromObj) {
          fromObj.paidByAmount += amount;
        }
      }
    }
  }

  for (const p of peopleMap.values()) {
    p.balance = p.include_in_split === 1 
      ? p.paidBackDirect + p.paidBackSplit - p.paidByAmount 
      : p.totalSpent;
  }

  return peopleMap;
}

export function getAll() {
  const peopleMap = computeAllBalances();
  return Array.from(peopleMap.values());
}

export function getById(id) {
  const peopleMap = computeAllBalances();
  for (const p of peopleMap.values()) {
    if (p.id === id) return p;
  }
  return null;
}

export function create(data) {
  const info = stmts.create.run({
    name: data.name,
    relationship: data.relationship || '',
    icon: data.icon || 'User',
    color: data.color || '--cyan',
    show_in_summary: data.show_in_summary != null ? (data.show_in_summary ? 1 : 0) : 1,
    include_in_split: data.include_in_split != null ? (data.include_in_split ? 1 : 0) : 1
  });
  return getById(info.lastInsertRowid);
}

export function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts.update.run({
    name: data.name ?? existing.name,
    relationship: data.relationship ?? existing.relationship,
    icon: data.icon ?? existing.icon,
    color: data.color ?? existing.color,
    show_in_summary: data.show_in_summary != null ? (data.show_in_summary ? 1 : 0) : existing.show_in_summary,
    include_in_split: data.include_in_split != null ? (data.include_in_split ? 1 : 0) : existing.include_in_split,
    id: id
  });
  return getById(id);
}

export function remove(id) {
  const p = getById(id);
  if (!p) return null;
  stmts.remove.run(id);
  return p;
}
