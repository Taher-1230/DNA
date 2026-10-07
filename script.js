/**
 * DNA Compression Simulator using Huffman Coding
 * Pure Vanilla JavaScript (No External Libraries)
 * Designed for DAA (Design and Analysis of Algorithms) Demonstration
 */

// =============================================================================
// 1. DATA STRUCTURES & ALGORITHM CLASSES
// =============================================================================

/**
 * Node in the Huffman Tree
 */
class HuffmanNode {
  constructor(char, freq, left = null, right = null) {
    this.char = char;         // e.g., 'A', 'T', 'G', 'C' (null for internal nodes)
    this.freq = freq;         // Frequency count
    this.left = left;         // Left child pointer (represents bit '0')
    this.right = right;       // Right child pointer (represents bit '1')
    this.isLeaf = (left === null && right === null);
    this.id = 'node_' + Math.random().toString(36).substr(2, 9);
    this.code = '';           // Assigned binary code
  }
}

// Standard Fixed 2-Bit Binary Encodings for DNA nucleotides
const FIXED_2BIT_CODES = {
  'A': '00',
  'C': '01',
  'G': '10',
  'T': '11'
};

const BASE_NAMES = {
  'A': 'Adenine',
  'T': 'Thymine',
  'G': 'Guanine',
  'C': 'Cytosine'
};

const BASE_COLORS = {
  'A': '#10b981', // Emerald
  'T': '#f43f5e', // Rose/Red
  'G': '#f59e0b', // Amber/Gold
  'C': '#06b6d4'  // Cyan
};

// =============================================================================
// 2. CORE HUFFMAN COMPRESSION ENGINE
// =============================================================================

/**
 * Count the frequency of each nucleotide (A, T, G, C) in the sequence
 * @param {string} seq - DNA sequence
 * @returns {Object} Frequencies of present nucleotides
 */
function countFrequencies(seq) {
  const freqs = { 'A': 0, 'T': 0, 'G': 0, 'C': 0 };
  for (let i = 0; i < seq.length; i++) {
    const base = seq[i];
    if (freqs.hasOwnProperty(base)) {
      freqs[base]++;
    }
  }
  return freqs;
}

/**
 * Build Huffman Tree using a Greedy Priority Queue approach
 * Returns both the tree root and step-by-step merge log for visualization
 */
function buildHuffmanTree(freqs) {
  // Filter only bases that appear at least once
  const activeBases = Object.keys(freqs).filter(b => freqs[b] > 0);

  if (activeBases.length === 0) {
    return { root: null, mergeLog: [] };
  }

  // Create initial leaf nodes
  let priorityQueue = activeBases.map(b => new HuffmanNode(b, freqs[b]));

  // Sort queue by frequency ascending (tie break alphabetically for deterministic output)
  priorityQueue.sort((a, b) => {
    if (a.freq !== b.freq) return a.freq - b.freq;
    return (a.char || '').localeCompare(b.char || '');
  });

  const mergeLog = [];

  // Special Edge Case: Sequence contains only 1 unique character (e.g., "AAAA")
  if (priorityQueue.length === 1) {
    const singleNode = priorityQueue[0];
    const dummyRoot = new HuffmanNode(null, singleNode.freq, singleNode, null);
    mergeLog.push({
      iteration: 1,
      selected: [singleNode.char + ` (${singleNode.freq})`],
      description: `Only 1 unique base present. Root created directly.`,
      merged: `Root (${dummyRoot.freq})`
    });
    return { root: dummyRoot, mergeLog };
  }

  let iteration = 1;

  // Greedy loop: continuously extract 2 nodes with smallest frequencies
  while (priorityQueue.length > 1) {
    // 1. Dequeue two smallest
    const leftChild = priorityQueue.shift();
    const rightChild = priorityQueue.shift();

    // 2. Create parent internal node
    const combinedFreq = leftChild.freq + rightChild.freq;
    const parentNode = new HuffmanNode(null, combinedFreq, leftChild, rightChild);

    // 3. Log this merge step for Step 2 visualization
    const leftLabel = leftChild.isLeaf ? `${leftChild.char} (${leftChild.freq})` : `Internal (${leftChild.freq})`;
    const rightLabel = rightChild.isLeaf ? `${rightChild.char} (${rightChild.freq})` : `Internal (${rightChild.freq})`;

    mergeLog.push({
      iteration: iteration++,
      leftLabel,
      rightLabel,
      combinedFreq,
      description: `Greedy Choice: Extracted 2 lowest frequencies [${leftLabel}] and [${rightLabel}]. Merged into parent with combined frequency ${combinedFreq}.`
    });

    // 4. Insert new parent node back into priority queue
    priorityQueue.push(parentNode);

    // 5. Re-sort priority queue
    priorityQueue.sort((a, b) => {
      if (a.freq !== b.freq) return a.freq - b.freq;
      const charA = a.char || 'Z';
      const charB = b.char || 'Z';
      return charA.localeCompare(charB);
    });
  }

  // The last remaining node is the root of the Huffman Tree
  const root = priorityQueue[0];
  return { root, mergeLog };
}

