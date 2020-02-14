import * as htmlValidator from 'html-validator'
import { expect } from 'chai'

import { getCurrentSlideNumbers, injectIntoHtml, createRevealJsHtml} from '../../utils'
import * as vscode from 'vscode'
import HtmlValidator = require('html-validator')
import { fail, doesNotReject } from 'assert'

const asciidocText = `
:revealjs_theme: moon
= Title

== Slide 1

=== Slide 1.1

=== Slide 1.2

[%header,cols=2*] 
|===
|Name of Column 1
|Name of Column 2

|Cell in column 1, row 1
|Cell in column 2, row 1

|Cell in column 1, row 2
|Cell in column 2, row 2
|===

== Slide 2

`

async function numberOfHtmlErrors (html: string) {
    const resultString = await htmlValidator({
        data: html
    }) as unknown as string
    const result = JSON.parse(resultString) as htmlValidator.ParsedJsonAsValidationResults
    const errors = result.messages.filter(m => m.type === "error")
    return errors.length
}

suite('Utils Test Suite', () => {

    test('injectIntoHtml works', () => {
        const html = '<!DOCTYPE html><html><head><title>test</title></head><body></body></html>'
        const script = '<script src="some/src"></script>'
        const resultHtml = injectIntoHtml(html, "body", script)
        expect(resultHtml).to.equal(`<!DOCTYPE html><html><head><title>test</title></head><body>${script}</body></html>`)
    })

    test('createRevealJsHtml returns valid Html', async () => {
		const pathCompleter = (inputPath: string) => 'some/prefix/' + inputPath
        const resourceBasePath = "./"
        const revealJsHtml = createRevealJsHtml(asciidocText, pathCompleter, resourceBasePath)
        const numErrors = await numberOfHtmlErrors(revealJsHtml)
        expect(numErrors).to.equal(0)
    }).timeout(4000);

    test('getCurrentSlideNumbers should return null when no content given', () => {
		const lineNumbers = getCurrentSlideNumbers("", 1)
		expect(lineNumbers).to.equal(null)
	})

	test('getCurrentSlideNumbers should calculate correct hSlideNumbers', () => {
		const lineNumbers = getCurrentSlideNumbers(asciidocText, 3)
		expect(lineNumbers).to.deep.equal({ hSlideNumber: 0, vSlideNumber: 0 })
	})

	test('getCurrentSlideNumbers should calculate correct vSlideNumbers', () => {
		const lineNumbers = getCurrentSlideNumbers(asciidocText, 9)
		expect(lineNumbers).to.deep.equal({ hSlideNumber: 1, vSlideNumber: 2 })
    })
})