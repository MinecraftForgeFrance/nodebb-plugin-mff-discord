<div class="acp-page-container">
	<!-- IMPORT admin/partials/settings/header.tpl -->

	<div class="row m-0">
		<div id="spy-container" class="col-12 px-0 mb-4" tabindex="0">
			<form class="form mff-discord-settings">
				<div class="mb-4">
					<h5 class="fw-bold tracking-tight settings-header">API</h5>

                    <div class="mb-3">
                        <label for="token">
                            Discord bot token (keep it secret)
                        </label>
                        <input class="form-control" type="text" name="token" id="token" />
					</div>

                    <div class="mb-3">
						<label for="webhook">
                            Discord webhook url (keep it secret)
                        </label>
                        <input class="form-control" placeholder="https://discordapp.com/api/webhooks/..." type="text" name="webhook" id="webhook" />
					</div>

                    <div class="mb-3">
                        <label for="token">
                            Discord JWT secret (keep it secret)
                        </label>
                        <input class="form-control" type="text" name="jwtSecret" id="jwtSecret" />
					</div>
				</div>

				<div class="mb-4">
                    <h5 class="fw-bold tracking-tight settings-header">Search categories</h5>

                    <div class="mb-3">
						<label for="tutocatid">
                            Tutorial category
                        </label>
                        <select class="form-control" id="tutocatid" class="form-control" name="tutocatid">
                        {{{ each categories }}}
                            <option value="{categories.cid}">{categories.name}</option>
                        {{{ end }}}
                        </select>
					</div>

                    <div class="mb-3">
                        <label for="supportcatid">
                            Support category
                        </label>
                        <select class="form-control" id="supportcatid" class="form-control" name="supportcatid">
                        {{{ each categories }}}
                            <option value="{categories.cid}">{categories.name}</option>
                        {{{ end }}}
					    </select>
					</div>
				</div>
			</form>
		</div>
	</div>
</div>
