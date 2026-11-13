/* -------------------------------------------------------------------------- */
/*                             FLOWCHARTY - app.js                            */
/*                           App behavior lives here                          */
/*                          Each section has one job                          */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                  SETTINGS                                  */
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
/*                                  APP STATE                                 */
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
