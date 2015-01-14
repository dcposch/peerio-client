// ---------------------
// Peerio.file
// ---------------------
//
// Peerio's file object contains functions and information
// regarding the sending and management of files.


Peerio.file = {
	autoCheck: true
};

(function() {
	'use strict';

	/**
	 * Encrypt and upload a file.
	 * @param {object} file
	 * @param {array} recipients - miniLock IDs of recipients
	 * @param {function} onStart - callback after upload of chunk 0
	 * @param {function} onProgress - callback on uploadProgress update
	 * @param {function} onFinish - callback after upload of last chunk
	 */
	Peerio.file.upload = function(file, recipients, onStart, onProgress, onFinish) {
		var clientFileID = Base58.encode(nacl.randomBytes(32))
		var chunkNumber = 0
		var totalChunks = Math.ceil(
			file.size / miniLock.crypto.chunkSize
		)
		var chunks
		var id = ''
		var uploadFileComplete = false
		Peerio.crypto.encryptFile(file, recipients,
			function(fileName) {
				id = nacl.util.encodeBase64(fileName.subarray(4))
				Peerio.user.files[id] = {
					creator: Peerio.user.username,
					name: file.name,
					id: id,
					selfDestruct: false,
					size: file.size,
					timestamp: (new Date()).getTime(),
					uploading: true,
					uploadProgress: '🔒',
					type: Peerio.file.getFileTypeFromName(file.name).type,
					icon: Peerio.file.getFileTypeFromName(file.name).icon
				}
				file = null
				Peerio.network.uploadFile(
					{
						ciphertext: fileName.buffer,
						totalChunks: totalChunks,
						clientFileID: clientFileID
					},
					function(data) {
						uploadFileComplete = true
						if (typeof(onStart) === 'function') {
							onStart(data, id)
						}
					}
				)
			},
			function(header, encryptedChunks, failed) {
				if (!header || !encryptedChunks) {
					if (typeof(onFinish) === 'function') {
						onFinish(false)
					}
					return false
				}
				var chunkInterval = setInterval(function() {
					if (uploadFileComplete) {
						clearInterval(chunkInterval)
						chunks = encryptedChunks
						Peerio.user.files[id].header = header
						sendNextChunk(chunks[chunkNumber], failed)
					}
				}, 100)
			}
		)
		var sendNextChunk = function(chunk, failed) {
			var chunkObject = {
				ciphertext: chunk.buffer,
				chunkNumber: chunkNumber,
				clientFileID: clientFileID
			}
			if (chunkNumber === 0) {
				chunkObject.header = Peerio.user.files[id].header
			}
			console.log('Uploading ' + chunkNumber + ' of ' + (totalChunks - 1))
			Peerio.network.uploadFileChunk(chunkObject,
				function(data) {
					Peerio.user.files[id].uploadProgress = Math.round(
						((chunkNumber * 100) / totalChunks)
					)
					if (typeof(onProgress) === 'function') {
						onProgress(data, id)
					}
					if (({}).hasOwnProperty.call(data, 'error')) {
						Peerio.user.files[id].uploading = false
					}
					if (chunkNumber < totalChunks - 1) {
						chunkNumber++
						sendNextChunk(chunks[chunkNumber])
					}
					else {
						Peerio.user.files[id].uploading = false
						if (typeof(onFinish) === 'function') {
							onFinish(data, id, failed)
						}
					}
				}
			)
		}
	}

	/**
	 * Retrieve file information, decrypt the filename and folder name.
	 * @param {array} fileIDs
	 * @param {function} callback - Returned with object containing file information.
	 */
	Peerio.file.getFile = function(fileIDs, callback) {
		var result = {}
		var getNextFile = function(count) {
			Peerio.network.getFile(fileIDs[count], function(file) {
				if (({}).hasOwnProperty.call(file, 'error')) {
					result[fileIDs[count]] = 'error'
				}
				else {
					file.name = Peerio.crypto.decryptFileName(
						file.id, file.header
					)
					file.type = Peerio.file.getFileTypeFromName(
						file.name
					).type
					file.icon = Peerio.file.getFileTypeFromName(
						file.name
					).icon
					file.uploading = false
					result[fileIDs[count]] = file
				}
				count++
				if (count === fileIDs.length) {
					callback(result)
				}
				else {
					getNextFile(count)
				}
			})
		}
		if (fileIDs.length === 0) {
			callback(result)
		}
		else {
			getNextFile(0)
		}
	}

	/**
	 * Retrieve all our file information, decrypt the filename and folder names.
	 * Also, load the result into Peerio.user.files.
	 * @param {function} callback - Returned with array containing file information.
	 */
	Peerio.file.getFiles = function(callback) {
		Peerio.network.getFiles(function(files) {
			files = files.files
			for (var file in files) {
				if (({}).hasOwnProperty.call(files, file)) {
					files[file].name = Peerio.crypto.decryptFileName(
						files[file].id, files[file].header
					)
					files[file].type = Peerio.file.getFileTypeFromName(
						files[file].name
					).type
					files[file].icon = Peerio.file.getFileTypeFromName(
						files[file].name
					).icon
					files[file].uploading = false
				}
			}
			Peerio.user.files = files
			if (typeof(callback) === 'function') {
				callback(files)
			}
		})
	}

	/**
	 * Remove a file from user's account and locally from Peerio.user.files.
	 * @param {string} id
	 * @param {function} callback - with server returned data.
	 */
	Peerio.file.removeFile = function(id, callback) {
		Peerio.network.removeFile(id, function(data) {
			if (!({}).hasOwnProperty.call(data, 'error')) {
				delete Peerio.user.files[id]
			}
			if (typeof(callback) === 'function') {
				callback(data)
			}
		})
	}

	/**
	 * Nuke a file from user's account and remove it locally from Peerio.user.files.
	 * @param {string} id
	 * @param {function} callback - with server returned data.
	 */
	Peerio.file.nukeFile = function(id, callback) {
		Peerio.network.nukeFile(id, function(data) {
			if (!({}).hasOwnProperty.call(data, 'error')) {
				delete Peerio.user.files[id]
			}
			if (typeof(callback) === 'function') {
				callback(data)
			}
		})
	}

	/**
	 * Download and decrypt a file.
	 * @param {string} id
	 * @param {object} header
	 * @param {function} progressHandler
	 * @param {function} callback - with decrypted blob.
	 */
	Peerio.file.downloadFile = function(id, header, progressHandler, callback) {
		Peerio.network.downloadFile(id, function(data) {
			if (!({}).hasOwnProperty.call(data, 'url')) {
				return false
			}
			var xhr = new XMLHttpRequest()
			xhr.onreadystatechange = function() {
				if (
					(this.readyState === 4) &&
					(this.status     === 200)
				) {
					Peerio.crypto.decryptFile(
						id,
						this.response,
						header,
						function(decryptedBlob) {
							if (decryptedBlob) {
								if (typeof(callback) === 'function') {
									callback(decryptedBlob)
								}
							}
							else {
								if (typeof(callback) === 'function') {
									callback(false)
								}
							}
						}
					)
				}
			}
			xhr.addEventListener('progress', progressHandler, false)
			xhr.open('GET', data.url)
			xhr.responseType = 'blob'
			xhr.send()
		})
	}

	/**
	 * Generate a new header for new recipients, based on an existing file header.
	 * @param {array} recipients - containing usernames of recipients to add.
	 * @param {string} id - of file.
	 * @param {function} callback - with header object and array of failed recipients.
	 */
	Peerio.file.generateNewHeader = function(recipients, id, callback) {
		var miniLockIDs = [Peerio.user.miniLockID]
		var failed = []
		var generateHeader = function() {
			var header = Peerio.user.files[id].header
			var decryptInfo = miniLock.crypto.decryptHeader(
				header, Peerio.user.keyPair.secretKey, Peerio.user.miniLockID
			)
			callback(
				miniLock.crypto.createHeader(
					miniLockIDs,
					Peerio.user.miniLockID,
					Peerio.user.keyPair.secretKey,
					nacl.util.decodeBase64(decryptInfo.fileInfo.fileKey),
					nacl.util.decodeBase64(decryptInfo.fileInfo.fileNonce),
					nacl.util.decodeBase64(decryptInfo.fileInfo.fileHash)
				),
				failed
			)
		}
		recipients.forEach(function(recipient) {
			if (
				({}).hasOwnProperty.call(Peerio.user.contacts, recipient) &&
				({}).hasOwnProperty.call(Peerio.user.contacts[recipient], 'miniLockID') &&
				(miniLockIDs.indexOf(Peerio.user.contacts[recipient].miniLockID) < 0)
			) {
				miniLockIDs.push(Peerio.user.contacts[recipient].miniLockID)
			}
			else if (recipient !== Peerio.user.username) {
				failed.push(recipient)
			}
		})
		generateHeader()
	}

	/**
	 * Get a file's extension.
	 * @param {string} fileName
	 * @return {string} extension - example: '.pdf'
	 */
	 Peerio.file.getFileExtension = function(fileName) {
	 	var extension = fileName.match(/\.\w+$/)
	 	if (!extension) {
	 		extension = ''
	 	}
	 	else {
	 		extension = extension[0]
	 	}
		return extension
	 }

	/**
	 * Truncate filenames that are too long for display in UI.
	 * @param {string} fileName
	 * @return {string} truncated
	 */
	 Peerio.file.truncateFileName = function(fileName) {
	 	if (fileName.length <= 36) {
	 		return fileName
	 	}
	 	var extension = Peerio.file.getFileExtension(fileName)
	 	fileName = fileName.substring(0, fileName.length - extension.length)
	 	return fileName.substring(0, 32) + '..' + extension
	 }

	/**
	 * Convert an integer from bytes into a readable file size.
	 * @param {number} bytes
	 * @return {string} fileSize
	 */
	Peerio.file.getReadableFileSize = function(bytes) {
		var KB = bytes / 1024
		var MB = KB	/ 1024
		var GB = MB	/ 1024
		if (KB < 1024) {
			return Math.ceil(KB) + 'KB'
		}
		else if (MB < 1024) {
			return (Math.round(MB * 10) / 10) + 'MB'
		}
		else {
			return (Math.round(GB * 10) / 10) + 'GB'
		}
	}

	/**
	 * Get a file's type and icon from its filename extension.
	 * @param {string} fileName
	 * @return {object} fileTypeInfo
	 */
	Peerio.file.getFileTypeFromName = function(fileName) {
		var extension = fileName.toLowerCase().match(/\.\w+$/)
		if (extension) {
			extension = extension[0].substring(1)
		}
		else {
			extension = ''
		}
		var types = [
			{
				type: 'archive',
				extensions: [
					'zip', 'rar', 'tar', 'gz',
					'7z', 'ace', 'cab', 'gzip'
				],
				icon: '&#xf1c6;'
			},
			{
				type: 'audio',
				extensions: [
					'mp3', 'm4a', 'aac', 'flac',
					'wav', 'ogg', 'wma', 'aiff',
					'3gp', 
				],
				icon: '&#xf1c7;'
			},
			{
				type: 'code',
				extensions: [
					'js', 'c', 'java', 'sh',
					'rb', 'clj', 'php', 'rake',
					'py', 'pl', 'cpp', 'cmd',
					'css', 'html', 'htm', 'xhtm',
					'xhtml', 'h', 'm', 'go'
				],
				icon: '&#xf1c9;'
			},
			{
				type: 'image',
				extensions: [
					'jpg', 'jpeg', 'png', 'bmp',
					'gif', 'tiff', 'psd'
				],
				icon: '&#xf1c5;'
			},
			{
				type: 'video',
				extensions: [
					'mp4', 'avi', 'wmv', 'webm',
					'mov', 'mkv', 'flv', 'ogv'
				],
				icon: '&#xf1c8;'
			},
			{
				type: 'pdf',
				extensions: [
					'pdf', 'xpdf', 'pdfx'
				],
				icon: '&#xf1c1;'
			},
			{
				type: 'word',
				extensions: [
					'doc', 'dot', 'docx', 'docm',
					'dotx', 'dotm', 'docb'
				],
				icon: '&#xf1c2;'
			},
			{
				type: 'excel',
				extensions: [
					'xls', 'xlt', 'xlm', 'xlsx',
					'xlsm', 'xltx', 'xltm'
				],
				icon: '&#xf1c3;'
			},
			{
				type: 'powerpoint',
				extensions: [
					'ppt', 'pot', 'pps', 'pptx',
					'pptm', 'potx', 'potm', 'ppam',
					'ppsx', 'ppsm', 'sldx', 'sldm'
				],
				icon: '&#xf1c4;'
			},
			{
				type: 'text',
				extensions: [
					'txt', 'rtf', 'text', 'md',
					'markdown'
				],
				icon: '&#xf0f6;'
			},
			{
				type: 'other',
				extensions: [''],
				icon: '&#xf016;'
			}
		]
		for (var i = 0; i < types.length; i++) {
			if (
				(types[i].extensions.indexOf(extension) >= 0) ||
				(types[i].type === 'other')
			) {
				return types[i]
			}
		}
	}

})()