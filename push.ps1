$git = "$env:LOCALAPPDATA\MinGit\cmd\git.exe"
if (Test-Path $git) {
    & $git push --force origin main
} else {
    git push --force origin main
}
