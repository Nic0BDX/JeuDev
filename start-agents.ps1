<#
.SYNOPSIS
Lance six agents Codex pour Aetheris, avec un worktree et un serveur Vite par agent.
.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\start-agents.ps1
.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\start-agents.ps1 -Dashboard
.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\start-agents.ps1 -Merge
.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\start-agents.ps1 -Clean
#>
[CmdletBinding(DefaultParameterSetName = 'Start')]
param(
    [Parameter(Mandatory, ParameterSetName = 'Dashboard')][switch]$Dashboard,
    [Parameter(ParameterSetName = 'Dashboard')][switch]$Once,
    [Parameter(Mandatory, ParameterSetName = 'Merge')][switch]$Merge,
    [Parameter(Mandatory, ParameterSetName = 'Clean')][switch]$Clean,
    [Parameter(Mandatory, ParameterSetName = 'Worker')][ValidateSet('Codex', 'Vite')][string]$Worker,
    [Parameter(Mandatory, ParameterSetName = 'Worker')][ValidateSet('assets','title','dex','worldmap','compendium','hud')][string]$Agent
)

$ErrorActionPreference = 'Stop'
$Integration = 'visual-fidelity'
$Agents = @(
    @{ Name = 'assets'; Color = '#8B5CF6'; Port = 5201; Scope = 'Visuels originaux, icônes, fonds et composants partagés. Travaille dans public/assets/, src/ui/ et src/styles/. Documente les visuels manquants dans ASSETS-NEEDED.md.' }
    @{ Name = 'title'; Color = '#F59E0B'; Port = 5202; Scope = 'Titre et réglages dans src/main.ts et une feuille de style dédiée. Préserve le lancement, la reprise et les accès existants.' }
    @{ Name = 'dex'; Color = '#22C55E'; Port = 5203; Scope = 'Interface du Dex dans src/dex.ts et une feuille de style dédiée. Réutilise les espèces existantes et coordonne la section Compendium avec son agent.' }
    @{ Name = 'worldmap'; Color = '#06B6D4'; Port = 5204; Scope = 'Carte du monde dans src/map.ts et une feuille de style dédiée. Préserve la découverte, les repères, le zoom et les données de régions existantes.' }
    @{ Name = 'compendium'; Color = '#EC4899'; Port = 5205; Scope = 'Compendium dans un module et une feuille de style dédiés. Réutilise les données existantes et conviens avec DEX du point de raccordement à src/dex.ts.' }
    @{ Name = 'hud'; Color = '#3B82F6'; Port = 5206; Scope = 'HUD dans src/world.ts et une feuille de style dédiée. Préserve le monde Three.js, la minimap, les commandes, le combat et la sauvegarde.' }
)

function Invoke-Git {
    & git -C $RepoRoot @args
    if ($LASTEXITCODE -ne 0) { throw "Git a échoué ($LASTEXITCODE) : $args" }
}

$RepoRoot = $PSScriptRoot
$RepoRoot = ([string](Invoke-Git rev-parse --show-toplevel)).Trim()
$WorktreeRoot = Join-Path (Split-Path -Parent $RepoRoot) ((Split-Path -Leaf $RepoRoot) + '-agents')
$BaseFile = Join-Path $WorktreeRoot 'base.txt'
$PowerShellExe = (Get-Process -Id $PID).Path

function Get-AgentPath($Entry) {
    Join-Path $WorktreeRoot $Entry.Name
}

function Get-AgentBranch($Entry) {
    'agent/' + $Entry.Name
}

function Test-Branch($Branch) {
    [bool](Invoke-Git branch --list $Branch)
}

function Get-BaseCommit {
    if (Test-Path -LiteralPath $BaseFile) {
        return ([string](Get-Content -LiteralPath $BaseFile -TotalCount 1)).Trim()
    }
    [string](Invoke-Git rev-parse HEAD)
}

