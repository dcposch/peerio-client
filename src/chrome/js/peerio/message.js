// ---------------------
// Peerio.message
// ---------------------
//
// Peerio's message object contains functions and information
// regarding the sending and management of messages.


Peerio.message = {};

(function() {
	'use strict';

	/**
	 * Given a string, match it to a contact.
	 * Useful for the "To" input field in the New Message modal.
	 * @param {string} input
	 * @return {array}
	 */
	Peerio.message.toAutocomplete = function(input) {
		var result = []
		if (!input) {
			return result
		}
		var exp = new RegExp('^' + input, 'i')
		for (var i in Peerio.user.contacts) {
			if (
				({}).hasOwnProperty.call(Peerio.user.contacts, i) &&
				!Peerio.user.contacts[i].isRequest &&
				!Peerio.user.contacts[i].isDeleted
			) {
				var contact = Peerio.user.contacts[i]
				if (
					contact.username.match(exp) ||
					contact.firstName.match(exp) ||
					contact.lastName.match(exp) ||
					contact.primaryAddress.match(exp)
				) {
					result.push(contact)
				}
				else {
					for (var a = 0; a < contact.addresses.length; a++) {
						if (contact.addresses[a].value.match(exp)) {
							result.push(contact)
							break
						}
					}
				}
			}
		}
		return result
	}

	/**
	 * Creates an encrypted message ready to be sent via Peerio.network.createMessage.
	 * @param {object) messageInfo - {
	 *  isDraft: Boolean indicating if message is draft,
	 *  recipients: Array of recipient usernames,
	 *  subject: Message subject (String),
	 *  body: Message body (String),
	 *  conversationID: Conversation ID of message, optional (String),
	 *  fileIDs: Array of file IDs of attached files,
	 *  sequence: Message sequence number in thread
	 * }
	 * @param {function} callback - Returns with object ready for Peerio.network.createMessage.
	 */
	Peerio.message.new = function(messageInfo, callback) {
		var createMessage = function() {
			var message = {
				subject: messageInfo.subject,
				message: messageInfo.body,
				receipt: nacl.util.encodeBase64(nacl.randomBytes(32)),
				fileIDs: messageInfo.fileIDs,
				ack: 'deprecated',
				participants: messageInfo.recipients,
				sequence: messageInfo.sequence
			}
			var encryptRecipients = messageInfo.recipients
			if (messageInfo.isDraft) {
				encryptRecipients = [Peerio.user.username]
			}
			Peerio.crypto.encryptMessage(
				message,
				encryptRecipients,
				function(header, body, failed) {
					if (!header || !body) {
						if (typeof(callback) === 'function') {
							callback(false)
						}
					}
					var messageObject = {
						isDraft: messageInfo.isDraft,
						recipients: messageInfo.recipients,
						header: header,
						body: body,
						files: files
					}
					if (({}).hasOwnProperty.call(messageInfo, 'conversationID')) {
						messageObject.conversationID = messageInfo.conversationID
					}
					if (typeof(callback) === 'function') {
						callback(messageObject, failed)
					}
				}
			)
		}
		var files = []
		if (!messageInfo.fileIDs.length) {
			createMessage()
		}
		messageInfo.fileIDs.forEach(function(fileID) {
			Peerio.file.generateNewHeader(
				messageInfo.recipients,
				fileID,
				function(header) {
					files.push({
						id: fileID,
						header: header
					})
					if (files.length === messageInfo.fileIDs.length) {
						createMessage()
					}
				}
			)
		})
	}

	/**
	 * Retrieve and organize a single thread.
	 * Progresively adds decrypted messages to Peerio.user.conversations[id].messages.
	 * @param {string} id - Conversation ID
	 * @param {boolean} getOnlyLastTenMessages - if false, gets all messages *except* last ten.
	 * @param {function} onComplete
	 */
	Peerio.message.getConversationPages = function(id, getOnlyLastTenMessages, onComplete) {
		var decryptedCount = 0
		var keys = []
		var page = getOnlyLastTenMessages? 0 : 1
		var beginDecrypt = function(data) {
			for (var message in data.conversations[id].messages) {
				if (({}).hasOwnProperty.call(data.conversations[id].messages, message)) {
					Peerio.user.conversations[id].messages[message] = data.conversations[id].messages[message]
				}
			}
			Peerio.user.conversations[id].messageCount = data.conversations[id].messageCount
			keys = keys.concat(data.conversations[id].pagination.messageOrder)
			decryptMessage(data.conversations[id].messages[keys[decryptedCount]])
		}
		var decryptMessage = function(message) {
			Peerio.crypto.decryptMessage(message, function(decrypted) {
				Peerio.user.conversations[id].messages[message.id].decrypted = decrypted
				decryptedCount++
				if (decryptedCount === keys.length) {
					if (typeof(onComplete) === 'function') {
						onComplete(Peerio.user.conversations[id])
					}
				}
				else {
					decryptMessage(Peerio.user.conversations[id].messages[keys[decryptedCount]])
				}
			})
		}
		Peerio.network.getConversationPages([
			{
				id: id,
				page: page
			}
		], function(data) {
			if (!({}).hasOwnProperty.call(data.conversations, id)) {
				onComplete(false)
				return false
			}
			if (!({}).hasOwnProperty.call(Peerio.user.conversations, id)) {
				Peerio.user.conversations[id] = data.conversations[id]
				Peerio.network.getMessages([data.conversations[id].original], function(original) {
					Peerio.user.conversations[id].original = original.messages[data.conversations[id].original]
					Peerio.user.conversations[id].messages[Peerio.user.conversations[id].original.id] = Peerio.user.conversations[id].original
					keys.push(Peerio.user.conversations[id].original.id)
					beginDecrypt(data)
				})
			}
			else {
				beginDecrypt(data)
			}
		})
	}

	/**
	 * Mark message(s) as read, send read receipt(s) if applicable.
	 * @param {array} read - filled with objects each containing {id, receipt, sender}
	 * @param {function} callback
	 */
	Peerio.message.readMessages = function(read, callback) {
		var encryptedRead = []
		var pushEncryptedReceipt = function(message) {
			var receipt = message.receipt.toString() + Date.now()
			var nonce = miniLock.crypto.getNonce()
			receipt = nacl.box(
				nacl.util.decodeUTF8(receipt),
				nonce,
				Peerio.crypto.getPublicKeyFromMiniLockID(message.senderID),
				Peerio.user.keyPair.secretKey
			)
			receipt = nacl.util.encodeBase64(receipt) + ':' + nacl.util.encodeBase64(nonce)
			encryptedRead.push({
				id: message.id,
				encryptedReturnReceipt: receipt
			})
			if (encryptedRead.length === read.length) {
				Peerio.network.readMessages(encryptedRead, callback)
			}
		}
		read.forEach(function(message) {
			if (message.sender === Peerio.user.username) {
				message.senderID = Peerio.user.miniLockID
			}
			else if (
				({}).hasOwnProperty.call(Peerio.user.contacts, message.sender) &&
				({}).hasOwnProperty.call(Peerio.user.contacts[message.sender], 'miniLockID')
			) {
				message.senderID = Peerio.user.contacts[message.sender].miniLockID
			}
			pushEncryptedReceipt(message)
		})
	}

	/**
	 * Compare return receipts and return if they match.
	 * @param {string} original - Original receipt, Base64 string
	 * @param {object} recipient - object for particular recipient from message.recipients
	 * @return {boolean} Whether receipts match.
	 */
	Peerio.message.checkReceipt = function(original, recipient) {
		if (
			(typeof(recipient.receipt.encryptedReturnReceipt) !== 'string') ||
			(recipient.receipt.encryptedReturnReceipt.length < 16)
		) {
			return false
		}
		var encryptedReturnReceipt = recipient.receipt.encryptedReturnReceipt.split(':')
		if (
			(encryptedReturnReceipt.length !== 2) ||
			(typeof(encryptedReturnReceipt) !== 'object')
		) {
			return false
		}
		if (({}).hasOwnProperty.call(Peerio.user.contacts, recipient.username)) {
			var decrypted = nacl.box.open(
				nacl.util.decodeBase64(encryptedReturnReceipt[0]),
				nacl.util.decodeBase64(encryptedReturnReceipt[1]),
				Peerio.crypto.getPublicKeyFromMiniLockID(
					Peerio.user.contacts[recipient.username].miniLockID
				),
				Peerio.user.keyPair.secretKey
			)
			if (!decrypted) {
				return false
			}
			decrypted = nacl.util.encodeUTF8(decrypted)
			decrypted = decrypted.substring(0, decrypted.length - 13)
			if (decrypted === original) {
				return true
			}
			else {
				return false
			}
		}
		else {
			return false
		}
	}

	/**
	 * Retrieve and organize original conversations.
	 * Update locally stored conversations object for user.
	 * @param {function} callback
	 * @param {object} conversations - Optionally, pass a pre-fetched conversations object to decrypt that instead.
	 */
	Peerio.message.getAllConversations = function(callback, conversations) {
		var keys = []
		var decryptedCount = 0
		var addConversation = function(conversation) {
			conversation.original = conversation.messages[conversation.original]
			Peerio.crypto.decryptMessage(conversation.original, function(decrypted) {
				if (decrypted.sequence === 0) {
					conversation.original.decrypted = decrypted
				}
				else if (
					({}).hasOwnProperty.call(conversation, 'original') &&
					conversation.original
				) {
					conversation.original.decrypted = false
				}
				if (({}).hasOwnProperty.call(Peerio.user.conversations, conversation.id)) {
					Peerio.user.conversations[conversation.id].lastTimestamp = conversation.lastTimestamp
					Peerio.user.conversations[conversation.id].events        = conversation.events
					Peerio.user.conversations[conversation.id].participants  = conversation.participants
				}
				else {
					Peerio.user.conversations[conversation.id] = conversation
				}
				decryptedCount++
				if (decryptedCount === keys.length) {
					if (typeof(callback) === 'function') {
						callback(conversations)
					}
				}
				else {
					addConversation(conversations[keys[decryptedCount]])
				}
			})
		}
		if (conversations) {
			Peerio.network.getConversationIDs(function(IDs) {
				if (({}).hasOwnProperty.call(IDs, 'conversationID')) {
					IDs = IDs.conversationID
					var missingConversations = []
					IDs.forEach(function(ID) {
						if (!({}).hasOwnProperty.call(conversations, ID)) {
							missingConversations.push(ID)
						}
					})
					missingConversations.forEach(function(missingConversation) {
						console.log('Missing conversations detected')
						console.log(missingConversation)
						Peerio.message.getConversationPages(missingConversation, true, function() {})
					})
					for (var i in conversations) {
						if (
							({}).hasOwnProperty.call(conversations, i) &&
							(IDs.indexOf(i) < 0)
						) {
							delete conversations[i]
						}
					}
					delete conversations._id
					delete conversations._rev
					keys = Object.keys(conversations)
					if (!keys.length) {
						if (typeof(callback) === 'function') {
							callback({})
						}
					}
					else {
						addConversation(conversations[keys[decryptedCount]])
					}
				}
			})
		}
		else {
			conversations = {}
			Peerio.network.getAllConversations(function(data) {
				Peerio.storage.db.get('conversations', function(err, old) {
					Peerio.storage.db.remove(old, function() {
						conversations = data.conversations
						conversations._id = 'conversations'
						console.log('Storing new conversation cache')
						Peerio.storage.db.put(conversations, function() {
							delete conversations._id
							keys = Object.keys(conversations)
							if (!keys.length) {
								if (typeof(callback) === 'function') {
									callback({})
								}
							}
							else {
								addConversation(conversations[keys[decryptedCount]])
							}
						})
					})
				})
			})
		}
	}

	/**
	 * Retrieve messages by their IDs and decrypt them.
	 * Also adds ephemeral keys to Peerio.user.ephemerals.
	 * @param {array} ids
	 * @param {function} callback
	 */
	 Peerio.message.getMessages = function(ids, callback) {
		Peerio.network.getMessages(ids, function(data) {
			var keys = Object.keys(data.messages)
			var decryptNextMessage = function(count) {
				var message = data.messages[keys[count]]
				Peerio.crypto.decryptMessage(message, function(decrypted) {
					message.decrypted = decrypted
					count++
					if (({}).hasOwnProperty.call(message.decrypted, 'fileIDs')) {
						Peerio.file.getFile(message.decrypted.fileIDs, function(fileData) {
							for (var file in fileData) {
								if (({}).hasOwnProperty.call(fileData, file)) {
									if (fileData[file] === 'error') {
										message.decrypted.fileIDs.splice(
											message.decrypted.fileIDs.indexOf(file), 1
										)
									}
									else {
										Peerio.user.files[file] = fileData[file]
									}
								}
							}
							if (count === keys.length) {
								callback(data)
							}
							else {
								decryptNextMessage(count)
							}
						})
					}
					else {
						if (count === keys.length) {
							callback(data)
						}
						else {
							decryptNextMessage(count)
						}
					}
				})
			}
			decryptNextMessage(0)
		})
	 }

	/**
	 * Retrieve unopened/modified messages.
	 * @param {function} callback
	 */
	Peerio.message.getModifiedMessages = function(callback) {
		var modified = []
		Peerio.network.getModifiedMessageIDs(function(IDs) {
			if (
				(typeof(IDs) !== 'object') ||
				({}).hasOwnProperty.call(IDs, 'error') ||
				!({}).hasOwnProperty.call(IDs, 'messageIDs') ||
				(typeof(IDs.messageIDs) !== 'object') ||
				!IDs.messageIDs.length
			) {
				callback(modified)
				return false
			}
			IDs = IDs.messageIDs
			var undownloadedIDs = []
			for (var i = 0; i < IDs.length; i++) {
				undownloadedIDs.push(IDs[i])
			}
			if (!undownloadedIDs.length) {
				if (typeof(callback) === 'function') {
					callback(modified)
				}
				return false
			}
			console.log(undownloadedIDs)
			Peerio.message.getMessages(undownloadedIDs, function(messages) {
				messages = messages.messages
				for (var i in messages) {
					if (({}).hasOwnProperty.call(messages, i)) {
						modified.push(messages[i])
					}
				}
				callback(modified)
			})
		})
	}

})()