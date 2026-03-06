import * as vscode from 'vscode';

// Stores marked positions as decorations + raw positions
let markedPositions: vscode.Position[] = [];
let decorationType: vscode.TextEditorDecorationType;

export function activate(context: vscode.ExtensionContext) {
  // Decoration to visually show marked positions
  // Create a small magenta dot as a data URI
  const icon = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
      font-family="monospace" font-size="11" font-weight="bold" fill="#ff00ff">M</text>
  </svg>
  `)}`;

  decorationType = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.parse(icon),
    gutterIconSize: 'contain',
    borderWidth: '0 0 0 2px',
    borderStyle: 'solid',
    borderColor: '#ff00ff',
  });

  const markCurrentPos = (unmark_if_present: boolean, posOverride?: vscode.Position) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const pos = posOverride ?? editor.selection.active;

    // Toggle: if already marked, unmark it
    const existingIndex = markedPositions.findIndex(
        p => p.line === pos.line && p.character === pos.character);

    if (existingIndex !== -1) {
      if (unmark_if_present) {
        markedPositions.splice(existingIndex, 1);
      }
    } else {
      markedPositions.push(pos);
    }

    vscode.commands.executeCommand(
        'setContext', 'multimarker.hasMarks',
        markedPositions.length > 0);

    updateDecorations(editor);
    updateStatusBar();
  };

  // Command: mark current cursor position
  const markCmd = vscode.commands.registerCommand(
      'multimarker.markPosition', () => markCurrentPos(true));

  // Command: apply all marks as real cursors
  const applyCmd = vscode.commands.registerCommand(
      'multimarker.applyCursors', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        if (markedPositions.length === 0) {
          vscode.window.showInformationMessage(
              'No cursor marks set. Use Alt+M to mark positions first.');
          return;
        }

        // Include original cursor + all marks
        const allPositions = [...markedPositions];

        editor.selections =
            allPositions.map(pos => new vscode.Selection(pos, pos));

        // Clear marks after applying
        clearAll(editor);
      });

  const markAndGotoNext = vscode.commands.registerCommand(
      'multimarker.markAndGotoNext', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const pos = editor.selection.active;
        const wordRange = editor.document.getWordRangeAtPosition(pos);
        if (!wordRange) return;
        markCurrentPos(false, wordRange.start);

        const word = editor.document.getText(wordRange);
        const docText = editor.document.getText();
        const currentOffset = editor.document.offsetAt(wordRange.end);
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'g');
        regex.lastIndex = currentOffset;
        const match = regex.exec(docText);

        if (!match) return;  // last occurrence, don't mark or move

        const nextPos = editor.document.positionAt(match.index);
        editor.selection = new vscode.Selection(nextPos, nextPos);
        editor.revealRange(new vscode.Range(nextPos, nextPos));
      });

  const markAndGotoPrev = vscode.commands.registerCommand(
      'multimarker.markAndGotoPrev', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const pos = editor.selection.active;
        const wordRange = editor.document.getWordRangeAtPosition(pos);
        if (!wordRange) return;
        markCurrentPos(false, wordRange.start);

        const word = editor.document.getText(wordRange);
        const docText = editor.document.getText();
        const currentOffset = editor.document.offsetAt(wordRange.start);
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'g');
        let match: RegExpExecArray | null;
        let prevMatch: RegExpExecArray | null = null;
        while ((match = regex.exec(docText)) !== null) {
          if (match.index >= currentOffset) break;
          prevMatch = match;
        }

        if (!prevMatch) return;  // first occurrence, don't mark or move

        const prevPos = editor.document.positionAt(prevMatch.index);
        editor.selection = new vscode.Selection(prevPos, prevPos);
        editor.revealRange(new vscode.Range(prevPos, prevPos));
      });

  // Command: clear all marks
  const clearCmd =
      vscode.commands.registerCommand('multimarker.clearMarks', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        clearAll(editor);
      });

  // Clear marks if user switches editor or moves without marking
  const onEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
    markedPositions = [];
    if (editor) updateDecorations(editor);
    updateStatusBar();
    vscode.commands.executeCommand(
        'setContext', 'multimarker.hasMarks', false);
  });

  context.subscriptions.push(
      markCmd, applyCmd, markAndGotoNext, markAndGotoPrev, clearCmd,
      onEditorChange, decorationType);

  updateStatusBar();
}

let statusBarItem: vscode.StatusBarItem;

function updateStatusBar() {
  if (!statusBarItem) {
    statusBarItem =
        vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  }
  if (markedPositions.length > 0) {
    statusBarItem.text = `$(record) ${markedPositions.length} cursor mark${markedPositions.length > 1 ? 's' : ''}`;  
    statusBarItem.backgroundColor =
        new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

function updateDecorations(editor: vscode.TextEditor) {
  const ranges = markedPositions.map(pos => new vscode.Range(pos, pos));
  editor.setDecorations(decorationType, ranges);
}

function clearAll(editor: vscode.TextEditor) {
  markedPositions = [];
  updateDecorations(editor);
  updateStatusBar();
  vscode.commands.executeCommand(
      'setContext', 'multimarker.hasMarks', false);
}

export function deactivate() {
  markedPositions = [];
  if (decorationType) decorationType.dispose();
  if (statusBarItem) statusBarItem.dispose();
}