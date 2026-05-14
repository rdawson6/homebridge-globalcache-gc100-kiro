var net = require("net");
var Service, Characteristic;

/* Register the plugin with homebridge */
module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform("homebridge-globalcache-gc100-kiro", "GC100KiroPlatform", GC100KiroPlatform);
}

function GC100KiroPlatform(log, config) {
	this.log = log;
	this.name = config["name"];
	this.ir_devices = config["ir_devices"];
	this.rs232_devices = config["rs232_devices"];
	this.volume_devices = config["volume_devices"];

	// Device connection settings
	this.host = config["host"];
	this.ir_port = (config["ir_port"] ? config["ir_port"] : 4998);

	// Shared serial queue for volume accessories only.
	// RS232 switch commands are short fire-and-forget so they stay independent.
	// Volume queries/sets share this queue so only one socket is ever open on
	// port 4999 at a time, preventing cross-zone response collisions.
	this._volQueue = [];
	this._volBusy = false;
}

/* Enqueue a volume command. callback(err, responseString) */
GC100KiroPlatform.prototype.volEnqueue = function(command, callback){
	this._volQueue.push({ command: command, callback: callback });
	this._volDrain();
}

GC100KiroPlatform.prototype._volDrain = function(){
	if(this._volBusy || this._volQueue.length === 0) return;
	var self = this;
	var item = this._volQueue.shift();
	this._volBusy = true;
	this._volSend(item.command, function(err, response){
		self._volBusy = false;
		item.callback(err, response);
		setTimeout(function(){ self._volDrain(); }, 100);
	});
}

/* Send one command on the shared volume socket.
   The GC100 buffers the first command and responds to it when the next one
   arrives. We send the command twice in a single write (same technique as the
   original doubled base64 commands in the rs232 switch config). The GC100
   executes the first and responds to the second. */
GC100KiroPlatform.prototype._volSend = function(command, callback){
	var self = this;
	var sock = new net.Socket();
	var responded = false;

	sock.connect(4999, this.host, function(){
		// Send command twice in one write — iTach IP2SL executes first, responds to second
		var doubled = command + command;
		self.log('VOL TX: ' + command.trim() + ' (doubled)');
		sock.write(doubled);
	});

	sock.on('data', function(data){
		if(responded) return;
		responded = true;
		var response = data.toString().trim();
		self.log('VOL RX: ' + response);
		sock.destroy();
		if(response.includes('Error')){
			callback(new Error('S6.2 error: ' + response));
		}else{
			callback(null, response);
		}
	});

	sock.on('error', function(err){
		if(responded) return;
		responded = true;
		self.log('VOL socket error: ' + err.message);
		sock.destroy();
		callback(err);
	});

	sock.setTimeout(3000, function(){
		if(responded) return;
		responded = true;
		self.log('VOL socket timeout');
		sock.destroy();
		callback(new Error('Socket timeout'));
	});
}

GC100KiroPlatform.prototype.accessories = function(callback){
	var results = [];

	if(Array.isArray(this.ir_devices)){
		/* IR Devices from the config file */
		for(var i = 0; i < this.ir_devices.length; i++){
			results.push(new GC100KiroAccessory('ir', this.ir_devices[i], this, this.ir_port));
		}
	}

	if(Array.isArray(this.rs232_devices)){
		/* RS232 Devices from the config file */
		for(var i = 0; i < this.rs232_devices.length; i++){
			results.push(new GC100KiroAccessory('rs232', this.rs232_devices[i], this, this.rs232_devices[i].port));
		}
	}

	if(Array.isArray(this.volume_devices)){
		/* Volume Devices - exposed as Lightbulb with Brightness slider in HomeKit */
		for(var i = 0; i < this.volume_devices.length; i++){
			results.push(new GC100KiroVolumeAccessory(this.volume_devices[i], this, i));
		}
	}

	if(results.length == 0){
		this.log("WARNING: No Accessories were loaded.");
	}

	callback(results);
}

/* =============================================================================
   Switch Accessories (IR and RS232)
   ============================================================================= */
