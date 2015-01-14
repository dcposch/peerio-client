Peerio.UI.controller('newMessage', function($scope) {
	'use strict';
	$('div.newMessageToWrapper').on('click', function() {
		$('input.newMessageTo').focus()
	})
	$scope.newMessage = {
		auto: [],
		recipients: [],
		attachFileIDs: [],
		sending: false
	}
	$scope.$on('newMessageReset', function() {
		$scope.newMessage.auto = []
		$scope.newMessage.recipients = []
		$scope.newMessage.subject = ''
		$scope.newMessage.body = ''
		$scope.newMessage.attachFileIDs = []
		$scope.newMessage.sending = false
	})
	$scope.$on('newMessagePopulate', function(event, messageInfo) {
		$scope.newMessage.auto = []
		$scope.newMessage.recipients = messageInfo.recipients
		$scope.newMessage.subject = messageInfo.subject
		$scope.newMessage.body = messageInfo.body
		$scope.newMessage.attachFileIDs = messageInfo.fileIDs
		$scope.newMessage.sending = false
	})
	$scope.$on('newMessageSetRecipients', function(event, recipients) {
		$scope.newMessage.recipients = recipients
	})
	$scope.$on('newMessageAttachFileIDs', function(event, ids) {
		$scope.newMessage.attachFileIDs = ids
		$('div.attachFile').removeClass('visible')
		$('div.newMessage').addClass('visible')
	})
	$scope.newMessage.toAutocomplete = function() {
		var auto = Peerio.message.toAutocomplete($scope.newMessage.to)
		$scope.newMessage.auto = []
		auto.forEach(function(contact) {
			if ($scope.newMessage.recipients.indexOf(contact) < 0) {
				$scope.newMessage.auto.push(contact)
			}
		})
	}
	$scope.newMessage.toKeyDown = function(event) {
		var key = event.keyCode
		if ((key === 8) || (key === 46)) {
			if (typeof($scope.newMessage.to) === 'undefined') {
				if (!$scope.newMessage.recipients.length) {
					return false
				}
				$scope.newMessage.recipients.splice(
					$scope.newMessage.recipients.length - 1, 1
				)
				$scope.newMessage.recipients = $scope.newMessage.recipients
			}
		}
		if (key === 13) {
			event.preventDefault()
			$scope.newMessage.addRecipient($scope.newMessage.auto[0].username)
		}
	}
	$scope.newMessage.addRecipient = function(username) {
		if ($scope.newMessage.recipients.indexOf(username) < 0) {
			$scope.newMessage.recipients.push(username)
		}
		delete $scope.newMessage.to
		$scope.newMessage.toAutocomplete('')
		setTimeout(function() {
			$('input.newMessageTo')[0].focus()
		}, 100)
	}
	$scope.newMessage.attachFile = function() {
		$scope.$root.$broadcast(
			'attachFilePopulate', {
				recipients: $scope.newMessage.recipients,
				opener: 'newMessage'
			}
		)
		$('div.newMessage').removeClass('visible')
		$('div.attachFile').addClass('visible')
		$('button.frontModalsClose').hide()
		setTimeout(function() {
			$('input.attachFileSearch')[0].focus()
		}, 100)
	}
	$scope.newMessage.send = function(isDraft) {
		if (!$scope.newMessage.recipients.length) {
			if (!isDraft) {
				swal({
					title: document.l10n.getEntitySync('newMessageRecipientsError').value,
					text: document.l10n.getEntitySync('newMessageRecipientsErrorText').value,
					type: 'error',
					confirmButtonText: document.l10n.getEntitySync('OK').value
				})
				return false
			}
			$scope.newMessage.recipients = [Peerio.user.username]
		}
		if (!$scope.newMessage.subject) {
			$scope.newMessage.subject = ' '
		}
		if (!$scope.newMessage.body) {
			$scope.newMessage.body = ' '
		}
		if ($scope.newMessage.recipients.indexOf(Peerio.user.username) < 0) {
			$scope.newMessage.recipients.push(Peerio.user.username)
		}
		$scope.newMessage.sending = true
		$scope.$root.$broadcast(
			'attachFilePopulate', {
				recipients: $scope.newMessage.recipients,
				opener: 'newMessage'
			}
		)
		Peerio.message.new({
			isDraft: isDraft,
			recipients: $scope.newMessage.recipients,
			subject: $scope.newMessage.subject,
			body: $scope.newMessage.body,
			sequence: 0,
			fileIDs: $scope.newMessage.attachFileIDs
		}, function(messageObject, failed) {
			Peerio.notification.playSound('sending')
			Peerio.network.createMessage(messageObject, function(result) {
				$scope.$root.$broadcast('attachFileReset', null)
				if (({}).hasOwnProperty.call(result, 'error')) {
					if (result.error === 413) {
						swal({
							title: document.l10n.getEntitySync('quotaError').value,
							text: document.l10n.getEntitySync('quotaErrorText').value,
							type: 'error',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
					}
					else {
						swal({
							title: document.l10n.getEntitySync('error').value,
							text: document.l10n.getEntitySync('newMessageErrorText').value,
							type: 'error',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
					}
					return false
				}
				else {
					if (failed.length) {
						var swalText = document.l10n.getEntitySync('messageCouldNotBeSentTo').value
						swalText += failed.join(', ')
						swal({
							title: document.l10n.getEntitySync('warning').value,
							text: swalText,
							type: 'warning',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
					}
					Peerio.message.getConversationPages(result.conversationID, true, function() {
						Peerio.notification.playSound('sent')
						Peerio.UI.selectConversation(result.conversationID)
						$scope.$root.$broadcast('messagesSectionRender', null)
					})
					$scope.$root.$broadcast('frontModalsClose', null)
					setTimeout(function() {
						$scope.newMessage.sending = false
					}, 500)
				}
			})
		})
	}
})