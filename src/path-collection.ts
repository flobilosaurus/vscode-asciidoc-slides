import { AsciidocThemes } from "./utils"

export const STYLES = [
    'node_modules/reveal.js/css/reveal.css',
]

export function getThemeStyles(themes: AsciidocThemes) {
    return [
        `node_modules/reveal.js/css/theme/${themes.revealjs}.css`,
        `node_modules/reveal.js/lib/css/${themes.highlightjs}.css` 
    ]
}

export const SCRIPTS = [
    'node_modules/reveal.js/js/reveal.js'
]

export const DEPENDENCY_SCRIPTS = [
    'node_modules/reveal.js/plugin/highlight/highlight.js'
]
