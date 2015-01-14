Peerio.UI.downloadFile = {};

(function() {
	'use strict';

	var downloadAdapters = {}

	downloadAdapters.chrome = function(id) {
		var fileName = Peerio.user.files[id].name
		chrome.fileSystem.chooseEntry({
			type: 'saveFile',
			suggestedName: fileName
		}, function(fileEntry) {
			if (!fileEntry) {
				return false
			}
			Peerio.user.files[id].downloading = true
			Peerio.file.downloadFile(
				id,
				Peerio.user.files[id].header,
				function(progress) {
					if (progress.lengthComputable) {
						Peerio.user.files[id].downloadProgress = Math.round(
							((progress.loaded / progress.total) * 100)
						)
						Peerio.UI.filesSectionScopeApply()
					}
				},
				function(decryptedBlob) {
					if (!decryptedBlob) {
						swal({
							title: document.l10n.getEntitySync('downloadFileError').value,
							text: document.l10n.getEntitySync('downloadFileErrorText').value,
							type: 'error',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
						return false
					}
					if (!Peerio.file.getFileExtension(fileEntry.name)) {
						fileEntry.name = fileEntry.name + Peerio.file.getFileExtension(fileName)
						fileEntry.fullPath = fileEntry.fullPath + Peerio.file.getFileExtension(fileName)
					}
					fileEntry.createWriter(function(fileWriter) {
						fileWriter.onwriteend = function() {
							Peerio.user.files[id].downloading = false
							Peerio.UI.filesSectionScopeApply()
							fileWriter.onwriteend = null
							fileWriter.truncate(decryptedBlob.size)
						}
						fileWriter.write(decryptedBlob)
					}, function() {})
				}
			)
		})
	}

	downloadAdapters.nodeWebkit = function(id) {
		var fileName = Peerio.user.files[id].name
		$('input.fileSelectDialogNodeWebkit').attr('nwsaveas', fileName)
		$('input.fileSelectDialogNodeWebkit').unbind().on('change', function(event) {
			event.preventDefault()
			var fileSavePath = this.value
			$('form.fileUploadForm input[type=reset]').click()
			if (!fileSavePath) {
				return false
			}
			if (!Peerio.file.getFileExtension(fileSavePath)) {
				fileSavePath += Peerio.file.getFileExtension(fileName)
			}
			Peerio.user.files[id].downloading = true
			Peerio.file.downloadFile(
				id,
				Peerio.user.files[id].header,
				function(progress) {
					if (progress.lengthComputable) {
						Peerio.user.files[id].downloadProgress = Math.round(
							((progress.loaded / progress.total) * 100)
						)
						Peerio.UI.filesSectionScopeApply()
					}
				},
				function(decryptedBlob) {
					var showSaveError = function() {
						swal({
							title: document.l10n.getEntitySync('downloadFileError').value,
							text: document.l10n.getEntitySync('downloadFileErrorText').value,
							type: 'error',
							confirmButtonText: document.l10n.getEntitySync('OK').value
						})
					}
					if (!decryptedBlob) {
						showSaveError()
						return false
					}
					var reader = new FileReader()
					reader.onload = function(readerEvent) {
						(require('fs')).writeFile(
							fileSavePath,
							readerEvent.target.result,
							'binary',
							function(err) {
								Peerio.user.files[id].downloading = false
								Peerio.UI.filesSectionScopeApply()
								if (err) {
									showSaveError()
								}
							}
						)
					}
					reader.readAsBinaryString(decryptedBlob)
				}
			)
		}, false)
		$('input.fileSelectDialogNodeWebkit').trigger('click')
	}

	Peerio.UI.downloadFile.adapter = (function() {
		if (
			typeof(chrome) === 'object' &&
			typeof(chrome.storage) === 'object' &&
			typeof(chrome.storage.local) === 'object'
		) {
			return downloadAdapters.chrome
		}
		else {
			return downloadAdapters.nodeWebkit
		}
	})()

	Peerio.UI.downloadFile.downloadFile = function(id) {
		Peerio.UI.downloadFile.adapter(id)
	}

})()