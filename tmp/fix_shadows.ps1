$files = Get-ChildItem -Path "c:\Users\mateu\Projetos\SCAE\src" -Filter *.tsx -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'shadow-sm' -or $content -match 'shadow-md') {
        $newContent = $content -replace 'shadow-sm', 'shadow-suave'
        $newContent = $newContent -replace 'shadow-md', 'shadow-media'
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
        Write-Output "Updated: $($file.FullName)"
    }
}
