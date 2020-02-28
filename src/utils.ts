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
const kroki = require("asciidoctor-kroki")
asciidoctorRevealjs.register()
kroki.register(asciidoctor.Extensions)

export const REVEALJS_PATH = 'node_modules/reveal.js'

export function getAttributes(asciidocText: string, pathCompleter: (path: string) => string, resourceBasePath: string) {
    const doc = asciidoctor.load(asciidocText) as Asciidoctor.Document

    const imagesDir = doc.getAttribute("imagesdir")
    const revealjsdir = doc.getAttribute("revealjsdir")
    const sourceHighlighter = doc.getAttribute("source-highlighter")
    const icons = doc.getAttribute("icons")

    return {
        icons: icons ? icons : "font",
        'source-highlighter': sourceHighlighter ? sourceHighlighter : 'highlightjs',
        imagesdir: imagesDir ? imagesDir : resourceBasePath,
        revealjsdir: revealjsdir ? revealjsdir : pathCompleter(REVEALJS_PATH)
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
    if(!content) {
        return null
    }

    const doc = asciidoctor.load(content, {header_footer: true, sourcemap: true}) as Asciidoctor.Document
    const sections = doc.getSections()
    if(!sections) {
        return null
    }

    let sectionNumber = 0
    let subSectionNumber = 0
    const lineInAsciidoc = line + 1

    const indexOfSectionAfterCursor = sections.findIndex(s => s.getLineNumber() > lineInAsciidoc)
    if(indexOfSectionAfterCursor === 0) {
        return {hSlideNumber: 0, vSlideNumber: 0}
    }

    if(indexOfSectionAfterCursor === -1) {
        sectionNumber = sections.length - 1 
    } else {
        sectionNumber = indexOfSectionAfterCursor - 1
    }

    const subSections = sections[sectionNumber].getSections()
    const indexOfSubSectionAfterCursor = subSections.findIndex(ss => ss.getLineNumber() > lineInAsciidoc)
    if(indexOfSubSectionAfterCursor === -1) {
        subSectionNumber = subSections.length 
    } else {
        subSectionNumber = indexOfSubSectionAfterCursor
    }

    // add one to hSlideNumber for title slide
    return {hSlideNumber: sectionNumber + 1, vSlideNumber: subSectionNumber}
}

export function showErrorMessage(message: string) {
    vscode.window.showErrorMessage(message)
}
