#!/usr/bin/env bash
set -euo pipefail

# Conservative repository scan inventory tool.
# Usage examples:
#   bash scripts/scan_repo.sh
#   ZIP_PATH=/path/to/archive.zip bash scripts/scan_repo.sh

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
REPORT_MD="$ROOT_DIR/docs/REPO_SCAN_REPORT.md"
QUESTIONS_MD="$ROOT_DIR/docs/REPO_SCAN_QUESTIONS.md"
SCAN_DIR="$ROOT_DIR/docs/scan"
WORK_DIR="$ROOT_DIR"
TS="$(date -Iseconds)"

mkdir -p "$SCAN_DIR"

TMP_BASE=""
cleanup_tmp() {
  if [[ -n "$TMP_BASE" && -d "$TMP_BASE" ]]; then
    rm -rf "$TMP_BASE"
  fi
}
trap cleanup_tmp EXIT

if [[ -n "${ZIP_PATH:-}" ]]; then
  echo "ZIP_PATH provided: $ZIP_PATH"
  if [[ ! -f "$ZIP_PATH" ]]; then
    echo "ZIP not found: $ZIP_PATH" >&2
    exit 2
  fi
  TMP_BASE="$(mktemp -d "${ROOT_DIR}/.scan_workspace.XXXXXXXX")"
  echo "Extracting ZIP to workspace: $TMP_BASE"
  unzip -qq "$ZIP_PATH" -d "$TMP_BASE"
  first_dir="$(find "$TMP_BASE" -mindepth 1 -maxdepth 1 -type d | head -n1 || true)"
  if [[ -n "$first_dir" ]] && [[ "$(find "$TMP_BASE" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')" == "1" ]]; then
    WORK_DIR="$first_dir"
  else
    WORK_DIR="$TMP_BASE"
  fi
else
  echo "Scanning current working tree"
  WORK_DIR="$ROOT_DIR"
fi

echo "Collecting inventory from $WORK_DIR ..."

python3 - "$WORK_DIR" "$SCAN_DIR" <<'PY'
import csv
import json
import os
import sys
from collections import defaultdict

root = os.path.abspath(sys.argv[1])
out_dir = os.path.abspath(sys.argv[2])

skip_dirs = {'.scan_workspace', '.git', '.idea', '.vscode'}

summary = []
for name in sorted(os.listdir(root)):
    if name.startswith('.scan_workspace') or name in skip_dirs:
        continue
    path = os.path.join(root, name)
    info = {
        'name': name,
        'type': 'dir' if os.path.isdir(path) else 'file',
        'bytes': os.path.getsize(path) if os.path.isfile(path) else 0,
    }
    summary.append(info)

ext_stats: dict[str, dict[str, int]] = defaultdict(lambda: {'count': 0, 'bytes': 0})
large = []
logs = set()
caches = set()
notebooks = set()
dumps = set()
envs = set()
builds = set()
tickets = set()
strategies = set()
migrations = set()

for dirpath, dirnames, filenames in os.walk(root):
    rel_dir = os.path.relpath(dirpath, root)
    if rel_dir != '.' and any(part in skip_dirs for part in rel_dir.split(os.sep)):
        continue
    dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith('.scan_workspace')]

    for filename in filenames:
        full_path = os.path.join(dirpath, filename)
        try:
            size = os.path.getsize(full_path)
        except OSError:
            continue

        rel_path = os.path.relpath(full_path, root)
        ext = os.path.splitext(filename)[1].lower()
        stats = ext_stats[ext]
        stats['count'] += 1
        stats['bytes'] += size

        if size > 1_000_000:
            large.append({'path': rel_path, 'bytes': size})

        rel_lower = rel_path.lower()
        name_lower = filename.lower()

        if name_lower.endswith('.log') or '/logs/' in rel_lower or rel_lower.startswith('logs/'):
            logs.add(rel_path)
        if any(token in rel_lower for token in ['__pycache__', '.ipynb_checkpoints', '.pytest_cache', '.mypy_cache', '.ruff_cache']):
            caches.add(rel_path)
        if ext == '.ipynb':
            notebooks.add(rel_path)
        if any(token in rel_lower for token in ['/dump/', '/dumps/', '/tmp/', '/temp/']) or name_lower.endswith(('.sqlite', '.db', '.pid', '.bak')):
            dumps.add(rel_path)
        if filename.startswith('.env') or filename.endswith('.env'):
            envs.add(rel_path)
        if any(token in rel_lower for token in ['/dist/', '/build/']):
            builds.add(rel_path)
        if rel_lower.startswith('tickets/') and name_lower.endswith('.jsonl'):
            tickets.add(rel_path)
        if 'strategy' in rel_lower and name_lower.endswith(('.yaml', '.yml', '.json', '.toml')):
            strategies.add(rel_path)
        if 'migration' in rel_lower and name_lower.endswith(('.sql', '.py', '.js', '.ts')):
            migrations.add(rel_path)

