import {expect} from 'chai'
import * as vscode from 'vscode';
import * as path from 'path';
import { ASCIIDOC_SLIDES_EXTENSION_NAME } from '../../extension';
import axios from 'axios'
import { ContainerManager } from '../../ContainerManager';
import { writeFileSync, writeFile } from 'fs';
import { Container } from '../../Container';

const workingDir = path.resolve(__dirname, '../../..')

async function loadAsciidocFileToEditor(content: string, containerManager: ContainerManager) {
	const fileName = path.join(workingDir, 'out', 'test.adoc')
	writeFileSync(fileName, content)
	const newFile = vscode.Uri.parse(fileName)
	const document = await vscode.workspace.openTextDocument(newFile)

	await vscode.window.showTextDocument(document)
	containerManager.checkActiveEditor()
}


suite('RevealServer', function() {
	let loggingOutput = ''
	const testLogger = (line : string) => loggingOutput += line
	const extensionPath = vscode.extensions.getExtension(ASCIIDOC_SLIDES_EXTENSION_NAME)?.extensionPath
	const containerManager = new ContainerManager(extensionPath || '', testLogger)

	const testAsciiDocWithNoImagesDirAndRelativePath = `
= Test Asciidoc

== Images

image::../media/morpheus.jpg[]
`

	const testAsciiDocWithNoImagesDirAndAbsolutePath = `
= Test Asciidoc

== Images

image::${workingDir}/media/morpheus.jpg[]
`

	const testAsciiDocWithRelativeImagesDir = `
:imagesdir: ../media
= Test Asciidoc

== Images

image::morpheus.jpg[]
`

	const testAsciiDocWithAbsoluteImagesDir = `
:imagesdir: ${workingDir}/media
= Test Asciidoc

== Images

image::morpheus.jpg[]
`
	this.timeout(3000);


	async function assertPreviewIsCorrect(container: Container, imagePath: string, done: () => void) {			
		const resp = await axios.get(container.browserUrl)
		
		// correct relative path for stylesheets used?
		expect(resp.data).to.include('<link rel="stylesheet" href="libs/reveal.js/css/reveal.css">')
		// image included?
		expect(resp.data).to.include(`<img src="${imagePath}" alt="morpheus">`)
		// asciidoc transformed to html?
		expect(resp.data).to.include('<h1>Test Asciidoc</h1>')
		// websocket script included?
		expect(resp.data).to.include('if(!runningInIFrame) {')
		// server responded with 200 (OK)?
		expect(loggingOutput).to.include('<-- GET /  --> GET / 200')

		done()
	}

	async function assertExportIsCorrect(container: Container, done: () => void) {
		const givenFilename = `${extensionPath}/exported.html`

		let exportedHtml = ''
		let writtenFilename = ''
		const writer = (fileName: string, content: string) => {
			writtenFilename = fileName
			exportedHtml = content
		}
	
		await container.exportAsHtml(givenFilename, writer)
				
		expect(writtenFilename).to.be.equal(givenFilename)
		// correct absolute path for stylesheets used?
		expect(exportedHtml).to.include(`<link rel="stylesheet" href="${extensionPath}/libs/reveal.js/css/reveal.css">`)
		// correct absolute path for scripts used?
		expect(exportedHtml).to.include(`<script src="${extensionPath}/libs/reveal.js/js/reveal.js"></script>`)
		// asciidoc transformed to html?
		expect(exportedHtml).to.include('<h1>Test Asciidoc</h1>')
		// websocket script not included?
		expect(exportedHtml).not.to.include('if(!runningInIFrame) {')
		// server responded with 200 (OK)?
		expect(loggingOutput).to.include('<-- GET /export  --> GET /export 200')

		done()
	}

	async function assertInlinedExportIsCorrect(container: Container, done: () => void) {
		let exportedInlinedHtml = ''
		let writtenFilename = ''
		const writer = (fileName: string, content: string) => {
			writtenFilename = fileName
			exportedInlinedHtml = content
		}
		const givenFilename = `${extensionPath}/inlinedExported.html`
					
		await container.exportAsInlinedHtml(givenFilename, writer)
		
		expect(writtenFilename).to.be.equal(givenFilename)
		
		// all styles inlined?
		expect(exportedInlinedHtml).not.to.include(`<link rel="stylesheet"`)
		// all scripts inlined?
		expect(exportedInlinedHtml).not.to.include(`<script src="`)
		// asciidoc transformed to html?
		expect(exportedInlinedHtml).to.include('<h1>Test Asciidoc</h1>')
		// websocket script not included?
		expect(exportedInlinedHtml).not.to.include('if(!runningInIFrame) {')
		// server responded with 200 (OK)?
		expect(loggingOutput).to.include('<-- GET /export-inlined  --> GET /export-inlined 200')

		done()
	}

	this.beforeEach(() => {
		loggingOutput = ''
	})

	test('returns correct preview html', (done) => {
		loadAsciidocFileToEditor(testAsciiDocWithNoImagesDirAndRelativePath, containerManager).then(() => {
			containerManager.checkActiveEditor().andDo(async (_, container) => {	
				assertPreviewIsCorrect(container, '../media/morpheus.jpg', done)		
			})
		})
	})

	test('returns correct export html', (done) => {
		loadAsciidocFileToEditor(testAsciiDocWithNoImagesDirAndRelativePath, containerManager).then(() => {
			containerManager.checkActiveEditor().andDo(async (_, container) => {			
				assertExportIsCorrect(container, done)
			})
		})
	});

	test('returns correct inlined export html', (done) => {
		loadAsciidocFileToEditor(testAsciiDocWithNoImagesDirAndRelativePath, containerManager).then(() => {
			containerManager.checkActiveEditor().andDo(async (_, container) => {
				assertInlinedExportIsCorrect(container, done)
			})
		})
	})
});
