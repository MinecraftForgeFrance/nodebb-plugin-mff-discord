'use strict';

define('forum/discord-link', ['translator'], (translator) => {
	const MffDiscordLink = {};
	MffDiscordLink.init = async () => {
		const sendBtn = document.getElementById('send');

		sendBtn.addEventListener('click', async (e) => {
			e.preventDefault();
			$('#discord-link-error').hide();

			try {
				const response = await fetch(window.location.href, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-csrf-token': config.csrf_token,
					},
					body: '{}'
				});
				const data = await response.json();
				if (response.status !== 200) {
					if (data.error) {
						showError(data.error);
					} else {
						showError('[[mff-discord:request.error]]');
					}
				}
				else {
					showSuccess('[[mff-discord:link.success]]');
				}
			}
			catch(resp) {
				showError('[[mff-discord:request.error]]');
			}
		});

		function showError(msg) {
			translator.translate(msg, function(translatedMsg) {
				$('#discord-link-error').find('p').html(translatedMsg);
				$('#discord-link-error').removeClass('hidden');
				$('#discord-link-success').hide();
				$('#discord-link-error').show();
			});
		}

		function showSuccess(msg) {
			translator.translate(msg, function(translatedMsg) {
				$('#discord-link-success').find('p').html(translatedMsg);
				$('#discord-link-success').removeClass('hidden');
				$('#discord-link-error').hide();
				$('#discord-link-success').show();
			});
		}
	};

	return MffDiscordLink;
});
