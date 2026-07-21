#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function fail(msg) {
  console.error('ERROR: ' + msg);
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  fail('Usage: node ua-tour-analyze.js <input.json> <output.json>');
}

let raw;
try {
  raw = fs.readFileSync(inputPath, 'utf8');
} catch (e) {
  fail('Could not read input file: ' + e.message);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  fail('Invalid JSON in input file: ' + e.message);
}

const nodes = Array.isArray(data.nodes) ? data.nodes : [];
const edges = Array.isArray(data.edges) ? data.edges : [];
const layers = Array.isArray(data.layers) ? data.layers : [];

if (nodes.length === 0) {
  fail('No nodes found in input.');
}

const nodeById = new Map();
for (const n of nodes) {
  nodeById.set(n.id, n);
}

// Restrict "file" type nodes for BFS/entry-point purposes to actual file/config/document
// but fan-in/fan-out should consider ALL nodes (including function nodes) since edges reference them.
// However per spec we rank "nodes" generically -- but tour only cares about file-level nodes.
// We'll compute fan-in/fan-out over ALL nodes in the graph (since edges may point to function: nodes),
// but only file-level types (file/document/service/pipeline/table/schema/resource/endpoint/config)
// are eligible for the top-20 rankings output, matching what the tour builder needs.

const FILE_LEVEL_TYPES = new Set([
  'file', 'document', 'service', 'pipeline', 'table', 'schema', 'resource', 'endpoint', 'config'
]);

const fanIn = new Map();
const fanOut = new Map();
for (const n of nodes) {
  fanIn.set(n.id, 0);
  fanOut.set(n.id, 0);
}

const adjForward = new Map(); // id -> [{target, type}]
for (const n of nodes) adjForward.set(n.id, []);

for (const e of edges) {
  if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
  fanOut.set(e.source, (fanOut.get(e.source) || 0) + 1);
  fanIn.set(e.target, (fanIn.get(e.target) || 0) + 1);
  adjForward.get(e.source).push({ target: e.target, type: e.type });
}

function isFileLevel(n) {
  return FILE_LEVEL_TYPES.has(n.type);
}

// A. Fan-In Ranking (top 20, file-level nodes only, for tour relevance)
const fanInRanking = nodes
  .filter(isFileLevel)
  .map((n) => ({ id: n.id, fanIn: fanIn.get(n.id) || 0, name: n.name }))
  .sort((a, b) => b.fanIn - a.fanIn)
  .slice(0, 20);

// B. Fan-Out Ranking (top 20, file-level nodes only)
const fanOutRanking = nodes
  .filter(isFileLevel)
  .map((n) => ({ id: n.id, fanOut: fanOut.get(n.id) || 0, name: n.name }))
  .sort((a, b) => b.fanOut - a.fanOut)
  .slice(0, 20);

// Percentile helpers over file-level nodes only
const fileLevelNodes = nodes.filter(isFileLevel);
const fanOutValues = fileLevelNodes.map((n) => fanOut.get(n.id) || 0).sort((a, b) => a - b);
const fanInValues = fileLevelNodes.map((n) => fanIn.get(n.id) || 0).sort((a, b) => a - b);

function percentileThreshold(sortedArr, percentile) {
  if (sortedArr.length === 0) return 0;
  const idx = Math.floor(sortedArr.length * percentile);
  const clampedIdx = Math.min(idx, sortedArr.length - 1);
  return sortedArr[clampedIdx];
}

const fanOutTop10PctThreshold = percentileThreshold(fanOutValues, 0.9);
const fanInBottom25PctThreshold = percentileThreshold(fanInValues, 0.25);

const ENTRY_FILENAME_PATTERNS = new Set([
  'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js', 'server.ts', 'server.js',
  'mod.rs', 'main.go', 'main.py', 'main.rs', 'manage.py', 'app.py', 'wsgi.py', 'asgi.py',
  'run.py', '__main__.py', 'Application.java', 'Main.java', 'Program.cs', 'config.ru',
  'index.php', 'App.swift', 'Application.kt', 'main.cpp', 'main.c'
]);

