Peerio.UI.controller('addContact', function($scope) {
	'use strict';
	$scope.addContact = {}
	$scope.addContact.addContact = function() {
		if (!$scope.addContact.contact) {
			return false
		}
		$scope.addContact.contact = $scope.addContact.contact.toLowerCase()
		Peerio.user.addContact($scope.addContact.contact, function(result) {
			if (result.success) {
				if (result.type === 'username') {
					swal({
						title: document.l10n.getEntitySync('addContactRequestSent').value,
						text: document.l10n.getEntitySync('addContactRequestSentText').value,
						type: 'success',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					$scope.addContact.contact = ''
					$scope.$root.$broadcast('frontModalsClose', null)
					Peerio.UI.contactsSectionPopulate()
				}
				else if (result.type === 'address') {
					swal({
						title: document.l10n.getEntitySync('addContactInviteSent').value,
						text: document.l10n.getEntitySync('addContactInviteSentText').value,
						type: 'info',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					$scope.addContact.contact = ''
					$scope.$root.$broadcast('frontModalsClose', null)
					Peerio.UI.contactsSectionPopulate()
				}
			}
			else {
				swal({
					title: document.l10n.getEntitySync('error').value,
					text: document.l10n.getEntitySync('addContactErrorText').value,
					type: 'error',
					confirmButtonText: document.l10n.getEntitySync('OK').value
				})
			}
		})
	}
})