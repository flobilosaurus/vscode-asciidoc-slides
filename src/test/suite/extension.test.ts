import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { SLIDE_PREVIEW_COMMAND } from '../../extension';

suite('asciidoc slides extension', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		//vscode.commands.executeCommand(SLIDE_PREVIEW_COMMAND)
	});
});