function pathDepth(filePath) {
  if (!filePath) return Infinity;
  const norm = filePath.replace(/^\.\//, '');
  return norm.split('/').length - 1; // 0 = root, 1 = one level deep
}

// C. Entry Point Candidates
const entryScores = [];
for (const n of fileLevelNodes) {
  let score = 0;
  const fp = n.filePath || '';
  const base = path.basename(fp);

  if (n.type === 'document') {
    const depth = pathDepth(fp);
    if (base.toLowerCase() === 'readme.md' && depth === 0) {
      score += 5;
    } else if (fp.toLowerCase().endsWith('.md') && depth === 0) {
      score += 2;
    }
  } else if (n.type === 'file') {
    if (ENTRY_FILENAME_PATTERNS.has(base)) {
      score += 3;
    }
    const depth = pathDepth(fp);
    if (depth <= 1) {
      score += 1;
    }
    const fo = fanOut.get(n.id) || 0;
    if (fo >= fanOutTop10PctThreshold && fanOutTop10PctThreshold > 0) {
      score += 1;
    }
    const fi = fanIn.get(n.id) || 0;
    if (fi <= fanInBottom25PctThreshold) {
      score += 1;
    }
  }

  if (score > 0) {
    entryScores.push({ id: n.id, score, name: n.name, summary: n.summary || '' });
  }
}

entryScores.sort((a, b) => b.score - a.score);
const entryPointCandidates = entryScores.slice(0, 5);

// D. BFS from top CODE entry point (skip document nodes -- they have no imports/calls edges)
const codeEntryCandidates = entryScores.filter((c) => {
  const n = nodeById.get(c.id);
  return n && n.type !== 'document';
});

let bfsTraversal = { startNode: null, order: [], depthMap: {}, byDepth: {} };

if (codeEntryCandidates.length > 0) {
  const startNode = codeEntryCandidates[0].id;
  const visited = new Set([startNode]);
  const order = [startNode];
  const depthMap = { [startNode]: 0 };
  const queue = [startNode];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentDepth = depthMap[current];
    const neighbors = adjForward.get(current) || [];
    for (const edge of neighbors) {
      if (edge.type !== 'imports' && edge.type !== 'calls') continue;
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        depthMap[edge.target] = currentDepth + 1;
        order.push(edge.target);
        queue.push(edge.target);
      }
    }
  }

  const byDepth = {};
  for (const [id, depth] of Object.entries(depthMap)) {
    const key = String(depth);
    if (!byDepth[key]) byDepth[key] = [];
    byDepth[key].push(id);
  }

  bfsTraversal = { startNode, order, depthMap, byDepth };
}

// E. Non-Code File Inventory
const nonCodeFiles = {
  documentation: [],
  infrastructure: [],
  data: [],
  config: [],
};

for (const n of nodes) {
  const entry = { id: n.id, name: n.name, type: n.type, summary: n.summary || '' };
  if (n.type === 'document') {
    nonCodeFiles.documentation.push(entry);
  } else if (n.type === 'service' || n.type === 'pipeline' || n.type === 'resource') {
    nonCodeFiles.infrastructure.push(entry);
  } else if (n.type === 'table' || n.type === 'schema' || n.type === 'endpoint') {
    nonCodeFiles.data.push(entry);
  } else if (n.type === 'config') {
    nonCodeFiles.config.push(entry);
  }
}

// F. Tightly Coupled Clusters
// Step 1: find bidirectional pairs (A->B and B->A) among imports/calls edges
const edgeKey = (s, t) => s + '||' + t;
const edgeSet = new Set();
for (const e of edges) {
  if (e.type === 'imports' || e.type === 'calls') {
    edgeSet.add(edgeKey(e.source, e.target));
  }
}

