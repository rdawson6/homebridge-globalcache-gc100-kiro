import json

with open('/var/lib/homebridge/config.json', 'r') as f:
    config = json.load(f)

# Find the GC100KiroPlatform entry
kiro = next(p for p in config['platforms'] if p.get('platform') == 'GC100KiroPlatform')

kiro['volume_devices'] = [
    {
        "name": "Summer Lounge Volume",
        "port": "4999",
        "zone": "3"
    },
    {
        "name": "Kitchen Volume",
        "port": "4999",
        "zone": "2"
    },
    {
        "name": "Bedroom 1 Volume",
        "port": "4999",
        "zone": "1"
    },
    {
        "name": "Winter Lounge Volume",
        "port": "4999",
        "zone": "8"
    }
]

with open('/var/lib/homebridge/config.json', 'w') as f:
    json.dump(config, f, indent=4)

print('Done')
