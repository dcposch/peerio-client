Peerio.UI.controller('loginForm', function($scope) {
	'use strict';
	$scope.login = {}
	$scope.login.version = Peerio.config.version
	$scope.login.login = function() {
		Peerio.storage.init($scope.login.username)
		$('form.loginForm').find('input').attr('disabled', true)
		$scope.login.username = $scope.login.username.toLowerCase()
		$scope.$root.$broadcast('login', {
			username: $scope.login.username,
			passOrPIN: $scope.login.passphrase,
			skipPIN: false
		})
	}
	$scope.$on('login', function(event, args) {
		Peerio.user.login(args.username, args.passOrPIN, args.skipPIN, function(loginResult) {
			if (loginResult) {
				Peerio.network.getSettings(function(data) {
					$scope.login.username = ''
					$scope.login.passphrase = ''
					Peerio.user.firstName = data.firstName
					Peerio.user.lastName  = data.lastName
					Peerio.user.addresses = data.addresses
					Peerio.user.settings = data.settings
					Peerio.user.quota = data.quota
					$scope.$root.$broadcast('mainTopPopulate', null)
					$scope.$root.$broadcast('contactsSectionPopulate', function() {
						$scope.$root.$broadcast('accountSettingsPopulate', null)
						$scope.$root.$broadcast('messagesSectionPopulate', function() {
							$('div.mainTopSectionTab[data-sectionLink=messages]').trigger('mousedown')
						})
						$scope.$root.$broadcast('filesSectionPopulate', null)
						$('div.loginScreen').addClass('slideUp')
						$('div.mainScreen').show()
					})
				})
				return false
			}
			swal({
				title: document.l10n.getEntitySync('loginFailed').value,
				text: document.l10n.getEntitySync('loginFailedText').value,
				type: 'error',
				confirmButtonText: document.l10n.getEntitySync('OK').value
			}, function() {
				$('form.loginForm').find('input').first().select()
				$('form.loginForm').find('input').removeAttr('disabled')
			})
		})
	})
	$scope.login.showSignupForm = function() {
		$('div.signupSplash').addClass('pullUp')
		setTimeout(function() {
			$('div.signupSplash').remove()
			$('div.signupFields').addClass('visible')
		}, 400)
		setTimeout(function() {
			$('div.signupFields').find('input')[0].focus()
		}, 700)
	}
	$scope.login.showPassphrase = function() {
		if ($('form.loginForm [ng-model="login.passphrase"]').attr('type') === 'text') {
			$('form.loginForm [ng-model="login.passphrase"]').attr('type', 'password')
			$('span.loginShowPassphraseEnable').show()
			$('span.loginShowPassphraseDisable').hide()
		}
		else {
			$('form.loginForm [ng-model="login.passphrase"]').attr('type', 'text')
			$('span.loginShowPassphraseEnable').hide()
			$('span.loginShowPassphraseDisable').show()
		}
	}
})