function Assert-BaseCommit($Base) {
    if ($Base -notmatch '^[0-9a-f]{40,64}($Entry) {
    $path = Get-AgentPath $Entry
    $branch = Get-AgentBranch $Entry
    foreach ($directory in $WorktreeRoot, $path) {
        if ((Get-Item -LiteralPath $directory -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw "Le worktree ne peut pas passer par un lien : $directory"
        }
    }
    $resolved = (Resolve-Path -LiteralPath $path).Path
    if ($resolved -ne [IO.Path]::GetFullPath($path)) { throw "Chemin de worktree inattendu : $resolved" }
    $top = [string](Invoke-Git -C $path rev-parse --show-toplevel)
    $actual = [string](Invoke-Git -C $path branch --show-current)
    $common = [string](Invoke-Git -C $path rev-parse --path-format=absolute --git-common-dir)
    $expected = [string](Invoke-Git rev-parse --path-format=absolute --git-common-dir)
    if ([IO.Path]::GetFullPath($top) -ne $resolved -or $actual -ne $branch -or $common -ne $expected) {
        throw "Le dossier $path doit être le worktree de $branch dans ce dépôt."
    }
}

function Show-Dashboard {
    do {
        if (-not $Once -and -not [Console]::IsOutputRedirected) { Clear-Host }
        Write-Host ("AETHERIS - AGENTS EN DIRECT - {0} (Ctrl+C pour quitter)" -f (Get-Date -Format 'HH:mm:ss')) -ForegroundColor Cyan
        $base = Get-BaseCommit
        foreach ($entry in $Agents) {
            $path = Get-AgentPath $entry
            Write-Host ("{0,-11} http://localhost:{1}" -f $entry.Name.ToUpperInvariant(), $entry.Port) -ForegroundColor Yellow
            if (-not (Test-Path -LiteralPath $path)) {
                Write-Host '  Worktree à créer.'
                continue
            }
            try {
                Assert-AgentWorktree $entry
                $commits = Invoke-Git -C $path rev-list --count "$base..HEAD"
                $changes = @(Invoke-Git -C $path status --short)
                $last = Invoke-Git -C $path log -1 --format='%ar : %s'
                Write-Host "  $commits commit(s), $($changes.Count) fichier(s) modifié(s)"
                Write-Host "  $last"
                $changes | Select-Object -First 4 | ForEach-Object { Write-Host "    $_" }
                foreach ($file in 'PROGRESS.md', 'FIDELITE.md', 'BLOCKERS.md') {
                    $report = Join-Path $path "agents-meta/$($entry.Name)/$file"
                    if (Test-Path -LiteralPath $report -PathType Leaf) {
                        $line = Get-Content -LiteralPath $report -Encoding UTF8 | Where-Object { $_.Trim() } | Select-Object -Last 1
                        if ($line) { Write-Host "  $($file) - $line" }
                    }
                }
            } catch { Write-Host "  $($_.Exception.Message)" -ForegroundColor Red }
        }
        if (-not $Once) { Start-Sleep -Seconds 3 }
    } until ($Once)
}

function Merge-Agents {
    if (Invoke-Git status --porcelain) { throw 'Le dépôt principal doit être propre avant la fusion.' }
    if (Test-Branch $Integration) { Invoke-Git switch $Integration }
    else { Invoke-Git switch -c $Integration (Get-BaseCommit) }
    foreach ($entry in $Agents) {
        $branch = Get-AgentBranch $entry
        if (-not (Test-Branch $branch)) { continue }
        $path = Get-AgentPath $entry
        if (Test-Path -LiteralPath $path) {
            Assert-AgentWorktree $entry
            if (Invoke-Git -C $path status --porcelain) {
                Write-Warning "$branch contient des modifications locales. La fusion prend ses commits."
            }
        }
        Invoke-Git merge --no-ff --no-edit $branch
    }
}

function Clean-Agents {
    if (-not (Test-Branch $Integration)) { throw "Crée d'abord $Integration avec -Merge." }
    foreach ($entry in $Agents) {
        $branch = Get-AgentBranch $entry
        if ((Test-Branch $branch) -and (Invoke-Git rev-list --count "$Integration..$branch") -ne '0') {
            throw "$branch contient des commits absents de $Integration."
        }
        $path = Get-AgentPath $entry
        if (Test-Path -LiteralPath $path) {
            Assert-AgentWorktree $entry
            if (Invoke-Git -C $path status --porcelain) { throw "Le worktree $path contient des modifications locales." }
        }
    }
    if ((Read-Host 'Supprimer les six worktrees et leurs branches fusionnées ? (oui/non)') -ne 'oui') { return }
    foreach ($entry in $Agents) {
        $path = Get-AgentPath $entry
        $branch = Get-AgentBranch $entry
        if (Test-Path -LiteralPath $path) { Invoke-Git worktree remove $path }
        if (Test-Branch $branch) {
            if ((Invoke-Git rev-list --count "$Integration..$branch") -ne '0') { throw "$branch a avancé pendant le nettoyage." }
            Invoke-Git branch -D $branch
        }
    }
    if (Test-Path -LiteralPath $BaseFile) { Remove-Item -LiteralPath $BaseFile }
}

function Initialize-Agent($Entry, $Base) {
    $path = Get-AgentPath $Entry
    $branch = Get-AgentBranch $Entry
    if (-not (Test-Path -LiteralPath $path)) {
        if (Test-Branch $branch) { Invoke-Git worktree add $path $branch }
        else { Invoke-Git worktree add -b $branch $path $Base }
    }
    Assert-AgentWorktree $Entry

    $mission = @"
# Agent $($Entry.Name)

Lis AGENTS.md, PROGRESS.md et ART_DIRECTION.md. Si le dépôt principal contient
PROMPT-FIDELITE.md et reference/, consulte-les en lecture seule dans "$RepoRoot".
Adapte les références à la structure et à la direction artistique d'Aetheris.

Périmètre : $($Entry.Scope)

Travaille uniquement sur $branch dans ton worktree. Coordonne les changements
de fichiers partagés et conserve le comportement des sauvegardes existantes.
Le serveur Vite est lancé séparément sur http://localhost:$($Entry.Port).
Vérifie le build et les vues à 1672 x 941 et 390 x 844 si Chromium est disponible.
Commite chaque lot terminé avec le préfixe [$($Entry.Name)].
Mets à jour agents-meta/$($Entry.Name)/PROGRESS.md et FIDELITE.md. Note les
blocages dans BLOCKERS.md.
"@
    Set-Content -LiteralPath (Join-Path $WorktreeRoot "$($Entry.Name)-mission.md") -Value $mission -Encoding UTF8
}

function Invoke-Worker($Entry) {
    $path = Get-AgentPath $Entry
    Assert-AgentWorktree $Entry
    Set-Location -LiteralPath $path
    if ($Worker -eq 'Codex') {
        $mission = Join-Path $WorktreeRoot "$($Entry.Name)-mission.md"
        $prompt = "Lis le fichier de mission suivant, puis exécute sa mission : $mission"
        & codex --sandbox workspace-write --ask-for-approval on-request $prompt
        return
    }
    if (-not (Test-Path -LiteralPath 'node_modules/.bin/vite.cmd')) {
        if (Test-Path -LiteralPath 'package-lock.json') { & npm.cmd ci }
        else { & npm.cmd install --no-package-lock }
        if ($LASTEXITCODE -ne 0) { throw 'L’installation des dépendances npm a échoué.' }
    }
    & npm.cmd run dev -- --host localhost --port $Entry.Port --strictPort
    if ($LASTEXITCODE -ne 0) { throw "Vite a échoué sur le port $($Entry.Port)." }
}

function Open-PowerShellWindow([string[]]$ModeArgs) {
    $arguments = @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $PSCommandPath)) + $ModeArgs
    Start-Process -FilePath $PowerShellExe -ArgumentList $arguments -WorkingDirectory $RepoRoot
}

