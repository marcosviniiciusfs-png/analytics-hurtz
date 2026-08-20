Option Explicit
Dim shell, fso, project, electron, desktop
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
project = fso.GetParentFolderName(WScript.ScriptFullName)
electron = fso.BuildPath(fso.GetParentFolderName(project), "overlay\node_modules\electron\dist\electron.exe")
desktop = fso.BuildPath(project, "desktop")
If Not fso.FileExists(electron) Then
  MsgBox "Electron não encontrado. Execute o instalador do Assistente Hurtz.", 16, "Assistente Hurtz"
  WScript.Quit 1
End If
shell.Environment("Process")("NODE_PATH") = fso.BuildPath(fso.GetParentFolderName(project), "overlay\node_modules")
shell.Environment("Process").Remove("ELECTRON_RUN_AS_NODE")
shell.Run """" & electron & """ """ & desktop & """", 0, False
