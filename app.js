/* -------------------------------------------------------------------------- */
/*                             FLOWCHARTY - app.js                            */
/*                           App behavior lives here                          */
/*                          Each section has one job                          */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                  SETTINGS                                 1*/
/* -------------------------------------------------------------------------- */
const GRID_SIZE = 20;
const FONT_SIZE = 14;
const LINE_HEIGHT = 18;
const LABEL_FONT_SIZE = 12;
const LABEL_LINE_HEIGHT = 16;
const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const BLUE = '#2f6fed';
const LINE_COLOR = '#5b6475';
const TEXT_COLOR = '#1d2433';
const SAVE_KEY = 'flowcharty';
const DOUBLE_CLICK_TIME = 350;
const SNAP_DISTANCE = 7;

const SHAPE_SIZES = {
  rect:     { width: 140, height: 64 },
  rounded:  { width: 140, height: 64 },
  pill:     { width: 140, height: 56 },
  diamond:  { width: 150, height: 96 },
  slant:    { width: 150, height: 64 },
  circle:   { width:  72, height: 72 },
  document: { width: 140, height: 72 },
  database: { width: 112, height: 84 },
  hexagon:  { width: 150, height: 64 }
}

const COLORS = [
{ fill: '#ffffff', border: '#3b4252' },
{ fill: '#e8f0fe', border: '#2f6fed' },
{ fill: '#e3f5ea', border: '#1f9254' },
{ fill: '#fff4cf', border: '#b7860b' },
{ fill: '#fde6ea', border: '#c8364f' },
{ fill: '#eee7fd', border: '#6a43c9' },
{ fill: '#eceff3', border: '#5b6475' }
];

const IS_MAC = navigator.userAgent.includes('Mac');
let COMMAND_KEY_NAME = 'Ctrl';
if (IS_MAC) {
  COMMAND_KEY_NAME = '⌘';
}

/* -------------------------------------------------------------------------- */
/*                                  APP STATE                                2*/
/* -------------------------------------------------------------------------- */

// The chart itself- every shape and every line
let chart = { shapes: [], lines: [], nextId: 1 };

// Where you are looking- x and y are the pan, zoom is the zoom level
let camera = { x: 0, y: 0, zoom: 1 };

// New line style
let lineStyle = { arrow: 'end', dashed: false, route: 'straight' };

// The fill color that new shapes get
let currentColor = '#ffffff';

// The last shape used - double clicking the canvas adds this type
let lastShapeType = 'rect';

// What is selected
let selectedShapeIds = [];
let selectedLineId = null;

// What is being typed into right now
let editing = null;

// Blue helper lines shown while dragging and the selection box
let guides = [];
let selectionBox = [];

// Spacebar hold check - spacebar + drag moves the view
let spaceIsDown = false;

// Used to spot double clicks
let lastClick = { target: '', time: 0 };

// Undo and Redo history
let undoStack = [];
let redoStack = [];

// Reused Elements
const canvas = document.getElementById('canvas');
const world = document.getElementById('world');
const textEditor = document.getElementById('text-editor');

/* -------------------------------------------------------------------------- */
/*                               Small Functions                             3*/
/* -------------------------------------------------------------------------- */
function findShape(id) {
  return chart.shapes.find(shape => shape.id === id);
}

function findLine(id) {
  return chart.lines.find(line => line.id === id);
}

function isSelected(shapeId) {
  return selectedShapeIds.includes(shapeId);
}
function selectOnly(shapeId) {
  selectedShapeIds = [shapeId];
  selectedLineId = null;
}

function clearSelection() {
  selectedShapeIds = [];
  selectedLineId = null;
}

function makeId(prefix) {
  const id = prefix + chart.nextId;
  chart.nextId = chart.nextId + 1;
  return id;
}

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function centerOf(shape) {
  return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2};
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function copyPoints(points) {
  return points.map(point => ({ x: point.x, y: point.y}));
}

function hasCommandKey(event) {
  return event.metaKey || event.ctrlKey;
}

