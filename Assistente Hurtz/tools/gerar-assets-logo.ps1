$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$project = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$source = "C:\Users\Brito\Downloads\Design sem nome (8).png"
$assets = Join-Path $project "assets"
$pngPath = Join-Path $assets "hurtz-logo.png"
$icoPath = Join-Path $assets "hurtz-logo.ico"

if (-not (Test-Path -LiteralPath $source)) {
    throw "Logo de origem não encontrada: $source"
}
New-Item -ItemType Directory -Force -Path $assets | Out-Null

$original = [System.Drawing.Bitmap]::FromFile($source)
try {
    $minX = $original.Width
    $minY = $original.Height
    $maxX = 0
    $maxY = 0
    for ($y = 0; $y -lt $original.Height; $y++) {
        for ($x = 0; $x -lt $original.Width; $x++) {
            if ($original.GetPixel($x, $y).A -gt 10) {
                if ($x -lt $minX) { $minX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $sourceRect = New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1)

    $canvas = New-Object System.Drawing.Bitmap 512, 512, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($canvas)
        try {
            $graphics.Clear([System.Drawing.Color]::Transparent)
            $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $destination = New-Object System.Drawing.Rectangle 36, 36, 440, 440
            $graphics.DrawImage($original, $destination, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
        } finally {
            $graphics.Dispose()
        }
        $canvas.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $canvas.Dispose()
    }

    $sizes = @(16, 24, 32, 48, 64, 128, 256)
    $entries = @()
    foreach ($size in $sizes) {
        $bitmap = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $g = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $g.Clear([System.Drawing.Color]::Transparent)
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $margin = [Math]::Max(1, [int]($size * 0.07))
                $destination = New-Object System.Drawing.Rectangle $margin, $margin, ($size - 2 * $margin), ($size - 2 * $margin)
                $g.DrawImage($original, $destination, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
            } finally {
                $g.Dispose()
            }
            $stream = New-Object System.IO.MemoryStream
            $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
            $entries += ,$stream.ToArray()
            $stream.Dispose()
        } finally {
            $bitmap.Dispose()
        }
    }

    $output = [System.IO.File]::Create($icoPath)
    $writer = New-Object System.IO.BinaryWriter $output
    try {
        $writer.Write([UInt16]0)
        $writer.Write([UInt16]1)
        $writer.Write([UInt16]$entries.Count)
        $offset = 6 + (16 * $entries.Count)
        for ($index = 0; $index -lt $entries.Count; $index++) {
            $size = $sizes[$index]
            $writer.Write([Byte]$(if ($size -eq 256) { 0 } else { $size }))
            $writer.Write([Byte]$(if ($size -eq 256) { 0 } else { $size }))
            $writer.Write([Byte]0)
            $writer.Write([Byte]0)
            $writer.Write([UInt16]1)
            $writer.Write([UInt16]32)
            $writer.Write([UInt32]$entries[$index].Length)
            $writer.Write([UInt32]$offset)
            $offset += $entries[$index].Length
        }
        foreach ($entry in $entries) {
            $writer.Write($entry)
        }
    } finally {
        $writer.Dispose()
        $output.Dispose()
    }
} finally {
    $original.Dispose()
}

Write-Host "[OK] Logo PNG e ícone ICO gerados em $assets"
