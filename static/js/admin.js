define('admin/plugins/mff-discord', ['settings', 'alerts'], function(Settings, alerts) {
	const MFFDiscordBridge = {};
	
	MFFDiscordBridge.init = function() {
        const settingsForm = $('.mff-discord-settings');
        const saveButton = document.getElementById('save');
		Settings.load('mffdiscordbridge', settingsForm);
	
        console.log(saveButton)
		saveButton.addEventListener('click', function() {
            console.log('saveButton clicked');
            Settings.save('mffdiscordbridge', settingsForm, function() {
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
