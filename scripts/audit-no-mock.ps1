# ==============================================================================
# AUDITORIA DE DATOS VIVOS (ANTI-MOCK AUDIT SCRIPT)
# Proyecto: Tactical Command: Wars of Legacy
# ==============================================================================
# Escanea todos los archivos de produccion en src/ (excluyendo tests)
# en busca de semillas inventadas, IDs sinteticos locales y fallbacks simulados.
# Devuelve codigo de salida 0 si el codigo esta 100% libre de mocks, o 1 si halla infracciones.
# ==============================================================================

Write-Host "Iniciando Auditoria Anti-Mock de Tactical Command..." -ForegroundColor Cyan

$forbiddenPatterns = @(
    "list_seed_",
    "DEFAULT_STARTER_",
    "INITIAL_COMMANDERS",
    "local-commander",
    "user_commander_01"
)

$srcFiles = Get-ChildItem -Path "src" -Recurse -File -Include *.ts, *.tsx | Where-Object {
    $_.FullName -notmatch "\.test\." -and $_.FullName -notmatch "__tests__"
}

$violationsFound = 0

foreach ($pattern in $forbiddenPatterns) {
    $matches = $srcFiles | Select-String -Pattern $pattern -SimpleMatch
    if ($matches) {
        Write-Host "[FAIL] INFRACCION ENCONTRADA para patron '$pattern':" -ForegroundColor Red
        foreach ($m in $matches) {
            Write-Host "   - $($m.Filename):$($m.LineNumber) -> $($m.Line.Trim())" -ForegroundColor Yellow
            $violationsFound++
        }
    } else {
        Write-Host "[OK] Limpio: Patron '$pattern' ausente en codigo de produccion." -ForegroundColor Green
    }
}

if ($violationsFound -gt 0) {
    Write-Host "`nAUDITORIA FALLIDA: Se detectaron $violationsFound violaciones de datos simulados." -ForegroundColor Red
    exit 1
} else {
    Write-Host "`nAUDITORIA EXITOSA: 100% libre de semillas inventadas e IDs sinteticos locales." -ForegroundColor Green
    exit 0
}