outputs = {
    'top_level.json': summary,
    'ext_stats.json': ext_stats,
    'large.json': sorted(large, key=lambda item: item['bytes'], reverse=True),
    'logs.json': sorted(logs),
    'caches.json': sorted(caches),
    'notebooks.json': sorted(notebooks),
    'dumps.json': sorted(dumps),
    'envs.json': sorted(envs),
    'builds.json': sorted(builds),
    'tickets.json': sorted(tickets),
    'strategies.json': sorted(strategies),
    'migrations.json': sorted(migrations),
}

for filename, payload in outputs.items():
    with open(os.path.join(out_dir, filename), 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)

with open(os.path.join(out_dir, 'top_level.csv'), 'w', newline='', encoding='utf-8') as handle:
    writer = csv.writer(handle)
    writer.writerow(['name', 'type', 'bytes'])
    for row in summary:
        writer.writerow([row['name'], row['type'], row['bytes']])

with open(os.path.join(out_dir, 'ext_stats.csv'), 'w', newline='', encoding='utf-8') as handle:
    writer = csv.writer(handle)
    writer.writerow(['extension', 'count', 'bytes'])
    for ext, data in sorted(ext_stats.items(), key=lambda item: item[1]['bytes'], reverse=True):
        writer.writerow([ext or '(no ext)', data['count'], data['bytes']])

with open(os.path.join(out_dir, 'large.csv'), 'w', newline='', encoding='utf-8') as handle:
    writer = csv.writer(handle)
    writer.writerow(['path', 'bytes'])
    for row in sorted(outputs['large.json'], key=lambda item: item['bytes'], reverse=True):
        writer.writerow([row['path'], row['bytes']])

single_column_lists = {
    'logs.csv': outputs['logs.json'],
    'caches.csv': outputs['caches.json'],
    'notebooks.csv': outputs['notebooks.json'],
    'dumps.csv': outputs['dumps.json'],
    'envs.csv': outputs['envs.json'],
    'builds.csv': outputs['builds.json'],
    'tickets.csv': outputs['tickets.json'],
    'strategies.csv': outputs['strategies.json'],
    'migrations.csv': outputs['migrations.json'],
}

for filename, values in single_column_lists.items():
    with open(os.path.join(out_dir, filename), 'w', newline='', encoding='utf-8') as handle:
        writer = csv.writer(handle)
        writer.writerow(['path'])
        for value in values:
            writer.writerow([value])
PY

python3 - "$WORK_DIR" "$SCAN_DIR" <<'PY'
import csv
import json
import os
import sys
from glob import glob

root = os.path.abspath(sys.argv[1])
out_dir = os.path.abspath(sys.argv[2])

patterns = {
    'compose_files': '**/docker-compose*.yml',
    'dockerfiles': '**/Dockerfile*',
    'package_json': '**/package.json',
    'pnpm_lock': '**/pnpm-lock.yaml',
    'pyproject': '**/pyproject.toml',
    'requirements': '**/requirements*.txt',
    'makefiles': '**/Makefile',
    'tests': '**/tests/**',
    'docs': "docs/**/*",
    'readmes': '**/README*.md',
    'tickets_dir': 'tickets/**/*.jsonl',
    'strategies_dir': '**/strateg*',
    'migrations_dir': '**/migrations/**',
}

presence = {}
for key, pattern in patterns.items():
    matches = [os.path.relpath(path, root) for path in glob(os.path.join(root, pattern), recursive=True)]
    if key == 'docs':
        matches = [match for match in matches if os.path.isfile(os.path.join(root, match))]
    presence[key] = sorted(set(matches))

with open(os.path.join(out_dir, 'presence.json'), 'w', encoding='utf-8') as handle:
    json.dump(presence, handle, indent=2, ensure_ascii=False)

with open(os.path.join(out_dir, 'presence_counts.csv'), 'w', newline='', encoding='utf-8') as handle:
    writer = csv.writer(handle)
    writer.writerow(['category', 'count'])
    for key, values in sorted(presence.items()):
        writer.writerow([key, len(values)])
PY

python3 - "$WORK_DIR" "$SCAN_DIR" <<'PY'
import csv
import glob
import json
import os
import re
import sys
import time

root = os.path.abspath(sys.argv[1])
out_dir = os.path.abspath(sys.argv[2])

doc_paths = sorted(glob.glob(os.path.join(root, 'docs', '**', '*.md'), recursive=True))
records = []
for path in doc_paths:
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as handle:
            text = handle.read()
    except OSError:
        continue
    headings = re.findall(r'^\s{0,3}#{1,3}\s+(.+)$', text, re.MULTILINE)
    records.append({
        'path': os.path.relpath(path, root),
        'mtime': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(path))),
        'words': len(text.split()),
        'headings': headings[:5],
    })

