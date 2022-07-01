import {
    Position,
    Range,
    window
} from 'vscode'

// This method will add and then remove a space on the last line to trick codelens to be updated
export const refreshCodeLenses = (): void => {
    window.visibleTextEditors.forEach((editor) => {
      if (editor.document.lineCount !== 0) {
        return
      }
      // NOTE: We add a space to the end of the last line to force
      // Codelens to refresh.
      const lineCount = editor.document.lineCount
      const lastLine = editor.document.lineAt(lineCount - 1)
      editor.edit((edit) => {
        if (lastLine.isEmptyOrWhitespace) {
          edit.insert(new Position(lineCount - 1, 0), ' ')
          edit.delete(new Range(lineCount - 1, 0, lineCount - 1, 1000))
        } else {
          edit.insert(new Position(lineCount - 1, 1000), '\n')
        }
      }).then(() => {}, () => {})
    })
  }
  