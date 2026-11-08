import { hasTour } from './media.js?v=20261108-fix2';

export function mountTour({ houses, toast }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'property-tour-dialog';
  dialog.setAttribute('aria-labelledby', 'tour-dialog-title');
  dialog.innerHTML = `<section class="tour-window"><header class="tour-dialog-header"><div><span class="small-label">3D SAYOHAT</span><h2 id="tour-dialog-title"></h2><p>Konsept model · Sichqoncha bilan aylantiring yoki ichkarida yuring</p></div><button type="button" class="btn btn-outline tour-close" aria-label="3D sayohatni yopish">✕ <span>Yopish</span></button></header><div class="tour-dialog-stage"></div></section>`;
  document.body.append(dialog);
  const stage = dialog.querySelector('.tour-dialog-stage');
  let opener = null;

  function close() {
    if (!dialog.open) return;
    const frame = stage.querySelector('iframe');
    if (frame) frame.src = 'about:blank';
    stage.replaceChildren();
    dialog.close();
    document.body.classList.remove('tour-open');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }

  function open(id, trigger) {
    const listing = houses.find(item => item.id === Number(id));
    if (!hasTour(listing)) {
      toast('Bu e’lon uchun 3D model hali qo‘shilmagan', 'error');
      return;
    }
    if (dialog.open) return;
    opener = trigger;
    dialog.querySelector('h2').textContent = listing.title;
    const frame = document.createElement('iframe');
    frame.title = `${listing.title} — interaktiv 3D sayohat`;
    frame.src = './premium-house.html?embed=1&expanded=1&v=20261108-fix2';
    frame.setAttribute('allow', 'fullscreen');
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock');
    stage.replaceChildren(frame);
    document.body.classList.add('tour-open');
    dialog.showModal();
    dialog.querySelector('.tour-close').focus();
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-tour-id]');
    if (!trigger) return;
    event.preventDefault();
    open(trigger.dataset.tourId, trigger);
  });
  dialog.querySelector('.tour-close').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  window.addEventListener('hashchange', close);
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === stage.querySelector('iframe')?.contentWindow && event.data?.type === 'marketplace:close-tour') close();
  });
  return { open, close };
}
