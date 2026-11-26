import { opportunities, systems, type SystemId } from '../data/roadmap';

function initRoadmap(exhibit: HTMLElement) {
  const report = exhibit.closest('.sample-report')!;
  const controls = [...exhibit.querySelectorAll<HTMLButtonElement>('[data-system], [data-opportunity]')];
  const edges = [...exhibit.querySelectorAll<SVGPathElement>('[data-from][data-to]')];
  const disclosure = report.querySelector<HTMLDetailsElement>('details')!;
  const reset = exhibit.querySelector<HTMLButtonElement>('[data-reset]')!;
  const label = exhibit.querySelector<HTMLElement>('[data-detail-label]')!;
  const title = exhibit.querySelector<HTMLElement>('[data-detail-title]')!;
  const copy = exhibit.querySelector<HTMLElement>('[data-detail-copy]')!;
  const status = exhibit.querySelector<HTMLElement>('[role="status"]')!;
  const defaultTitle = title.textContent;
  const defaultCopy = copy.textContent;

  type Selection = { system: SystemId } | { opportunity: number };
  const selectionFor = (button: HTMLButtonElement): Selection => button.dataset.system
    ? { system: button.dataset.system as SystemId }
    : { opportunity: Number(button.dataset.opportunity) };
  const same = (a: Selection | undefined, b: Selection) =>
    a !== undefined && ('system' in a ? 'system' in b && a.system === b.system : 'opportunity' in b && a.opportunity === b.opportunity);

  const items = controls.map((button) => ({ button, selection: selectionFor(button) }));
  let selected: Selection | undefined;
  let preview: { button: HTMLButtonElement; mode: 'pointer' | 'focus'; selection: Selection } | undefined;

  function render() {
    const active = preview?.selection ?? selected;
    const system = active && 'system' in active ? active.system : undefined;
    const opportunity = active && 'opportunity' in active ? opportunities.find(({ id }) => id === active.opportunity) : undefined;
    const related = system ? opportunities.filter((item) => item.systems.includes(system)) : opportunity ? [opportunity] : [];
    const relatedSystems = new Set(related.flatMap((item) => item.systems));

    for (const { button, selection } of items) {
      const isRelated = 'system' in selection ? relatedSystems.has(selection.system) : related.some(({ id }) => id === selection.opportunity);
      button.classList.toggle('is-related', isRelated);
      button.classList.toggle('is-active', same(active, selection));
      button.setAttribute('aria-pressed', String(same(selected, selection)));
    }

    for (const edge of edges) {
      edge.classList.toggle('is-related', related.some(({ systems }) => systems.includes(edge.dataset.from as SystemId) && systems.includes(edge.dataset.to as SystemId)));
    }
    label.textContent = preview && !same(selected, preview.selection) ? 'Preview' : active ? 'Current selection' : 'Explore the roadmap';
    title.textContent = system ? systems[system].name : opportunity?.name ?? defaultTitle;
    copy.textContent = system
      ? `${systems[system].detail} Related opportunities: ${related.map((item) => item.name).join(', ')}.`
      : opportunity
        ? `${opportunity.explanation} Related systems: ${opportunity.systems.map((id) => systems[id].name).join(', ')}.`
        : defaultCopy;
  }

  for (const { button, selection } of items) {
    const begin = (mode: 'pointer' | 'focus') => {
      preview = { button, mode, selection };
      render();
    };
    const end = (mode: 'pointer' | 'focus') => {
      if (preview?.button === button && preview.mode === mode) {
        preview = undefined;
        render();
      }
    };
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') begin('pointer');
    });
    button.addEventListener('pointerleave', () => end('pointer'));
    button.addEventListener('focus', () => begin('focus'));
    button.addEventListener('blur', () => end('focus'));
    button.addEventListener('click', () => {
      selected = selection;
      preview = undefined;
      render();
      status.textContent = `${title.textContent} selected. ${copy.textContent}`;
    });
    button.disabled = false;
  }

  reset.addEventListener('click', () => {
    selected = preview = undefined;
    render();
    status.textContent = 'Roadmap selection cleared.';
  });

  disclosure.addEventListener('toggle', () => {
    if (!disclosure.open && preview) {
      preview = undefined;
      render();
    }
  });
  if (window.matchMedia('(min-width: 60rem)').matches) disclosure.open = true;
  reset.hidden = false;
  exhibit.dataset.enhanced = '';
  render();
}

document.querySelectorAll<HTMLElement>('[data-roadmap-exhibit]').forEach(initRoadmap);
