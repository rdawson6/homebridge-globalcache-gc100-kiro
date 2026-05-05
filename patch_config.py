import json

with open('/var/lib/homebridge/config.json', 'r') as f:
    config = json.load(f)

new_platform = {
    "platform": "GC100KiroPlatform",
    "name": "gc100kiro",
    "host": "192.168.4.200",
    "ir_port": "4999",
    "rs232_devices": [
        {
            "name": "Winter Lounge",
            "port": "4999",
            "base64_encoded": True,
            "commands": {
                "on": "JHM4c3JjMgo=",
                "off": "JHM4c3Jjb2ZmCg=="
            },
            "success_messages": {
                "on": "JHM4c3JjMQo=",
                "off": "JHM4c3Jjb2ZmCg=="
            }
        },
        {
            "name": "Summer Lounge",
            "port": "4999",
            "base64_encoded": True,
            "commands": {
                "on": "JHMzc3JjMgo=",
                "off": "JHMzc3Jjb2ZmCg=="
            },
            "success_messages": {
                "on": "JHMzc3JjMgo=",
                "off": "JHMzc3Jjb2ZmCg=="
            }
        },
        {
            "name": "Summer Lounge Vol+",
            "port": "4999",
            "base64_encoded": True,
            "stateless": True,
            "commands": {
                "on": "JHMzdm9sKwo=",
                "off": "JHMzdm9sKwo="
            },
            "success_messages": {
                "on": "JHMzdm9sKwo=",
                "off": "JHMzdm9sKwo="
            }
        },
        {
            "name": "Summer Lounge Vol-",
            "port": "4999",
            "base64_encoded": True,
            "stateless": True,
            "commands": {
                "on": "JHMzdm9sLQo=",
                "off": "JHMzdm9sLQo="
            },
            "success_messages": {
                "on": "JHMzdm9sLQo=",
                "off": "JHMzdm9sLQo="
            }
        },
        {
            "name": "Kitchen",
            "port": "4999",
            "base64_encoded": True,
            "commands": {
                "on": "JHMyc3JjMgo=",
                "off": "JHMyc3Jjb2ZmCg=="
            },
            "success_messages": {
                "on": "JHMyc3JjMgo=",
                "off": "JHMyc3Jjb2ZmCg=="
            }
        },
        {
            "name": "Kitchen Vol+",
            "port": "4999",
            "base64_encoded": True,
            "stateless": True,
            "commands": {
                "on": "JHMydm9sKwo=",
                "off": "JHMydm9sKwo="
            },
            "success_messages": {
                "on": "JHMydm9sKwo=",
                "off": "JHMydm9sKwo="
            }
        },
        {
            "name": "Kitchen Vol-",
            "port": "4999",
            "base64_encoded": True,
            "stateless": True,
            "commands": {
                "on": "JHMydm9sLQo=",
                "off": "JHMydm9sLQo="
            },
            "success_messages": {
                "on": "JHMydm9sLQo=",
                "off": "JHMydm9sLQo="
            }
        },
        {
            "name": "Bedroom 1",
            "port": "4999",
            "base64_encoded": True,
            "commands": {
                "on": "JHMxc3JjMQo=",
                "off": "JHMxc3Jjb2ZmCg=="
            },
            "success_messages": {
                "on": "JHMxc3JjMQo=",
                "off": "JHMxc3Jjb2ZmCg=="
            }
        },
        {
            "name": "Bedroom 1 Vol+",
            "port": "4999",
            "base64_encoded": True,
            "stateless": True,
            "commands": {
                "on": "JHMxdm9sKwo=",
                "off": "JHMxdm9sKwo="
            },
            "success_messages": {
                "on": "JHMxdm9sKwo=",
                "off": "JHMxdm9sKwo="
            }
        },
        {
            "name": "Bedroom 1 Vol-",
            "port": "4999",
            "base64_encoded": True,
            "stateless": True,
            "commands": {
                "on": "JHMxdm9sLQo=",
                "off": "JHMxdm9sLQo="
            },
            "success_messages": {
                "on": "JHMxdm9sLQo=",
                "off": "JHMxdm9sLQo="
            }
        },
        {
            "name": "Kitchen AppleTV",
            "port": "4999",
            "base64_encoded": True,
            "commands": {
                "on": "JHMyc3JjNQo=",
                "off": "JHMyc3Jjb2ZmCg=="
            },
            "success_messages": {
                "on": "JHMyc3JjNQo=",
                "off": "JHMyc3Jjb2ZmCg=="
            }
        }
    ],
    "_bridge": {
        "username": "0E:92:DB:C3:A3:E8",
        "port": 47812
    }
}

config['platforms'].append(new_platform)

with open('/var/lib/homebridge/config.json', 'w') as f:
    json.dump(config, f, indent=4)

print('Done')
