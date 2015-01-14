Peerio.UI.controller('accountSettings', function($scope) {
	'use strict';
	$scope.accountSettings = {}
	$scope.$on('accountSettingsPopulate', function() {
		$scope.accountSettings.firstName = Peerio.user.firstName
		$scope.accountSettings.lastName  = Peerio.user.lastName
		$scope.addresses = Peerio.user.addresses
		$scope.$apply()
		Peerio.UI.applyDynamicElements()
	})
	$scope.accountSettings.updateName = function() {
		Peerio.UI.twoFactorAuth(function() {
			Peerio.network.updateSettings({
				firstName: $scope.accountSettings.firstName,
				lastName: $scope.accountSettings.lastName
			}, function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('error').value,
						text: document.l10n.getEntitySync('couldNotUpdateName').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					return false
				}
				else {
					swal({
						title: document.l10n.getEntitySync('confirmed').value,
						text: document.l10n.getEntitySync('confirmedNameText').value,
						type: 'success',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					Peerio.user.firstName = $scope.accountSettings.firstName
					Peerio.user.lastName  = $scope.accountSettings.lastName
					$scope.$root.$broadcast('mainTopPopulate', null)
					$scope.$root.$broadcast('accountSettingsPopulate', null)
					$scope.$root.$broadcast('messagesSectionPopulate', null)
					$scope.$root.$broadcast('filesSectionPopulate', null)
					$scope.$root.$broadcast('contactsSectionPopulate', null)
				}
			})
		})
	}
	$scope.accountSettings.addNewAddress = function() {
		var parsed = Peerio.util.parseAddress(
			$scope.accountSettings.newAddress
		)
		if (!parsed) {
			swal({
				title: document.l10n.getEntitySync('error').value,
				text: document.l10n.getEntitySync('couldNotAddAddress').value,
				type: 'error',
				confirmButtonText: document.l10n.getEntitySync('OK').value
			})
			return false
		}
		Peerio.UI.twoFactorAuth(function() {
			Peerio.network.addAddress($scope.accountSettings.newAddress, function(data) {
				$scope.accountSettings.newAddress = ''
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('error').value,
						text: document.l10n.getEntitySync('couldNotAddAddress').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					return false
				}
				Peerio.network.getSettings(function(data) {
					Peerio.user.addresses = data.addresses
					$scope.$root.$broadcast('accountSettingsPopulate', null)
				})
			})
		})
	}
	$scope.accountSettings.confirmAddress = function(event) {
		var thisAddress = $(event.target).prev('input').val()
		if (event.target.value.length < 8) {
			return false
		}
		Peerio.network.confirmAddress(
			thisAddress,
			event.target.value,
			function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('error').value,
						text: document.l10n.getEntitySync('couldNotConfirmAddress').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					return false
				}
				swal({
					title: document.l10n.getEntitySync('confirmed').value,
					text: document.l10n.getEntitySync('confirmedAddressText').value,
					type: 'success',
					confirmButtonText: document.l10n.getEntitySync('OK').value
				})
				Peerio.network.getSettings(function(data) {
					Peerio.user.addresses = data.addresses
					$scope.$root.$broadcast('accountSettingsPopulate', null)
				})
			}
		)
	}
	$scope.accountSettings.setPrimaryAddress = function(event) {
		var thisAddress = $(event.target)
			.parent().find('input').first().val()
		Peerio.UI.twoFactorAuth(function() {
			Peerio.network.setPrimaryAddress(
				thisAddress,
				function(data) {
					if (({}).hasOwnProperty.call(data, 'error')) {
						return false
					}
					Peerio.network.getSettings(function(data) {
						Peerio.user.addresses = data.addresses
						$scope.$root.$broadcast('accountSettingsPopulate', null)
					})
				}
			)
		})
	}
	$scope.accountSettings.removeAddress = function(event) {
		var thisAddress = $(event.target)
			.parent().find('input').first().val()
		Peerio.UI.twoFactorAuth(function() {
			Peerio.network.removeAddress(
				thisAddress,
				function(data) {
					if (({}).hasOwnProperty.call(data, 'error')) {
						return false
					}
					Peerio.network.getSettings(function(data) {
						Peerio.user.addresses = data.addresses
						$scope.$root.$broadcast('accountSettingsPopulate', null)
					})
				}
			)
		})
	}
	$scope.accountSettings.deleteAccount = function() {
		swal({
			title: document.l10n.getEntitySync('deleteAccountConfirm').value,
			text: document.l10n.getEntitySync('deleteAccountConfirmText').value,
			type: 'warning',
			showCancelButton: true,
			cancelButtonText: document.l10n.getEntitySync('cancel').value,
			confirmButtonColor: '#e07a66',
			confirmButtonText: document.l10n.getEntitySync('deleteAccount').value,
			closeOnConfirm: false
		}, function() {
			Peerio.UI.twoFactorAuth(function() {
				Peerio.network.closeAccount(function() {
					window.close()
				})
			})
		})
	}
	$scope.accountSettings.changePassphrase = function() {
		// @todo kaepora
	}
	$scope.accountSettings.isTwoFactorAuthEnabled = function() {
		return Peerio.user.settings.twoFactorAuth
	}
	$scope.accountSettings.enableTwoFactorAuth = function() {
		$scope.$root.$broadcast('frontModalsClose', null)
		setTimeout(function() {
			Peerio.network.setUp2FA(function(data) {
				$('div.twoFactorAuthQRCode').html('')
				var myQRCode = 'otpauth://totp/Peerio:' + Peerio.user.username 
				myQRCode += ('?secret=' + data.secret + '&issuer=Peerio')
				myQRCode = new QRCode($('div.twoFactorAuthQRCode')[0], {
					text: myQRCode,
					width: 160,
					height: 160,
				})
				$('div.frontModals').addClass('small')
				$('div.frontModalsWrapper').addClass('visible')
				$('div.twoFactorAuth').addClass('visible')
				setTimeout(function() {
					$('input.twoFactorAuthCode').val('')
					$('input.twoFactorAuthCode')[0].focus()
				}, 200)
			})
		}, 250)
	}
	$scope.accountSettings.disableTwoFactorAuth = function() {
		Peerio.UI.twoFactorAuth(function() {
			Peerio.network.updateSettings({
				twoFactorAuth: false
			}, function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('error').value,
						text: document.l10n.getEntitySync('twoFactorAuthCannotDisable').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					return false
				}
				else {
					swal({
						title: document.l10n.getEntitySync('twoFactorAuthDisabled').value,
						text: document.l10n.getEntitySync('twoFactorAuthDisabledText').value,
						type: 'success',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					Peerio.user.settings.twoFactorAuth = false
					$scope.$apply(Peerio.UI.applyDynamicElements)
				}
			})
		})
	}
})