with open(os.path.join(out_dir, 'docs_heads.json'), 'w', encoding='utf-8') as handle:
    json.dump(records, handle, indent=2, ensure_ascii=False)

with open(os.path.join(out_dir, 'docs_heads.csv'), 'w', newline='', encoding='utf-8') as handle:
    writer = csv.writer(handle)
    writer.writerow(['path', 'mtime', 'words', 'heading_1', 'heading_2', 'heading_3', 'heading_4', 'heading_5'])
    for record in records:
        row = [record['path'], record['mtime'], record['words']]
        row.extend(record['headings'] + [''] * (5 - len(record['headings'])))
        writer.writerow(row)
PY

# Heuristic RG searches for ports and potential order placement code
rg --no-heading --line-number --color=never --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.jsx' --glob '*.py' --glob '*.yml' --glob '*.yaml' --glob '.env*' --glob 'Dockerfile*' --glob '*.md' '\b[0-9]{4,5}\b' "$WORK_DIR" \
  > "$SCAN_DIR/port_candidates.txt" || true

rg --no-heading --line-number --color=never --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.jsx' --glob '*.py' --glob '*.md' '(?i)place[_-]?order|submit[_-]?order|create[_-]?order|orderId|reduceOnly|oco|bracket' "$WORK_DIR" \
  > "$SCAN_DIR/order_path_candidates.txt" || true

python3 - "$WORK_DIR" "$REPORT_MD" "$QUESTIONS_MD" "$SCAN_DIR" "$TS" <<'PY'
import json
import os
import sys

work_dir, report_path, questions_path, scan_dir, timestamp = sys.argv[1:]


def read_json(name, default):
    path = os.path.join(scan_dir, name)
    if not os.path.exists(path):
        return default
    with open(path, 'r', encoding='utf-8') as handle:
        try:
            return json.load(handle)
        except json.JSONDecodeError:
            return default


summary = read_json('top_level.json', [])
ext_stats = read_json('ext_stats.json', {})
large = read_json('large.json', [])
logs = read_json('logs.json', [])
caches = read_json('caches.json', [])
notebooks = read_json('notebooks.json', [])
dumps = read_json('dumps.json', [])
envs = read_json('envs.json', [])
builds = read_json('builds.json', [])
tickets = read_json('tickets.json', [])
strategies = read_json('strategies.json', [])
migrations = read_json('migrations.json', [])
presence = read_json('presence.json', {})
docs_heads = read_json('docs_heads.json', [])


def human_size(value: int) -> str:
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    size = float(value)
    idx = 0
    while size >= 1024 and idx < len(units) - 1:
        size /= 1024
        idx += 1
    return f"{size:.2f} {units[idx]}"


def directory_size(path: str) -> int:
    total = 0
    for dirpath, _, filenames in os.walk(path):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            try:
                total += os.path.getsize(file_path)
            except OSError:
                pass
    return total


def write_section(handle, title, rows, limit=None, formatter=None):
    handle.write(f"## {title}\n")
    if not rows:
        handle.write("None found.\n\n")
        return
    if limit and len(rows) > limit:
        subset = rows[:limit]
    else:
        subset = rows
    for row in subset:
        if formatter:
            handle.write(f"- {formatter(row)}\n")
        else:
            handle.write(f"- {row}\n")
    if limit and len(rows) > limit:
        handle.write("- ...\n")
    handle.write("\n")


total_bytes = directory_size(work_dir)

tickets_bytes = sum(
    os.path.getsize(os.path.join(work_dir, path))
    for path in tickets
    if os.path.exists(os.path.join(work_dir, path))
)

