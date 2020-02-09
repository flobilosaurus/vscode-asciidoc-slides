import * as htmlValidator from 'html-validator'
import { expect } from 'chai'

import { convertAsciidocToRevealJsHtml, AsciidocExtensionPath } from '../../utils'
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
        extensionPath: vscode.Uri.file('.')
    }

	test('convertAsciidocToRevealJsHtml should produce valid Html', async () => {
        const result = convertAsciidocToRevealJsHtml(initialInput)

		const options = {
            data: result.slidesHtml,
            isFragment: true
		}
		
		await validate(options)
    })

})