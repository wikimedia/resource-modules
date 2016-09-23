// @flow

const test = require('tape')

const {fileAnalysis} = require('../../lib/visitors/types')
const getGlobalDependenciesErrors = require('../../lib/lint/global-dependencies')

test('won\'t return errors if there are no requires', (t) => {
  t.deepEqual(getGlobalDependenciesErrors(fileAnalysis({}), [], {files: {}}, 'test', {}), [])
  t.deepEqual(getGlobalDependenciesErrors(fileAnalysis({requires: []}), [], {files: {}}, 'test', {}), [])
  t.end()
})

test('it should not complain if required dep in source is defined in same file in the same module', (t) => {
  const m1 = { scripts: [ 'f1' ] }
  const f1 = fileAnalysis({
    mw_requires: ['mw.banana.phone'],
    mw_defines: [{
      type: 'namespace', name: 'mw.banana', definitions: ['phone']
    }]
  })

  t.deepEqual(getGlobalDependenciesErrors(
    // File analysis
    f1,
    [ // In modules
      ['m1', m1]
    ],
    { // Analysis from source
      files: { f1 }
    },
    // Looking at file...
    'f1',
    { // resource modules
      m1
    }
  ), [])

  t.end()
})

test('it should not complain if required dep in source is defined in a previous file in the same module', (t) => {
  const m1 = {
    scripts: [
      'f2',
      'f1'
    ]
  }
  const f1 = fileAnalysis({ mw_requires: ['mw.banana.phone'] })
  const f2 = fileAnalysis({ mw_defines: [{
    type: 'namespace', name: 'mw.banana', definitions: ['phone']
  }] })

  t.deepEqual(getGlobalDependenciesErrors(
    // File analysis
    f1,
    [ // In modules
      ['m1', m1]
    ],
    { // Analysis from source
      files: { f1, f2 }
    },
    // Looking at file...
    'f1',
    { // resource modules
      m1
    }
  ), [])

  t.end()
})

// test('it should complain if required dep in source is not defined in a previous file in the same module', (t) => {
test('it should complain if required dep in source is not defined in a previous file in the same module', (t) => {
  const m1 = {
    scripts: [
      'f2',
      'f1'
    ]
  }
  const f1 = fileAnalysis({ mw_requires: ['mw.banana.phone'] })
  const f2 = fileAnalysis({ mw_defines: [] })

  t.deepEqual(getGlobalDependenciesErrors(
    // File analysis
    f1,
    [ // In modules
      ['m1', m1]
    ],
    { // Analysis from source
      files: { f1, f2 }
    },
    // Looking at file...
    'f1',
    { // resource modules
      m1
    }
  ), [
    // Module not defined
    { id: 'mw.banana.phone', kind: 'not_defined' }
  ])

  t.end()
})

test('it should not complain if required dep in source is defined in a dependency module', (t) => {
  const m1 = {
    dependencies: ['m2'],
    scripts: ['f1']
  }
  const m2 = {
    scripts: ['f2']
  }
  const f1 = fileAnalysis({ mw_requires: ['mw.banana.phone'] })
  const f2 = fileAnalysis({ mw_defines: [{
    type: 'namespace', name: 'mw.banana', definitions: ['phone']
  }] })

  t.deepEqual(getGlobalDependenciesErrors(
    f1,
    [ // In modules
      ['m1', m1]
    ],
    { // Analysis from source
      files: { f1, f2 }
    },
    'f1',
    { // resource modules
      m1, m2
    }
  ), [])

  t.end()
})

test('it should not complain if required dep in source is defined in a nested dependency module', (t) => {
  const m1 = {
    dependencies: ['m2'],
    scripts: ['f1']
  }
  const m2 = {
    dependencies: ['m3']
  }
  const m3 = {
    scripts: ['f2']
  }
  const f1 = fileAnalysis({ mw_requires: ['mw.banana.phone'] })
  const f2 = fileAnalysis({ mw_defines: [{
    type: 'namespace', name: 'mw.banana', definitions: ['phone']
  }] })

  t.deepEqual(getGlobalDependenciesErrors(
    f1,
    [ // In modules
      ['m1', m1]
    ],
    { // Analysis from source
      files: { f1, f2 }
    },
    'f1',
    { // resource modules
      m1, m2, m3
    }
  ), [])

  t.end()
})

test('it should complain if required dep in source is not defined in a nested dependency module', (t) => {
  const m1 = {
    dependencies: ['m2'],
    scripts: ['f1']
  }
  const m2 = {
    dependencies: ['m3']
  }
  const m3 = {
    scripts: []
  }
  const f1 = fileAnalysis({ mw_requires: ['mw.banana.phone'] })
  const f2 = fileAnalysis({ mw_defines: [{
    type: 'namespace', name: 'mw.banana', definitions: ['phone']
  }] })

  t.deepEqual(getGlobalDependenciesErrors(
    f1,
    [ // In modules
      ['m1', m1]
    ],
    { // Analysis from source
      files: { f1, f2 }
    },
    'f1',
    { // resource modules
      m1, m2, m3
    }
  ), [ // Required module not found, defined in file f2
    { id: 'mw.banana.phone', kind: 'not_found', where: 'f2' }
  ])

  t.end()
})

test('it should complain if file that defines required dep in source is multiple times in the dependency tree', (t) => {
  const m1 = {
    dependencies: ['m2', 'm3'],
    scripts: ['f1']
  }
  const m2 = {
    dependencies: ['m3'],
    scripts: ['f2']
  }
  const m3 = {
    scripts: ['f2']
  }
  const f1 = fileAnalysis({ mw_requires: ['mw.banana.phone'] })
  const f2 = fileAnalysis({ mw_defines: [{
    type: 'namespace', name: 'mw.banana', definitions: ['phone']
  }] })

  t.deepEqual(getGlobalDependenciesErrors(
    f1,
    [ // In modules
      ['m1', m1]
    ],
    { // Analysis from source
      files: { f1, f2 }
    },
    'f1',
    { // resource modules
      m1, m2, m3
    }
  ), [ // Required file found in multiple modules in the dependency tree (m2, m3)
    {
      id: 'mw.banana.phone',
      kind: 'file_in_multiple_dependencies',
      where: ['f2', ['m2', 'm3']]
    }
  ])

  t.end()
})

test('it should complain if a required dep in source is defined multiple times in one or more files', (t) => {
  const m1 = {
    dependencies: ['m2', 'm3'],
    scripts: ['f1']
  }
  const m2 = {
    scripts: ['f2']
  }
  const m3 = {
    scripts: ['f3']
  }
  const f1 = fileAnalysis({ mw_requires: ['mw.banana.phone'] })
  const f2 = fileAnalysis({ mw_defines: [{
    type: 'namespace', name: 'mw.banana', definitions: ['phone']
  }] })
  const f3 = fileAnalysis({ mw_defines: [{
    type: 'namespace', name: 'mw.banana', definitions: ['phone']
  }] })

  t.deepEqual(getGlobalDependenciesErrors(
    f1,
    [ // In modules
      ['m1', m1]
    ],
    { // Analysis from source
      files: { f1, f2, f3 }
    },
    'f1',
    { // resource modules
      m1, m2, m3
    }
  ), [ // Required module, defined in files f2 and f3
    {
      id: 'mw.banana.phone',
      kind: 'multiple_defines',
      where: [
        [ 'f2', f2 ],
        [ 'f3', f3 ]
      ]
    }
  ])

  t.end()
})