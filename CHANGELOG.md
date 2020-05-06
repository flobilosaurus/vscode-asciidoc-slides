# Change Log

## [1.3.0]

- feature: printing or exporting as pdf via url parameter `?print-pdf` (see: [revealjs - pdf export](https://github.com/hakimel/reveal.js/#instructions-1))
- bugfix for bug 'inlined html export did not inline some style and script resources'

## [1.2.0]

- feature: enable possibility to include other asciidoc content (eg. `include::another.adoc[]`)
- bugfix: scroll to slide under cursor was broken after another document was saved
- bugfix: each 'open slides in browser' command started a new server instance, even if called on the same document

## [1.1.1]

- bugfix: path of attribute __imagesdir__ was not handled correctly in preview

## [1.1.0]

- complete redevelopment of extension inspired by [vscode reveal](https://github.com/evilz/vscode-reveal)
- add command 'show in browser'
- add command 'export to inlined html'

## [0.5.1]

- remove security issues by updating dependencies

## [0.5.0]

- reduce size of extension (use webpack)

## [0.4.2]

- fixed: [bug in some path in exported slides html, on windows](https://github.com/flobilosaurus/vscode-asciidoc-slides/issues/8)

## [0.4.1]

- fixed: [bug in calculation of slide under cursor](https://github.com/flobilosaurus/vscode-asciidoc-slides/issues/7)

## [0.4.0]

- add kroki integration, which converts textual description of diagrams to images (see https://github.com/Mogztter/asciidoctor-kroki)

## [0.3.0]

- update @asciidoctor/reveal.js from 3.1 to 4.0
- use revealjs 3.9.2
- 'non common' languages for highlightjs need to be loaded explicitly now via `:highlightjs-languages: asciidoc, clojure`

## [0.2.1]

- Add icon to slide preview panel

## [0.1.1]

- Initial release
