import * as vscode from 'vscode';
import * as path from 'path'
import * as fs from 'fs'
import { SlidesPreviewPanel } from './SlidesPreviewPanel';
import { createRevealJsHtml, showErrorMessage } from './utils';

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('asciidocSlides.preview', () => {
		SlidesPreviewPanel.createOrShow(context.extensionPath)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('asciidocSlides.export', async () => {
		const document = vscode.window.activeTextEditor?.document
		if(document) {
			const proposedFilename = path.join(path.dirname(document.fileName), "slides.html")
			const exportFileLocation = await vscode.window.showSaveDialog({defaultUri: vscode.Uri.file(proposedFilename), filters: {'HTML': ['html']}})
			if(exportFileLocation) {
				
				const pathCompleter = (inputPath: string) => path.join(context.extensionPath, inputPath)
				console.log("resource base path: ", path.dirname(document.fileName))
				const slidesHtml = createRevealJsHtml(document.getText(), pathCompleter, path.dirname(document.fileName), false);
				fs.writeFile(exportFileLocation.fsPath, slidesHtml, (err) => {
					if(err) {
						showErrorMessage(`Error while exporting: ${err?.message}`)
					}
				})
			}

		} else {
			showErrorMessage("Call this command based on an asciidoc document.")
		}
	}));
}
