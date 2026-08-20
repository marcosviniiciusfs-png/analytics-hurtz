Option Explicit
Dim shell, fso, root, suite, electron, desktop
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
suite = fso.GetParentFolderName(root)
electron = fso.BuildPath(suite, "overlay\node_modules\electron\dist\electron.exe")
desktop = fso.BuildPath(root, "desktop")
If Not fso.FileExists(electron) Then
  MsgBox "Electron não encontrado. Execute o instalador do Assistente Hurtz.", 16, "Hurtz"
  WScript.Quit 1
End If
shell.CurrentDirectory = desktop
shell.Environment("PROCESS")("NODE_PATH") = fso.BuildPath(suite, "overlay\node_modules")
shell.Run Chr(34) & electron & Chr(34) & " " & Chr(34) & desktop & Chr(34), 0, False