with open(report_path, 'w', encoding='utf-8') as handle:
    handle.write('# Repository Scan Report\n\n')
    handle.write(f'- Timestamp: {timestamp}\n')
    handle.write(f"- Source: {'ZIP workspace' if '.scan_workspace' in work_dir else 'Working tree'}\n")
    handle.write(f'- Root scanned: `{work_dir}`\n')
    handle.write(f'- Total size (approx): {human_size(total_bytes)}\n\n')

    handle.write('## Top-level Structure\n')
    for item in summary:
        if item['type'] == 'dir':
            descriptor = 'dir'
            handle.write(f"- `{item['name']}` ({descriptor})\n")
        else:
            descriptor = f"file — {human_size(item['bytes'])}"
            handle.write(f"- `{item['name']}` ({descriptor})\n")
    handle.write('\n')

    handle.write('## Key Manifests & Tooling\n')
    manifest_keys = ['compose_files', 'dockerfiles', 'package_json', 'pnpm_lock', 'pyproject', 'requirements', 'makefiles']
    for key in manifest_keys:
        entries = presence.get(key, [])
        handle.write(f"- **{key}**: {len(entries)}\n")
        for candidate in entries[:20]:
            handle.write(f"  - `{candidate}`\n")
        if len(entries) > 20:
            handle.write('  - ...\n')
    handle.write('\n')

    handle.write('## Extension Stats (Top 30 by size)\n')
    entries = sorted(ext_stats.items(), key=lambda item: item[1]['bytes'], reverse=True)[:30]
    for ext, data in entries:
        handle.write(f"- `{ext or '(no ext)'}` — files: {data['count']}, size: {human_size(data['bytes'])}\n")
    handle.write('\n')

    write_section(handle, 'Large Files (>1MB)', large, formatter=lambda row: f"`{row['path']}` — {human_size(row['bytes'])}")
    write_section(handle, 'Logs', logs)
    write_section(handle, 'Caches', caches)
    write_section(handle, 'Notebooks', notebooks)
    write_section(handle, 'Dumps / Temp / DB files', dumps)
    write_section(handle, 'Build Artifacts', builds)
    write_section(handle, 'Environment Files', envs)
    write_section(handle, 'Tickets (JSONL)', tickets)
    write_section(handle, 'Strategy Config Candidates', strategies)
    write_section(handle, 'Migration Candidates', migrations)

    handle.write('## Heuristic Findings\n')
    for filename in ['port_candidates.txt', 'order_path_candidates.txt']:
        path = os.path.join(scan_dir, filename)
        handle.write(f"### {filename}\n")
        if not os.path.exists(path):
            handle.write('No candidates found.\n\n')
            continue
        with open(path, 'r', encoding='utf-8', errors='ignore') as heuristics:
            lines = [line.rstrip() for line in heuristics]
        handle.write(f'Lines: {len(lines)}\n\n')
        for line in lines[:200]:
            handle.write(f'- {line}\n')
        if len(lines) > 200:
            handle.write('- ...\n')
        handle.write('\n')

    handle.write('## Documentation Inventory\n')
    readmes = presence.get('readmes', [])
    handle.write(f'- READMEs: {len(readmes)}\n')
    for doc in readmes[:20]:
        handle.write(f"  - `{doc}`\n")
    handle.write('\n- Docs pages:\n')
    for doc in docs_heads:
        headings = ', '.join(doc.get('headings', []))
        handle.write(f"  - `{doc['path']}` — mtime: {doc['mtime']}, words: {doc['words']}, headings: {headings}\n")

    handle.write('\n## Tickets Footprint\n')
    handle.write(f'- Files: {len(tickets)}; Total size: {human_size(tickets_bytes)}\n')

questions = []
if notebooks:
    questions.append(f'There are {len(notebooks)} notebook(s). Should we archive all notebooks to `archive/` or keep a curated subset?')
if logs:
    questions.append(f'Found {len(logs)} log file(s)/folders. OK to remove logs entirely (they are reproducible) or keep last N by date?')
if dumps:
    questions.append(f'Found {len(dumps)} dump/temp/DB artifacts. Should we archive DB files (`*.sqlite`, `*.db`) or delete them?')
if envs:
    questions.append(f'Found {len(envs)} environment file(s). Confirm which `.env*` can be ignored vs. need to keep examples only?')
if builds:
    questions.append(f'Detected build artifacts. OK to treat `/dist` and `/build` as generated and exclude from git?')
if strategies:
    questions.append('Strategy-related configs detected. Which directories or files are canonical versus experimental?')
if migrations:
    questions.append('Multiple migration artefacts detected. Confirm which migration paths remain active and which are legacy?')

if not questions:
    questions.append('No ambiguous items detected beyond common caches/logs. Confirm we can proceed with a conservative cleanup (archive, not delete).')

questions.extend([
    'Confirm that `tickets/*.jsonl` are sacred: archive never delete.',
    'Confirm there must be **no API order placement** in code or docs; review heuristics before any future removals.',
    'Confirm which strategy configs are the source of truth versus sample or legacy variants.'
])

with open(questions_path, 'w', encoding='utf-8') as handle:
    handle.write('# Follow-up Questions (Please answer in chat)\n\n')
    for index, question in enumerate(questions, 1):
        handle.write(f'{index}. {question}\n')
    handle.write('\n')
PY

echo "Scan complete."
echo "Report: $REPORT_MD"
echo "Questions: $QUESTIONS_MD"
echo "Artifacts: $SCAN_DIR"

if [[ -z "${ZIP_PATH:-}" ]]; then
  echo
  echo "To scan a ZIP instead of the working tree:"
  echo "  ZIP_PATH=/path/to/repo.zip bash scripts/scan_repo.sh"
fi
