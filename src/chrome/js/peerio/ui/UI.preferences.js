Peerio.UI.controller('preferences', function($scope) {
	'use strict';
	$scope.preferences = {}
	setTimeout(function() {
		$scope.preferences.language = Peerio.user.settings.localeCode
		$scope.preferences.languageOptions = [{
			name: 'English',
			value: 'en'
		}, {
			name: 'Francais',
			value: 'fr'
		}]
		if ($scope.preferences.language === 'fr') {
			$scope.preferences.languageOptions.reverse()
		}
		$scope.$apply()
	}, 5000)
	$scope.preferences.getLocaleCode = function() {
		return Peerio.user.settings.localeCode
	}
	$scope.preferences.updateLocaleCode = function() {
		Peerio.user.settings.localeCode = $scope.preferences.language
		Peerio.UI.twoFactorAuth(function() {
			Peerio.network.updateSettings({
				localeCode: $scope.preferences.language
			}, function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('error').value,
						text: document.l10n.getEntitySync('errorText').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					return false
				}
				else {
					var defaultPouch = new PouchDB('_default')
					defaultPouch.get('localeCode', function(err, data) {
						defaultPouch.remove(data, function() {
							defaultPouch.put({
								_id: 'localeCode',
								localeCode: Peerio.user.settings.localeCode
							}, function() {})
						})
					})
					Peerio.storage.db.get('localeCode', function(err, data) {
						Peerio.storage.db.remove(data, function() {
							Peerio.storage.db.put({
								_id: 'localeCode',
								localeCode: Peerio.user.settings.localeCode
							}, function() {
								swal({
									title: document.l10n.getEntitySync('confirmed').value,
									text: document.l10n.getEntitySync('confirmedLanguageText').value,
									type: 'success',
									confirmButtonText: document.l10n.getEntitySync('OK').value
								})
							})
						})
					})
				}
			})
		})
	}
	$scope.preferences.receiveMessageNotifications = function() {
		return Peerio.user.settings.receiveMessageNotifications
	}
	$scope.preferences.receiveMessageNotificationsOnCheck = function(event) {
		if (event.target.checked) {
			Peerio.user.settings.receiveMessageNotifications = true
		}
		else {
			Peerio.user.settings.receiveMessageNotifications = false
		}
		Peerio.UI.twoFactorAuth(function() {
			Peerio.network.updateSettings({
				receiveMessageNotifications: Peerio.user.settings.receiveMessageNotifications
			}, function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('error').value,
						text: document.l10n.getEntitySync('errorText').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					return false
				}
				else {
					swal({
						title: document.l10n.getEntitySync('confirmed').value,
						text: document.l10n.getEntitySync('confirmedText').value,
						type: 'success',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
				}
			})
		})
	}
	$scope.preferences.sendReadReceipts = function() {
		return Peerio.user.settings.sendReadReceipts
	}
	$scope.preferences.sendReadReceiptsOnCheck = function(event) {
		if (event.target.checked) {
			Peerio.user.settings.sendReadReceipts = true
		}
		else {
			Peerio.user.settings.sendReadReceipts = false
		}
		Peerio.UI.twoFactorAuth(function() {
			Peerio.network.updateSettings({
				sendReadReceipts: Peerio.user.settings.sendReadReceipts
			}, function(data) {
				if (({}).hasOwnProperty.call(data, 'error')) {
					swal({
						title: document.l10n.getEntitySync('error').value,
						text: document.l10n.getEntitySync('errorText').value,
						type: 'error',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
					return false
				}
				else {
					swal({
						title: document.l10n.getEntitySync('confirmed').value,
						text: document.l10n.getEntitySync('confirmedText').value,
						type: 'success',
						confirmButtonText: document.l10n.getEntitySync('OK').value
					})
				}
			})
		})
	}
	$scope.preferences.peerioPINStrength = function() {
		if (!$scope.preferences.peerioPIN) { return false }
		var entropy = zxcvbn($scope.preferences.peerioPIN).entropy
		if (entropy >= Peerio.config.minPINEntropy) {
			return true
		}
		return false
	}
	$scope.preferences.peerioPINSet = function() {
		$('button.preferencesPeerioPINEntryContinue').attr('disabled', true)
		Peerio.user.setPIN(
			$scope.preferences.peerioPIN,
			Peerio.user.username,
			function() {
				swal({
					title: document.l10n.getEntitySync('peerioPINUpdated').value,
					text: document.l10n.getEntitySync('peerioPINUpdatedText').value,
					type: 'success',
					confirmButtonText: document.l10n.getEntitySync('OK').value
				})
				$('button.preferencesPeerioPINEntryContinue').removeAttr('disabled')
			}
		)
	}
	$scope.preferences.peerioPINRemove = function() {
		Peerio.user.removePIN(Peerio.user.username, function() {
			swal({
				title: document.l10n.getEntitySync('peerioPINRemoved').value,
				text: document.l10n.getEntitySync('peerioPINRemovedText').value,
				type: 'success',
				confirmButtonText: document.l10n.getEntitySync('OK').value
			})
		})
	}
})