const bidirectionalPairs = [];
const seenPairs = new Set();
for (const e of edges) {
  if (e.type !== 'imports' && e.type !== 'calls') continue;
  if (edgeSet.has(edgeKey(e.target, e.source))) {
    const pairKey = [e.source, e.target].sort().join('||');
    if (!seenPairs.has(pairKey)) {
      seenPairs.add(pairKey);
      bidirectionalPairs.push([e.source, e.target]);
    }
  }
}

// Union-find to group bidirectional pairs into initial clusters
const parent = new Map();
function find(x) {
  if (!parent.has(x)) parent.set(x, x);
  let root = x;
  while (parent.get(root) !== root) root = parent.get(root);
  parent.set(x, root);
  return root;
}
function union(a, b) {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent.set(ra, rb);
}

for (const [a, b] of bidirectionalPairs) {
  union(a, b);
}

const clusterGroups = new Map(); // root -> Set of node ids
for (const [a, b] of bidirectionalPairs) {
  const root = find(a);
  if (!clusterGroups.has(root)) clusterGroups.set(root, new Set());
  clusterGroups.get(root).add(a);
  clusterGroups.get(root).add(b);
}

// Expand clusters: add nodes connecting to 2+ existing members (via any imports/calls edge, either direction)
const undirectedAdj = new Map(); // id -> Set of connected ids
for (const e of edges) {
  if (e.type !== 'imports' && e.type !== 'calls') continue;
  if (!undirectedAdj.has(e.source)) undirectedAdj.set(e.source, new Set());
  if (!undirectedAdj.has(e.target)) undirectedAdj.set(e.target, new Set());
  undirectedAdj.get(e.source).add(e.target);
  undirectedAdj.get(e.target).add(e.source);
}

const finalClusters = [];
for (const [root, memberSet] of clusterGroups.entries()) {
  const members = new Set(memberSet);
  // Try expanding up to a max size of 5
  let changed = true;
  while (changed && members.size < 5) {
    changed = false;
    const candidateCounts = new Map();
    for (const m of members) {
      const neighbors = undirectedAdj.get(m) || new Set();
      for (const nb of neighbors) {
        if (members.has(nb)) continue;
        candidateCounts.set(nb, (candidateCounts.get(nb) || 0) + 1);
      }
    }
    let bestCandidate = null;
    let bestCount = 0;
    for (const [cand, count] of candidateCounts.entries()) {
      if (count >= 2 && count > bestCount) {
        bestCandidate = cand;
        bestCount = count;
      }
    }
    if (bestCandidate && members.size < 5) {
      members.add(bestCandidate);
      changed = true;
    }
  }

  if (members.size >= 2 && members.size <= 5) {
    // count edges within cluster
    let edgeCount = 0;
    for (const e of edges) {
      if ((e.type === 'imports' || e.type === 'calls') && members.has(e.source) && members.has(e.target)) {
        edgeCount++;
      }
    }
    finalClusters.push({ nodes: Array.from(members), edgeCount });
  }
}

finalClusters.sort((a, b) => b.edgeCount - a.edgeCount);
const clusters = finalClusters.slice(0, 10);

// G. Layer List
const layersOutput = {
  count: layers.length,
  list: layers.map((l) => ({ id: l.id, name: l.name, description: l.description })),
};

// H. Node Summary Index
const nodeSummaryIndex = {};
for (const n of nodes) {
  nodeSummaryIndex[n.id] = { name: n.name, type: n.type, summary: n.summary || '' };
}

const result = {
  scriptCompleted: true,
  entryPointCandidates,
  fanInRanking,
  fanOutRanking,
  bfsTraversal,
  nonCodeFiles,
  clusters,
  layers: layersOutput,
  nodeSummaryIndex,
  totalNodes: nodes.length,
  totalEdges: edges.length,
};

try {
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
} catch (e) {
  fail('Could not write output file: ' + e.message);
}

console.log('Analysis complete. Wrote results to ' + outputPath);
process.exit(0);