function GC100KiroAccessory(type, dconfig, platform, port){
	this.name = dconfig.name;
	this.platform = platform;
	this.port = port;
	this.stateless = dconfig.stateless || false;

	// Cached on/off state — null means unknown, will be resolved on first get
	this._cachedState = null;

	if(type == 'ir'){
		this.executeCommand = this.executeIRCommand;
	}else if(type == 'rs232'){
		this.executeCommand = this.executeRS232Command;
	}

	this.services = [];

	this.commands = dconfig.commands || {};
	this.success_messages = dconfig.success_messages || {};

	if(dconfig.base64_encoded) this.base64Decode();

	if(this.commands.on && this.commands.off){
		var switchService = new Service.Switch(this.name);
		switchService
			.getCharacteristic(Characteristic.On)
			.on('get', this.getState.bind(this))
			.on('set', this.setState.bind(this));
		this.services.push(switchService);
	}

	if(this.services.length == 0){
		this.platform.log("WARNING: no services determined for accessory `"+this.name+"`. Make sure valid commands are defined in ~/homebridge/config.json");
	}
}

GC100KiroAccessory.prototype.getServices = function() {
	return this.services;
}

/* Get state — return cached value if known, otherwise query the S6.2.
   Stateless accessories (vol+/vol-) always return false — they're momentary. */
GC100KiroAccessory.prototype.getState = function(callback) {
	// Stateless switches (vol+/vol-) are always off from HomeKit's perspective
	if(this.stateless){
		return callback(null, false);
	}
	// Return cached state if we have it
	if(this._cachedState !== null){
		this.platform.log("Get `" + this.name + "` state (cached): " + this._cachedState);
		return callback(null, this._cachedState);
	}
	// Query the S6.2 — extract zone number from the on command (e.g. $s8src2 -> zone 8)
	var self = this;
	var zoneMatch = this.commands.on && this.commands.on.match(/\$s(\d+)src/);
	if(!zoneMatch){
		// Can't determine zone, default to false
		return callback(null, false);
	}
	var zone = zoneMatch[1];
	var sock = new net.Socket();
	var responded = false;
	sock.connect(parseInt(this.port), this.platform.host, function(){
		sock.write('$g' + zone + 'src\r$g' + zone + 'src\r');
	});
	sock.on('data', function(data){
		if(responded) return;
		responded = true;
		var response = data.toString().trim();
		self.platform.log("Get `" + self.name + "` src query: " + response);
		// $r<zone>srcoff = off, anything else (src1, src2, srcloc) = on
		var isOn = !response.includes('srcoff');
		self._cachedState = isOn;
		sock.destroy();
		callback(null, isOn);
	});
	sock.on('error', function(err){
		if(responded) return;
		responded = true;
		self.platform.log("Get `" + self.name + "` error: " + err.message);
		sock.destroy();
		callback(null, false);
	});
	sock.setTimeout(3000, function(){
		if(responded) return;
		responded = true;
		self.platform.log("Get `" + self.name + "` timeout");
		sock.destroy();
		callback(null, false);
	});
}

GC100KiroAccessory.prototype.setState = function(state, callback) {
	var self = this;
	if(state){
		this.platform.log("Set `"+this.name+"` state to `on`");
		this.executeCommand(this.commands.on, this.success_messages.on, function(err){
			if(!err) self._cachedState = true;
			callback(err);
		});
	}else{
		this.platform.log("Set `"+this.name+"` state to `off`");
		this.executeCommand(this.commands.off, this.success_messages.off, function(err){
			if(!err) self._cachedState = false;
			callback(err);
		});
	}
}

GC100KiroAccessory.prototype.executeIRCommand = function(command, success_message, callback){
	var sock = new net.Socket();
	sock.log = this.platform.log;

	sock.connect(this.port, this.platform.host, function(){
		this.log('CONNECTED TO: ' + this.localAddress + ':' + this.localPort);
		this.write(command + "\r");
	}).on('data', function(data) {
		this.log('DATA: ' + data);
		if(data.toString().trim() == success_message){
			this.log("IR Command Accepted");
			callback(null);
		}else{
			this.log("IR Command Failed: " + data);
			callback(new Error("Error setting state."));
		}
		this.destroy();
	});
}

