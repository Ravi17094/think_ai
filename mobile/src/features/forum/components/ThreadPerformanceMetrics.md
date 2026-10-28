## Forum Performance - [Date]
- Device: [e.g. Pixel 6a / mid-range, Android 14, 6GB RAM]
- Threads: 500+
- Baseline FPS: avg __, min __, max __ (measured via Flipper/Performance tools)
- Optimizations: removeClippedSubviews, windowSize=21, maxToRenderPerBatch=10, updateCellsBatchingPeriod=50, initialNumToRender=10, memoized rows, lazy thumbnails, stable keyExtractor, dedupe pagination, loadMore guard
- Optimized FPS: avg __, min __, max __ (target 55 FPS on mid-range; do not claim met until measured)
- Memory: before __ MB, after __ MB
- Infinite scroll: verified (no duplicates, pages append correctly, guard prevents duplicate loadMore)
- Notes: [jank, blank cells, etc.]
