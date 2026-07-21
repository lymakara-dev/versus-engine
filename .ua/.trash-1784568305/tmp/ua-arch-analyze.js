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
if (!inputPath || !outputPath) fail('Usage: node ua-arch-analyze.js <input.json> <output.json>');

let input;
try {
  input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (e) {
  fail('Failed to read/parse input JSON: ' + e.message);
}

const fileNodes = input.fileNodes || [];
const importEdges = input.importEdges || [];
const allEdges = input.allEdges || [];

try {
  // ---------- A. Directory Grouping ----------
  const nodesWithPath = fileNodes.filter(n => n.filePath);
  const nodesNoPath = fileNodes.filter(n => !n.filePath);

  function commonPrefix(paths) {
    if (paths.length === 0) return '';
    const splitPaths = paths.map(p => p.split('/'));
    const first = splitPaths[0];
    let prefixLen = 0;
    for (let i = 0; i < first.length - 1; i++) { // -1: leave at least filename
      const seg = first[i];
      if (splitPaths.every(sp => sp.length > i + 1 && sp[i] === seg)) {
        prefixLen = i + 1;
      } else {
        break;
      }
    }
    return first.slice(0, prefixLen).join('/');
  }

  const allPaths = nodesWithPath.map(n => n.filePath);
  const prefix = commonPrefix(allPaths);

  function groupKeyFor(filePath) {
    let rest = filePath;
    if (prefix && rest.startsWith(prefix + '/')) {
      rest = rest.slice(prefix.length + 1);
    }
    const segs = rest.split('/');
    if (segs.length > 1) {
      return segs[0];
    }
    // flat: no subdirectory, group by file type/extension pattern
    const fname = segs[0];
    if (/\.(test|spec)\./.test(fname) || /^test_/.test(fname) || /_test\.go$/.test(fname)) return 'test';
    if (/\.config\./.test(fname)) return 'config';
    const ext = fname.includes('.') ? fname.slice(fname.lastIndexOf('.') + 1) : 'noext';
    return ext || 'root';
  }

  const directoryGroups = {};
  for (const n of nodesWithPath) {
    const g = groupKeyFor(n.filePath);
    if (!directoryGroups[g]) directoryGroups[g] = [];
    directoryGroups[g].push(n.id);
  }
  // Non-path nodes get their own pseudo group by type
  for (const n of nodesNoPath) {
    const g = '__no_path__:' + n.type;
    if (!directoryGroups[g]) directoryGroups[g] = [];
    directoryGroups[g].push(n.id);
  }

  // ---------- B. Node Type Grouping ----------
  const nodeTypeGroups = {};
  for (const n of fileNodes) {
    if (!nodeTypeGroups[n.type]) nodeTypeGroups[n.type] = [];
    nodeTypeGroups[n.type].push(n.id);
  }

  // ---------- C. Import Adjacency Matrix ----------
  const fileFanOut = {};
  const fileFanIn = {};
  const importAdj = {}; // source -> Set(target)
  for (const e of importEdges) {
    if (!importAdj[e.source]) importAdj[e.source] = new Set();
    importAdj[e.source].add(e.target);
    fileFanOut[e.source] = (fileFanOut[e.source] || 0) + 1;
    fileFanIn[e.target] = (fileFanIn[e.target] || 0) + 1;
  }

  const idToGroup = {};
  for (const [g, ids] of Object.entries(directoryGroups)) {
    for (const id of ids) idToGroup[id] = g;
  }

  const groupImportsFrom = {}; // group -> Set(group)
  const groupImportedBy = {}; // group -> Set(group)
  for (const e of importEdges) {
    const gs = idToGroup[e.source];
    const gt = idToGroup[e.target];
    if (!gs || !gt) continue;
    if (!groupImportsFrom[gs]) groupImportsFrom[gs] = new Set();
    groupImportsFrom[gs].add(gt);
    if (!groupImportedBy[gt]) groupImportedBy[gt] = new Set();
    groupImportedBy[gt].add(gs);
  }

  // ---------- D. Cross-Category Dependency Analysis ----------
  const idToType = {};
  for (const n of fileNodes) idToType[n.id] = n.type;

  const crossCategoryMap = {}; // key: fromType|toType|edgeType -> count
  for (const e of allEdges) {
    const ft = idToType[e.source];
    const tt = idToType[e.target];
    if (!ft || !tt) continue;
    if (ft === tt) continue; // cross-category only
    const key = ft + '|' + tt + '|' + e.type;
    crossCategoryMap[key] = (crossCategoryMap[key] || 0) + 1;
  }
  const crossCategoryEdges = Object.entries(crossCategoryMap).map(([key, count]) => {
    const [fromType, toType, edgeType] = key.split('|');
    return { fromType, toType, edgeType, count };
  }).sort((a, b) => b.count - a.count);

  // ---------- E. Inter-Group Import Frequency ----------
  const interGroupMap = {}; // "from|to" -> count
  for (const e of importEdges) {
    const gs = idToGroup[e.source];
    const gt = idToGroup[e.target];
    if (!gs || !gt) continue;
    const key = gs + '|' + gt;
    interGroupMap[key] = (interGroupMap[key] || 0) + 1;
  }
  const interGroupImports = Object.entries(interGroupMap).map(([key, count]) => {
    const [from, to] = key.split('|');
    return { from, to, count };
  }).sort((a, b) => b.count - a.count);

  // ---------- F. Intra-Group Import Density ----------
  const intraGroupDensity = {};
  for (const g of Object.keys(directoryGroups)) {
    let internalEdges = 0;
    let totalEdges = 0;
    for (const e of importEdges) {
      const gs = idToGroup[e.source];
      const gt = idToGroup[e.target];
      if (gs !== g && gt !== g) continue;
      totalEdges++;
      if (gs === g && gt === g) internalEdges++;
    }
    const density = totalEdges > 0 ? internalEdges / totalEdges : 0;
    intraGroupDensity[g] = { internalEdges, totalEdges, density: Math.round(density * 100) / 100 };
  }

  // ---------- G. Directory Pattern Matching ----------
  const dirPatternMap = {
    routes: 'api', api: 'api', controllers: 'api', endpoints: 'api', handlers: 'api',
    services: 'service', core: 'service', lib: 'service', domain: 'service', logic: 'service',
    models: 'data', db: 'data', data: 'data', persistence: 'data', repository: 'data', entities: 'data',
    components: 'ui', views: 'ui', pages: 'ui', ui: 'ui', layouts: 'ui', screens: 'ui',
    middleware: 'middleware', plugins: 'middleware', interceptors: 'middleware', guards: 'middleware',
    utils: 'utility', helpers: 'utility', common: 'utility', shared: 'utility', tools: 'utility',
    config: 'config', constants: 'config', env: 'config', settings: 'config',
    __tests__: 'test', test: 'test', tests: 'test', spec: 'test', specs: 'test',
    types: 'types', interfaces: 'types', schemas: 'types', contracts: 'types', dtos: 'types',
    hooks: 'hooks',
    store: 'state', state: 'state', reducers: 'state', actions: 'state', slices: 'state',
    assets: 'assets', static: 'assets', public: 'assets',
    migrations: 'data',
    management: 'config', commands: 'config',
    templatetags: 'utility',
    signals: 'service',
    serializers: 'api',
    cmd: 'entry',
    internal: 'service',
    pkg: 'utility',
    dto: 'types', request: 'types', response: 'types',
    entity: 'data',
    controller: 'api',
    routers: 'api',
    composables: 'service',
    blueprints: 'api',
    mailers: 'service', jobs: 'service', channels: 'service',
    bin: 'entry',
    docs: 'documentation', documentation: 'documentation', wiki: 'documentation',
    deploy: 'infrastructure', deployment: 'infrastructure', infra: 'infrastructure', infrastructure: 'infrastructure',
    '.github': 'ci-cd', '.gitlab': 'ci-cd', '.circleci': 'ci-cd',
    k8s: 'infrastructure', kubernetes: 'infrastructure', helm: 'infrastructure', charts: 'infrastructure',
    terraform: 'infrastructure', tf: 'infrastructure',
    docker: 'infrastructure',
    sql: 'data', database: 'data', schema: 'data',
  };

  const patternMatches = {};
  for (const g of Object.keys(directoryGroups)) {
    const base = g.startsWith('__no_path__:') ? null : g;
    if (base && dirPatternMap[base]) {
      patternMatches[g] = dirPatternMap[base];
    }
  }

  // ---------- H. Deployment Topology Detection ----------
  const infraFiles = [];
  let hasDockerfile = false, hasCompose = false, hasK8s = false, hasTerraform = false, hasCI = false;
  for (const n of fileNodes) {
    const p = n.filePath || '';
    const base = path.basename(p);
    if (/^Dockerfile/.test(base)) { hasDockerfile = true; infraFiles.push(p); }
    else if (/^docker-compose/.test(base)) { hasCompose = true; infraFiles.push(p); }
    else if (/\.ya?ml$/.test(base) && /k8s|kubernetes/i.test(p)) { hasK8s = true; infraFiles.push(p); }
    else if (/\.tf$|\.tfvars$/.test(base)) { hasTerraform = true; infraFiles.push(p); }
    else if (/^\.github\/workflows\//.test(p) || base === '.gitlab-ci.yml' || base === 'Jenkinsfile') { hasCI = true; infraFiles.push(p); }
    else if (base === 'Makefile') { infraFiles.push(p); }
  }

  // ---------- I. Data Pipeline Detection ----------
  const schemaFiles = [];
  const migrationFiles = [];
  const dataModelFiles = [];
  const apiHandlerFiles = [];
  for (const n of fileNodes) {
    const p = n.filePath || '';
    if (/\.sql$/.test(p) || /\.graphql$|\.gql$|\.proto$|\.prisma$/.test(p)) schemaFiles.push(p);
    if (/migrations?\//i.test(p)) migrationFiles.push(p);
    if (/\b(models?|entities|entity)\//i.test(p)) dataModelFiles.push(p);
    if (/\b(routes?|api|controllers?|endpoints?|handlers?)\//i.test(p)) apiHandlerFiles.push(p);
  }

  // ---------- J. Documentation Coverage ----------
  const docNodeIds = nodeTypeGroups['document'] || [];
  const docPaths = new Set();
  for (const id of docNodeIds) {
    const n = fileNodes.find(f => f.id === id);
    if (n && n.filePath) docPaths.add(n.filePath);
  }
  let groupsWithDocs = 0;
  const undocumentedGroups = [];
  const codeGroups = Object.keys(directoryGroups).filter(g => !g.startsWith('__no_path__:'));
  for (const g of codeGroups) {
    const hasDoc = [...docPaths].some(dp => dp.startsWith(g + '/') || dp.includes('/' + g + '/') || dp.toLowerCase().includes(g.toLowerCase()));
    if (hasDoc) groupsWithDocs++;
    else undocumentedGroups.push(g);
  }
  const totalGroups = codeGroups.length;
  const coverageRatio = totalGroups > 0 ? Math.round((groupsWithDocs / totalGroups) * 100) / 100 : 0;

  // ---------- K. Dependency Direction ----------
  const dependencyDirection = [];
  const seenPairs = new Set();
  for (const { from, to, count } of interGroupImports) {
    if (from === to) continue;
    const pairKey = [from, to].sort().join('|');
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    const reverseCount = interGroupMap[to + '|' + from] || 0;
    if (count > reverseCount) {
      dependencyDirection.push({ dependent: from, dependsOn: to });
    } else if (reverseCount > count) {
      dependencyDirection.push({ dependent: to, dependsOn: from });
    }
  }

  // ---------- File Stats ----------
  const filesPerGroup = {};
  for (const [g, ids] of Object.entries(directoryGroups)) filesPerGroup[g] = ids.length;
  const nodeTypeCounts = {};
  for (const [t, ids] of Object.entries(nodeTypeGroups)) nodeTypeCounts[t] = ids.length;

  const result = {
    scriptCompleted: true,
    commonPrefix: prefix,
    directoryGroups,
    nodeTypeGroups,
    crossCategoryEdges,
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology: {
      hasDockerfile, hasCompose, hasK8s, hasTerraform, hasCI,
      infraFiles: [...new Set(infraFiles)],
    },
    dataPipeline: {
      schemaFiles: [...new Set(schemaFiles)],
      migrationFiles: [...new Set(migrationFiles)],
      dataModelFiles: [...new Set(dataModelFiles)],
      apiHandlerFiles: [...new Set(apiHandlerFiles)],
    },
    docCoverage: {
      groupsWithDocs,
      totalGroups,
      coverageRatio,
      undocumentedGroups,
    },
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup,
      nodeTypeCounts,
    },
    fileFanIn,
    fileFanOut,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  process.exit(0);
} catch (e) {
  fail(e.stack || e.message);
}
