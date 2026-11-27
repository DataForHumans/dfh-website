import { categories, flows, items, opportunities, priorities, quadrants, rankedOpportunities, scenario } from '../data/connection-map';

type Point = readonly [number, number];
type Bounds = readonly [number, number, number, number];
type Attrs = Record<string, string | number>;

const ns = 'http://www.w3.org/2000/svg';
const colors = {
  cream: 'var(--cream)',
  paper: 'var(--connection-paper)',
  green: 'var(--sage-deep)',
  sage: 'var(--sage-wash)',
  line: 'var(--sage-text)',
  blue: 'var(--diagram-blue)',
  ochre: 'var(--ochre)',
  border: 'var(--diagram-soft)',
  highValue: 'var(--connection-sage)',
};

const views = {
  wide: {
    width: 1000, height: 410, columns: [175, 500, 825],
    systems: [[145, 150], [390, 205], [650, 133], [855, 238]],
    processes: [[112, 49], [362, 101], [676, 34], [883, 140]],
    observations: [[135, 232], [399, 283], [650, 215], [850, 315]],
    curves: [[220, 105, 310, 155], [485, 251, 552, 100], [743, 105, 776, 224]],
    matrix: [75, 40, 390, 280],
  },
  narrow: {
    width: 360, height: 520, columns: [62, 180, 298],
    systems: [[83, 139], [264, 185], [99, 365], [265, 402]],
    processes: [[78, 53], [270, 93], [86, 284], [277, 315]],
    observations: [[82, 207], [264, 253], [94, 435], [265, 470]],
    curves: [[132, 104, 210, 123], [196, 210, 155, 290], [154, 325, 217, 350]],
    matrix: [44, 30, 285, 210],
  },
} as const;

function set(element: SVGElement, attributes: Attrs) {
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
}

function make<T extends keyof SVGElementTagNameMap>(parent: SVGElement, tag: T, attributes: Attrs = {}) {
  const element = document.createElementNS(ns, tag);
  set(element, attributes);
  parent.append(element);
  return element;
}

