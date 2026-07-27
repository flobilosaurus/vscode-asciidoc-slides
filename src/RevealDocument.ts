import { Asciidoctor } from 'asciidoctor/types/index'

/**
 * Reuse an Opal bridge installed by another Asciidoctor extension when present.
 * Loading a second bridge throws at runtime.
 */
const asciidoctor = ((<any>global).Opal && (<any>global).Opal.Asciidoctor) || require('@asciidoctor/core')()
const asciidoctorRevealjs = require('@asciidoctor/reveal.js')
const kroki = require('asciidoctor-kroki')
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

function loadDocument(asciidocText: string, docDir: string, sourcemap: boolean = false): Asciidoctor.Document {
    return asciidoctor.load(asciidocText, {
        safe: 'safe',
        header_footer: true,
        sourcemap,
        attributes: { docDir }
    }) as Asciidoctor.Document
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

function flattenSections(sections: Asciidoctor.Section[]): Asciidoctor.Section[] {
    return sections.reduce((all: Asciidoctor.Section[], section: Asciidoctor.Section) => {
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