function escapeText(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function borderColorFor(fill) {
  const color = COLORS.find(c => c.fill === fill);
  if (color) {
    return color.border;
  }
  return COLORS[0].border;
}

function screenToWorld(screenX, screenY) {
  const box = canvas.getBoundingClientRect();
  return {
    x: (screenX - box.left - camera.x) / camera.zoom,
    y: (screenY - box.top - camera.y) / camera.zoom
    };
}

function isDoubleClick(target) {
  const now = Date.now();
  const result = lastClick.target === target && now - lastClick.time < DOUBLE_CLICK_TIME;
  lastClick = { target: target, time: now };
  return result;
}

/* -------------------------------------------------------------------------- */
/*                               Saving and Undo                             4*/
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
/*                           Shape Outlines and Text                         5*/
/* -------------------------------------------------------------------------- */

// (0, 0) is the shape's top-left corner. w and h is its width and height
function shapeOutline(type, w, h) {
  if (type === 'rect') {
    return `M 0 0 H ${w} V ${h} H 0 Z`;
  }

  if (type === 'rounded') {
    const r = Math.min(12, w / 3, h / 3);
  return `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
  }

  if (type === 'pill') {
    const r = Math.min(w, h) /2;
    return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  }

  if (type === 'diamond') {
    return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
  }
  
  if (type === 'slant') {
    const s = Math.min(20, w * 0.2);
    return `M ${s} 0 H ${w} L ${w - s} ${h} H 0 Z`;
  }

  if (type === 'circle') {
    return `M 0 ${h / 2} A ${w / 2} ${h / 2} 0 1 1 ${w} ${h / 2} A ${w / 2} ${h / 2} 0 1 1 0 ${h / 2} Z`;
  }

  if (type === 'document') {
    return `M 0 0 H ${w} V ${h - 10} C ${w * 0.72} ${h - 26} ${w * 0.38} ${h + 8} 0 ${h - 8} Z`;
  }

  if (type === 'database') {
    return `M 0 12 A ${w / 2} 12 0 0 1 ${w} 12 V ${h - 12} A ${w / 2} 12 0 0 1 0 ${h - 12} Z`;
  }
  
  if (type === 'hexagon') {
    const s = Math.min(18, w * 0.2);
    return `M ${s} 0 H ${w - s} L ${w} ${h / 2} L ${w - s} ${h} H ${s} L 0 ${h / 2} Z`;
  }
  
  return `M 0 0 h ${w} V ${h} H 0 Z`;
}

// Determines how wide the text inside a shape is allowed to be
function textAreaWidth(shape) {
  let width = shape.width - 16;
  if (shape.type === 'diamond') {
    width = shape.width * 0.6;
  } else if (shape.type === 'slant') {
    width = shape.width - 44;
  } else if (shape.type === 'hexagon') {
    width = shape.width - 44;
  } else if (shape.type === 'circle') {
    width = shape.width * 0.74;
  } else if (shape.type === 'pill') {
    width = shape.width - shape.height * 0.6;
  }
  return Math.max(24, width);
  }

// Determines the top and bottom of where text is inside a shape
function textMiddleY(shape) {
  if (shape.type === 'database') {
    return shape.height / 2 + 6;
  }
  if (shape.type === 'document') {
    return shape.height / 2 - 5;
  }
  return shape.height / 2;
}

// a hidden canvas to measure how wide a text is
const measuringCanvas = document.createElement('canvas');
const measurer = measuringCanvas.getContext('2d');

// Adds a 'wraptext' feature for text in shapes
function wrapText(text, maxWidth, fontSize) {
  measurer.font = fontSize + 'px ' + FONT_FAMILY;
  const lines = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      if (word === '') {
        continue;
      }
      let tryLine = word;
      if (line !== '') {
        tryLine = line + ' ' + word;
      }
      if (line === '' || measurer.measureText(tryLine).width <= maxWidth) {
        line = tryLine;
      } else {
        lines.push(line);
        line = word;
      }
    }lines.push(line);
  }
  return lines;
}

/* -------------------------------------------------------------------------- */
/*                                Drawing Logic                              8*/
/* -------------------------------------------------------------------------- */

function drawShape(shape, forPicture){
  const border = borderColorFor(shape.fill);
  let svg = `<g data-shape="${shape.id}" transform="translate(${shape.x} ${shape.y})" style="cursor: move">`;
  svg += `<path d="${shapeOutline(shape.type, shape.width, shape.height)}" fill="${shape.fill}" stroke="${border}" stroke-width="1.6" stroke-linejoin="round"></path>`;

  if (shape.type === 'database') {
    svg += `<path d="M 0 12 A ${shape.width / 2} 12 0 0 0 ${shape.width} 12" fill="none" stroke="${border}" stroke-width="1.6"></path>`;
  }
  const beingEdited = editing !== null && editing.id === shape.id;
  if (shape.text !== '' && !beingEdited) {
    svg += drawShapeText(shape);
  }
  if (isSelected(shape.id) && !forPicture) {
    const z = camera.zoom;
    svg += `<rect x=" -5" y=" -5" width="${shape.width + 10}" height="${shape.height + 10}" rx="6" fill="none" stroke="${BLUE}" stroke-width="${1.5 / z}" stroke-dasharray="${5 / z} ${3 / z}" pointer-events="none"></rect>`;
  }
  svg += '</g>';
  return svg;
}

function drawShapeText(shape) {
  const lines = wrapText(shape.text, textAreaWidth(shape), FONT_SIZE);
  const firstLineY = textMiddleY(shape) - (lines.length - 1) * LINE_HEIGHT / 2;
  let svg = `<text font-size="${FONT_SIZE}" font-family="${FONT_FAMILY}" fill="${TEXT_COLOR}" text-anchor="middle" dominant-baseline="central">`;
  for (let i = 0; i < lines.length; i++) {
    svg += `<tspan x="${shape.width / 2}" y="${firstLineY + i * LINE_HEIGHT}">${escapeText(lines[i])}</tspan>`;
  }
  svg += '</text>';
  return svg;
}

function drawEverything(forPicture) {
  let svg = '';
  for (const line of chart.lines) {
    svg += drawLine(line, forPicture);
  }
  for (const shape of chart.shapes) {
    svg += drawShape(shape, forPicture);
  }
  return svg;
}

function render() {
  world.setAttribute('transform', `translate(${camera.x} ${camera.y}) scale(${camera.zoom})`);
  let svg = drawEverything(false);
  world.innerHTML = svg;
  
  const gridOnScreen = GRID_SIZE * camera.zoom;
  canvas.style.backgroundSize = `${gridOnScreen}px ${gridOnScreen}px`;
  canvas.style.backgroundPosition = `${camera.x}px ${camera.y}px`;
  const emptyMessage = document.getElementById('empty-message');
  if (chart.shapes.length === 0) {
    emptyMessage.style.display = 'block';
  } else {
    emptyMessage.style.display = 'none';
  }
  document.getElementById('zoom-label').textContent = Math.round(camera.zoom * 100) + '%';
}



/* -------------------------------------------------------------------------- */
/*                                   STARTUP                                16*/
/* -------------------------------------------------------------------------- */
console.log ('FlowCharty is running!')
render();