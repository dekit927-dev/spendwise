Add-Type -AssemblyName System.Drawing

$width = 512
$height = 512
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear with transparent
$g.Clear([System.Drawing.Color]::Transparent)

# Squircle background
$rect = New-Object System.Drawing.Rectangle(16, 16, 480, 480)
$radius = 120
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$d = $radius * 2
$path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
$path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
$path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
$path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
$path.CloseFigure()

# Background gradient (dark titanium obsidian)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(512, 512)),
    [System.Drawing.Color]::FromArgb(255, 15, 23, 42),
    [System.Drawing.Color]::FromArgb(255, 2, 6, 23)
)
$g.FillPath($bgBrush, $path)

# Subtle rim border
$rimPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(55, 255, 255, 255), 6)
$g.DrawPath($rimPen, $path)

# Draw the SpendWise S-Curve with exact mathematical Bézier points scaled to 512x512
# Scale factor = 512 / 120 = 4.2667
# M 82 34 -> (350, 145)
# C 74 24, 60 24, 52 24 -> (316, 102), (256, 102), (222, 102)
# C 40 24, 34 33, 34 46 -> (171, 102), (145, 141), (145, 196)
# C 34 56, 46 60, 60 60 -> (145, 239), (196, 256), (256, 256)
# C 74 60, 86 64, 86 74 -> (316, 256), (367, 273), (367, 316)
# C 86 87, 80 96, 68 96 -> (367, 371), (341, 410), (290, 410)
# C 60 96, 46 96, 38 86 -> (256, 410), (196, 410), (162, 367)

$sPen = New-Object System.Drawing.Pen(
    (New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(140, 100)),
        (New-Object System.Drawing.Point(370, 420)),
        [System.Drawing.Color]::FromArgb(255, 16, 185, 129),
        [System.Drawing.Color]::FromArgb(255, 56, 189, 248)
    )),
    52
)
$sPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$sPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$sPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$curvePath = New-Object System.Drawing.Drawing2D.GraphicsPath

# Add each cubic Bézier segment
$curvePath.AddBezier(350, 145, 316, 102, 256, 102, 222, 102)
$curvePath.AddBezier(222, 102, 171, 102, 145, 141, 145, 196)
$curvePath.AddBezier(145, 196, 145, 239, 196, 256, 256, 256)
$curvePath.AddBezier(256, 256, 316, 256, 367, 273, 367, 316)
$curvePath.AddBezier(367, 316, 367, 371, 341, 410, 290, 410)
$curvePath.AddBezier(290, 410, 256, 410, 196, 410, 162, 367)

$g.DrawPath($sPen, $curvePath)

# Save high-res modern PNG
$pngPath = "c:\Users\dell\Desktop\Spendwise\public\images\logo.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Save JPG version
$jpgPath = "c:\Users\dell\Desktop\Spendwise\public\images\logo.jpg"
$bmp.Save($jpgPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)

$g.Dispose()
$bmp.Dispose()
Write-Host "Generated high-res 512x512 logo.png and logo.jpg successfully."
