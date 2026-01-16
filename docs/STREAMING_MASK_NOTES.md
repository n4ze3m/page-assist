Streaming tail mask approach

- 3 mask layers on paragraph (.streaming-mask):
  1. Full body coverage: 100% x 100%, positioned bottom with line-height offset
  2. Solid reveal on last line: width = --stream-mask-start, height = line-height
  3. Fade tail on last line: width = --stream-mask-width, height = line-height, positioned at --stream-mask-start
- Edge-offset mask-position used to avoid JS height calculations
- Anchor is inline so its rect tracks last glyph; we compute:
  - maskWidth = paragraphRect.width \* 0.75
  - maskStart = max(anchorX + shift - maskWidth, 0)
- CSS variables:
  - --stream-mask-line-height (from computed style)
  - --stream-mask-start (px)
  - --stream-mask-width (px)
- Last line always masked; earlier lines fully shown

Hybrid buffering strategy

- Base charsPerFlush and flushIntervalMs from config
- Adaptive flush size: increases with pendingBuffer (up to 6x) to drain bursts
- Keeps pacing tied to chunk cadence but prevents backlog
