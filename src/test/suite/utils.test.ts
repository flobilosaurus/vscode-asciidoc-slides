import * as htmlValidator from 'html-validator'
import { expect } from 'chai'
import * as R from 'remeda'

import { convertAsciidocToRevealJsHtml, AsciidocExtensionPath, addScripts, AsciidocExtensionPathSlidesHtmlWithScripts, AsciidocExtensionPathSlidesHtml } from '../../utils'
import * as vscode from 'vscode'
import HtmlValidator = require('html-validator')

const asciidocText = `
= Title

== Slide 1

=== Slide 1.1

=== Slide 1.2

== Slide 2

`

async function validate (options: HtmlValidator.OptionsForHtmlFileAsValidationTargetAndObjectAsResult) {
    const resultString = await htmlValidator(options) as unknown as string
    const result = JSON.parse(resultString) as htmlValidator.ParsedJsonAsValidationResults
    const errors = result.messages.filter(m => m.type === "error")
    expect(errors).to.have.length(0)
}

suite('Utils Test Suite', () => {

    const initialInput : AsciidocExtensionPath = {
        asciidocText,
        extensionPath: vscode.Uri.file('.'),
        scriptUris: [vscode.Uri.file('js/reveal.js')]
    }

	test('convertAsciidocToRevealJsHtml should produce valid Html', async () => {
        const result = convertAsciidocToRevealJsHtml(initialInput)

		const options = {
            data: result.slidesHtml,
            isFragment: true
		}
		
		await validate(options)
    })

    test('addScripts should produce valid Html', async () => {
        const input = R.addProp(initialInput, 'slidesHtml', '');
        const result = addScripts(input)

		const options = {
            data: result.scriptsHtml,
            isFragment: true
		}
		
		await validate(options)
    })
})