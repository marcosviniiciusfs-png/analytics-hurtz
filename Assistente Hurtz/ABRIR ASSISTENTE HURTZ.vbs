Option Explicit
Dim shell, fso, project, launcher
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
project = fso.GetParentFolderName(WScript.ScriptFullName)
launcher = project & "\Hurtz Launcher.exe"
If fso.FileExists(launcher) Then
    shell.Run """" & launcher & """", 1, False
Else
    MsgBox "Hurtz Launcher.exe não foi encontrado.", 16, "Hurtz"
End If
