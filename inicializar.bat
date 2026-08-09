@echo off
setlocal
title Lousa Virtual - dev

rem Roda a partir da pasta do proprio .bat, entao pode ser chamado de qualquer lugar
rem (inclusive por um atalho na area de trabalho).
cd /d "%~dp0"

where npm >nul 2>&1
if errorlevel 1 (
  echo.
  echo [ERRO] npm nao encontrado no PATH. Instale o Node.js: https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo Primeira execucao: instalando dependencias...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar as dependencias.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando o servidor de desenvolvimento...
echo O navegador abre sozinho quando o servidor estiver pronto.
echo Para parar: Ctrl+C nesta janela.
echo.

rem --open faz o Vite abrir o navegador so depois que o servidor sobe,
rem evitando a tela de "nao foi possivel conectar".
call npm run dev -- --open

rem Se o servidor cair sozinho, a janela fica aberta com a mensagem de erro.
if errorlevel 1 pause
