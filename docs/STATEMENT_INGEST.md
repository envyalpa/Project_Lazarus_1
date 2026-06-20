# Statement Ingest — Reference for AI

## Command Format

```
/ingest-statement path="<absolute_path>" [password="<encryption_password>"] [bank="auto|federal|gpay"] [confirm] [confirm-fuzzy]
```

### Parameters
| Param | Required | Description |
|-------|----------|-------------|
| `path` | **Yes** | Absolute path to the PDF statement on local filesystem |
| `password` | No | Encryption password (default: `ALLE1606` for Federal Bank statements) |
| `bank` | No | Bank type: `auto` (try federal first, fallback gpay), `federal`, `gpay` (default: `auto`) |
| `confirm` | No | Skip confirmation prompt — proceed directly to insert |
| `confirm-fuzzy` | No | Auto-accept all fuzzy duplicates without prompting |

### Supporting Entries
Append a CSV block after the command to provide split and category enrichment from other sources:

```
/ingest-statement path="C:\Statements\federal_june.pdf" bank=federal confirm

[supporting_entries]
date,title,amount,type,category,paid_by,paid_to,paid_for
2026-06-05,Swiggy Order,324.50,expense,Food,ICICI Debit,,Me,Wife
2026-06-07,Amazon Pay,1250.00,expense,Shopping,ICICI Debit,,Me,Family
[/supporting_entries]
```

Fields: `date`, `title`, `amount`, `type`, `category`, `paid_by`, `paid_to`, `paid_for` (comma-separated splits). All optional — any field provided enriches the matching statement row.

---

## Workflow (AI-side)

### Step 1 — Parse PDF
Run `scripts/ingest-statement.js` with the given params:

```
node scripts/ingest-statement.js --path "..." [--password "..."] [--bank federal|gpay|auto] [--confirm] [--confirm-fuzzy]
```

This invokes the appropriate Python parser (`lib/federal_parser.py` or `lib/gpay_parser.py`), returning parsed rows with cleaned titles.

**If parse fails with ENCRYPTED**: ask user for the password. Federal Bank statements default password is `ALLE1606`.

### Step 2 — Account Detection
- **Federal Bank** → `paid_by: "Federal Bank Debit"` (debits), `paid_to: "Federal Bank Debit"` (credits)
- **GPay "Paid to {name}"** → `paid_by: extract from account description (e.g. "Federal Bank 8796" → "Federal Bank Debit")`
- **GPay "Received from {name}"** → `paid_to: account, paid_by: person name`
- **GPay "Self transfer {bank}"** → `type: "transfer"`, `paid_by: source`, `paid_to: dest`

If account name is ambiguous, the script outputs the detected account and flags uncertainty. Ask user to confirm.

### Step 3 — Duplicate Detection
Script runs two-pass dedup against the DB:
1. **Exact**: same date + amount + lowercase-trimmed title → auto-skip
2. **Fuzzy**: amount ±1 rupee, then score: amount exact (30) + date proximity (30/20/10) + account match (20) + title similarity (10) + person alias (10). Threshold ≥50 → flagged

**Fuzzy matches require user decision** unless `--confirm-fuzzy` passed:
- **Merge** (default for very high score): update existing row with better data from statement
- **Keep New**: import as fresh row
- **Skip**: exclude from import

### Step 4 — Title Normalization
Script applies `cleanTitle()` logic from `import-federal.js`:
- `CHRG/...` → `"Bank Charge - {label}"`
- `POS/...` → merchant name
- `BY CDM...` → `"Cash Deposit - {name}"`
- `UPI REFUND...` → `"UPI Refund #{ref}"`
- `UPI IN/...` → `"UPI IN - {name}"` (self VPA check for transfers)
- `UPIOUT/...` → vendor detection (Swiggy, Amazon, Spotify, Apple, Microsoft, etc.) or `"UPI Payment - {name}"`
- `NFT/...` → `"NEFT - {description}"`
- `SBINT...` → `"Interest Credit"`

Then checks `title_cleanup` table for any previously-confirmed mappings for the raw description → use that cleaned title instead.

### Step 5 — Category Assignment
Priority order:
1. From `title_cleanup` table (previously confirmed mapping from this raw description)
2. From supporting entries (title match)
3. Via `catAliases` mapping (e.g., "medicine" → "Medical", "car fuel" → "Fuel")
4. Substring/word match against existing categories
5. Fallback: leave as `null` (uncategorized)

### Step 6 — Paid-For / Split Detection
Scan the transaction title and notes for known person names using the `nameAliases` list:

| Found Alias | Split Value | Condition |
|-------------|-------------|-----------|
| celine, mom, family, celinepaulson | `Family` | Title contains alias |
| sola, solapaul1994, sola paulson, sister | `Sister` | Title contains alias |
| merlin, ringmerlinmoon | `Wife` | Title contains alias |
| arnold, elwin, vishnu, sneha | `Family` | Other family members |

If **no person name detected**: `paid_for = "Me"` (default for expenses).

If **person name detected AND title indicates user paid**: append detected split to `paid_for`:
- `"Me"` → `"Me,Family"` or `"Me,Sister"` or `"Me,Wife"`
- Multiple persons: `"Me,Family,Sister"`

**Supporting entries override** the auto-detected paid_for if they provide a `paid_for` column for a matching transaction.

### Step 7 — Supporting Entry Enrichment
If supporting entries CSV is provided:
- Build `(date, titleFragment)` lookup against parsed statement rows
- For matches: apply the supporting entry's field values as overrides
- This is the primary mechanism for correcting auto-detected fields

Matching logic:
1. Exact date + title word overlap ≥ 0.5 → match
2. Date within 1 day + high title overlap → match  
3. First match wins (no multi-match)

### Step 8 — Confirmation
Unless `--confirm` passed, present the user with:
- Account detected
- Total rows found, exact duplicates skipped, fuzzy matches pending
- Preview of first 5 rows (or all if ≤ 10)
- Ask: "Insert [N] transactions? (yes/no)"

### Step 9 — Insert
Runs a SQLite transaction:
1. INSERT new transactions into `transactions` table
2. For merged rows: UPDATE existing
3. Batch-insert title vendors (vendor→canonical memory)
4. Upsert title cleanup mappings
5. Log import to `import_log` table

### Response Format
After successful ingest, respond with:

```
**Statement Ingest Complete**
Bank: Federal Bank
Account: Federal Bank Debit
Found: 87 rows
Inserted: 85 new
Merged: 0
Skipped (exact dup): 2
Fuzzy duplicates resolved: 0
Import log ID: #42
```

Then ask: "Anything to correct or update, Commander?"

---

## Person Name → Split Mapping Reference

```
Family   ← celine, mom, family, celinepaulson
Sister   ← sola, solapaul1994, sola paulson, sister
Wife     ← merlin, ringmerlinmoon
Family   ← arnold, elwin, vishnu, sneha  (other family)
Me/Alien ← envyalpa, allen  (self)
```

## Category Alias Reference

```
medicine         → Medical
house care       → Home
personal care    → Grooming
hobbies, tickets → Fun
misc             → Unknown
car care         → Car
car fuel         → Fuel
pet care         → Haru
family, savings,
bank transfers   → Transfer
credit card *    → Credit Card
car loan *       → Car Loan
wedding *        → Wedding
travel           → Transport
construction     → Home
skin treatment   → Grooming
```

## Account Mapping (GPay)

```
"Federal Bank 8796"       → "Federal Bank Debit"
"ICICI Bank 0454"         → "ICICI Debit"
"State Bank of India 2690" → "SBI Debit"
```
