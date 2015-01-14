Peerio.UI.controller('contactsSection', function($scope, $element, $sce) {
	'use strict';
	$scope.contactsSidebar = {}
	$scope.contactsSidebar.addContact = function() {
		$('div.frontModals').addClass('small')
		$('div.frontModalsWrapper').addClass('visible')
		$('div.addContact').addClass('visible')
		setTimeout(function() {
			$('div.addContact').find('input[type=text]')[0].focus()
		}, 100)
	}
	$scope.contactsSidebar.importContacts = function() {
		$('div.frontModalsWrapper').addClass('visible')
		$('div.importContacts').addClass('visible')
	}
	$scope.contactsSection = {
		contacts: {},
		me: Peerio.user,
		searchFilter: '',
		typeFilter: 'all',
		orderByProperty: 'isRequest',
		orderByReverse: true
	}
	Peerio.UI.contactsSectionPopulate = function() {
		$scope.$root.$broadcast('contactsSectionPopulate', null)
	}
	$scope.$on('contactsSectionPopulate', function(event, callback) {
		if (/Sidebar/.test($element[0].className)) {
			return false
		}
		Peerio.user.getAllContacts(function(contacts) {
			$scope.contactsSection.contacts = contacts
			$scope.contactsSection.conversations = Peerio.user.conversations
			$scope.contactsSection.files = Peerio.user.files
			$scope.$apply()
			Peerio.UI.applyDynamicElements()
			Peerio.user.getTOFU(Peerio.user.username, function(isTOFU) {
				if (
					isTOFU &&
					(typeof(Peerio.user.TOFU) === 'object') &&
					Object.keys(Peerio.user.TOFU).length
				) {
					var compareTOFU = Peerio.util.compareTOFU(Peerio.user.TOFU)
					if (compareTOFU.notMatch.length) {
						swal({
							title: document.l10n.getEntitySync('TOFUNotMatchError').value,
							text: document.l10n.getEntitySync('TOFUNotMatchErrorText').value + compareTOFU.notMatch.join(', '),
							type: 'warning',
							confirmButtonColor: '#e07a66',
							confirmButtonText: document.l10n.getEntitySync('OK').value,
						}, function() {
							Peerio.user.contacts = contacts
							Peerio.user.setTOFU(Peerio.util.getNewTOFU, Peerio.user.username)
						})
					}
					else if (compareTOFU.notFound.length) {
						Peerio.user.contacts = contacts
						Peerio.user.setTOFU(Peerio.util.getNewTOFU, Peerio.user.username)
					}
					else {
						Peerio.user.contacts = contacts
						console.log('TOFU check passed')
					}
				}
				if (!isTOFU) {
					Peerio.user.contacts = contacts
					Peerio.user.setTOFU(
						Peerio.util.getNewTOFU(),
						Peerio.user.username,
						function() {}
					)
				}
				else {
					Peerio.user.contacts = contacts
				}
			})
			if (typeof(callback) === 'function') {
				callback()
				$scope.$apply()
				Peerio.UI.applyDynamicElements()
			}
			$('input.mainTopSearchSubmit').trigger('click')
		})
	})
	$scope.$on('contactsSectionUpdate', function() {
		if (/Sidebar/.test($element[0].className)) {
			return false
		}
		Peerio.user.getReceivedContactRequests(function() {
			$scope.$apply()
		})
	})
	$scope.$on('contactsSectionSetSearchFilter', function(event, input) {
		$scope.contactsSection.searchFilter = input.toLowerCase()
		$scope.$apply()
	})
	$scope.$on('contactsSectionSetTypeFilter', function(event, type) {
		$scope.contactsSection.typeFilter = type
	})
	$scope.contactsSection.setTypeFilter = function(type, event) {
		$('ul.contactsSidebarTypeFilters li').removeClass('active')
		$(event.target).addClass('active')
		$scope.$root.$broadcast('contactsSectionSetTypeFilter', type)
	}
	$scope.contactsSection.checkTypeFilter = function(contact) {
		if ($scope.contactsSection.typeFilter === 'all') {
			return true
		}
		if ($scope.contactsSection.typeFilter === 'confirmed') {
			if (contact.isRequest) {
				return false
			}
			return true
		}
		if ($scope.contactsSection.typeFilter === 'pending') {
			if (contact.isRequest) {
				return true
			}
			return false
		}
	}
	$scope.contactsSection.checkSearchFilter = function(contact) {
		if (!$scope.contactsSection.searchFilter.length) {
			return true
		}
		var fullName = (contact.firstName + ' ' + contact.lastName).toLowerCase()
		if (fullName.match($scope.contactsSection.searchFilter)) {
			return true
		}
		if (contact.username.toLowerCase().match($scope.contactsSection.searchFilter)) {
			return true
		}
		return false
	}
	$scope.contactsSection.expandContact = function(username, event) {
		$scope.contactsSection.contact = Peerio.user.contacts[username]
		$scope.contactsSection.conversations = Peerio.user.conversations
		$scope.contactsSection.files = Peerio.user.files
		if (
			({}).hasOwnProperty.call(Peerio.user.contacts, username) &&
			Peerio.user.contacts[username].miniLockID.length
		) {
			var avatar = Peerio.crypto.getAvatar(
				username,
				Peerio.user.contacts[username].miniLockID
			)
			$scope.contactsSection.contact.avatarIcon1 = 'data:image/png;base64,' + new Identicon(
				avatar[0].substring(0, 16), 46
			).toString()
			$scope.contactsSection.contact.avatarIcon2 = 'data:image/png;base64,' + new Identicon(
				avatar[0].substring(16, 32), 46
			).toString()
			$scope.contactsSection.contact.avatarIcon3 = 'data:image/png;base64,' + new Identicon(
				avatar[1].substring(0, 16), 46
			).toString()
			$scope.contactsSection.contact.avatarIcon4 = 'data:image/png;base64,' + new Identicon(
				avatar[1].substring(16, 32), 46
			).toString()
		}
		if (typeof(event) === 'object') {
			$('div.contactListItem').removeClass('selected')
			if ($(event.target).hasClass('contactListItem')) {
				$(event.target).addClass('selected')
			}
			else {
				$(event.target).parents('div.contactListItem').addClass('selected')
			}
		}
	}
	$scope.contactsSection.acceptRequest = function(username) {
		Peerio.network.acceptContactRequest(username, function() {
			$scope.$root.$broadcast('contactsSectionPopulate', function() {
				$('div.contactListItem').first().trigger('mousedown')
			})
		})
	}
	$scope.contactsSection.declineRequest = function(username) {
		Peerio.network.declineContactRequest(username, function() {
			$scope.$root.$broadcast('contactsSectionPopulate', function() {
				$('div.contactListItem').first().trigger('mousedown')
			})
		})
	}
	$scope.contactsSection.removeContact = function(username) {
		swal({
			title: document.l10n.getEntitySync('removeContactQuestion').value,
			text: document.l10n.getEntitySync('removeContactText').value,
			type: 'warning',
			showCancelButton: true,
			cancelButtonText: document.l10n.getEntitySync('cancel').value,
			confirmButtonColor: '#e07a66',
			confirmButtonText: document.l10n.getEntitySync('removeContact').value,
			closeOnConfirm: false
		}, function() {
			if (Peerio.user.contacts[username].isRequest) {
				Peerio.network.cancelContactRequest(username, function() {
					$scope.$root.$broadcast('contactsSectionPopulate', function() {
						$('div.contactListItem').first().trigger('mousedown')
					})
				})
			}
			else {
				Peerio.network.removeContact(username, function() {
					$scope.$root.$broadcast('contactsSectionPopulate', function() {
						$('div.contactListItem').first().trigger('mousedown')
					})
				})
			}
		})
	}
	$scope.contactsSection.newMessage = function(username) {
		$scope.$root.$broadcast('newMessageSetRecipients', [username])
		$('div.frontModalsWrapper').addClass('visible')
		$('div.newMessage').addClass('visible')
		setTimeout(function() {
			$('input.newMessageTo')[0].focus()
		}, 100)
	}
	$scope.contactsSection.viewAllMessages = function(username) {
		$scope.$root.$broadcast('mainTopDoSearch',
			Peerio.user.contacts[username].firstName + ' ' +
			Peerio.user.contacts[username].lastName
		)
		$('div.mainTopSectionTab[data-sectionLink=messages]').trigger('mousedown')
	}
	$scope.contactsSection.showLatestMessageItem = function(conversation, username) {
		if (
			!({}).hasOwnProperty.call(conversation, 'original') ||
			(typeof(conversation.original) !== 'object') ||
			!({}).hasOwnProperty.call(conversation.original, 'sender')
		) {
			return false
		}
		if (conversation.original.sender === username) {
			return true
		}
		if (
			(conversation.original.sender === Peerio.user.username) &&
			(conversation.participants.indexOf(username) >= 0)
		) {
			return true
		}
		return false
	}
	$scope.contactsSection.viewAllFiles = function(username) {
		$scope.$root.$broadcast('mainTopDoSearch',
			Peerio.user.contacts[username].firstName + ' ' +
			Peerio.user.contacts[username].lastName
		)
		$('div.mainTopSectionTab[data-sectionLink=files]').trigger('mousedown')
	}
	$scope.contactsSection.getDate = function(timestamp) {
		if (typeof(timestamp) === 'undefined') { return '' }
		return Peerio.util.getDateFromTimestamp(timestamp)
	}
	$scope.contactsSection.getIcon = function(fileID) {
		if (({}).hasOwnProperty.call(Peerio.user.files, fileID)) {
			return $sce.trustAsHtml(
				Peerio.user.files[fileID].icon
			)
		}
	}
})