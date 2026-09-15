import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(root, 'package.json'))
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const en = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.json'), 'utf8'))
const ru = JSON.parse(fs.readFileSync(path.join(root, 'locales/ru-RU.json'), 'utf8'))
const failures = []

function fail(message) {
  failures.push(message)
  console.error('FAIL', message)
}

function ok(message) {
  console.log('OK  ', message)
}

function placeholders(value) {
  return [...String(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
}

if (pkg.name !== 'dsh-locale-ru') fail(`package name is ${pkg.name}`)
else ok('package name')

if (pkg.scripts?.postinstall || pkg.scripts?.install || pkg.scripts?.prepare) {
  fail('install/postinstall/prepare scripts are not allowed')
} else ok('no install scripts')

if (pkg.dependencies && Object.keys(pkg.dependencies).length) fail('runtime dependencies are not allowed')
else ok('no runtime dependencies')

if (!pkg.dsh?.bundle?.patch) fail('missing dsh.bundle.patch')
else ok('dsh.bundle.patch')

const clientDecl = pkg.dsh?.client
if (clientDecl?.platform !== 'web') fail('dsh.client.platform must be web')
else ok('dsh.client.platform=web')
if (clientDecl?.immediately !== true) fail('dsh.client.immediately must be true so the language pack registers before UI copy is bound')
else ok('dsh.client.immediately')
if (!Array.isArray(clientDecl.inject) || !clientDecl.inject.includes('@deepseek-ai/dsh-client-locale')) {
  fail('dsh.client.inject must include @deepseek-ai/dsh-client-locale')
} else ok('dsh.client.inject locale')
if (pkg.exports?.['./client'] !== './lib/client.js') fail('exports["./client"] must point at lib/client.js')
else ok('exports["./client"]')

const patch = fs.readFileSync(path.join(root, pkg.dsh.bundle.patch), 'utf8')
if (!patch.includes('name: dsh-locale-ru')) fail('cordis.patch.yml must insert dsh-locale-ru')
else ok('cordis.patch.yml inserts dsh-locale-ru')
if (!patch.includes('id: locale-ru')) fail('cordis.patch.yml must use a dedicated row id')
else ok('cordis.patch.yml row id')

const host = fs.readFileSync(path.join(root, 'lib/index.js'), 'utf8')
if (!/export function apply\(\)\s*\{\s*\}/.test(host)) fail('host apply() must be a no-op')
else ok('host apply is a no-op')
if (/locale|setLocale|models|pwsh|workspace/.test(host.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, ''))) {
  fail('host half must not touch locale, models, tools, or workspace')
} else ok('host half has no side effects')

const enNs = Object.keys(en).sort()
const ruNs = Object.keys(ru).sort()
if (enNs.join('\n') !== ruNs.join('\n')) fail('namespace set mismatch between en.json and ru-RU.json')
else ok(`${ruNs.length} namespaces`)

let keys = 0
let translated = 0
for (const ns of enNs) {
  const enKeys = Object.keys(en[ns]).sort()
  const ruKeys = Object.keys(ru[ns] || {}).sort()
  if (enKeys.join('\n') !== ruKeys.join('\n')) fail(`key set mismatch in ${ns}`)
  for (const key of enKeys) {
    keys++
    if (placeholders(en[ns][key]) !== placeholders(ru[ns][key])) {
      fail(`placeholder mismatch ${ns}.${key}`)
    }
    if (ru[ns][key] !== en[ns][key]) translated++
  }
}
const leftovers = []
for (const ns of enNs) {
  for (const key of Object.keys(en[ns])) {
    if (ru[ns][key] === en[ns][key]) leftovers.push(`${ns}.${key}`)
  }
}
ok(`${keys} keys, ${translated} translated, ${leftovers.length} technical leftovers`)
const allowedLeftover = (item) =>
  /^(open-in-app\.app\.|trajectory\.kind\.|conversation\.tool\.title\.(bash|pwsh|grep|glob)$|common\.number\.|subagent\.tokens\.(thousand|million)$)/.test(item) ||
  [
    'chat.message.referenceSeparator',
    'chat.message.compaction.commandTitle',
    'chat.message.turnProcess.separator',
    'common.json.label',
    'conversation.row.input',
    'conversation.row.output',
    'conversation.web.http',
    'cordis.body.hostCode',
    'cordis.body.clientCode',
    'documentHtml.title',
    'documentMarkdown.viewer.label',
    'settings.agentPreset.presetIdPlaceholder',
    'settings.models.baseUrl',
    'settings.models.customBaseUrlPlaceholder',
    'settings.plugins.webSearchBaseUrl',
    'settings.theme.fontSize.unit',
    'sidebarPdf.title',
    'slash.menu.drill.key',
    'trajectory.timing.ttft',
    'trajectory.tab.diff',
    'trajectory.record.json',
    'trajectory.request.rowAria',
    'workflowRun.run.title',
  ].includes(item)
const unexpected = leftovers.filter((item) => !allowedLeftover(item))
if (unexpected.length) fail(`unexpected English leftovers:\n${unexpected.join('\n')}`)
else ok('English leftovers are technical values')

const clientSrc = fs.readFileSync(path.join(root, 'lib/client.js'), 'utf8')
if (!clientSrc.startsWith('window.__ModuleLoader__.load({')) fail('client.js must use window.__ModuleLoader__.load')
else ok('client ModuleLoader wrapper')
if (!clientSrc.includes(`id: ${JSON.stringify(pkg.name)}`)) fail('client ModuleLoader id must match package name')
else ok('client ModuleLoader id')
if (clientSrc.includes('document.') || clientSrc.includes('innerText') || clientSrc.includes('textContent')) {
  fail('client plugin must not patch the DOM')
} else ok('no DOM patching')
if (clientSrc.includes('setLocale(')) fail('plugin must not force the active locale')
else ok('does not force locale')

const recorded = []
const catalog = new Map([
  ['en', { id: 'en', label: 'English' }],
  ['zh', { id: 'zh', label: '中文', fallback: 'en' }],
])
const dicts = new Map()
const locale = {
  addLanguage(input) {
    if (catalog.has(input.id.toLowerCase())) throw new Error(`locale "${input.id}" is already registered`)
    if (!catalog.has(input.fallback.toLowerCase())) throw new Error(`fallback "${input.fallback}" is not registered`)
    catalog.set(input.id.toLowerCase(), { ...input })
    recorded.push(['addLanguage', input])
    return () => catalog.delete(input.id.toLowerCase())
  },
  register(ns, localeId, dict) {
    if (typeof localeId !== 'string' || typeof dict !== 'object') {
      throw new Error('language packs must use register(ns, locale, dict)')
    }
    const owner = dicts.get(ns) ?? new Map()
    owner.set(localeId, dict)
    dicts.set(ns, owner)
    recorded.push(['register', ns, localeId, Object.keys(dict).length])
    return () => owner.delete(localeId)
  },
}

let loaderCalled = false
const sandbox = {
  window: {
    __ModuleLoader__: {
      load(record) {
        loaderCalled = true
        if (record.id !== pkg.name) throw new Error(`unexpected module id ${record.id}`)
        const mod = record.factory(() => {
          throw new Error('client plugin must not require extra modules')
        })
        if (!Array.isArray(mod.inject) || !mod.inject.includes('locale')) {
          throw new Error('client inject must include locale')
        }
        const effects = []
        mod.apply({
          locale,
          effect(factory, label) {
            const dispose = factory()
            effects.push({ dispose, label })
            return dispose
          },
        })
        if (!effects.some((item) => item.label === 'dsh-locale-ru: language pack')) {
          throw new Error('language pack effect was not registered')
        }
        if (!catalog.has('ru-ru')) throw new Error('ru-RU was not added to the catalog')
        if (catalog.get('ru-ru').label !== 'Русский (ru-RU)') throw new Error('unexpected language label')
        if (catalog.get('ru-ru').fallback !== 'en') throw new Error('fallback must be en')
        if (dicts.size !== ruNs.length) throw new Error(`registered ${dicts.size} namespaces, expected ${ruNs.length}`)
        for (const ns of ruNs) {
          if (!dicts.get(ns)?.has('ru-RU')) throw new Error(`namespace ${ns} was not registered`)
          if (Object.keys(dicts.get(ns).get('ru-RU')).length !== Object.keys(ru[ns]).length) {
            throw new Error(`namespace ${ns} registered incomplete dictionary`)
          }
        }
        for (const item of effects) item.dispose?.()
        if (catalog.has('ru-ru')) throw new Error('language was not disposed')
        for (const ns of ruNs) {
          if (dicts.get(ns)?.has('ru-RU')) throw new Error(`namespace ${ns} was not disposed`)
        }
      },
    },
  },
}

vm.runInNewContext(clientSrc, sandbox, { filename: 'lib/client.js' })
if (!loaderCalled) fail('client.js did not register with __ModuleLoader__')
else ok('client plugin loads, registers ru-RU, and unloads cleanly')

if (recorded.filter((item) => item[0] === 'addLanguage').length !== 1) fail('expected exactly one addLanguage call')
else ok('single addLanguage(ru-RU)')

const hostModule = await import(pathToFileURL(path.join(root, 'lib/index.js')).href)
if (typeof hostModule.apply !== 'function') fail('host must export apply')
else {
  hostModule.apply()
  ok('host apply() can be called')
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`)
  process.exit(1)
}
console.log('\nself-test passed')
