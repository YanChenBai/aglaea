$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path $PSScriptRoot -Parent
$resourceRoot = Join-Path $projectRoot 'App_Resources/Android/src/main/res'
$source = [System.Drawing.Bitmap]::new((Join-Path $projectRoot 'assets/icon.png'))

function Write-Icon([string] $Path, [int] $Size, [int] $ArtworkSize) {
    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
    try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
        $offset = [int](($Size - $ArtworkSize) / 2)
        $destination = [System.Drawing.Rectangle]::new($offset, $offset, $ArtworkSize, $ArtworkSize)
        $graphics.DrawImage($source, $destination, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
        New-Item -ItemType Directory -Force (Split-Path $Path -Parent) | Out-Null
        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $attributes.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

try {
    foreach ($density in @(
        @{ Name = 'mdpi'; Legacy = 48; Canvas = 108; Artwork = 72 },
        @{ Name = 'hdpi'; Legacy = 72; Canvas = 162; Artwork = 108 },
        @{ Name = 'xhdpi'; Legacy = 96; Canvas = 216; Artwork = 144 },
        @{ Name = 'xxhdpi'; Legacy = 144; Canvas = 324; Artwork = 216 },
        @{ Name = 'xxxhdpi'; Legacy = 192; Canvas = 432; Artwork = 288 }
    )) {
        $directory = Join-Path $resourceRoot "mipmap-$($density.Name)"
        Write-Icon (Join-Path $directory 'ic_launcher.png') $density.Legacy $density.Legacy
        # 自适应图标的画布为 108dp，头像居中放入 72dp 可见区域。
        Write-Icon (Join-Path $directory 'ic_launcher_foreground.png') $density.Canvas $density.Artwork
    }
}
finally {
    $source.Dispose()
}
