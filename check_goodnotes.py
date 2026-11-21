"""Read the public sharing endpoint; persist only an allowlist, never tokens."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.request

SHARE = 'MJbDtYQRseZYpHrdMvT74z'
ROOT = Path(__file__).resolve().parent


def fetch_snapshot():
    request = urllib.request.Request(
        f'https://api.goodnotes.com/v3/documents/{SHARE}',
        headers={'User-Agent': 'Goodnotes-public-note-change-check/1.0', 'Accept': 'application/json'},
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.load(response)
            break
        except Exception:
            if attempt == 2:
                raise RuntimeError('Goodnotes public endpoint unavailable; baseline unchanged') from None
            time.sleep(3 * (attempt + 1))
    if payload.get('type') != 'Ok' or not isinstance(payload.get('document'), dict):
        raise RuntimeError('Share unavailable; baseline unchanged')
    document = payload['document']
    ids = document.get('pageIds')
    pages = document.get('pages')
    if not isinstance(ids, list) or not ids or not isinstance(pages, dict) or len(ids) != len(set(ids)):
        raise RuntimeError('Unexpected Goodnotes schema; baseline unchanged')
    result = {'schema': 1, 'share': SHARE, 'revision': document.get('version'),
              'last_modified': document.get('lastModified'), 'pages': []}
    if not result['revision']:
        raise RuntimeError('Missing document revision; baseline unchanged')
    for number, page_id in enumerate(ids, 1):
        page = pages.get(page_id)
        if not isinstance(page, dict) or not page.get('version'):
            raise RuntimeError('Incomplete page metadata; baseline unchanged')
        result['pages'].append({'page': number, 'id': page_id, 'revision': page['version'],
                                'last_modified': page.get('lastModified'),
                                'position': page.get('position')})
    result['fingerprint'] = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()
    return result


def compare(previous, current):
    old = {p['id']: p for p in previous['pages']}
    new = {p['id']: p for p in current['pages']}
    return {'changed': previous['fingerprint'] != current['fingerprint'],
            'added_pages': [p['page'] for p in current['pages'] if p['id'] not in old],
            'modified_pages': [p['page'] for p in current['pages'] if p['id'] in old and
                               (p['revision'], p['last_modified']) !=
                               (old[p['id']]['revision'], old[p['id']]['last_modified'])],
            'moved_pages': [p['page'] for p in current['pages'] if p['id'] in old and
                           p['page'] != old[p['id']]['page']],
            'removed_previous_pages': [p['page'] for p in previous['pages'] if p['id'] not in new]}


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    current = fetch_snapshot()
    path = ROOT / 'monitor' / 'latest.json'
    previous = json.loads(path.read_text(encoding='utf-8')) if path.exists() else current
    result = compare(previous, current)
    checked = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    report = {'checked_at': checked, 'initial_baseline': not path.exists(),
              'page_count': len(current['pages']), **result}
    reviewed_path = ROOT / 'monitor' / 'reviewed.json'
    reviewed = json.loads(reviewed_path.read_text(encoding='utf-8')) if reviewed_path.exists() else current
    report['pending_since_transcription'] = compare(reviewed, current)
    write_json(path, current)
    if not reviewed_path.exists():
        write_json(reviewed_path, current)
    write_json(ROOT / 'monitor' / 'status.json', report)
    if result['changed']:
        write_json(ROOT / 'monitor' / 'history' / (checked[:10] + '.json'), report)
    message = ('检测到笔记更新' if result['changed'] else '本次未检测到新变化')
    lines = [f'## {message}', f'检查时间（UTC）：{checked}', f'当前页数：{report["page_count"]}',
             f'新增页：{result["added_pages"]}', f'修改页：{result["modified_pages"]}',
             f'顺序变化页：{result["moved_pages"]}', f'删除页（旧页码）：{result["removed_previous_pages"]}',
             '', '版本变化也可能来自文稿属性修改。检测结果需要识图确认，题库不会据此自动改写。',
             'pending_since_transcription 保留相对上次题库整理的变化，不会被下一次无变化检查清除。']
    summary = '\n\n'.join(lines) + '\n'
    (ROOT / 'monitor' / '报告.md').write_text(summary, encoding='utf-8')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as output:
            output.write(summary)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
