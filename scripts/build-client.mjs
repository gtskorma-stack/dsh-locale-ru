import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const dictionaries = JSON.parse(fs.readFileSync(path.join(root, 'locales/ru-RU.json'), 'utf8'))
const json = JSON.stringify(dictionaries)

const client = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(pkg.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
\t\tconst LANGUAGE_ID = "ru-RU";
\t\tconst LANGUAGE_LABEL = "Русский (ru-RU)";
\t\tconst LANGUAGE_FALLBACK = "en";
\t\tconst dictionaries = ${json};
\t\tconst inject = ["locale"];
\t\tfunction apply(ctx) {
\t\t\tctx.effect(() => {
\t\t\t\tconst disposers = [ctx.locale.addLanguage({
\t\t\t\t\tid: LANGUAGE_ID,
\t\t\t\t\tlabel: LANGUAGE_LABEL,
\t\t\t\t\tfallback: LANGUAGE_FALLBACK
\t\t\t\t})];
\t\t\t\ttry {
\t\t\t\t\tfor (const ns of Object.keys(dictionaries)) {
\t\t\t\t\t\tdisposers.push(ctx.locale.register(ns, LANGUAGE_ID, dictionaries[ns]));
\t\t\t\t\t}
\t\t\t\t} catch (error) {
\t\t\t\t\tfor (const dispose of disposers.reverse()) dispose();
\t\t\t\t\tthrow error;
\t\t\t\t}
\t\t\t\treturn () => {
\t\t\t\t\tfor (const dispose of disposers.reverse()) dispose();
\t\t\t\t};
\t\t\t}, "dsh-locale-ru: language pack");
\t\t}
\t\texports.apply = apply;
\t\texports.inject = inject;
\t\texports.LANGUAGE_ID = LANGUAGE_ID;
\t\texports.LANGUAGE_LABEL = LANGUAGE_LABEL;
\t\treturn module.exports;
\t}
});
`

fs.writeFileSync(path.join(root, 'lib/client.js'), client)
console.log('wrote lib/client.js', Buffer.byteLength(client), 'bytes')
