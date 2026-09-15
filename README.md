# dsh-locale-ru

Русская локализация веб-интерфейса DeepSeek Harness (DSH).

> **Неофициальный community-плагин.** Проект не связан с DeepSeek и не одобрен DeepSeek.

Плагин добавляет **Русский (ru-RU)** через штатный locale/i18n API DSH:

```js
ctx.locale.addLanguage({ id: 'ru-RU', label: 'Русский (ru-RU)', fallback: 'en' })
ctx.locale.register(namespace, 'ru-RU', dictionary)
```

Плагин **не изменяет** DSH core, `node_modules`, модели, API, PowerShell, tool execution, sessions, workspaces или другие плагины. Русский язык выбирается штатно в **Settings → General → Language**. Язык не форсируется: сохранённая настройка English остаётся English, а отсутствующие переводы используют английский fallback.

## Совместимость

Плагин протестирован с:

- DeepSeek Harness `0.1.5-rc.1`
- locale API из `@deepseek-ai/dsh-client-locale@0.1.5-rc.2`
- web profile DSH
- Node.js 20+

Более новые версии DSH могут изменить locale API. Если после обновления DSH появляется ошибка загрузчика, сначала удалите плагин и создайте issue с версией DSH и текстом ошибки.

## Установка

Из локальной папки:

```powershell
dsh plugin --profile web add D:\path\to\dsh-locale-ru
```

После установки перезапустите web profile и откройте **Settings → General → Language → Русский (ru-RU)**.

## Удаление

```powershell
dsh plugin --profile web remove dsh-locale-ru
```

После удаления перезапустите web profile. Если был выбран русский язык, интерфейс вернётся к English или browser default.

## Повторная установка

```powershell
dsh plugin --profile web remove dsh-locale-ru
dsh plugin --profile web add D:\path\to\dsh-locale-ru
```

## Что переведено

В текущей версии покрыты все 42 client locale namespace, найденные в протестированной версии DSH: **1257 ключей**, из них **1187 переведены**. Остальные 70 намеренно оставлены техническими значениями.

Переведены, в частности:

- Settings / General / Models / Plugins
- Agent presets
- Chat / Sidebar / Session history
- Composer / Tools / Jobs / Goals / Plans
- Approvals / Connection states
- Model selection / Plugin manager / Workspace UI

Технические значения намеренно не переводятся: model/provider IDs, API key / Base URL как имена wire-полей, package names, file paths, slash commands, JSON/YAML keys, product names, а также технические сокращения и единицы (`K`, `M`, `px`, `TTFT` и т. п.).

## Структура плагина

Плагин двухчастный:

- `dsh.bundle.patch` добавляет минимальный no-op host row, чтобы DSH мог активировать пакет;
- `dsh.client` с `platform: "web"` и `immediately: true` загружает браузерную часть;
- `lib/client.js` использует `window.__ModuleLoader__` — формат, который DSH отдаёт через `/plugins`;
- host `apply()` пустой и не меняет настройки, модели, инструменты или workspace.

## Self-test

```powershell
node scripts/self-test.mjs
```

Проверяются:

- manifest и DSH client declaration;
- отсутствие install/postinstall/prepare scripts;
- отсутствие runtime dependencies;
- `__ModuleLoader__` wrapper;
- регистрация `ru-RU`;
- полный набор namespace и ключей;
- совпадение placeholders;
- разрешённые английские technical leftovers;
- отсутствие DOM patching;
- отсутствие принудительного `setLocale()`;
- корректный clean unload.

## Пересборка client bundle после изменения словаря

Отредактируйте `locales/ru-RU.json`, затем выполните:

```powershell
node scripts/build-client.mjs
node scripts/self-test.mjs
```

`locales/en.json` хранится как эталонный набор namespace/ключей для self-test и проверки полноты перевода.

## Безопасность

В пакете нет:

- API keys или credentials;
- `.env` файлов;
- runtime dependencies;
- native modules;
- install/postinstall scripts;
- DOM hacks;
- изменений DSH core или `node_modules`.

## Лицензия

MIT. См. [LICENSE](LICENSE).
