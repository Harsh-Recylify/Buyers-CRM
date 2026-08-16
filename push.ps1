$git = "$env:LOCALAPPDATA\MinGit\cmd\git.exe"
if (Test-Path $git) {
    & $git push -u origin main
} else {
    git push -u origin main
}
