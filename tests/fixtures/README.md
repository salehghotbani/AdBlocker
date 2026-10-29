# Test-media provenance

`youtube-media.webm` is a self-generated, silent 20-second 160×90 test pattern. It contains no YouTube footage, advertisements, third-party artwork or downloaded media. The synthetic player serves it at distinct content/ad fixture URLs to exercise actual media decoding and source handoffs.

Generation command (FFmpeg is needed only to regenerate the checked-in test asset):

```sh
ffmpeg -f lavfi -i "testsrc2=size=160x90:rate=12:duration=20" -c:v libvpx -b:v 90k -an youtube-media.webm
```

The asset and synthetic fixture code are under the repository's MIT license. They enter the reviewer source archive, not the browser upload ZIPs. They are deliberately separate from opt-in real-ad observations.
