import * as vscode from 'vscode';
import { SlidesPreviewPanel } from './SlidesPreviewPanel';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('asciidocSlides.preview', () => {
		SlidesPreviewPanel.createOrShow(context.extensionPath)
	});

	context.subscriptions.push(disposable);
}
