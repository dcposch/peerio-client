Peerio.UI.controller('signupForms', function($scope) {
	'use strict';
	$scope.signup = {}
	$scope.signup.checkUsername = function() {
		if (!$scope.signup.username) {
			return false
		}
		$scope.signup.username = $scope.signup.username.toLowerCase()
		Peerio.network.validateUsername(
			$scope.signup.username,
			function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					$('div.signupUsernameAvailability').addClass('visible')
					$('input.signupDesiredUsername').addClass('invalid')
				}
				else {
					$('div.signupUsernameAvailability').removeClass('visible')
					$('input.signupDesiredUsername').removeClass('invalid')
				}
			}
		)
	}
	$scope.signup.checkAddress = function() {
		Peerio.network.validateAddress(
			$scope.signup.emailOrPhone,
			function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					$('div.signupAddressAvailability').addClass('visible')
					$('input.signupEmailOrPhone').addClass('invalid')
				}
				else {
					$('div.signupAddressAvailability').removeClass('visible')
					$('input.signupEmailOrPhone').removeClass('invalid')
				}
			}
		)
	}
	$scope.signup.basicInformationContinue = function() {
		if ($('input.invalid').length) { return false }
		$('div.signupProgressBarFill').css({width: 100})
		$('form.signupBasicInformation').hide()
		$('form.signupYourPassphrase').show()
		$('form.signupYourPassphrase').find('input')[0].focus()
		Peerio.UI.applyDynamicElements()
		if (typeof(require) === 'function') {
			$('a').unbind().on('click', function(e) {
				e.preventDefault()
				var gui = require('nw.gui')
				gui.Shell.openExternal($(this).attr('href'))
			})
		}
	}
	$scope.signup.showPassphrase = function() {
		if ($('input.signupPassphrase').attr('type') === 'text') {
			$('input.signupPassphrase').attr('type', 'password')
			$('input.signupConfirmPassphrase').attr('type', 'password')
			$('span.signupShowPassphraseEnable').show()
			$('span.signupShowPassphraseDisable').hide()
		}
		else {
			$('input.signupPassphrase').attr('type', 'text')
			$('input.signupConfirmPassphrase').attr('type', 'text')
			$('span.signupShowPassphraseEnable').hide()
			$('span.signupShowPassphraseDisable').show()
		}
	}
	$scope.signup.renderPassphraseHint = function() {
		if (!$scope.signup.passphrase) {
			$scope.signup.passphraseHint = ''
			return false
		}
		var entropy = zxcvbn($scope.signup.passphrase).entropy
		if (entropy <= miniLock.settings.minKeyEntropy / 3) {
			$scope.signup.passphraseHint = document.l10n.getEntitySync(
				'signupPassphraseHint1'
			).value
			$('span.signupPassphraseHint').removeClass('green')
			$('span.signupPassphraseHint').addClass('red')
		}
		else if (entropy <= miniLock.settings.minKeyEntropy / 2) {
			$scope.signup.passphraseHint = document.l10n.getEntitySync(
				'signupPassphraseHint1'
			).value
			$('span.signupPassphraseHint').removeClass('green')
			$('span.signupPassphraseHint').addClass('red')
		}
		else if (entropy <= miniLock.settings.minKeyEntropy / 1.5) {
			$scope.signup.passphraseHint = document.l10n.getEntitySync(
				'signupPassphraseHint2'
			).value
			$('span.signupPassphraseHint').removeClass('green')
			$('span.signupPassphraseHint').addClass('red')
		}
		else if (
			miniLock.crypto.checkKeyStrength(
				$scope.signup.passphrase,
				$scope.signup.username
			)
		) {
			$scope.signup.passphraseHint = document.l10n.getEntitySync(
				'signupPassphraseHint3'
			).value
			$('span.signupPassphraseHint').removeClass('red')
			$('span.signupPassphraseHint').addClass('green')
		}
	}
	$scope.signup.checkPassphrase = function() {
		$scope.signup.username = $scope.signup.username.toLowerCase()
		var strengthIsOK = miniLock.crypto.checkKeyStrength(
			$scope.signup.passphrase,
			$scope.signup.username
		)
		if (!strengthIsOK) {
			$('form.signupYourPassphrase').find('div.infoAlert').remove()
			$('form.signupYourPassphrase').find('div.errorAlert').show()
			return false
		}
		swal({
			title: document.l10n.getEntitySync('signupPassphraseConfirm').value,
			text: document.l10n.getEntitySync('signupPassphraseConfirmText').value,
			type: 'warning',
			showCancelButton: true,
			cancelButtonText: document.l10n.getEntitySync('cancel').value,
			confirmButtonText: document.l10n.getEntitySync('continue').value,
			closeOnConfirm: true
		}, function() {
			$('button.yourPassphraseContinue').attr('disabled', true)
			Peerio.user.setKeyPair(
				$scope.signup.passphrase,
				$scope.signup.username,
				function() {
					$scope.signup.registerAccount()
				}
			)
		})
	}
	$scope.signup.registerAccount = function() {
		$scope.signup.address = Peerio.util.parseAddress($scope.signup.emailOrPhone)
		$scope.signup.username = $scope.signup.username.toLowerCase()
		$scope.$apply()
		Peerio.user.registerAccount($scope.signup.username, {
			firstName: $scope.signup.firstName,
			lastName: $scope.signup.lastName,
			address: $scope.signup.address,
			miniLockID: Peerio.user.miniLockID
		}, function(data) {
			if (({}).hasOwnProperty.call(data, 'error')) {
				swal({
					title: document.l10n.getEntitySync('registerAccountError').value,
					text: document.l10n.getEntitySync('registerAccountErrorText').value,
					type: 'error',
					confirmButtonText: document.l10n.getEntitySync('OK').value
				})
			}
			$scope.signup.yourPassphraseContinue()
		}, function() {
			swal({
				title: document.l10n.getEntitySync('registerAccountError').value,
				text: document.l10n.getEntitySync('registerAccountErrorText').value,
				type: 'error',
				confirmButtonText: document.l10n.getEntitySync('OK').value
			})
		})
	}
	$scope.signup.yourPassphraseContinue = function() {
		$('div.signupProgressBarFill').css({width: 200})
		$('form.signupYourPassphrase').hide()
		$('form.signupAccountConfirmation').show()
		$('form.signupAccountConfirmation').find('input')[0].focus()
		Peerio.UI.applyDynamicElements()
	}
	$scope.signup.confirmAccount = function() {
		Peerio.network.sendAccountConfirmation(
			$scope.signup.confirmationCode,
			function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					$('div.signupConfirmationCodeValidity').addClass('visible')
					$('input.confirmationCode').addClass('invalid')
				}
				else {
					$('div.signupConfirmationCodeValidity').removeClass('visible')
					$('input.confirmationCode').removeClass('invalid')
					$scope.signup.accountConfirmationContinue()
				}
			}
		)
	}
	$scope.signup.accountConfirmationContinue = function() {
		$('div.signupProgressBarFill').css({width: 300})
		$('form.signupAccountConfirmation').hide()
		$('form.signupFinishingUp').show()
		$('form.signupFinishingUp').find('input')[0].focus()
		Peerio.UI.applyDynamicElements()
	}
	$scope.signup.peerioPINStrength = function() {
		if (!$scope.signup.peerioPIN) { return false }
		var entropy = zxcvbn($scope.signup.peerioPIN).entropy
		if (entropy >= Peerio.config.minPINEntropy) {
			return true
		}
		return false
	}
	$scope.signup.peerioPINSet = function() {
		$('button.signupPeerioPINEntryContinue').attr('disabled', true)
		Peerio.user.setPIN(
			$scope.signup.peerioPIN,
			Peerio.user.username,
			function() {
				$scope.signup.firstLogin()
			}
		)
	}
	$scope.signup.firstLogin = function() {
		$scope.signup.username = $scope.signup.username.toLowerCase()
		$scope.$root.$broadcast('login', {
			username: $scope.signup.username,
			passOrPIN: $scope.signup.passphrase,
			skipPIN: true
		})
	}
})