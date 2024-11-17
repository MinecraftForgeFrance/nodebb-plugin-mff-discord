define('admin/plugins/mff-discord', ['settings', 'alerts'], function(Settings, alerts) {
	var MFFDiscordBridge = {};
	
	MFFDiscordBridge.init = function() {
		Settings.load('mffdiscordbridge', $('.mff-discord-settings'));
	
		$('#save').on('click', function() {
            Settings.save('mffdiscordbridge', $('.mff-discord-settings'), function() {
                alerts.alert({
                    type: 'success',
                    alert_id: 'mffdiscordbridge-saved',
                    title: 'Settings Saved',
                    message: 'Please reload your NodeBB to apply these settings',
                    clickfn: function() {
                        socket.emit('admin.reload');
                    }
                })
            });
        });
	};
	
	return MFFDiscordBridge;
});