/**
 * Traverse the Huffman Tree to assign binary codes
 * Left edge = '0', Right edge = '1'
 */
function generateHuffmanCodes(root) {
  const codeMap = {};

  if (!root) return codeMap;

  // Edge case: single child tree
  if (root.isLeaf) {
    codeMap[root.char] = '0';
    root.code = '0';
    return codeMap;
  }

  function traverse(node, currentCode) {
    if (!node) return;

    node.code = currentCode;

    if (node.isLeaf) {
      codeMap[node.char] = currentCode || '0';
      return;
    }

    if (node.left) {
      traverse(node.left, currentCode + '0');
    }
    if (node.right) {
      traverse(node.right, currentCode + '1');
    }
  }

  traverse(root, '');
  return codeMap;
}

/**
 * Encode DNA sequence using the generated Huffman codebook
 */
function encodeSequence(seq, codeMap) {
  let encodedBitstream = '';
  const tokens = [];

  for (let i = 0; i < seq.length; i++) {
    const base = seq[i];
    const code = codeMap[base] || '';
    encodedBitstream += code;
    tokens.push({
      index: i,
      base: base,
      code: code
    });
  }

  return { encodedBitstream, tokens };
}

/**
 * Decode binary bitstream back into DNA sequence using the tree
 * Proves 100% lossless compression
 */
function decodeBitstream(bitstream, root) {
  if (!root || !bitstream) return '';

  let decodedSeq = '';
  let currentNode = root;

  // Single character edge case
  if (root.isLeaf) {
    return root.char.repeat(bitstream.length);
  }

  for (let i = 0; i < bitstream.length; i++) {
    const bit = bitstream[i];

    if (bit === '0') {
      currentNode = currentNode.left;
    } else if (bit === '1') {
      currentNode = currentNode.right;
    }

    if (currentNode && currentNode.isLeaf) {
      decodedSeq += currentNode.char;
      currentNode = root; // Return to root for next symbol
    }
  }

  return decodedSeq;
}

/**
 * Calculate compression statistics and Shannon entropy
 */
function calculateMetrics(seq, freqs, codeMap) {
  const totalBases = seq.length;
  if (totalBases === 0) return null;

  // 1. Original size: Standard fixed-length 2 bits per nucleotide
  const originalBits = totalBases * 2;

  // 2. Compressed size: Sum of (freq * codeLength)
  let compressedBits = 0;
  for (const base in freqs) {
    if (freqs[base] > 0 && codeMap[base]) {
      compressedBits += freqs[base] * codeMap[base].length;
    }
  }

  // 3. Difference and percentages
  const savedBits = originalBits - compressedBits;
  const compressionRatio = ((compressedBits / originalBits) * 100).toFixed(1);
  const savingsPercent = ((savedBits / originalBits) * 100).toFixed(1);
  const avgCodeLength = (compressedBits / totalBases).toFixed(2);

  // 4. Shannon Entropy: H = - sum(p_i * log2(p_i))
  let entropy = 0;
  for (const base in freqs) {
    if (freqs[base] > 0) {
      const p = freqs[base] / totalBases;
      entropy -= p * (Math.log2(p));
    }
  }

  return {
    totalBases,
    originalBits,
    compressedBits,
    savedBits,
    compressionRatio,
    savingsPercent,
    avgCodeLength,
    entropy: entropy.toFixed(2)
  };
}

// =============================================================================
// 3. DOM ELEMENTS & EVENT LISTENERS
// =============================================================================

const dnaInput = document.getElementById('dna-input');
const seqStatsPill = document.getElementById('seq-stats-pill');
const seqLengthVal = document.getElementById('seq-length-val');
const validationStatus = document.getElementById('validation-status');
const btnClear = document.getElementById('btn-clear');
const btnRunCompression = document.getElementById('btn-run-compression');
const btnStepMode = document.getElementById('btn-step-mode');
const btnRandomDna = document.getElementById('btn-random-dna');
const errorAlert = document.getElementById('error-alert');
const errorMessage = document.getElementById('error-message');
const resultsContainer = document.getElementById('results-container');

