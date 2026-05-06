# Changelog

All notable changes to this project will be documented in this file.

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
