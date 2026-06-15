Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
launcherDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(launcherDir)
ps1 = projectRoot & "\launch-app.ps1"
lockFile = projectRoot & "\data\launch.lock"

' Ignore rapid double-clicks while a launch is already running
If fso.FileExists(lockFile) Then
  Set lockF = fso.GetFile(lockFile)
  ageSeconds = DateDiff("s", lockF.DateLastModified, Now)
  If ageSeconds >= 0 And ageSeconds < 600 Then
    WScript.Quit 0
  End If
End If

shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """ -Silent", 0, False