// View & Stepper Mode elements
const tabAllSteps = document.getElementById('tab-all-steps');
const tabStepper = document.getElementById('tab-stepper');
const stepperControls = document.getElementById('stepper-controls');
const btnStepPrev = document.getElementById('btn-step-prev');
const btnStepNext = document.getElementById('btn-step-next');
const btnStepAutoplay = document.getElementById('btn-step-autoplay');
const stepperIndicator = document.getElementById('stepper-indicator');
const btnCopyBitstream = document.getElementById('btn-copy-bitstream');
const copyBtnText = document.getElementById('copy-btn-text');

let currentStep = 1;
const TOTAL_STEPS = 7;
let autoplayTimer = null;
let currentCompressedBitstream = '';

// Step section elements
const stepSections = [
  document.getElementById('step-1-section'),
  document.getElementById('step-2-section'),
  document.getElementById('step-3-section'),
  document.getElementById('step-4-section'),
  document.getElementById('step-5-section'),
  document.getElementById('step-6-section'),
  document.getElementById('step-7-section')
];

// Input sanitization and validation
dnaInput.addEventListener('input', () => {
  cleanAndValidateInput();
});

btnClear.addEventListener('click', () => {
  dnaInput.value = '';
  cleanAndValidateInput();
  resultsContainer.classList.add('hidden');
  hideError();
  stopAutoplay();
});

// Preset Buttons
document.querySelectorAll('.btn-preset[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    dnaInput.value = btn.getAttribute('data-preset');
    cleanAndValidateInput();
    runSimulator(false);
  });
});

btnRandomDna.addEventListener('click', () => {
  const bases = ['A', 'T', 'G', 'C'];
  // Create a realistic skewed random DNA string of length 32
  // We bias towards 'A' and 'T' to demonstrate clear compression
  const weights = ['A', 'A', 'A', 'A', 'T', 'T', 'C', 'G'];
  let randomSeq = '';
  for (let i = 0; i < 32; i++) {
    randomSeq += weights[Math.floor(Math.random() * weights.length)];
  }
  dnaInput.value = randomSeq;
  cleanAndValidateInput();
  runSimulator(false);
});

// Run Compression Button
btnRunCompression.addEventListener('click', () => {
  setViewMode('all');
  runSimulator(false);
});

// Step-by-Step Mode Button
btnStepMode.addEventListener('click', () => {
  setViewMode('stepper');
  runSimulator(true);
});

// Tab Switchers
tabAllSteps.addEventListener('click', () => setViewMode('all'));
tabStepper.addEventListener('click', () => setViewMode('stepper'));

// Stepper Navigation
btnStepPrev.addEventListener('click', () => {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
});

btnStepNext.addEventListener('click', () => {
  if (currentStep < TOTAL_STEPS) {
    showStep(currentStep + 1);
  }
});

btnStepAutoplay.addEventListener('click', () => {
  if (autoplayTimer) {
    stopAutoplay();
  } else {
    startAutoplay();
  }
});

// Copy Bitstream Button
btnCopyBitstream.addEventListener('click', () => {
  if (!currentCompressedBitstream) return;
  navigator.clipboard.writeText(currentCompressedBitstream).then(() => {
    copyBtnText.textContent = 'Copied!';
    setTimeout(() => {
      copyBtnText.textContent = 'Copy Bitstream';
    }, 2000);
  });
});

// =============================================================================
// 4. INPUT VALIDATION & SANITIZATION
// =============================================================================

function cleanAndValidateInput() {
  let val = dnaInput.value.toUpperCase().replace(/\s+/g, '');
  seqLengthVal.textContent = val.length;

  if (val.length === 0) {
    validationStatus.className = 'validation-status';
    validationStatus.querySelector('.status-text').textContent = 'Enter A, T, G, C characters';
    hideError();
    return '';
  }

  // Check for non-ATGC characters
  const invalidChars = val.replace(/[ATGC]/g, '');

  if (invalidChars.length > 0) {
    validationStatus.className = 'validation-status invalid';
    validationStatus.querySelector('.status-text').textContent = `Invalid character(s): "${invalidChars.slice(0, 5)}"`;
    showError(`Input contains invalid character(s) (${invalidChars[0]}). Only characters A, T, G, and C are allowed.`);
    return null;
  }

  validationStatus.className = 'validation-status valid';
  validationStatus.querySelector('.status-text').textContent = 'Valid DNA sequence (Alphabet: A, T, G, C)';
  hideError();
  return val;
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorAlert.classList.remove('hidden');
}

