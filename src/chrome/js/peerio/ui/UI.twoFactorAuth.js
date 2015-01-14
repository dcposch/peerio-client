Peerio.UI.controller('twoFactorAuth', function($scope) {
	'use strict';
	$scope.twoFactorAuth = {}
	$scope.$on('twoFactorAuthValidateWithCallback', function(event, callback) {
		setTimeout(function() {
			$scope.twoFactorAuth.validateCallback = callback
			$('div.frontModals').addClass('small')
			$('div.frontModalsWrapper').addClass('visible')
			$('div.twoFactorAuth').addClass('visible')
			setTimeout(function() {
				$('input.twoFactorAuthCode').val('')
				$('input.twoFactorAuthCode')[0].focus()
			}, 200)
		}, 300)
	})
	Peerio.UI.twoFactorAuth = function(callback) {
		if ($scope.twoFactorAuth.isEnabled()) {
			$scope.$root.$broadcast('frontModalsClose', null)
			$scope.$root.$broadcast('twoFactorAuthValidateWithCallback', callback)
		}
		else {
			callback()
		}
	}
	$scope.twoFactorAuth.isEnabled = function() {
		if (!Peerio.user.authTokens.length) {
			return true
		}
		return Peerio.user.settings.twoFactorAuth
	}
	$scope.twoFactorAuth.submitCode = function() {
		if ($scope.twoFactorAuth.isEnabled()) {
			Peerio.network.validate2FA($scope.twoFactorAuth.code, function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('twoFactorAuthIncorrect').value,
						text: document.l10n.getEntitySync('twoFactorAuthIncorrectText').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
				}
				else {
					if (typeof($scope.twoFactorAuth.validateCallback) === 'function') {
						$scope.twoFactorAuth.validateCallback()
					}
					$scope.$root.$broadcast('frontModalsClose', null)
				}
			})
		}
		else {
			Peerio.network.confirm2FA($scope.twoFactorAuth.code, function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('twoFactorAuthIncorrect').value,
						text: document.l10n.getEntitySync('twoFactorAuthIncorrectText').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					Peerio.network.setUp2FA(function(data) {
						if (!data.secret) {
							return false
						}
						$('div.twoFactorAuthQRCode').html('')
						var myQRCode = 'otpauth://totp/Peerio:' + Peerio.user.username 
						myQRCode += ('?secret=' + data.secret + '&issuer=Peerio')
						myQRCode = new QRCode($('div.twoFactorAuthQRCode')[0], {
							text: myQRCode,
							width: 160,
							height: 160,
						})
						$('input.twoFactorAuthCode').val('')
						$('input.twoFactorAuthCode')[0].focus()
					})
				}
				else {
					swal({
						title: document.l10n.getEntitySync('confirmed').value,
						text: document.l10n.getEntitySync('twoFactorAuthConfirmedText').value,
						type: 'success',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					}, function() {
						Peerio.user.settings.twoFactorAuth = true
						$scope.$apply()
                        $('div.twoFactorAuthQRCode').remove()
						$scope.$root.$broadcast('frontModalsClose', null)
					})
				}
			})
		}
	}
})