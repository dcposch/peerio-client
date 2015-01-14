Peerio.UI.controller('importContacts', function($scope) {
	'use strict';
	$scope.importContacts = {}
	
	$('input.importContactsFileSelectDialog').unbind().on('change', function(event) {
		event.preventDefault()
		if (!this.files) {
			return false
		}
		Papa.parse(this.files[0], {
			header: true,
			complete: function(results) {
				var invite = []
				results.data.forEach(function(contact) {
					(Object.keys(contact)).forEach(function(key) {
						if (key.match(/(mail)|(phone)/i)) {
							var parsed = Peerio.util.parseAddress(contact[key])
							if (parsed) {
								invite.push({
									address: parsed
								})
							}
						}
					})
				})
				Peerio.network.addContact(invite, function(data) {
					$('form.importContactsUploadForm input[type=reset]').click()
					if (({}).hasOwnProperty.call(data, 'error')) {
						swal({
							title: document.l10n.getEntitySync('importContactsError').value,
							text: document.l10n.getEntitySync('importContactsErrorText').value,
							type: 'error',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
					}
					else {
						swal({
							title: document.l10n.getEntitySync('importContactsSuccess').value,
							text: document.l10n.getEntitySync('importContactsSuccessText').value,
							type: 'success',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
					}
				})
			}
		})
		return false
	})
})