import * as cheerio from 'cheerio'
import * as path from 'path'
import { createLocalResourceBaseHtmlTag, SCROLL_TO_SLIDE_LISTENER_SCRIPT } from './/html-helper'
import * as vscode from 'vscode'
import {Asciidoctor} from 'asciidoctor/types/index'
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

const revealsPathOfAsciidoctor = 'node_modules/@asciidoctor/reveal.js/node_modules/reveal.js'

export function getAttributes(asciidocText: string, pathCompleter: (path: string) => string, resourceBasePath: string) {
    const doc = asciidoctor.load(asciidocText) as Asciidoctor.Document
    
    const imagesDir = doc.getAttribute("imagesdir")
    const highlightjsDir = doc.getAttribute("highlightjsdir")
    const givenHighlightJsThemePath = doc.getAttribute("highlightjs-theme")
    const revealjsdir = doc.getAttribute("revealjsdir")
    const sourceHighlighter = doc.getAttribute("source-highlighter")
    const icons = doc.getAttribute("icons")
    
    return {
        icons: icons ? icons : "font",
        'source-highlighter': sourceHighlighter ? sourceHighlighter : 'highlightjs',
        imagesdir: imagesDir ? imagesDir : resourceBasePath,
        highlightjsdir: highlightjsDir ? highlightjsDir : pathCompleter(`${revealsPathOfAsciidoctor}/plugin/highlight`),
        'highlightjs-theme': givenHighlightJsThemePath ? givenHighlightJsThemePath : pathCompleter(`${revealsPathOfAsciidoctor}/lib/css/zenburn.css`),
        revealjsdir: revealjsdir ? revealjsdir : pathCompleter(revealsPathOfAsciidoctor)
    }
}

export function createRevealJsHtml (asciidocText: string, pathCompleter: (path: string) => string, resourceBasePath: string, preview: boolean) {
    
    const attributes = getAttributes(asciidocText, pathCompleter, resourceBasePath)
    const opts = { 
        backend: 'revealjs',
        header_footer: true, 
        attributes
    }
    const completeRevealJsHtml =  asciidoctor.convert(asciidocText, opts) as string
    
    if(preview) {
        const completeRevealJsHtmlWithResourceBase = injectIntoHtml(completeRevealJsHtml, "head", createLocalResourceBaseHtmlTag(resourceBasePath))
        return injectIntoHtml(completeRevealJsHtmlWithResourceBase, 'body', SCROLL_TO_SLIDE_LISTENER_SCRIPT)
    }

    return completeRevealJsHtml
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

export function showErrorMessage(message: string) {
    vscode.window.showErrorMessage(message)
}