@echo off
chcp 65001 >nul
title 完了我被老蒋包围了 - 官网启动器
cd /d "C:\Users\71082_gz9ifxv\lobsterai\project\game-site"

echo ============================================
echo   游戏官网启动器（本地服务器 + 公网隧道）
echo ============================================
echo.
echo 正在启动本地服务器 (端口 8123)...
start "官网服务器" cmd /c "python -m http.server 8123 --directory ."
timeout /t 2 /nobreak >nul

echo 正在建立公网隧道，请稍候...
echo （出现 https://xxxx.lhr.life 即上线，保持本窗口开启）
echo.
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -R 80:localhost:8123 nokey@localhost.run

echo.
echo 隧道已断开。关闭本窗口前，网站已下线。
pause
