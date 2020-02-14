import * as cheerio from 'cheerio'
import { createLocalResourceBaseHtmlTag, SCROLL_TO_SLIDE_LISTENER_SCRIPT } from './/html-helper'

/**
 * Check if Opal has been loaded already, if not, require through asciidoctor.js
 * workaround to dont bridge opal runtime again because it will throw.
 * This can happen if other extensions like joaompinto.asciidoctor-vscode 
 * have already required('opal-runtime') or required('asciidoctor.js') or similar 
 * and thereby already bridged opal.
 *  */
const asciidoctor = ((<any>global).Opal && (<any>global).Opal.Asciidoctor) || require('@asciidoctor/core')()
const asciidoctorRevealjs = require('@asciidoctor/reveal.js')
asciidoctorRevealjs.register()

export function createRevealJsHtml (asciidocText: string, pathCompleter: (path: string) => string, resourceBasePath: string) {
    const revealsPathOfAsciidoctor = 'node_modules/@asciidoctor/reveal.js/node_modules/reveal.js'
    const attributes = {
        icons: "font",
        'source-highlighter': 'highlightjs',
        highlightjsdir: pathCompleter(`${revealsPathOfAsciidoctor}/plugin/highlight`),
        revealjsdir: pathCompleter(revealsPathOfAsciidoctor)
    }
    const opts = { 
        backend: 'revealjs',
        header_footer: true, 
        attributes
    }
    const completeRevealJsHtml =  asciidoctor.convert(asciidocText, opts) as string
    const completeRevealJsHtmlWithResourceBase = injectIntoHtml(completeRevealJsHtml, "head", createLocalResourceBaseHtmlTag(resourceBasePath))
    
    return injectIntoHtml(completeRevealJsHtmlWithResourceBase, 'body', SCROLL_TO_SLIDE_LISTENER_SCRIPT)
}

export function injectIntoHtml(html: string, parentNodeSelector: string, toInject: string) {
    const $ = cheerio.load(html)
    $(parentNodeSelector).append(toInject)
    return $.html()
}

export function getCurrentSlideNumbers (content: string, line : number) : {hSlideNumber: number, vSlideNumber: number} | null {
    const lines = content.split('\n')
    if (lines && lines.length > 1) {
        const linesInRange = lines.slice(0, line + 1)
        let hSlideNumber = -1
        let vSlideNumber = 0
        linesInRange.forEach(l => {
            if(l.startsWith('== ') || l.startsWith('= ')) {
                hSlideNumber++
                vSlideNumber = 0
            }
            if(l.startsWith('=== ')) {
                vSlideNumber++
            }
        })
        return {hSlideNumber, vSlideNumber}
    }
    return null
}
