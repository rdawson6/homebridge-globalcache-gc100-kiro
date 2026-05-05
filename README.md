# homebridge-globalcache-gc100-kiro

A [Homebridge](https://homebridge.io) plugin for controlling the **Systemline S6.2 multi-room audio system** via a **Global Cache iTach GC-100** RS232 interface.

[![npm](https://img.shields.io/npm/v/homebridge-globalcache-gc100-kiro)](https://www.npmjs.com/package/homebridge-globalcache-gc100-kiro)
[![Homebridge v2](https://img.shields.io/badge/homebridge-%5E1.0.0%20%7C%7C%20%5E2.0.0-blueviolet)](https://homebridge.io)

---

## Overview

The [Systemline S6.2](https://www.systemline.co.uk) is an 8-zone multi-room audio matrix amplifier. It exposes a serial (RS232) control interface, but has no native IP connectivity.

This plugin bridges that gap using a [Global Cache iTach GC-100](https://www.globalcache.com/products/gc-100/) — a network-to-serial adapter — to expose each S6.2 zone as a HomeKit accessory. You can then control your whole-home audio from the Apple Home app, Siri, or any HomeKit automation.

**What you can do from HomeKit:**
- Turn individual zones on or off (source selection)
- Control volume per zone via a brightness slider
- Include zones in automations and scenes

---

## Requirements

- [Homebridge](https://homebridge.io) v1 or v2
- Global Cache iTach GC-100 (network-to-serial adapter)
- Systemline S6.2 multi-room amplifier
- GC-100 connected to the S6.2 RS232 port and reachable on your local network

---

## Installation

Install via the Homebridge UI, or manually:

```bash
npm install -g homebridge-globalcache-gc100-kiro
```

---

## Configuration

Add the platform to your Homebridge `config.json`. The plugin is best configured via the Homebridge UI which provides a form-based editor.

### Minimal example

```json
{
  "platform": "GC100KiroPlatform",
  "name": "gc100kiro",
  "host": "192.168.1.100",
  "rs232_devices": [
    {
      "name": "Kitchen",
      "port": "4999",
      "base64_encoded": true,
      "commands": {
        "on": "JHMyc3JjMgo=",
        "off": "JHMyc3Jjb2ZmCg=="
      },
      "success_messages": {
        "on": "JHMyc3JjMgo=",
        "off": "JHMyc3Jjb2ZmCg=="
      }
    }
  ],
  "volume_devices": [
    {
      "name": "Kitchen Volume",
      "port": "4999",
      "zone": "2"
    }
  ]
}
```

### Configuration options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `platform` | string | ✅ | Must be `GC100KiroPlatform` |
| `name` | string | ✅ | Platform name shown in logs |
| `host` | string | ✅ | IP address of the GC-100 on your network |
| `ir_port` | string | | IR port (default: `4998`) |
| `rs232_devices` | array | | Zone switch accessories (see below) |
| `volume_devices` | array | | Volume control accessories (see below) |

#### Zone switches (`rs232_devices`)

Each entry creates a HomeKit **Switch** accessory that controls a zone's source input. Turning it on selects the source; turning it off mutes the zone.

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Accessory name shown in HomeKit |
| `port` | string | GC-100 RS232 port (default: `4999`) |
| `base64_encoded` | boolean | Set `true` if commands are Base64 encoded |
| `commands.on` | string | RS232 command to turn zone on |
| `commands.off` | string | RS232 command to turn zone off |
| `success_messages.on` | string | Expected response for on command |
| `success_messages.off` | string | Expected response for off command |

#### Volume zones (`volume_devices`)

Each entry creates a HomeKit **Lightbulb** accessory where the brightness slider controls zone volume. The S6.2 volume range (0–30) is mapped to HomeKit's 0–100% scale.

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Accessory name shown in HomeKit |
| `zone` | string | S6.2 zone number (1–8) |
| `port` | string | GC-100 RS232 port (default: `4999`) |

---

## RS232 Commands

The S6.2 uses a simple ASCII command protocol over RS232. Commands must be terminated with `\r`. If using `base64_encoded: true`, encode the raw command string in Base64.

### Common commands

| Action | Raw command | Base64 |
|--------|-------------|--------|
| Zone 2 on (source 2) | `$s2src2\r` | `JHMyc3JjMgo=` |
| Zone 2 off | `$s2srcoff\r` | `JHMyc3Jjb2ZmCg==` |
| Zone 8 on (source 2) | `$s8src2\r` | `JHM4c3JjMgo=` |
| Zone 8 off | `$s8srcoff\r` | `JHM4c3Jjb2ZmCg==` |

The command format is: `$s<zone>src<source>\r` to select a source, or `$s<zone>srcoff\r` to turn a zone off.

Use [base64encode.org](https://www.base64encode.org/) to encode your own commands.

---

## Zone reference (Systemline S6.2)

| Zone | Description |
|------|-------------|
| 1 | Zone 1 |
| 2 | Zone 2 |
| 3 | Zone 3 |
| 4 | Zone 4 |
| 5 | Zone 5 |
| 6 | Zone 6 |
| 7 | Zone 7 |
| 8 | Zone 8 |

---

## How it works

The GC-100 exposes its RS232 port over TCP on port 4999. This plugin opens a TCP socket to the GC-100 and sends raw RS232 commands directly to the S6.2.

**Zone switches** send a source-select or source-off command and read back the S6.2 response to determine state. State is cached after the first query to avoid unnecessary polling.

**Volume accessories** use a shared serial queue so only one socket is open on port 4999 at a time — this prevents response collisions when multiple zones are queried simultaneously. Volume changes are debounced (400ms) so dragging the slider doesn't flood the amplifier with commands. Startup queries are staggered per zone to allow each to complete before the next begins.

---

## Homebridge v2

This plugin is fully compatible with Homebridge v2 and HAP-NodeJS v1.

---

## Credits

Based on the original [homebridge-globalcache-itach](https://github.com/PaulWieland/homebridge-globalcache-itach) by [Paul Wieland](https://github.com/PaulWieland).

Enhanced for Systemline S6.2 RS232 control, volume slider support, state caching, and Homebridge v2 compatibility.

---

## License

MIT
