<!-- IMPORT partials/breadcrumbs.tpl -->

<form id="link-account-form" role="form" method="post">
    <div class="alert alert-warning mb-3">
        <i class="fa fa-exclamation-triangle"></i> <strong>[[mff-discord:link.warning]]</strong>
    </div>

    <div class="mb-3">
        <div class="d-flex align-items-center">
            <div class="me-3">
                <img src="{avatarUrl}" alt="Discord Avatar" class="rounded-circle" style="width: 64px; height: 64px;">
            </div>
            <div>
                <h4>{displayName}</h4>
            </div>
        </div>
    </div>
    <div class="mb-3">
        <button type="submit" id="send" class="btn btn-primary">[[mff-discord:link.confirm]]</button>
    </div>
</form>

<div class="alert alert-danger hidden" id="discord-link-error">
    <p class="mb-0"></p>
</div>

<div class="alert alert-success hidden" id="discord-link-success">
    <p class="mb-0"></p>
</div>