if ($Dashboard) { Show-Dashboard; return }
if ($Merge) { Merge-Agents; return }
if ($Clean) { Clean-Agents; return }
if ($Worker) { Invoke-Worker ($Agents | Where-Object { $_.Name -eq $Agent }); return }

foreach ($command in 'codex', 'node', 'npm.cmd') { Get-Command $command | Out-Null }
if (Invoke-Git diff --name-only HEAD) { throw 'Commite les modifications suivies avant de lancer les agents.' }
New-Item -ItemType Directory -Path $WorktreeRoot -Force | Out-Null
$base = Get-BaseCommit
Assert-BaseCommit $base
Set-Content -LiteralPath $BaseFile -Value $base -Encoding UTF8
foreach ($entry in $Agents) { Initialize-Agent $entry $base }

$terminal = Get-Command wt.exe -ErrorAction SilentlyContinue
$launchArgs = @($PowerShellExe, '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath)
if ($terminal) {
    & $terminal.Source -w aetheris-agents new-tab -d $RepoRoot --title DASHBOARD @launchArgs -Dashboard
    foreach ($entry in $Agents) {
        $path = Get-AgentPath $entry
        $title = $entry.Name.ToUpperInvariant()
        $terminalArgs = @('-w', 'aetheris-agents', 'new-tab', '-d', $path, '--title', $title, '--tabColor', $entry.Color) +
            $launchArgs + @('-Worker', 'Codex', '-Agent', $entry.Name, ';', 'split-pane', '-V', '-s', '0.3', '-d', $path, '--title', "$title VITE") +
            $launchArgs + @('-Worker', 'Vite', '-Agent', $entry.Name)
        & $terminal.Source @terminalArgs
    }
} else {
    Open-PowerShellWindow @('-Dashboard')
    foreach ($entry in $Agents) {
        Open-PowerShellWindow @('-Worker', 'Codex', '-Agent', $entry.Name)
        Open-PowerShellWindow @('-Worker', 'Vite', '-Agent', $entry.Name)
    }
}
) { throw "Commit de départ invalide : $Base" }
    Invoke-Git cat-file -e "$Base^{commit}"
}

