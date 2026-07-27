interface AsciidoctorSection {
    getSections(): AsciidoctorSection[]
    getLineNumber(): number
    getId(): string
}

interface AsciidoctorDocument {
    hasAttribute(name: string): boolean
    getAttribute(name: string): unknown
    getAttributes(): Record<string, unknown>
    getTitle(): string | undefined
    getSections(): AsciidoctorSection[]
}

/**
 * Reveal.js 5 still uses Asciidoctor's Opal runtime. Keep its newest compatible
 * Asciidoctor and Kroki releases isolated from current native Asciidoctor.js.
 */
const asciidoctor = require('asciidoctor-legacy')()
const asciidoctorRevealjs = require('@asciidoctor/reveal.js')
const kroki = require('asciidoctor-kroki-legacy')
asciidoctorRevealjs.register()
kroki.register(asciidoctor.Extensions)

export type AsciidocAttributes = {
    title: string,
    imageDir: string,
    revealJsTheme: string,
    revealJsCustomTheme?: string,
    hightlightJsTheme: string,
}

export type RevealConfiguration = {
    absolutePath: string,
    title: string,
    themeCss: string,
    hightlightJsThemeCss: string,
    isInlined: boolean
}

function loadDocument(asciidocText: string, docDir: string, sourcemap: boolean = false): AsciidoctorDocument {
    return asciidoctor.load(asciidocText, {
        safe: 'safe',
        header_footer: true,
        sourcemap,
        attributes: { docDir }
    }) as AsciidoctorDocument
}

export function extractAsciidocAttributes(asciidocText: string, docDir: string): AsciidocAttributes {
    const doc = loadDocument(asciidocText, docDir)
    const getAttributeOrDefault = (key: string, defaultValue?: string) =>
        doc.hasAttribute(key) ? doc.getAttribute(key) : defaultValue

    return {
        ...doc.getAttributes(),
        title: doc.getTitle() || '',
        imageDir: getAttributeOrDefault('imagesdir', '') as string,
        revealJsTheme: getAttributeOrDefault('revealjs_theme', 'night') as string,
        revealJsCustomTheme: getAttributeOrDefault('revealjs_customtheme', undefined) as string | undefined,
        hightlightJsTheme: getAttributeOrDefault('hightlightjs-theme', 'monokai') as string
    }
}

export function extractRevealConfiguration(asciidocAttributes: AsciidocAttributes): RevealConfiguration {
    return {
        absolutePath: '',
        title: asciidocAttributes.title,
        themeCss: asciidocAttributes.revealJsCustomTheme || `libs/reveal.js/css/theme/${asciidocAttributes.revealJsTheme}.css`,
        hightlightJsThemeCss: `libs/highlight.js/styles/${asciidocAttributes.hightlightJsTheme}.css`,
        isInlined: false
    }
}

export function convertToRevealJsSlides(asciidocText: string, docDir: string, imagesDir?: string): string {
    const attributes: any = { docDir }
    if (imagesDir !== undefined) {
        attributes.imagesdir = imagesDir
    }

    return asciidoctor.convert(asciidocText, {
        safe: 'safe',
        backend: 'revealjs',
        attributes
    }) as string
}

function flattenSections(sections: AsciidoctorSection[]): AsciidoctorSection[] {
    return sections.reduce((all: AsciidoctorSection[], section: AsciidoctorSection) => {
        const nested = section.getSections() || []
        return all.concat(section, flattenSections(nested))
    }, [])
}

export function getSlideIdAtLine(asciidocText: string, lineNumber: number): string {
    try {
        const doc = loadDocument(asciidocText, '', true)
        const sections = flattenSections(doc.getSections() || [])
        const lineInAsciidoc = lineNumber + 1
        const section = sections
            .filter(candidate => candidate.getLineNumber() <= lineInAsciidoc)
            .pop()

        return section ? section.getId() : ''
    } catch (e) {
        console.error(e)
        return ''
    }
}
