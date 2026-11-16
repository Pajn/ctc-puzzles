const input = document.getElementById('q');
const status = document.getElementById('status');
const empty = document.getElementById('empty');
const cells = [...document.querySelectorAll('#videos > li')];

let frame = 0;
function apply() {
  const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const cell of cells) {
    const q = cell.dataset.q;
    const match = terms.every((t) => q.includes(t));
    cell.hidden = !match;
    if (match) shown++;
  }
  status.textContent = terms.length ? `${shown} of ${cells.length} videos` : '';
  empty.hidden = shown > 0;
  const url = new URL(location.href);
  if (input.value) url.searchParams.set('q', input.value);
  else url.searchParams.delete('q');
  history.replaceState(null, '', url);
}

input.addEventListener('input', () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(apply);
});

const initial = new URLSearchParams(location.search).get('q');
if (initial) {
  input.value = initial;
  apply();
}