function Assert-AgentWorktree($Entry) {
    $path = Get-AgentPath $Entry
    $branch = Get-AgentBranch $Entry
    foreach ($directory in $WorktreeRoot, $path) {
        if ((Get-Item -LiteralPath $directory -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw "Le worktree ne peut pas passer par un lien : $directory"
        }
    }
    $resolved = (Resolve-Path -LiteralPath $path).Path
    if ($resolved -ne [IO.Path]::GetFullPath($path)) { throw "Chemin de worktree inattendu : $resolved" }
    $top = [string](Invoke-Git -C $path rev-parse --show-toplevel)
    $actual = [string](Invoke-Git -C $path branch --show-current)
    $common = [string](Invoke-Git -C $path rev-parse --path-format=absolute --git-common-dir)
    $expected = [string](Invoke-Git rev-parse --path-format=absolute --git-common-dir)
    if ([IO.Path]::GetFullPath($top) -ne $resolved -or $actual -ne $branch -or $common -ne $expected) {
        throw "Le dossier $path doit être le worktree de $branch dans ce dépôt."
    }
}

function Show-Dashboard {
    do {
        if (-not $Once -and -not [Console]::IsOutputRedirected) { Clear-Host }
        Write-Host ("AETHERIS - AGENTS EN DIRECT - {0} (Ctrl+C pour quitter)" -f (Get-Date -Format 'HH:mm:ss')) -ForegroundColor Cyan
        $base = Get-BaseCommit
        foreach ($entry in $Agents) {
            $path = Get-AgentPath $entry
            Write-Host ("{0,-11} http://localhost:{1}" -f $entry.Name.ToUpperInvariant(), $entry.Port) -ForegroundColor Yellow
            if (-not (Test-Path -LiteralPath $path)) {
                Write-Host '  Worktree à créer.'
                continue
            }
            try {
                Assert-AgentWorktree $entry
                $commits = Invoke-Git -C $path rev-list --count "$base..HEAD"
                $changes = @(Invoke-Git -C $path status --short)
                $last = Invoke-Git -C $path log -1 --format='%ar : %s'
                Write-Host "  $commits commit(s), $($changes.Count) fichier(s) modifié(s)"
                Write-Host "  $last"
                $changes | Select-Object -First 4 | ForEach-Object { Write-Host "    $_" }
                foreach ($file in 'PROGRESS.md', 'FIDELITE.md', 'BLOCKERS.md') {
                    $report = Join-Path $path "agents-meta/$($entry.Name)/$file"
                    if (Test-Path -LiteralPath $report -PathType Leaf) {
                        $line = Get-Content -LiteralPath $report -Encoding UTF8 | Where-Object { $_.Trim() } | Select-Object -Last 1
                        if ($line) { Write-Host "  $($file) - $line" }
                    }
                }
            } catch { Write-Host "  $($_.Exception.Message)" -ForegroundColor Red }
        }
        if (-not $Once) { Start-Sleep -Seconds 3 }
    } until ($Once)
}

function Merge-Agents {
    if (Invoke-Git status --porcelain) { throw 'Le dépôt principal doit être propre avant la fusion.' }
    if (Test-Branch $Integration) { Invoke-Git switch $Integration }
    else { Invoke-Git switch -c $Integration (Get-BaseCommit) }
    foreach ($entry in $Agents) {
        $branch = Get-AgentBranch $entry
        if (-not (Test-Branch $branch)) { continue }
        $path = Get-AgentPath $entry
        if (Test-Path -LiteralPath $path) {
            Assert-AgentWorktree $entry
            if (Invoke-Git -C $path status --porcelain) {
                Write-Warning "$branch contient des modifications locales. La fusion prend ses commits."
            }
        }
        Invoke-Git merge --no-ff --no-edit $branch
    }
}

function Clean-Agents {
    if (-not (Test-Branch $Integration)) { throw "Crée d'abord $Integration avec -Merge." }
    foreach ($entry in $Agents) {
        $branch = Get-AgentBranch $entry
        if ((Test-Branch $branch) -and (Invoke-Git rev-list --count "$Integration..$branch") -ne '0') {
            throw "$branch contient des commits absents de $Integration."
        }
        $path = Get-AgentPath $entry
        if (Test-Path -LiteralPath $path) {
            Assert-AgentWorktree $entry
            if (Invoke-Git -C $path status --porcelain) { throw "Le worktree $path contient des modifications locales." }
        }
    }
    if ((Read-Host 'Supprimer les six worktrees et leurs branches fusionnées ? (oui/non)') -ne 'oui') { return }
    foreach ($entry in $Agents) {
        $path = Get-AgentPath $entry
        $branch = Get-AgentBranch $entry
        if (Test-Path -LiteralPath $path) { Invoke-Git worktree remove $path }
        if (Test-Branch $branch) {
            if ((Invoke-Git rev-list --count "$Integration..$branch") -ne '0') { throw "$branch a avancé pendant le nettoyage." }
            Invoke-Git branch -D $branch
        }
    }
    if (Test-Path -LiteralPath $BaseFile) { Remove-Item -LiteralPath $BaseFile }
}

function Initialize-Agent($Entry, $Base) {
    $path = Get-AgentPath $Entry
    $branch = Get-AgentBranch $Entry
    if (-not (Test-Path -LiteralPath $path)) {
        if (Test-Branch $branch) { Invoke-Git worktree add $path $branch }
        else { Invoke-Git worktree add -b $branch $path $Base }
    }
    Assert-AgentWorktree $Entry

    $mission = @"
# Agent $($Entry.Name)

Lis AGENTS.md, PROGRESS.md et ART_DIRECTION.md. Si le dépôt principal contient
PROMPT-FIDELITE.md et reference/, consulte-les en lecture seule dans "$RepoRoot".
Adapte les références à la structure et à la direction artistique d'Aetheris.

Périmètre : $($Entry.Scope)

Travaille uniquement sur $branch dans ton worktree. Coordonne les changements
de fichiers partagés et conserve le comportement des sauvegardes existantes.
Le serveur Vite est lancé séparément sur http://localhost:$($Entry.Port).
Vérifie le build et les vues à 1672 x 941 et 390 x 844 si Chromium est disponible.
Commite chaque lot terminé avec le préfixe [$($Entry.Name)].
Mets à jour agents-meta/$($Entry.Name)/PROGRESS.md et FIDELITE.md. Note les
blocages dans BLOCKERS.md.
"@
    Set-Content -LiteralPath (Join-Path $WorktreeRoot "$($Entry.Name)-mission.md") -Value $mission -Encoding UTF8
}

function Invoke-Worker($Entry) {
    $path = Get-AgentPath $Entry
    Assert-AgentWorktree $Entry
    Set-Location -LiteralPath $path
    if ($Worker -eq 'Codex') {
        $mission = Join-Path $WorktreeRoot "$($Entry.Name)-mission.md"
        $prompt = "Lis le fichier de mission suivant, puis exécute sa mission : $mission"
        & codex --sandbox workspace-write --ask-for-approval on-request $prompt
        return
    }
    if (-not (Test-Path -LiteralPath 'node_modules/.bin/vite.cmd')) {
        if (Test-Path -LiteralPath 'package-lock.json') { & npm.cmd ci }
        else { & npm.cmd install --no-package-lock }
        if ($LASTEXITCODE -ne 0) { throw 'L’installation des dépendances npm a échoué.' }
    }
    & npm.cmd run dev -- --host localhost --port $Entry.Port --strictPort
    if ($LASTEXITCODE -ne 0) { throw "Vite a échoué sur le port $($Entry.Port)." }
}

function Open-PowerShellWindow([string[]]$ModeArgs) {
    $arguments = @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $PSCommandPath)) + $ModeArgs
    Start-Process -FilePath $PowerShellExe -ArgumentList $arguments -WorkingDirectory $RepoRoot
}

