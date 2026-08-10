# Offline narration via the Windows Speech API.
# Text arrives as a UTF-8 file rather than an argument so quotes, dashes and
# apostrophes in the narration can never break the command line.
param(
  [Parameter(Mandatory = $true)][string]$TextFile,
  [Parameter(Mandatory = $true)][string]$OutFile,
  [string]$Voice = "",
  [int]$Rate = -1
)

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

if ($Voice -ne "") {
  try { $synth.SelectVoice($Voice) } catch { }
}
$synth.Rate = $Rate

# 22.05 kHz mono 16-bit: plenty for speech, keeps the asset small.
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

$text = [System.IO.File]::ReadAllText($TextFile, [System.Text.Encoding]::UTF8)
$synth.SetOutputToWaveFile($OutFile, $fmt)
$synth.Speak($text)
$synth.SetOutputToNull()
$synth.Dispose()

if (Test-Path $OutFile) { (Get-Item $OutFile).Length } else { 0 }
