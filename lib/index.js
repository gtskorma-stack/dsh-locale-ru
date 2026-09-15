/**
 * Host half of dsh-locale-ru.
 *
 * Empty apply exists so the package can appear in the host Loader roster.
 * All behaviour lives in the browser half (`exports["./client"]`), which
 * registers the ru-RU language and dictionaries through ctx.locale.
 */
export function apply() {}