/* RS232 Command Execution
   FIX 1: Append \r so the S6.2 correctly terminates the command.
   FIX 2: Check for 'Error' in response rather than exact string match,
          because the S6.2 responds with $r... not an echo of the sent command.
*/
GC100KiroAccessory.prototype.executeRS232Command = function(command, success_message, callback){
	var sock = new net.Socket();
	sock.log = this.platform.log;

	sock.connect(this.port, this.platform.host, function(){
		this.log('CONNECTED TO: ' + this.localAddress + ':' + this.localPort);
		this.write(command + "\r");
	}).on('data', function(data) {
		this.log('DATA: ' + data);
		if(!data.toString().trim().includes('Error')){
			this.log("RS232 Command Accepted");
			callback(null);
		}else{
			this.log("RS232 Command Failed: " + data);
			callback(new Error("Error setting state."));
		}
		this.destroy();
	});
}

GC100KiroAccessory.prototype.base64Decode = function(){
	var decoded = {};
	for(var i in this.commands){
		decoded[i] = new Buffer(this.commands[i], 'base64').toString('ascii');
	}
	this.commands = decoded;

	var decoded = {};
	for(var i in this.success_messages){
		decoded[i] = new Buffer(this.success_messages[i], 'base64').toString('ascii');
	}
	this.success_messages = decoded;
}

/* =============================================================================
   Volume Accessory
   Exposed as a Lightbulb in HomeKit — brightness slider = volume (0-100% -> 0-30)

   Config example:
   { "name": "Kitchen Volume", "port": "4999", "zone": "2" }

   Design:
   - All volume commands go through the platform-level volQueue so only one
     socket is open on port 4999 at a time. This prevents the S6.2 from
     receiving overlapping commands and sending responses to the wrong socket.
   - setVolume calls back to HomeKit immediately (optimistic) then enqueues
     the actual send after a 400ms debounce. The queue never blocks HomeKit.
   - Cache: after a set the new value is stored locally. get returns the cache
     instantly, preventing the feedback loop that caused the slider to fight itself.
   - Startup queries are staggered by (index * 1500ms) — enough time for the
     previous zone's query to complete before the next one starts.
   ============================================================================= */
function GC100KiroVolumeAccessory(dconfig, platform, index){
	this.name = dconfig.name;
	this.platform = platform;
	this.port = dconfig.port;
	this.zone = String(dconfig.zone);
	this.services = [];

	this._debounceTimer = null;
	this._cachedVol = null;  // cached S6.2 volume 0-30, null = unknown

	var self = this;
	var lightService = new Service.Lightbulb(this.name);

	lightService
		.getCharacteristic(Characteristic.On)
		.on('get', function(callback){ self.getMuteState(callback); })
		.on('set', function(value, callback){ self.setMuteState(value, callback); });

	lightService
		.getCharacteristic(Characteristic.Brightness)
		.on('get', function(callback){ self.getVolume(callback); })
		.on('set', function(value, callback){ self.setVolume(value, callback); });

	this.services.push(lightService);
	this._lightService = lightService;

	// Stagger startup queries — 2000ms per zone so each completes before the next starts
	setTimeout(function(){
		self.platform.log('[' + self.name + '] Startup volume query');
		self.platform.volEnqueue('$g' + self.zone + 'vol\r', function(err, response){
			if(err){ return; }
			// Handle muted state
			if(response && response.includes('volmute')){
				self._cachedVol = 0;
				self.platform.log('[' + self.name + '] Startup: muted');
				lightService.getCharacteristic(Characteristic.Brightness).updateValue(0);
				lightService.getCharacteristic(Characteristic.On).updateValue(false);
				return;
			}
			var match = response && response.match(/\$r\d+vol(\d+)/);
			if(match){
				self._cachedVol = parseInt(match[1]);
				var pct = Math.round(self._cachedVol * 100 / 30);
				self.platform.log('[' + self.name + '] Startup: ' + self._cachedVol + '/30 (' + pct + '%)');
				lightService.getCharacteristic(Characteristic.Brightness).updateValue(pct);
				lightService.getCharacteristic(Characteristic.On).updateValue(self._cachedVol > 0);
			}
		});
	}, (index || 0) * 2000);
}