function text(parent: SVGElement, x: number, y: number, label: string, size = 16, weight = 400, anchor = 'middle', fill = colors.green) {
  const element = make(parent, 'text', { x, y, 'font-size': size, 'font-weight': weight, 'text-anchor': anchor, fill });
  element.textContent = label;
  return element;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;
function phase(time: number, start: number, end: number) {
  const progress = clamp((time - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
}
const opacity = (element: SVGElement, amount: number) => set(element, { opacity: clamp(amount) });
const translate = (x: number, y: number) => `translate(${x} ${y})`;

function wrap(element: SVGTextElement, label: string, width: number, lineHeight: number, x = 0) {
  element.replaceChildren();
  const lines = [make(element, 'tspan', { x })];
  for (const word of label.split(' ')) {
    const line = lines[lines.length - 1];
    const previous = line.textContent || '';
    line.textContent = previous ? `${previous} ${word}` : word;
    if (previous && line.getComputedTextLength() > width) {
      line.textContent = previous;
      const next = make(element, 'tspan', { x });
      next.textContent = word;
      lines.push(next);
    }
  }
  lines.forEach((line, index) => set(line, { dy: index === 0 ? -(lines.length - 1) * lineHeight / 2 : lineHeight }));
}

function marker(parent: SVGElement, id: number, radius: number) {
  make(parent, 'circle', { r: radius, fill: colors.ochre });
  text(parent, 0, 4.6, String(id), 14, 700, 'middle', 'var(--ink)');
}

function planGraphics(plan: SVGGElement, report: SVGGElement, view: typeof views.wide | typeof views.narrow, narrow: boolean) {
  plan.replaceChildren();
  report.replaceChildren();

  const [px, py, pw, ph] = view.matrix;
  const matrix = make(plan, 'g', { 'data-map-matrix': '' });
  make(matrix, 'rect', { x: px, y: py, width: pw, height: ph, fill: colors.sage, stroke: colors.line });
  make(matrix, 'rect', { x: px, y: py, width: pw / 2, height: ph / 2, fill: colors.highValue });
  make(matrix, 'path', { d: `M${px + pw / 2} ${py}V${py + ph} M${px} ${py + ph / 2}H${px + pw}`, stroke: colors.paper, 'stroke-width': 2 });
  quadrants.forEach((label, index) => {
    text(matrix, px + pw * (index % 2 ? 0.75 : 0.25), py + ph * (index >= 2 ? 0.5 : 0) + 20, label, narrow ? 13 : 14);
  });
  text(matrix, px + pw / 2, py + ph + 23, 'Implementation effort →', narrow ? 13 : 14);
  const benefit = text(matrix, 0, 0, 'Expected benefit →', narrow ? 13 : 14);
  set(benefit, { transform: `${translate(px - 19, py + ph / 2)} rotate(-90)` });

  const reportWidth = narrow ? 265 : 340;
  const reportHeight = 350;
  const reportX = (view.width - reportWidth) / 2 - 7;
  const reportY = narrow ? 61 : 23;
  const bounds: Bounds = [reportX, reportY, reportWidth, reportHeight];
  const seqX = narrow ? 30 : 555;
  const seqY = narrow ? 300 : 54;
  const seqSpacing = narrow ? 69 : 93;
  const sequence = make(plan, 'g', { 'data-map-ranking': '' });
  const sequenceTitle = text(sequence, seqX, seqY - 12, 'Ranked opportunities', narrow ? 16 : 19, 600, 'start');
  const rows = rankedOpportunities.map(opportunity => {
    const row = make(sequence, 'g', { 'data-map-ranked': opportunity.id });
    const rule = make(row, 'path', { d: `M0 34H${narrow ? 300 : 375}`, stroke: colors.border });
    const badge = make(row, 'g', { transform: translate(15, 1) });
    marker(badge, opportunity.id, 11);
    text(row, 39, -11, priorities[opportunity.rank], narrow ? 13 : 14, 600, 'start', colors.line);
    const label = text(row, 39, 14, opportunity.label, narrow ? 15 : 17, 500, 'start');
    // Reserve room for the longest label in the completed document as well as in the matrix view.
    wrap(label, opportunity.label, (reportWidth - 61) / (narrow ? 0.96 : 0.83), 14, 39);
    const from: Point = [seqX, seqY + seqSpacing * opportunity.rank + 25];
    return { row, rule, from };
  });

  const stack = make(report, 'g', { 'data-map-stack': '' });
  for (let i = 2; i >= 1; i--) {
    make(stack, 'rect', {
      x: reportX + i * 10, y: reportY - i * 9, width: reportWidth, height: reportHeight,
      fill: i === 2 ? colors.highValue : colors.sage, stroke: colors.line, 'stroke-width': 1.2,
    });
  }
  const cover = make(stack, 'g');
  make(cover, 'rect', { x: reportX, y: reportY, width: reportWidth, height: reportHeight, fill: colors.paper, stroke: colors.line, 'stroke-width': 1.3 });
  make(cover, 'rect', { x: reportX, y: reportY, width: reportWidth, height: 8, fill: colors.green });
  text(cover, reportX + 19, reportY + 37, 'Data for Humans', narrow ? 15 : 16, 600, 'start');
  const reportTitle = text(cover, reportX + 19, reportY + 71, 'Your data strategy', narrow ? 24 : 29, 400, 'start');
  reportTitle.classList.add('connection-map__report-title');
  text(cover, reportX + 19, reportY + 96, scenario.name, narrow ? 14 : 15, 400, 'start', colors.line);
  make(cover, 'path', { d: `M${reportX + 19} ${reportY + 113}H${reportX + reportWidth - 19}`, stroke: colors.border });
  text(report, view.width / 2, narrow ? 450 : 398, scenario.closing, narrow ? 15 : 16, 600);

  return { matrix, sequenceTitle, rows, stack, cover, bounds };
}

export function createScene(svg: SVGSVGElement) {
  svg.replaceChildren();
  const flowLayer = make(svg, 'g');
  const peopleLayer = make(svg, 'g');
  const connectionLayer = make(svg, 'g');
  const itemLayer = make(svg, 'g');
  const reportLayer = make(svg, 'g', { 'data-map-report': '' });
  const planLayer = make(svg, 'g', { 'data-map-priorities': '' });
  const markerLayer = make(svg, 'g');

  const contributions = items.map((item, index) => {
    const group = make(itemLayer, 'g', { 'data-map-item': item.id });
    const ownedBefore = items.slice(0, index).filter(previous => previous.person === item.person).length;
    return {
      ...item, description: item.label, group, ownedBefore,
      box: make(group, 'rect'), node: make(group, 'circle'), label: text(group, 0, 0, item.label),
    };
  });
  const people = scenario.staff.map((name, index) => {
    const group = make(peopleLayer, 'g', { 'data-map-person': index + 1 });
    make(group, 'circle', { r: 16, fill: colors.blue });
    return { group, name, label: text(group, 0, 39, name, 15, 600) };
  });
  const categoryLabels = categories.map(category => text(peopleLayer, 0, 0, category.label, 17, 600));
  const flowLines = flows.map(({ process }) => make(flowLayer, 'path', {
    'data-map-flow': process, fill: 'none', stroke: colors.line, 'stroke-width': 1.8, 'stroke-linecap': 'round',
  }));
  const proposedLines = opportunities.map(opportunity => make(connectionLayer, 'path', {
    'data-map-proposal': opportunity.id, fill: 'none', stroke: colors.ochre,
    'stroke-width': 3.5, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1,
  }));
  const callout = text(connectionLayer, 0, 0, '', 26, 700);
  set(callout, { 'data-map-callout': '' });
  const markers = opportunities.map(({ id }) => {
    const group = make(markerLayer, 'g', { 'data-map-marker': id });
    marker(group, id, 13);
    return group;
  });

  function layout(narrow: boolean) {
    const view = narrow ? views.narrow : views.wide;
    set(svg, { viewBox: `0 0 ${view.width} ${view.height}` });
    people.forEach((person, index) => {
      set(person.group, { transform: translate(view.columns[index], narrow ? 27 : 38) });
      set(person.label, { 'font-size': narrow ? 13 : 15 });
      wrap(person.label, person.name, narrow ? 112 : 215, 14);
    });
    categoryLabels.forEach((label, index) => set(label, {
      x: view.columns[index], y: narrow ? 30 : 39, 'font-size': narrow ? 14 : 17,
    }));
    const map = Object.fromEntries(flows.flatMap((flow, index) => [
      [flow.process, view.processes[index]], [flow.system, view.systems[index]],
    ])) as Record<string, Point>;
    const observationOrder = ['obs-stock', 'obs-demand', 'obs-coverage', 'obs-overlap'];
    observationOrder.forEach((id, index) => { map[id] = view.observations[index]; });
    const positions = contributions.map(item => {
      const category = categories.findIndex(entry => entry.ids.some(id => id === item.id));
      const row = categories[category].ids.findIndex(id => id === item.id);
      set(item.label, { 'font-size': narrow ? 13 : 16 });
      wrap(item.label, item.description, narrow ? 101 : 210, 14);
      return {
        staff: [view.columns[item.person], (narrow ? 111 : 112) + item.ownedBefore * (narrow ? 64 : 55)] as Point,
        group: [view.columns[category], (narrow ? 90 : 103) + row * (narrow ? 78 : 67)] as Point,
        map: map[item.id],
      };
    });
    flows.forEach(({ process, system }, index) => {
      const [x, y] = map[process], [endX, endY] = map[system];
      set(flowLines[index], { d: `M${x} ${y + (narrow ? 18 : 22)} Q${x} ${(y + endY) / 2} ${endX} ${endY - (narrow ? 14 : 23)}` });
    });
    const markerPositions = opportunities.map(({ systems: [from, to] }, index) => {
      const [x, y] = map[from], [endX, endY] = map[to];
      const [a, b, c, d] = view.curves[index];
      const line = proposedLines[index];
      set(line, { d: `M${x} ${y} C${a} ${b} ${c} ${d} ${endX} ${endY}` });
      const point = line.getPointAtLength(line.getTotalLength() / 2);
      return [point.x, point.y] as Point;
    });
    return { view, positions, markerPositions, narrow, ...planGraphics(planLayer, reportLayer, view, narrow) };
  }

  // During a crossover the same cards and markers keep moving. Briefly conceal
  // the lower-priority label when two labels would occupy the same space.
  let concealed = new Set<SVGTextElement>();
  function clearOverlaps(active: boolean) {
    const next = new Set<SVGTextElement>();
    if (active) {
      const occupied: DOMRect[] = [];
      const layers = [markerLayer, planLayer, reportLayer, connectionLayer, peopleLayer, itemLayer];
      for (const layer of layers) {
        for (const label of layer.querySelectorAll('text')) {
          let alpha = 1;
          for (let el: Element | null = label; el && el !== svg; el = el.parentElement) {
            alpha *= Number(el.getAttribute('opacity') ?? 1);
          }
          if (alpha <= 0.02 || !label.textContent) continue;
          const rect = label.getBoundingClientRect();
          const overlaps = occupied.some(other =>
            Math.min(rect.right, other.right) - Math.max(rect.left, other.left) > 1 &&
            Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top) > 1);
          if (overlaps) next.add(label);
          else occupied.push(rect);
        }
      }
    }
    for (const label of concealed) {
      if (!next.has(label)) label.removeAttribute('visibility');
    }
    for (const label of next) {
      if (!concealed.has(label)) label.setAttribute('visibility', 'hidden');
    }
    concealed = next;
  }

  let composition: ReturnType<typeof layout>;
  let calloutIndex = -1;

  function resize(narrow: boolean) {
    composition = layout(narrow);
    calloutIndex = -1;
  }

  function draw(time: number) {
    const { narrow, positions, markerPositions, view, matrix, sequenceTitle, rows, stack, cover, bounds } = composition;
    const sort = phase(time, 5.9, 7.7);
    const map = phase(time, 9, 12.8);
    const present = 1 - phase(time, 26, 27.2);

    // Keep the contribution elements intact as they move from staff to categories to the operational map.
    people.forEach((person, index) => opacity(person.group, phase(time, 0.1 + index * 0.19, 0.65 + index * 0.19) * (1 - sort)));
    categoryLabels.forEach(label => opacity(label, sort * (1 - map)));
    contributions.forEach((item, index) => {
      const { staff, group, map: point } = positions[index];
      const x = mix(mix(staff[0], group[0], sort), point[0], map);
      const y = mix(mix(staff[1], group[1], sort), point[1], map);
      const start = [1.15, 2.35, 3.75][item.person] + item.ownedBefore * 0.22;
      const system = item.kind === 'sys';
      const width = narrow ? 108 : 222;
      const height = narrow ? 36 : 42;
      const observation = item.kind === 'obs';
      opacity(item.group, phase(time, start, start + 0.32) * present * (observation ? 1 - phase(time, 16, 16.7) : 1));
      set(item.group, { transform: translate(x, y) });
      set(item.box, {
        x: -width / 2, y: -height / 2, width, height, rx: observation ? 2 : 0,
        fill: item.kind === 'proc' ? colors.sage : observation ? colors.paper : colors.cream,
        stroke: item.kind === 'proc' ? 'none' : colors.border, opacity: system ? 1 - map : 1,
      });
      set(item.node, { r: mix(0, narrow ? 14 : 23, map), fill: colors.cream, stroke: colors.line, 'stroke-width': narrow ? 2 : 2.6, opacity: system ? map : 0 });
      set(item.label, { y: mix(5, system ? (narrow ? 31 : 48) : 5, map), 'font-weight': observation ? 400 : 500 });
    });

    flowLines.forEach(line => opacity(line, phase(time, 12, 14.2) * present));
    proposedLines.forEach((line, index) => {
      const reveal = phase(time, 16 + index * 3, 17.2 + index * 3);
      set(line, { 'stroke-dashoffset': 1 - reveal, opacity: (reveal > 0 ? 1 : 0) * present });
    });

    const index = time < 19 ? 0 : time < 22 ? 1 : 2;
    if (index !== calloutIndex) {
      set(callout, { x: view.width / 2, y: narrow ? 505 : 385, 'font-size': narrow ? 17 : 28 });
      wrap(callout, opportunities[index].label, view.width - 20, 18, view.width / 2);
      calloutIndex = index;
    }
    opacity(callout, time >= 16 && time < 26 ? phase(time, 16.65 + index * 3, 17.15 + index * 3) * (1 - phase(time, 25.8, 26)) : 0);

    // The matrix and the same ranked row elements travel into the layered report.
    const prioritizing = phase(time, 26.3, 28.8);
    const delivering = phase(time, 33, 35.5);
    opacity(planLayer, phase(time, 26, 27.1));
    const [px, py, pw, ph] = view.matrix;
    const [rx, ry, rw, rh] = bounds;
    const kx = mix(1, rw / pw, delivering), ky = mix(1, rh / ph, delivering);
    const mx = mix(px, rx + 20, delivering), my = mix(py, ry - 18, delivering);
    set(matrix, { transform: `${translate(mx, my)} scale(${kx} ${ky}) ${translate(-px, -py)}` });
    opacity(matrix, 1 - phase(time, 33.9, 34.65));
    Array.from(matrix.children).slice(1).forEach(child => opacity(child as SVGElement, 1 - phase(time, 33, 33.7)));

    opacity(sequenceTitle, phase(time, 28.8, 29.25) * (1 - phase(time, 33, 33.7)));
    rows.forEach(({ row, rule, from }, rank) => {
      const scale = mix(1, narrow ? 0.96 : 0.83, delivering);
      const x = mix(from[0], rx + 10, delivering), y = mix(from[1], ry + 147 + rank * 56, delivering);
      set(row, { transform: `${translate(x, y)} scale(${scale})` });
      opacity(row, phase(time, 29 + rank * 0.7, 29.5 + rank * 0.7));
      opacity(rule, 1 - phase(time, 33, 33.6));
    });
    markers.forEach((group, index) => {
      const [x, y] = markerPositions[index];
      const [relativeX, relativeY] = opportunities[index].matrix;
      const endX = mx + relativeX * pw * kx, endY = my + relativeY * ph * ky;
      // Give the two crossing numbered markers room to pass without swapping identities.
      const arc = !narrow && index < 2 ? Math.sin(Math.PI * prioritizing) * (index === 0 ? 22 : -22) : 0;
      set(group, { transform: translate(mix(x, endX, prioritizing), mix(y, endY, prioritizing) + arc) });
      opacity(group, phase(time, 16.75 + index * 3, 17.2 + index * 3) * (1 - phase(time, 33, 33.7)));
    });
    opacity(reportLayer, phase(time, 33.8, 35.3));
    opacity(cover, phase(time, 34.5, 35.15));
    set(stack, { transform: translate(0, mix(12, 0, delivering)) });

    clearOverlaps(
      (sort > 0 && sort < 1) || (map > 0 && map < 1) || (time >= 26 && time <= 28.8) ||
      (delivering > 0 && delivering < 1),
    );
  }

  return { resize, draw };
}
