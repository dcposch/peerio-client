// ---------------------
// Peerio.UI
// ---------------------
//
// Peerio's UI object is responsible for handling the User Interface.
// It interfaces with AngularJS and Zepto in order to retrieve user input
// and programatically handle user interface progressions.
// It also handles user interface elements such as tooltips, resizing,
// and localization.

Peerio.UI = angular.module('PeerioUI', ['ngSanitize', 'cfp.hotkeys']);


(function(){
	'use strict';

	//
	// Intialization
	//

	Peerio.UI.filter('orderObjectBy', function() {
		return function(items, field, reverse) {
			var filtered = []
			angular.forEach(items, function(item) {
				filtered.push(item)
			})
			filtered.sort(function(a, b) {
				if (
					(typeof(a[field]) === 'string') &&
					(typeof(b[field]) === 'string')
				) {
					return (a[field].toLowerCase() > b[field].toLowerCase() ? 1 : -1)
				}
				return (a[field] > b[field] ? 1 : -1)
			})
			if (reverse) {
				filtered.reverse()
			}
			return filtered
		}
	})

	Peerio.UI.applyDynamicElements = function() {
		$('[data-l10n-id]').each(function (index, value) {
			if ($(value).get(0).tagName.toLowerCase() === 'input') {
				if ($(value).attr('type').match(/(button)|(submit)/)) {
					$(value).val(document.l10n.getEntitySync(
						$(value).attr('data-l10n-id')
					).value)
				}
				else {
					$(value).attr('placeholder', document.l10n.getEntitySync(
						$(value).attr('data-l10n-id')
					).value)
				}
			}
			else if ($(value).get(0).tagName.toLowerCase() === 'button') {
				$(value).text(document.l10n.getEntitySync(
					$(value).attr('data-l10n-id')
				).value)
			}
			else if ($(value).get(0).tagName.toLowerCase() === 'textarea') {
				$(value).attr('placeholder', document.l10n.getEntitySync(
					$(value).attr('data-l10n-id')
				).value)
			}
			else {
				$(value).html(
					document.l10n.getEntitySync(
						$(value).attr('data-l10n-id')
					).value
				)
			}
		})
		$('[data-utip-l10n]').each(function (index, value) {
			$(value).attr('data-utip', document.l10n.getEntitySync(
				$(value).attr('data-utip-l10n')
			).value)
		})
		$('[data-utip-l10n]').utip()
	}

	//
	// General Directives
	//

	Peerio.UI.directive('resize', function($window) {
		return function($scope, element) {
			var resize = element[0].getAttribute('resize').split(',')
			resize[0] = parseInt(resize[0])
			resize[1] = parseInt(resize[1])
			$scope.$watch(function() {
				$scope.resize = function() {
					var newSize = {}
					if (resize[0] > 0) {
						newSize.width  = (window.innerWidth  - resize[0]) + 'px'
					}
					if (resize[1] > 0) {
						newSize.height = (window.innerHeight - resize[1]) + 'px'
					}
					return newSize
				}
			}, true)
			angular.element($window).bind('resize', function() {
				$('div.messagesSectionMessageViewSingles').scrollTop(
					$('div.messagesSectionMessageViewSingles')[0].scrollHeight + 100
				)
				$scope.$apply()
			})
		}
	})

	//
	// Socket events
	//

	Peerio.UI.onSocketReconnecting = function() {
		$('div.mainTopUserMenu span.connectionStatus').addClass('reconnecting')
	}

	Peerio.UI.onSocketReconnect = function() {
		$('div.mainTopUserMenu span.connectionStatus').removeClass('reconnecting')
		if (Peerio.user.username.length) {
			Peerio.UI.messagesSectionUpdate()
			setTimeout(Peerio.UI.contactsSectionPopulate, 1000)
		}
	}

	//
	// Misc. UI calls
	//

	Peerio.UI.showRateLimitedAlert = function() {
		swal({
			title: document.l10n.getEntitySync('accountRateLimited').value,
			text: document.l10n.getEntitySync('accountRateLimitedText').value,
			type: 'error',
			confirmButtonText: document.l10n.getEntitySync('OK').value
		})
	}

	Peerio.UI.showBlacklistedAlert = function() {
		swal({
			title: document.l10n.getEntitySync('accountBlacklisted').value,
			text: document.l10n.getEntitySync('accountBlacklistedText').value,
			type: 'error',
			confirmButtonText: document.l10n.getEntitySync('OK').value
		})
	}

	//
	// Load UI
	//

	window.onload = function() {
		Peerio.storage.db.get('localeCode', function(err, data) {
			var language = ''
			if (
				(typeof(data) === 'object') &&
				(({}).hasOwnProperty.call(data, 'localeCode')) &&
				(typeof(data.localeCode) === 'string') &&
				(data.localeCode.length === 2)
			) {
				language = data.localeCode
			}
			if (
				(typeof(language) !== 'string') ||
				!/^((en)|(fr))$/.test(language)
			) {
				var navLang = navigator.language || navigator.userLanguage
				if (/fr/.test(navLang)) {
					language = 'fr'
				}
				else {
					language = 'en'
				}
			}
			document.l10n.ready(function() {
				Peerio.UI.applyDynamicElements()
			})
			document.l10n.linkResource('locale/' + language + '.l20n')
			document.l10n.requestLocales(language)
		})
		$('.loginScreen').show()
		$('div.mainTopSectionSelect [data-sectionLink=messages]').trigger('mousedown')
	}

})()
