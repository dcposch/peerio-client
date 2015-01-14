Peerio.UI.controller('mainTop', function($scope) {
	'use strict';
	$scope.mainTop = {}
	$scope.mainTop.userMenu = {}
	$scope.mainTop.messagesNewCount = 0
	$scope.mainTop.contactsNewCount = 0
	$scope.$on('mainTopPopulate', function() {
		$scope.mainTop.userMenu.userFirstName = Peerio.user.firstName
		$scope.$apply(Peerio.UI.applyDynamicElements)
	})
	$scope.$on('mainTopDoSearch', function(event, input) {
		$scope.mainTop.searchInput = input
		$scope.mainTop.doSearch(input)
	})
	$scope.mainTop.userMenu.openAccountSettings = function() {
		if ($('div.frontModalsWrapper').hasClass('visible')) {
			return false
		}
		$('div.frontModalsWrapper').addClass('visible')
		$('div.accountSettings').addClass('visible')
		$('div.mainTopUserMenu').mouseleave()
		$scope.$apply(Peerio.UI.applyDynamicElements)
	}
	$scope.mainTop.userMenu.openPreferences = function() {
		if ($('div.frontModalsWrapper').hasClass('visible')) {
			return false
		}
		$('div.frontModalsWrapper').addClass('visible')
		$('div.preferences').addClass('visible')
		$('div.mainTopUserMenu').mouseleave()
	}
	$scope.mainTop.userMenu.logout = function() {
		swal({
			title: document.l10n.getEntitySync('logoutConfirm').value,
			text: document.l10n.getEntitySync('logoutConfirmText').value,
			type: 'warning',
			showCancelButton: true,
			allowOutsideClick: true,
			confirmButtonText: document.l10n.getEntitySync('logout').value
		}, function() { window.close() })
	}
	$scope.mainTop.clickTab = function(sectionLink) {
		$('div.mainTopSectionTab').removeClass('active')
		$('div.mainTopSectionTab').each(function(index, value) {
			if ($(value).attr('data-sectionLink') === sectionLink) {
				$(value).addClass('active')
			}
		})
		$('.sidebar').hide()
		$('section').hide()
		$('.sidebar').each(function(index, value) {
			if ($(value).attr('data-sectionLink') === sectionLink) {
				$(value).show()
			}
		})
		$('section').each(function(index, value) {
			if ($(value).attr('data-sectionLink') === sectionLink) {
				$(value).show()
			}
		})
		$('div.messagesSectionMessageViewSingles').scrollTop(
			$('div.messagesSectionMessageViewSingles')[0].scrollHeight + 1000
		)
	}
	$scope.mainTop.doSearch = function(input) {
		$scope.mainTop.messagesSearchCount = 0
		$scope.mainTop.filesSearchCount = 0
		$scope.mainTop.contactsSearchCount = 0
		$scope.mainTop.searchCount = 0
		$scope.$root.$broadcast('messagesSectionSetSearchFilter', input)
		$scope.$root.$broadcast('filesSectionSetSearchFilter', input)
		$scope.$root.$broadcast('contactsSectionSetSearchFilter', input)
		if (!input.length) {
			return false
		}
		$scope.mainTop.messagesSearchCount = $('div.messageListItem:not(.ng-hide)').length
		$scope.mainTop.filesSearchCount = $('tr.filesSectionTableEntry:not(.ng-hide)').length
		$scope.mainTop.contactsSearchCount = $('div.contactListItem:not(.ng-hide)').length
		$scope.mainTop.searchCount = $scope.mainTop.messagesSearchCount +
			$scope.mainTop.filesSearchCount +
			$scope.mainTop.contactsSearchCount
		$scope.$apply()
	}
	$scope.mainTop.getMessagesNewCount = function() {
		var count = $('div.messageStatusIndicatorUnread:not(.ng-hide)').length
		if (count !== $scope.mainTop.messagesNewCount) {
			$scope.mainTop.messagesNewCount = count
		}
		return $scope.mainTop.messagesNewCount
	}
	$scope.mainTop.getContactsNewCount = function() {
		var count = $('span[ng-show="contact.isReceivedRequest"]:not(.ng-hide)').length
		if (count !== $scope.mainTop.contactsNewCount) {
			$scope.mainTop.contactsNewCount = count
		}
		return $scope.mainTop.contactsNewCount
	}
})