
const test = require('tape')

const {walk} = require('../../lib/analyze')
const i18n = require('../../lib/visitors/i18n')

const files = {
  'a': {
    source: `
    mw.msg( 'banana' )
    mw.msg( 'phone' )
    `
  },
  'b': {
    source: `
    mw.msg( variable )
    `
  }
}

test('tracks mw.msg\'s labels in .messages', (t) => {
  t.deepEqual(
    walk(i18n, files, 'a').a,
    {
      messages: ['banana', 'phone'],
      source: files.a.source
    }
  )
  t.end()
})

test('Warns against using mw.msg with non string literals', (t) => {
  t.throws(() => {
    walk(i18n, files, 'b')
  }, /mw.msg must be used with string literals/)
  t.end()
})