if ($Dashboard) { Show-Dashboard; return }
if ($Merge) { Merge-Agents; return }
if ($Clean) { Clean-Agents; return }
if ($Worker) { Invoke-Worker ($Agents | Where-Object { $_.Name -eq $Agent }); return }

foreach ($command in 'codex', 'node', 'npm.cmd') { Get-Command $command | Out-Null }
if (Invoke-Git diff --name-only HEAD) { throw 'Commite les modifications suivies avant de lancer les agents.' }
New-Item -ItemType Directory -Path $WorktreeRoot -Force | Out-Null
$base = Get-BaseCommit
Assert-BaseCommit $base
Set-Content -LiteralPath $BaseFile -Value $base -Encoding UTF8
foreach ($entry in $Agents) { Initialize-Agent $entry $base }

$terminal = Get-Command wt.exe -ErrorAction SilentlyContinue
$launchArgs = @($PowerShellExe, '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath)
if ($terminal) {
    & $terminal.Source -w aetheris-agents new-tab -d $RepoRoot --title DASHBOARD @launchArgs -Dashboard
    foreach ($entry in $Agents) {
        $path = Get-AgentPath $entry
        $title = $entry.Name.ToUpperInvariant()
        $terminalArgs = @('-w', 'aetheris-agents', 'new-tab', '-d', $path, '--title', $title, '--tabColor', $entry.Color) +
            $launchArgs + @('-Worker', 'Codex', '-Agent', $entry.Name, ';', 'split-pane', '-V', '-s', '0.3', '-d', $path, '--title', "$title VITE") +
            $launchArgs + @('-Worker', 'Vite', '-Agent', $entry.Name)
        & $terminal.Source @terminalArgs
    }
} else {
    Open-PowerShellWindow @('-Dashboard')
    foreach ($entry in $Agents) {
        Open-PowerShellWindow @('-Worker', 'Codex', '-Agent', $entry.Name)
        Open-PowerShellWindow @('-Worker', 'Vite', '-Agent', $entry.Name)
    }
}
