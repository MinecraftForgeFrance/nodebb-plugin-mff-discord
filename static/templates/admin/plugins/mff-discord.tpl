<form role="form" class="mff-discord-settings">
	<div class="row">
		<div class="col-xs-12">
            <div class="panel panel-default">
                <div class="panel-heading">Discord bridge settings</div>
                <div class="panel-body">
                    <div class="row">
                        <div class="col-lg-6 col-xs-12">
                            <div class="form-group">
                                <label for="token">
                                    Discord bot token (keep it secret)
                                </label>
                                <input class="form-control" type="text" name="token" id="token" />
                            </div>

                            <div class="form-group">
                                <label for="webhook">
                                    Discord webhook url (keep it secret)
                                </label>
                                <input class="form-control" placeholder="https://discordapp.com/api/webhooks/..." type="text" name="webhook" id="webhook" />
                            </div>
                        </div>
                        <div class="col-lg-6 col-xs-12">
                            <div class="form-group">
                                <label for="webhook">
                                    Tutorial category id
                                </label>
                                <input class="form-control" type="number" name="tutocatid" id="tutocatid" />
                            </div>

                            <div class="form-group">
                                <label for="webhook">
                                    Support category id
                                </label>
                                <input class="form-control" type="number" name="supportcatid" id="supportcatid" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
		</div>
	</div>
</form>

<button id="save" class="floating-button mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored">
	<i class="material-icons">save</i>
</button>