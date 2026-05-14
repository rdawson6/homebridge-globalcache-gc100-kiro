# Changelog

All notable changes to this project will be documented in this file.

## [0.3.5] - 2026-05-14

### Added
- Systemline S6.2 branding icon (`branding/icon.png`) — now shows in Homebridge UI plugin list

## [0.3.4] - 2026-05-14

### Changed
- Display name updated to **Systemline S6.2 Control**
- Description updated to reference iTach IP2SL instead of GC-100
- README updated — all hardware references changed from GC-100 to iTach IP2SL
- Added `ip2sl` and `itach` keywords for better discoverability
- GitHub Actions workflow updated to opt into Node.js 24 ahead of June 2026 deadline

## [0.3.3] - 2026-05-06

### Changed
- Updated description to reference Systemline S6.2 and Kiro AI
- Added Kiro AI to contributors

## [0.3.2] - 2026-05-06

### Changed
- Added Systemline, S6.2, multiroom and audio keywords for better discoverability

## [0.3.1] - 2026-05-06

### Changed
- Updated GitHub Actions workflow to Node.js 24

## [0.3.0] - 2026-05-06

### Added
- Initial public release
- Zone source switching via HomeKit Switch accessories (RS232 over GC-100)
- Per-zone volume control via HomeKit Lightbulb brightness sliders
- Shared serial queue to prevent RS232 response collisions on port 4999
- Volume debouncing (400ms) for smooth slider control
- Staggered startup volume queries per zone
- RS232 state caching to avoid unnecessary polling
- Homebridge v1 and v2 compatible
