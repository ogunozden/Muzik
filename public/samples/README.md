Real instrument samples live here.

Use the app page at `/sesler` to update them without editing code. The upload
API writes only to known sample slots under this folder, and the audio engine
uses those files as the source of instrument playback. Synthetic Web Audio
fallback is disabled by default so missing samples stay silent instead of
playing the wrong instrument.

Melodic instruments:

- `ney`
- `ud`
- `kemence`
- `tanpura`

Each melodic instrument supports chromatic WAV slots from `C3.wav` through
`B5.wav`. Sharp notes use `s` in the filename:

```text
C3.wav
Cs3.wav
D3.wav
Ds3.wav
...
B5.wav
```

Percussion instruments:

- `kudum`
- `bendir`
- `davul`
- `def`

Each percussion folder supports:

```text
dum.wav
dum-accent.wav
tek.wav
tek-accent.wav
ke.wav
ke-accent.wav
```

WAV is recommended. Other browser-decodable audio may also work, but the app
stores uploads using the slot's fixed `.wav` filename so the engine has a stable
URL.
