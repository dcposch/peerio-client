Peerio.UI.controller('filesSection', function($scope, $element, $sce) {
	'use strict';
	$scope.filesSidebar = {}
	$scope.filesSidebar.selectFile = function() {
		if (!/Sidebar/.test($element[0].className)) {
			return false
		}
		$('input.fileSelectDialog').click()
	}
	$scope.filesSidebar.getUserQuota = function() {
		return Peerio.file.getReadableFileSize(Peerio.user.quota.user)
	}
	$scope.filesSidebar.getTotalQuota = function() {
		return Peerio.file.getReadableFileSize(Peerio.user.quota.total)
	}
	$scope.filesSidebar.getQuotaPercentage = function() {
		var p = (Peerio.user.quota.user * 100) / Peerio.user.quota.total
		return Math.ceil(p) + '%'
	}
	$scope.filesSection = {}
	$scope.filesSection.searchFilter = ''
	$scope.filesSection.typeFilter = ''
	$scope.filesSection.ownerFilter = /./
	$scope.filesSection.checkedIDs = []
	Peerio.UI.filesSectionScopeApply = function() {
		$scope.$apply()
	}
	$scope.$on('filesSectionPopulate', function(event, callback) {
		if (/Sidebar/.test($element[0].className)) {
			return false
		}
		Peerio.file.getFiles(function() {
			$scope.filesSection.files = Peerio.user.files
			$scope.$apply()
			if (typeof(callback) === 'function') {
				callback()
			}
		})
	})
	$scope.$on('filesSectionSetSearchFilter', function(event, input) {
		$scope.filesSection.searchFilter = input.toLowerCase()
		$scope.$apply()
	})
	$scope.$on('filesSectionSetTypeFilter', function(event, type) {
		$scope.filesSection.typeFilter = type
	})
	$scope.$on('filesSectionSetOwnerFilter', function(event, owner) {
		$scope.filesSection.ownerFilter = owner
	})
	$scope.filesSection.getDate = function(timestamp) {
		if (typeof(timestamp) === 'undefined') { return '' }
		return Peerio.util.getDateFromTimestamp(timestamp)
	}
	$scope.filesSection.getSize = function(bytes) {
		return Peerio.file.getReadableFileSize(bytes)
	}
	$scope.filesSection.truncateName = function(fileName) {
		return Peerio.file.truncateFileName(fileName)
	}
	$scope.filesSection.getIcon = function(fileID) {
		if (({}).hasOwnProperty.call(Peerio.user.files, fileID)) {
			return $sce.trustAsHtml(
				Peerio.user.files[fileID].icon
			)
		}
	}
	$scope.filesSection.onCheck = function(id, event) {
		if (event.target.checked) {
			$scope.filesSection.checkedIDs.push(id)
		}
		else {
			var index = $scope.filesSection.checkedIDs.indexOf(id)
			if (index >= 0) {
				$scope.filesSection.checkedIDs.splice(index, 1)
			}
		}
	}
	$scope.filesSection.getFullName = function(username) {
		return Peerio.util.getFullName(username)
	}
	$scope.filesSection.setTypeFilter = function(type, event) {
		$('ul.filesSidebarTypeFilters li').removeClass('active')
		$(event.target).addClass('active')
		$scope.$root.$broadcast('filesSectionSetTypeFilter', type)
	}
	$scope.filesSection.checkTypeFilter = function(type) {
		if ($scope.filesSection.typeFilter === '') {
			return true
		}
		if ($scope.filesSection.typeFilter === 'other') {
			return !(new RegExp('^((image)|(video)|(pdf)|(word)|(excel)|(powerpoint))$')).test(type)
		}
		return (new RegExp('^' + $scope.filesSection.typeFilter + '$')).test(type)
	}
	$scope.filesSection.checkSearchFilter = function(file) {
		if (!$scope.filesSection.searchFilter.length) {
			return true
		}
		if (file.name.toLowerCase().match($scope.filesSection.searchFilter)) {
			return true
		}
		if (file.creator.toLowerCase().match($scope.filesSection.searchFilter)) {
			return true
		}
		var fullName = Peerio.util.getFullName(file.creator).toLowerCase()
		if (fullName.match($scope.filesSection.searchFilter)) {
			return true
		}
		return false
	}
	$scope.filesSection.setOwnerFilter = function(owner, event) {
		if (owner === 'all') {
			owner = new RegExp('.')
		}
		if (owner === 'me') {
			owner = new RegExp('^' + Peerio.user.username + '$')
		}
		if (owner === 'others') {
			owner = new RegExp('^(?!(' + Peerio.user.username + ')$).*')
		}
		$('div.filesSectionToolbarSort button').removeClass('active')
		$(event.target).addClass('active')
		$scope.$root.$broadcast('filesSectionSetOwnerFilter', owner)
	}
	$scope.filesSection.checkOwnerFilter = function(file) {
		return $scope.filesSection.ownerFilter.test(file.creator)
	}
	$scope.filesSection.downloadFile = function(id) {
		Peerio.UI.downloadFile.downloadFile(id)
		setTimeout(function() {
			$scope.filesSection.hideListingActions('')
		}, 100)
	}
	$scope.filesSection.sendFiles = function(ids) {
		$scope.$root.$broadcast(
			'attachFilePopulate', {
				recipients: [],
				opener: 'newMessage'
			}
		)
		ids.forEach(function(id) {
			var size = Peerio.user.files[id].size
			var timestamp = Peerio.user.files[id].timestamp
			$('#attachFileCheckbox' + size + timestamp).prop('checked', true)
		})
		$scope.$root.$broadcast('newMessageAttachFileIDs', ids)
		$('div.frontModalsWrapper').addClass('visible')
		$('div.newMessage').addClass('visible')
		setTimeout(function() {
			$('input.newMessageTo')[0].focus()
			$scope.filesSection.hideListingActions('')
		}, 100)
	}
	$scope.filesSection.removeFiles = function(ids) {
		swal({
			title: document.l10n.getEntitySync('removeFilesQuestion').value,
			text: document.l10n.getEntitySync('removeFilesText').value,
			type: 'warning',
			showCancelButton: true,
			cancelButtonText: document.l10n.getEntitySync('cancel').value,
			confirmButtonColor: '#e07a66',
			confirmButtonText: document.l10n.getEntitySync('remove').value,
			closeOnConfirm: false
		}, function() {
			ids.forEach(function(id) {
				Peerio.file.removeFile(id, function() {
					var index = $scope.filesSection.checkedIDs.indexOf(id)
					if (index >= 0) {
						$scope.filesSection.checkedIDs.splice(index, 1)
					}
					Peerio.network.getSettings(function(data) {
						Peerio.user.quota = data.quota
						$scope.$apply()
					})
				})
			})
			$scope.filesSection.hideListingActions('')
		})
	}
	$scope.filesSection.nukeFiles = function(ids) {
		var ownAllFiles = true
		ids.forEach(function(id) {
			if (Peerio.user.files[id].creator !== Peerio.user.username) {
				ownAllFiles = false
			}
		})
		if (!ownAllFiles) {
			swal({
				title: document.l10n.getEntitySync('destroyFilesOwnerError').value,
				text: document.l10n.getEntitySync('destroyFilesOwnerErrorText').value,
				type: 'error',
				confirmButtonText: document.l10n.getEntitySync('OK').value
			})
			return false
		}
		swal({
			title: document.l10n.getEntitySync('destroyFilesQuestion').value,
			text: document.l10n.getEntitySync('destroyFilesText').value,
			type: 'warning',
			showCancelButton: true,
			cancelButtonText: document.l10n.getEntitySync('cancel').value,
			confirmButtonColor: '#e07a66',
			confirmButtonText: document.l10n.getEntitySync('destroy').value,
			closeOnConfirm: false
		}, function() {
			ids.forEach(function(id) {
				Peerio.file.nukeFile(id, function() {
					var index = $scope.filesSection.checkedIDs.indexOf(id)
					if (index >= 0) {
						$scope.filesSection.checkedIDs.splice(index, 1)
					}
					Peerio.network.getSettings(function(data) {
						Peerio.user.quota = data.quota
						$scope.$apply()
					})
				})
			})
			$scope.filesSection.hideListingActions('')
		})
	}
	$scope.filesSection.showListingActions = function(id, event) {
		if (Peerio.user.files[id].uploading) {
			return false
		}
		$scope.filesSection.selectedFile = id
		$('div.fileListingActions').css({
			left: event.clientX + 5,
			top: event.clientY + 5
		}).addClass('expand')
	}
	$scope.filesSection.isFileIDOwnedByMe = function(id) {
		if (!id) {
			return false
		}
		if (Peerio.user.files[id].creator === Peerio.user.username) {
			return true
		}
		return false
	}
	$scope.filesSection.hideListingActions = function(event) {
		if (
			(event === '') ||
			(!event.srcElement.className.match('fileListing'))
		) {
			delete $scope.filesSection.selectedFile
			$('div.fileListingActions').removeClass('expand')
		}
	}
	$scope.filesSection.fileObjectHandler = function(file) {
		if (file.size >= Peerio.config.fileUploadSizeLimit) {
			swal({
				title: document.l10n.getEntitySync('sizeError').value,
				text: document.l10n.getEntitySync('sizeErrorText').value,
				type: 'error',
				confirmButtonText: document.l10n.getEntitySync('OK').value
			})
		}
		else if (file.size >= (Peerio.user.quota.total - Peerio.user.quota.user)) {
			swal({
				title: document.l10n.getEntitySync('quotaError').value,
				text: document.l10n.getEntitySync('quotaErrorText').value,
				type: 'error',
				confirmButtonText: document.l10n.getEntitySync('OK').value
			})
		}
		else {
			Peerio.file.upload(file, [Peerio.user.username],
				function(data, id) {
					if (({}).hasOwnProperty.call(data, 'error')) {
						swal({
							title: document.l10n.getEntitySync('fileUploadError').value,
							text: document.l10n.getEntitySync('fileUploadErrorText').value,
							type: 'error',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
						$('form.fileUploadForm input[type=reset]').click()
						delete Peerio.user.files[id]
					}
					$scope.$apply()
				},
				function(data, id) {
					if (({}).hasOwnProperty.call(data, 'error')) {
						swal({
							title: document.l10n.getEntitySync('fileUploadError').value,
							text: document.l10n.getEntitySync('fileUploadErrorText').value,
							type: 'error',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
						$('form.fileUploadForm input[type=reset]').click()
						delete Peerio.user.files[id]
					}
					$scope.$apply()
				},
				function(data, id) {
					if (({}).hasOwnProperty.call(data, 'error')) {
						swal({
							title: document.l10n.getEntitySync('fileUploadError').value,
							text: document.l10n.getEntitySync('fileUploadErrorText').value,
							type: 'error',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
						$('form.fileUploadForm input[type=reset]').click()
						delete Peerio.user.files[id]
					}
					$('form.fileUploadForm input[type=reset]').click()
					Peerio.network.getSettings(function(data) {
						Peerio.user.quota = data.quota
						if (Peerio.file.autoCheck) {
							// @todo kaepora
							Peerio.file.autoCheck = false
						}
						$scope.$apply()
					})
				}
			)
		}
	}
	$('input.fileSelectDialog').unbind().on('change', function(event) {
		event.preventDefault()
		if (!this.files) {
			return false
		}
		for (var i = 0; i < this.files.length; i++) {
			$scope.filesSection.fileObjectHandler(this.files[i])
		}
		return false
	})
	var dragCounter = 0
	$(document).unbind()
	$(document).on('dragover', function(e) {
		e.preventDefault()
		return false
	})
	$(document).on('dragenter', function(e) {
		e.preventDefault()
		if (!Peerio.user.username) {
			return false
		}
		dragCounter++
		$('div.dragAndDropUpload').addClass('visible')
		return false
	})
	$(document).on('dragleave', function() {
		if (!Peerio.user.username) {
			return false
		}
		dragCounter--
		if (!dragCounter) {
			dragCounter = 0
			$('div.dragAndDropUpload').removeClass('visible')
		}
		return false
	})
	$(document).on('drop', function(e) {
		e.preventDefault()
		if (!Peerio.user.username) {
			return false
		}
		dragCounter = 0
		$('div.dragAndDropUpload').removeClass('visible')
		if ($('div.attachFile.visible').length) {
			Peerio.file.autoCheck = true
		}
		else {
			$('div.mainTopSectionSelect [data-sectionLink=files]').trigger('mousedown')
		}
		for (var i = 0; i < e.dataTransfer.files.length; i++) {
			$scope.filesSection.fileObjectHandler(e.dataTransfer.files[i])
		}
		return false
	})
})