function hideError() {
  errorAlert.classList.add('hidden');
}

// =============================================================================
// 5. VIEW MODE & STEPPER CONTROLLER
// =============================================================================

function setViewMode(mode) {
  if (mode === 'all') {
    tabAllSteps.classList.add('active');
    tabStepper.classList.remove('active');
    stepperControls.classList.add('hidden');
    stopAutoplay();
    // Show all step cards
    stepSections.forEach(sec => sec.classList.remove('hidden'));
  } else {
    tabAllSteps.classList.remove('active');
    tabStepper.classList.add('active');
    stepperControls.classList.remove('hidden');
    showStep(currentStep);
  }
}

function showStep(stepIndex) {
  currentStep = stepIndex;
  stepperIndicator.textContent = `Step ${currentStep} of ${TOTAL_STEPS}`;

  btnStepPrev.disabled = (currentStep === 1);
  btnStepNext.disabled = (currentStep === TOTAL_STEPS);

  // If stepper mode is active, hide all except the current step
  if (tabStepper.classList.contains('active')) {
    stepSections.forEach((sec, idx) => {
      if (idx === currentStep - 1) {
        sec.classList.remove('hidden');
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        sec.classList.add('hidden');
      }
    });
  } else {
    // In full mode, just scroll to step
    stepSections[currentStep - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function startAutoplay() {
  btnStepAutoplay.textContent = '⏸ Pause';
  btnStepAutoplay.classList.add('btn-primary');
  btnStepAutoplay.classList.remove('btn-accent');

  autoplayTimer = setInterval(() => {
    if (currentStep < TOTAL_STEPS) {
      showStep(currentStep + 1);
    } else {
      showStep(1); // loop back
    }
  }, 2600);
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
  btnStepAutoplay.textContent = '▶ Auto-Play';
  btnStepAutoplay.classList.remove('btn-primary');
  btnStepAutoplay.classList.add('btn-accent');
}

// =============================================================================
// 6. MAIN SIMULATOR ORCHESTRATOR
// =============================================================================

function runSimulator(isStepMode = false) {
  const seq = cleanAndValidateInput();
  if (!seq) {
    if (dnaInput.value.trim().length === 0) {
      showError('Please enter or select a DNA sequence to begin compression.');
    }
    return;
  }

  // 1. Count Frequencies
  const freqs = countFrequencies(seq);

  // 2. Build Huffman Tree with merge log
  const { root, mergeLog } = buildHuffmanTree(freqs);

  // 3. Generate Huffman Codes
  const codeMap = generateHuffmanCodes(root);

  // 4. Encode Sequence
  const { encodedBitstream, tokens } = encodeSequence(seq, codeMap);
  currentCompressedBitstream = encodedBitstream;

  // 5. Calculate Metrics
  const metrics = calculateMetrics(seq, freqs, codeMap);

  // 6. Decompress & Verify Lossless
  const reconstructedSeq = decodeBitstream(encodedBitstream, root);

  // Render all UI components
  renderStep1Frequencies(seq, freqs);
  renderStep2MergeLog(mergeLog);
  renderStep3TreeSVG(root);
  renderStep4Codebook(freqs, codeMap, seq.length);
  renderStep5EncodedStream(tokens, encodedBitstream);
  renderStep6Metrics(metrics);
  renderStep7Decompression(seq, reconstructedSeq);

  // Reveal results container
  resultsContainer.classList.remove('hidden');

  if (isStepMode) {
    setViewMode('stepper');
    showStep(1);
  } else {
    setViewMode('all');
    // Smooth scroll down to Step 1
    document.getElementById('step-1-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// =============================================================================
// 7. RENDER STEP 1: FREQUENCY COUNTING
// =============================================================================

function renderStep1Frequencies(seq, freqs) {
  const container = document.getElementById('freq-cards-grid');
  const distBar = document.getElementById('freq-distribution-bar');
  container.innerHTML = '';
  distBar.innerHTML = '';

  const total = seq.length;
  const bases = ['A', 'T', 'G', 'C'];

  bases.forEach(base => {
    const count = freqs[base] || 0;
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

    // Card element
    const card = document.createElement('div');
    card.className = `freq-card base-card-${base.toLowerCase()}`;
    card.innerHTML = `
      <div class="freq-avatar ${base.toLowerCase()}">${base}</div>
      <div class="freq-info">
        <div class="freq-name">Character ${base} (${BASE_NAMES[base]})</div>
        <div class="freq-count-row">
          <span class="freq-count">${count}</span>
          <span class="freq-pct">(${pct}%)</span>
        </div>
      </div>
    `;
    container.appendChild(card);

    // Distribution segment
    if (count > 0) {
      const seg = document.createElement('div');
      seg.className = `dist-seg seg-${base.toLowerCase()}`;
      seg.style.width = `${pct}%`;
      seg.title = `${base}: ${count} (${pct}%)`;
      distBar.appendChild(seg);
    }
  });
}

// =============================================================================
// 8. RENDER STEP 2: PRIORITY QUEUE MERGES
// =============================================================================

function renderStep2MergeLog(mergeLog) {
  const container = document.getElementById('queue-merges-timeline');
  container.innerHTML = '';

  if (mergeLog.length === 0) {
    container.innerHTML = `<div class="queue-step-item">No merges needed.</div>`;
    return;
  }

  mergeLog.forEach(step => {
    const item = document.createElement('div');
    item.className = 'queue-step-item';

    if (step.selected) {
      // Single node case
      item.innerHTML = `
        <div class="queue-step-meta">
          <span class="iteration-pill">Single Base</span>
          <div class="queue-step-desc">${step.description}</div>
        </div>
        <div class="queue-step-visual">
          <span class="queue-node-chip merged">${step.merged}</span>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div class="queue-step-meta">
          <span class="iteration-pill">Greedy Choice #${step.iteration}</span>
          <div class="queue-step-desc">${step.description}</div>
        </div>
        <div class="queue-step-visual">
          <span class="queue-node-chip">${step.leftLabel}</span>
          <span class="queue-operator">+</span>
          <span class="queue-node-chip">${step.rightLabel}</span>
          <span class="queue-operator">➔</span>
          <span class="queue-node-chip merged">Parent Node (${step.combinedFreq})</span>
        </div>
      `;
    }
    container.appendChild(item);
  });
}

// =============================================================================
// 9. RENDER STEP 3: DYNAMIC HUFFMAN TREE SVG DIAGRAM
// =============================================================================

function renderStep3TreeSVG(root) {
  const svg = document.getElementById('huffman-tree-svg');
  svg.innerHTML = '';

  if (!root) return;

  // Compute Tree Depth and Coordinates
  function getDepth(node) {
    if (!node) return 0;
    return 1 + Math.max(getDepth(node.left), getDepth(node.right));
  }

  const maxDepth = getDepth(root);
  const svgWidth = 800;
  const svgHeight = Math.max(340, maxDepth * 95 + 60);
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);

  // Tree Layout Algorithm (Assign X and Y coordinates to every node)
  let leafCount = 0;
  function countLeaves(node) {
    if (!node) return 0;
    if (node.isLeaf) return 1;
    return countLeaves(node.left) + countLeaves(node.right);
  }
  const totalLeaves = Math.max(1, countLeaves(root));

  // Assign X positions using in-order traversal
  let currentLeafIndex = 0;
  function assignPositions(node, depth = 0) {
    if (!node) return;

    node.y = 50 + depth * 80;

    if (node.isLeaf) {
      currentLeafIndex++;
      node.x = (svgWidth / (totalLeaves + 1)) * currentLeafIndex;
      return;
    }

    if (node.left) assignPositions(node.left, depth + 1);
    if (node.right) assignPositions(node.right, depth + 1);

    // Parent X is midpoint of left and right child
    if (node.left && node.right) {
      node.x = (node.left.x + node.right.x) / 2;
    } else if (node.left) {
      node.x = node.left.x;
    } else if (node.right) {
      node.x = node.right.x;
    }
  }

  assignPositions(root, 0);

  // Group elements for edges and nodes so edges are rendered under nodes
  const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(edgesGroup);
  svg.appendChild(nodesGroup);

  // Track parent relationships for path highlighting
  function setParents(node, parent = null) {
    if (!node) return;
    node.parent = parent;
    if (node.left) setParents(node.left, node);
    if (node.right) setParents(node.right, node);
  }
  setParents(root, null);

  const tooltip = document.getElementById('tree-tooltip');

  // Recursive renderer
  function drawTree(node) {
    if (!node) return;

    // Draw Left Edge
    if (node.left) {
      drawBranch(node, node.left, '0', edgesGroup);
      drawTree(node.left);
    }

    // Draw Right Edge
    if (node.right) {
      drawBranch(node, node.right, '1', edgesGroup);
      drawTree(node.right);
    }

    // Draw Node Glyph
    drawNode(node, nodesGroup);
  }

  function drawBranch(parent, child, bit, group) {
    // Curved Bezier Branch for modern aesthetic
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midY = (parent.y + child.y) / 2;
    const d = `M ${parent.x} ${parent.y} C ${parent.x} ${midY}, ${child.x} ${midY}, ${child.x} ${child.y}`;
    path.setAttribute('d', d);
    path.setAttribute('class', `tree-branch branch-${bit}`);
    path.setAttribute('data-target-id', child.id);
    child.branchElement = path;
    group.appendChild(path);

    // Edge Label Pill (0 or 1)
    const labelX = (parent.x + child.x) / 2;
    const labelY = (parent.y + child.y) / 2;

    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    labelBg.setAttribute('x', labelX - 10);
    labelBg.setAttribute('y', labelY - 9);
    labelBg.setAttribute('width', 20);
    labelBg.setAttribute('height', 18);
    labelBg.setAttribute('class', 'tree-edge-label-bg');
    group.appendChild(labelBg);

    const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelText.setAttribute('x', labelX);
    labelText.setAttribute('y', labelY);
    labelText.setAttribute('class', `tree-edge-label-text label-${bit}`);
    labelText.textContent = bit;
    group.appendChild(labelText);
  }

  function drawNode(node, group) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'tree-node-group');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);

    if (node.isLeaf) {
      circle.setAttribute('r', 24);
      circle.setAttribute('class', `tree-node-circle leaf-${node.char.toLowerCase()}`);
      
      // Interactive Path Highlighting & Tooltip
      circle.addEventListener('mouseenter', (e) => {
        let curr = node;
        while (curr && curr.branchElement) {
          curr.branchElement.classList.add('highlighted');
          curr = curr.parent;
        }
        if (tooltip) {
          tooltip.style.display = 'block';
          tooltip.innerHTML = `<strong>Character ${node.char} (${BASE_NAMES[node.char]})</strong><br>Frequency: ${node.freq}<br>Huffman Code: <span style="color:#38bdf8; font-weight:700;">${node.code}</span> (${node.code.length} bits)<br>Fixed Binary: <span style="color:#94a3b8">${FIXED_2BIT_CODES[node.char]}</span> (2 bits)`;
          const rect = svg.getBoundingClientRect();
          tooltip.style.left = `${e.clientX - rect.left + 15}px`;
          tooltip.style.top = `${e.clientY - rect.top - 15}px`;
        }
      });

      circle.addEventListener('mouseleave', () => {
        svg.querySelectorAll('.tree-branch').forEach(b => b.classList.remove('highlighted'));
        if (tooltip) tooltip.style.display = 'none';
      });

      g.appendChild(circle);

      // Character Letter
      const charText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      charText.setAttribute('x', node.x);
      charText.setAttribute('y', node.y - 4);
      charText.setAttribute('class', 'tree-node-text-char');
      charText.textContent = node.char;
      g.appendChild(charText);

      // Frequency subscript
      const freqText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      freqText.setAttribute('x', node.x);
      freqText.setAttribute('y', node.y + 11);
      freqText.setAttribute('class', 'tree-node-text-freq');
      freqText.textContent = `f=${node.freq}`;
      g.appendChild(freqText);

      // Huffman Code Badge below leaf
      const codeBadge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      codeBadge.setAttribute('x', node.x);
      codeBadge.setAttribute('y', node.y + 38);
      codeBadge.setAttribute('class', 'tree-node-code-badge');
      codeBadge.textContent = `code: ${node.code}`;
      g.appendChild(codeBadge);
    } else {
      circle.setAttribute('r', 18);
      circle.setAttribute('class', 'tree-node-circle internal');
      g.appendChild(circle);

      // Internal node combined frequency
      const freqText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      freqText.setAttribute('x', node.x);
      freqText.setAttribute('y', node.y);
      freqText.setAttribute('class', 'tree-node-text-char');
      freqText.style.fontSize = '12px';
      freqText.textContent = node.freq;
      g.appendChild(freqText);
    }

    group.appendChild(g);
  }

  drawTree(root);
}

// =============================================================================
// 10. RENDER STEP 4: CODEBOOK TABLE
// =============================================================================

function renderStep4Codebook(freqs, codeMap, totalBases) {
  const tbody = document.getElementById('codebook-tbody');
  const tfoot = document.getElementById('codebook-tfoot');
  tbody.innerHTML = '';

  const bases = ['A', 'T', 'G', 'C'];
  let totalFixedBits = 0;
  let totalHuffmanBits = 0;

  bases.forEach(base => {
    const count = freqs[base] || 0;
    const prob = totalBases > 0 ? (count / totalBases).toFixed(3) : '0.000';
    const fixedCode = FIXED_2BIT_CODES[base];
    const huffmanCode = count > 0 ? (codeMap[base] || '-') : '-';
    const codeLen = count > 0 && codeMap[base] ? codeMap[base].length : 0;

    const baseFixedBits = count * 2;
    const baseHuffmanBits = count * codeLen;
    const bitDiff = baseFixedBits - baseHuffmanBits;

    totalFixedBits += baseFixedBits;
    totalHuffmanBits += baseHuffmanBits;

    let diffClass = 'diff-neutral';
    let diffSign = '';
    if (bitDiff > 0) {
      diffClass = 'diff-positive';
      diffSign = `+${bitDiff} bits saved`;
    } else if (bitDiff < 0) {
      diffClass = 'diff-negative';
      diffSign = `${bitDiff} bits`;
    } else {
      diffSign = `0 bits`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="badge-base base-${base.toLowerCase()}">${base}</span>
        <strong>Character ${base} (${BASE_NAMES[base]})</strong>
      </td>
      <td><strong>${count}</strong></td>
      <td>${prob}</td>
      <td><span class="code-pill code-fixed">${fixedCode}</span> (2 bits)</td>
      <td><span class="code-pill code-huffman">${huffmanCode}</span></td>
      <td>${codeLen > 0 ? codeLen + ' bit(s)' : '-'}</td>
      <td>${baseFixedBits} bits</td>
      <td>${baseHuffmanBits} bits</td>
      <td class="${diffClass}">${count > 0 ? diffSign : '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  const netSavings = totalFixedBits - totalHuffmanBits;
  tfoot.innerHTML = `
    <tr>
      <td><strong>Total Summary</strong></td>
      <td><strong>${totalBases} chars</strong></td>
      <td><strong>1.000</strong></td>
      <td><strong>2.00 b/char</strong></td>
      <td><strong>Variable</strong></td>
      <td>-</td>
      <td><strong>${totalFixedBits} bits</strong></td>
      <td><strong>${totalHuffmanBits} bits</strong></td>
      <td class="${netSavings >= 0 ? 'diff-positive' : 'diff-negative'}">
        <strong>${netSavings >= 0 ? '+' : ''}${netSavings} bits (${totalFixedBits > 0 ? ((netSavings / totalFixedBits) * 100).toFixed(1) : 0}%)</strong>
      </td>
    </tr>
  `;
}

// =============================================================================
// 11. RENDER STEP 5: ENCODED SEQUENCE & BITSTREAM
// =============================================================================

function renderStep5EncodedStream(tokens, encodedBitstream) {
  const container = document.getElementById('nucleotide-stream-container');
  const display = document.getElementById('compressed-bitstream-display');
  container.innerHTML = '';

  // Limit chip rendering to 120 bases for performance, showing ellipsis if larger
  const maxDisplayTokens = Math.min(tokens.length, 120);

  for (let i = 0; i < maxDisplayTokens; i++) {
    const t = tokens[i];
    const chip = document.createElement('div');
    chip.className = `base-token-chip chip-${t.base.toLowerCase()}`;
    chip.innerHTML = `
      <span class="base-token-char ${t.base.toLowerCase()}">${t.base}</span>
      <span class="base-token-code">${t.code}</span>
    `;
    chip.title = `Base #${i + 1}: ${t.base} ➔ Binary: ${t.code}`;
    container.appendChild(chip);
  }

  if (tokens.length > maxDisplayTokens) {
    const moreChip = document.createElement('div');
    moreChip.className = 'base-token-chip';
    moreChip.innerHTML = `<span class="base-token-code">+${tokens.length - maxDisplayTokens} more</span>`;
    container.appendChild(moreChip);
  }

  // Display continuous bitstream with spaced 8-bit octets for readability
  let formattedBitstream = '';
  for (let i = 0; i < encodedBitstream.length; i += 8) {
    formattedBitstream += encodedBitstream.substring(i, i + 8) + ' ';
  }
  display.textContent = formattedBitstream.trim() || 'No bits generated';
}

// =============================================================================
// 12. RENDER STEP 6: METRICS & COMPARISON DASHBOARD
// =============================================================================

function renderStep6Metrics(metrics) {
  if (!metrics) return;

  // KPI Numbers
  document.getElementById('val-original-bits').innerHTML = `${metrics.originalBits} <span class="metric-unit">bits</span>`;
  document.getElementById('val-original-calc').textContent = `${metrics.totalBases} characters × 2 bits/char`;

  document.getElementById('val-compressed-bits').innerHTML = `${metrics.compressedBits} <span class="metric-unit">bits</span>`;
  document.getElementById('val-compressed-calc').textContent = `Average ${metrics.avgCodeLength} bits/character`;

  document.getElementById('val-saved-bits').innerHTML = `${metrics.savedBits} <span class="metric-unit">bits</span>`;
  if (metrics.savedBits > 0) {
    document.getElementById('val-saved-pct-tag').textContent = `+${metrics.savingsPercent}% bit reduction`;
    document.getElementById('val-ratio-desc').textContent = 'Savings over 2-bit fixed baseline';
    document.getElementById('savings-badge-top').textContent = `${metrics.savingsPercent}% Space Saved`;
    document.getElementById('savings-badge-top').className = 'badge badge-accent';
  } else if (metrics.savedBits === 0) {
    document.getElementById('val-saved-pct-tag').textContent = `0.0% (Worst Case: Equal Frequencies)`;
    document.getElementById('val-ratio-desc').textContent = 'Uniform 25% distribution';
    document.getElementById('savings-badge-top').textContent = `0% Saved (Worst Case)`;
    document.getElementById('savings-badge-top').className = 'badge badge-outline';
  } else {
    document.getElementById('val-saved-pct-tag').textContent = `${metrics.savingsPercent}% expansion`;
    document.getElementById('val-ratio-desc').textContent = 'Overhead due to small input';
    document.getElementById('savings-badge-top').textContent = `${metrics.savingsPercent}% (No savings)`;
    document.getElementById('savings-badge-top').className = 'badge badge-danger';
  }

  // Visual Size Bars
  const originalWidth = 100;
  const compressedRatioPercent = Math.min(100, Math.max(5, (metrics.compressedBits / metrics.originalBits) * 100));
  
  const barCompressedFill = document.getElementById('bar-compressed-fill');
  barCompressedFill.style.width = `${compressedRatioPercent}%`;
  document.getElementById('bar-compressed-text').textContent = `${compressedRatioPercent.toFixed(1)}% (${metrics.avgCodeLength} bits/char)`;
  document.getElementById('bar-original-text').textContent = `100.0% (2.00 bits/char)`;

  // Theoretical Insights
  document.getElementById('insight-avg-len').textContent = `${metrics.avgCodeLength} bits/character`;
  document.getElementById('insight-entropy').textContent = `${metrics.entropy} bits/character`;
}

// =============================================================================
// 13. RENDER STEP 7: LOSSLESS DECOMPRESSION VERIFICATION
// =============================================================================

function renderStep7Decompression(original, reconstructed) {
  const origElem = document.getElementById('decomp-original');
  const reconElem = document.getElementById('decomp-reconstructed');
  const statusBox = document.getElementById('decomp-status-box');
  const losslessBadge = document.getElementById('lossless-badge');

  origElem.textContent = original;
  reconElem.textContent = reconstructed;

  const isIdentical = (original === reconstructed);

  if (isIdentical) {
    statusBox.className = 'decomp-status';
    statusBox.innerHTML = `
      <svg class="decomp-check-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>
      <span>Verification Passed: 100% Lossless Match. All ${original.length} characters reconstructed identically via tree traversal!</span>
    `;
    losslessBadge.textContent = '100% Lossless';
    losslessBadge.className = 'badge badge-success';
  } else {
    statusBox.className = 'decomp-status alert-danger';
    statusBox.innerHTML = `<span>Mismatch detected during decompression.</span>`;
    losslessBadge.textContent = 'Mismatch';
    losslessBadge.className = 'badge';
  }
}

// =============================================================================
// 14. THEME TOGGLE & INITIALIZATION
// =============================================================================

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeLabel = document.getElementById('theme-label');

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    if (isDark) {
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'Dark Mode';
    } else {
      themeIcon.textContent = '☁️';
      themeLabel.textContent = 'Cloudy White';
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // Load default skewed sample sequence to show off immediate compression value
  dnaInput.value = 'AAAAAAAAAAAAAAAATTTTCCCCGG';
  cleanAndValidateInput();
  runSimulator(false);
});

