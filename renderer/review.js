const reviewMode = document.getElementById('review-mode');
const prioritySection = document.getElementById('priority');
const storagePrefix = 'goodnotes.MJbDtYQRseZYpHrdMvT74z.review.v1.';
const records = new Map();
const origins = new Map();
const storageNotice = document.getElementById('storage-notice');

for (const card of cards) {
  const marker = document.createComment(card.id);
  card.before(marker);
  origins.set(card, marker);
  try {
    const value = localStorage.getItem(storagePrefix + card.dataset.reviewKey);
    if (value === 'retry' || value === 'done') records.set(card, value);
  } catch {
    storageNotice.hidden = false;
  }
  paintMark(card);
}

function paintMark(card) {
  const value = records.get(card);
  for (const button of card.querySelectorAll('[data-mark]')) {
    button.setAttribute('aria-pressed', String(button.dataset.mark === value));
  }
}

function arrangeReview() {
  for (const card of cards) {
    if (reviewMode.value === 'review' && records.get(card) === 'retry') {
      prioritySection.append(card);
    } else if (card.parentElement === prioritySection) {
      origins.get(card).after(card);
    }
  }
}

function reviewMatches(card) {
  const solved = records.get(card) === 'done';
  return reviewMode.value === 'all' || (reviewMode.value === 'solved' ? solved : !solved);
}

reviewMode.addEventListener('change', () => {
  arrangeReview();
  filter();
});

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-mark]');
  if (!button) return;
  const card = button.closest('.question');
  const value = button.dataset.mark;
  records.set(card, value);
  try {
    localStorage.setItem(storagePrefix + card.dataset.reviewKey, value);
  } catch {
    storageNotice.hidden = false;
  }
  paintMark(card);
  // Keep the reader in place when marking a difficult question during this visit.
  const next = card.nextElementSibling;
  filter();
  if (card.hidden) {
    const focusTarget = next?.matches('.question:not([hidden])') ?
      next.querySelector('[data-mark]') : reviewMode;
    focusTarget.focus({preventScroll: true});
  }
  const message = value === 'done' ? '已标记做出来了' : '下次优先复习';
  document.getElementById('review-feedback').textContent =
    '第 ' + card.id.slice(2) + ' 题，' + message;
});

window.addEventListener('storage', event => {
  if (event.key !== null && !event.key.startsWith(storagePrefix)) return;
  for (const card of cards) {
    if (event.key === null) records.delete(card);
    else if (event.key === storagePrefix + card.dataset.reviewKey) {
      if (event.newValue === 'retry' || event.newValue === 'done') records.set(card, event.newValue);
      else records.delete(card);
    } else continue;
    paintMark(card);
  }
  arrangeReview();
  filter();
});

function revealLinkedQuestion() {
  const linked = document.getElementById(location.hash.slice(1));
  if (!linked?.matches('.question') || !linked.hidden) return;
  if (!reviewMatches(linked)) reviewMode.value = 'all';
  arrangeReview();
  resetFilters();
  linked.scrollIntoView();
}

arrangeReview();
filter();
window.addEventListener('hashchange', revealLinkedQuestion);
revealLinkedQuestion();