GC100KiroVolumeAccessory.prototype.getServices = function(){
	return this.services;
}

/* Get mute state — return from cache if available */
GC100KiroVolumeAccessory.prototype.getMuteState = function(callback){
	if(this._cachedVol !== null){
		return callback(null, this._cachedVol > 0);
	}
	var self = this;
	this.platform.volEnqueue('$g' + this.zone + 'vol\r', function(err, response){
		if(err){ return callback(null, false); }
		// $r<zone>volmute means zone is muted (off)
		if(response && response.includes('volmute')){
			self._cachedVol = 0;
			return callback(null, false);
		}
		var match = response && response.match(/\$r\d+vol(\d+)/);
		if(match){
			self._cachedVol = parseInt(match[1]);
			callback(null, self._cachedVol > 0);
		}else{
			callback(null, false);
		}
	});
}

/* Set mute state — mute or unmute */
GC100KiroVolumeAccessory.prototype.setMuteState = function(value, callback){
	var self = this;
	var cmd = value
		? '$s' + this.zone + 'volmoff\r'
		: '$s' + this.zone + 'volmute\r';
	this.platform.log('[' + this.name + '] ' + (value ? 'Unmuting' : 'Muting') + ' zone ' + this.zone);
	this.platform.volEnqueue(cmd, function(err){
		if(!err){
			if(value){
				// Unmuted — invalidate cache so next get re-queries actual volume
				self._cachedVol = null;
			} else {
				self._cachedVol = 0;
			}
		}
		callback(err || null);
	});
}

/* Get volume — return from cache if available, otherwise query */
GC100KiroVolumeAccessory.prototype.getVolume = function(callback){
	if(this._cachedVol !== null){
		var pct = Math.round(this._cachedVol * 100 / 30);
		this.platform.log('[' + this.name + '] Volume (cached) ' + this._cachedVol + '/30 -> ' + pct + '%');
		return callback(null, pct);
	}
	var self = this;
	this.platform.volEnqueue('$g' + this.zone + 'vol\r', function(err, response){
		if(err){ return callback(err); }
		// Handle muted state
		if(response && response.includes('volmute')){
			self._cachedVol = 0;
			self.platform.log('[' + self.name + '] Volume: muted');
			return callback(null, 0);
		}
		var match = response && response.match(/\$r\d+vol(\d+)/);
		if(match){
			self._cachedVol = parseInt(match[1]);
			var pct = Math.round(self._cachedVol * 100 / 30);
			self.platform.log('[' + self.name + '] Volume ' + self._cachedVol + '/30 -> ' + pct + '%');
			callback(null, pct);
		}else{
			callback(new Error('Unexpected response: ' + response));
		}
	});
}

/* Set volume — debounced 400ms, optimistic cache, no re-query after set */
GC100KiroVolumeAccessory.prototype.setVolume = function(value, callback){
	var self = this;
	var s62vol = Math.round(value * 30 / 100);

	// Respond to HomeKit immediately — queue never blocks the UI
	callback(null);

	// Cancel any pending debounced send
	if(this._debounceTimer){
		clearTimeout(this._debounceTimer);
		this._debounceTimer = null;
	}

	// Update cache optimistically
	this._cachedVol = s62vol;

	// Send 400ms after slider stops moving
	this._debounceTimer = setTimeout(function(){
		self._debounceTimer = null;
		var cmd = '$s' + self.zone + 'vol' + s62vol + '\r';
		self.platform.log('[' + self.name + '] Set volume ' + s62vol + '/30 (' + value + '%) [debounced]');
		self.platform.volEnqueue(cmd, function(err){
			if(err){
				self.platform.log('[' + self.name + '] Set volume failed: ' + err.message);
				self._cachedVol = null; // invalidate so next get re-queries
			}
		});
	}, 400);
}
