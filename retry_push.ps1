# 自动重试 git push，直到成功
$g = "C:\Users\71082_gz9ifxv\lobsterai\project\game-site\mingit\cmd\git.exe"
Push-Location "C:\Users\71082_gz9ifxv\lobsterai\project\game-site"
$log = "C:\Users\71082_gz9ifxv\lobsterai\project\game-site\retry_push.log"
for ($i = 1; $i -le 12; $i++) {
    Add-Content $log ("try $i at " + (Get-Date -Format "HH:mm:ss"))
    & $g push origin main *>> $log
    if ($LASTEXITCODE -eq 0) {
        Add-Content $log "PUSH_SUCCESS"
        exit 0
    }
    Start-Sleep -Seconds 75
}
Add-Content $log "PUSH_FAILED_ALL"
Pop-Location
