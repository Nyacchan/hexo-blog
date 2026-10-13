Add-Type -AssemblyName System.Drawing

$srcDir = "D:\DSH_workflow\待放图片"
$dstDir = "E:\blog\source\assets"

function Resize-Image {
    param($srcPath, $dstPath, [int]$maxW, [int]$maxH, [int]$quality = 88, [bool]$keepAlpha = $false)
    $img = [System.Drawing.Image]::FromFile($srcPath)
    $ratio = [Math]::Min($maxW / $img.Width, $maxH / $img.Height)
    if ($ratio -gt 1) { $ratio = 1 }
    $nw = [int]($img.Width * $ratio); $nh = [int]($img.Height * $ratio)

    if ($keepAlpha) {
        $bmp = New-Object System.Drawing.Bitmap($nw, $nh, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($img, 0, 0, $nw, $nh)
        $g.Dispose()
        # 抠掉棋盘格灰白与纯黑(原图透明区被填实的部分)
        for ($y = 0; $y -lt $nh; $y++) {
            for ($x = 0; $x -lt $nw; $x++) {
                $c = $bmp.GetPixel($x, $y)
                $isLight = ($c.R -ge 222 -and $c.G -ge 222 -and $c.B -ge 222 -and [math]::Abs($c.R-$c.G) -le 10 -and [math]::Abs($c.G-$c.B) -le 10)
                $isBlack = ($c.R -le 14 -and $c.G -le 14 -and $c.B -le 14)
                if ($isLight -or $isBlack) { $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0)) }
            }
        }
        $bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    } else {
        $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($img, 0, 0, $nw, $nh)
        $g.Dispose()
        $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
        $bmp.Save($dstPath, $enc, $ep)
        $bmp.Dispose()
    }
    $img.Dispose()
}

Write-Output "=== 处理头像(抠透明 + 缩到 400px) ==="
Resize-Image -srcPath "$srcDir\头像.png" -dstPath "$dstDir\avatar.png" -maxW 400 -maxH 400 -keepAlpha $true
Write-Output "  -> avatar.png  $([math]::Round((Get-Item "$dstDir\avatar.png").Length/1KB,1)) KB"

Write-Output "=== 处理 favicon(缩到 256px,保留透明) ==="
Resize-Image -srcPath "$srcDir\favicon.png" -dstPath "$dstDir\favicon-src.png" -maxW 256 -maxH 256 -keepAlpha $true
Write-Output "  -> favicon-src.png  $([math]::Round((Get-Item "$dstDir\favicon-src.png").Length/1KB,1)) KB"

Write-Output "=== 处理背景1(PC 日间) ==="
Resize-Image -srcPath "$srcDir\背景1.jpeg" -dstPath "$dstDir\bg-day.jpg" -maxW 1920 -maxH 1080 -quality 86
Write-Output "  -> bg-day.jpg  $([math]::Round((Get-Item "$dstDir\bg-day.jpg").Length/1KB,1)) KB"

Write-Output "=== 处理背景3(PC 夜间,21:9 超宽) ==="
Resize-Image -srcPath "$srcDir\背景3.jpg" -dstPath "$dstDir\bg-night.jpg" -maxW 1920 -maxH 1080 -quality 86
Write-Output "  -> bg-night.jpg  $([math]::Round((Get-Item "$dstDir\bg-night.jpg").Length/1KB,1)) KB"

Write-Output "=== 处理背景2(移动端) ==="
Resize-Image -srcPath "$srcDir\背景2.png" -dstPath "$dstDir\bg-mobile.jpg" -maxW 1080 -maxH 1920 -quality 86
Write-Output "  -> bg-mobile.jpg  $([math]::Round((Get-Item "$dstDir\bg-mobile.jpg").Length/1KB,1)) KB"

Write-Output "=== 处理默认封面 ==="
Resize-Image -srcPath "$srcDir\默认封面.jpg" -dstPath "$dstDir\cover-default.jpg" -maxW 1200 -maxH 800 -quality 86
Write-Output "  -> cover-default.jpg  $([math]::Round((Get-Item "$dstDir\cover-default.jpg").Length/1KB,1)) KB"

Write-Output ""
Write-Output "=== 产出清单 ==="
Get-ChildItem $dstDir -File | Where-Object { $_.Name -match '^(avatar|favicon-src|bg-|cover-default)' } |
    Select-Object Name, @{n='KB';e={[math]::Round($_.Length/1KB,1)}} | Format-Table -AutoSize
