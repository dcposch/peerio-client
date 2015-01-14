// ---------------------
// Peerio.network
// ---------------------
//
// Peerio's network object contains functions that allow Peerio to interface
// with the Peerio Server Application via network calls over WebSockets.

'use strict';
Peerio.network = {};

/**
 * Asks the server to validate a username.
 * @param {string}   username - Username to validate.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.validateUsername = function(username, callback) {
	if (!username) { return false }
	Peerio.socket.emit('validateUsername', {
		username: username
	}, callback)
}

/**
 * Asks the server to validate an address.
 * @param {string}   address  - Address to validate.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.validateAddress = function(address, callback) {
	var parsed = Peerio.util.parseAddress(address)
	if (!parsed) { return false }
	Peerio.socket.emit('validateAddress', {
		address: parsed
	}, callback)
}

/**
 * Begins an account registration challenge with the server.
 * @param {object} accountInfo - Contains account information.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.registerAccount = function(accountInfo, callback) {
	Peerio.socket.emit('registrationRequest', accountInfo, callback)
}

/**
 * Begins an account registration challenge with the server.
 * @param {object} accountInfo - Contains account information.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.returnAccountCreationToken = function(decryptedToken, callback) {
	Peerio.socket.emit('accountCreationResponse', {
		accountCreationToken: decryptedToken
	}, callback)
}

/**
 * Send back an account confirmation code for the user's email/phone number.
 * @param {number} confirmationCode - 8 digit number.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.sendAccountConfirmation = function(confirmationCode, callback) {
	Peerio.socket.emit('accountConfirmation', {
		username: Peerio.user.username,
		confirmationCode: confirmationCode
	}, callback)
}

/**
 * Send a request for authTokens.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getAuthTokens = function(callback) {
	Peerio.socket.emit('authTokenRequest', {
		username: Peerio.user.username,
		miniLockID: Peerio.user.miniLockID,
		//version: Peerio.config.version
	}, callback)
}

/**
 * Get user settings and some personal data. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getSettings = function(callback) {
	Peerio.socket.emit('getSettings', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Change settings. Uses an authtoken.
 * @param {object} settingsObject - With the optional parameters of:
 *	twoFactorAuth, firstName, lastName, sendReadReceipts, localeCode, receiveMessageNotifications
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.updateSettings = function(settingsObject, callback) {
	settingsObject.authToken = Peerio.user.popAuthToken()
	Peerio.socket.emit('updateSettings', settingsObject, callback)
}

/**
 * Add a new user address. Uses an authtoken.
 * @param {string} address
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.addAddress = function(address, callback) {
	address = Peerio.util.parseAddress(address)
	if (!address) { return false }
	Peerio.socket.emit('addAddress', {
		address: address,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Confirms an address using confirmation code. Uses an authToken.
 * @param {string} address
 * @param {string} code
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.confirmAddress = function(address, code, callback) {
	address = Peerio.util.parseAddress(address)
	if (!address) { return false }
	Peerio.socket.emit('confirmAddress', {
		address: {
			value: address.value
		},
		confirmationCode: code,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Sets an adddress as the primary address. Uses an authToken.
 * @param {string} address
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.setPrimaryAddress = function(address, callback) {
	address = Peerio.util.parseAddress(address)
	if (!address) { return false }
	Peerio.socket.emit('setPrimaryAddress', {
		address: {
			value: address.value
		},
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Removes an address from user's account. Uses an authToken.
 * @param {string} address
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.removeAddress = function(address, callback) {
	address = Peerio.util.parseAddress(address)
	if (!address) { return false }
	Peerio.socket.emit('removeAddress', {
		address: {
			value: address.value
		},
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Gets a miniLock ID for a user.  Uses an authToken.
 * @param {string} username
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getMiniLockID = function(username, callback) {
	Peerio.socket.emit('getMiniLockID', {
		username: username,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieves all contacts for the user. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getContacts = function(callback) {
	Peerio.socket.emit('getContacts', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieves all sent contact requests. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getSentContactRequests = function(callback) {
	Peerio.socket.emit('getSentContactRequests', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieves all received contact requests. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getReceivedContactRequests = function(callback) {
	Peerio.socket.emit('getReceivedContactRequests', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieves all received contact requests. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getReceivedContactRequests = function(callback) {
	Peerio.socket.emit('getReceivedContactRequests', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieves a Peerio username from an address. Uses an authToken.
 * @param {string} address
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.addressLookup = function(address, callback) {
	address = Peerio.util.parseAddress(address)
	if (!address) { return false }
	Peerio.socket.emit('addressLookup', {
		address: address,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Sends a contact request to a username. Uses an authToken.
 * @param {array} contacts - Contains objects which either have a `username` or `address` property
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.addContact = function(contacts, callback) {
	Peerio.socket.emit('addContact', {
		contacts: contacts,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Cancel a contact request previously sent to a username. Uses an authToken.
 * @param {string} username
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.cancelContactRequest = function(username, callback) {
	Peerio.socket.emit('cancelContactRequest', {
		username: username,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Accept a contact request from a username. Uses an authToken.
 * @param {string} username
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.acceptContactRequest = function(username, callback) {
	Peerio.socket.emit('acceptContactRequest', {
		username: username,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Decline a contact request from a username. Uses an authToken.
 * @param {string} username
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.declineContactRequest = function(username, callback) {
	Peerio.socket.emit('declineContactRequest', {
		username: username,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Removes a username as a contact. Uses an authToken.
 * @param {string} username
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.removeContact = function(username, callback) {
	Peerio.socket.emit('removeContact', {
		username: username,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Send a Peerio invitation to an address. Uses an authToken.
 * @param {string} address
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.inviteUserAddress = function(address, callback) {
	address = Peerio.util.parseAddress(address)
	if (!address) { return false }
	Peerio.socket.emit('inviteUserAddress', {
		address: address,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Send a Peerio message to contacts. Uses an authToken.
 * @param {string} createMessageObject - created with Peerio.message.new.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.createMessage = function(messageObject, callback) {
	var socketMsg = {
		isDraft: messageObject.isDraft,
		recipients: messageObject.recipients,
		header: messageObject.header,
		body: messageObject.body,
		files: messageObject.files,
		authToken: Peerio.user.popAuthToken()
	}
	if (({}).hasOwnProperty.call(messageObject, 'conversationID')) {
		socketMsg.conversationID = messageObject.conversationID
	}
	Peerio.socket.emit('createMessage', socketMsg, callback)
}

/**
 * Retrieve a list of all user messages. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getAllMessages = function(callback) {
	Peerio.socket.emit('getAllMessages', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieve a message by its ID. Uses an authToken.
 * @param {array} ids - Array of all message IDs.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getMessages = function(ids, callback) {
	Peerio.socket.emit('getMessages', {
		ids: ids,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieve a list of all user message IDs. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getMessageIDs = function(callback) {
	Peerio.socket.emit('getMessageIDs', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieve a list of all unopened/modified IDs. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getModifiedMessageIDs = function(callback) {
	Peerio.socket.emit('getModifiedMessageIDs', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieve list of conversation IDs only. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getConversationIDs = function(callback) {
	Peerio.socket.emit('getConversationIDs', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieve list of conversations. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getAllConversations = function(callback) {
	Peerio.socket.emit('getAllConversations', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieve entire conversations. Uses an authToken.
 * @param {array} conversations - Contains objects in format {id, page}
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getConversationPages = function(conversations, callback) {
	Peerio.socket.emit('getConversationPages', {
		conversations: conversations,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Mark a message as read. Uses an authToken.
 * @param {array} read - array containing {id, encryptedReturnReceipt} objects
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.readMessages = function(read, callback) {
	Peerio.socket.emit('readMessages', {
		read: read,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Remove a conversation and optionally also remove files. Uses an authToken.
 * @param {string} id
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.removeConversation = function(id, callback) {
	Peerio.socket.emit('removeConversation', {
		id: id,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Initiate a file upload. Uses an authToken.
 * @param {object} uploadFileObject - containing:
 	{object} header,
 	{string} ciphertext,
 	{number} totalChunks,
 	{string} clientFileID,
 	{string} parentFolder (optional)
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.uploadFile = function(uploadFileObject, callback) {
	uploadFileObject.authToken = Peerio.user.popAuthToken()
	Peerio.socket.emit('uploadFile', uploadFileObject, callback)
}

/**
 * Uploads a file chunk. Uses an authToken.
 * @param {object} chunkObject - containing:
 	{string} ciphertext,
 	{number} chunkNumber,
 	{string} clientFileID,
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.uploadFileChunk = function(chunkObject, callback) {
	chunkObject.authToken = Peerio.user.popAuthToken()
	Peerio.socket.emit('uploadFileChunk', chunkObject, callback)
}

/**
 * Retrieve information about a single file.
 * @param {string} id
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getFile = function(id, callback) {
	Peerio.socket.emit('getFile', {
		id: id,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieve a list of all user files. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.getFiles = function(callback) {
	Peerio.socket.emit('getFiles', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Retrieve file download information. Uses an authToken.
 * @param {string} id
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.downloadFile = function(id, callback) {
	Peerio.socket.emit('downloadFile', {
		id: id,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Delete a file. Uses an authToken.
 * @param {string} id
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.removeFile = function(id, callback) {
	Peerio.socket.emit('removeFile', {
		id: id,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Nuke a file. Uses an authToken.
 * @param {string} id
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.nukeFile = function(id, callback) {
	Peerio.socket.emit('nukeFile', {
		id: id,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Set up 2FA. Returns a TOTP shared secret. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.setUp2FA = function(callback) {
	Peerio.socket.emit('setUp2FA', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Confirm 2FA. Send a code to confirm the shared secret.
 * @param {number} code
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.confirm2FA = function(code, callback) {
	Peerio.socket.emit('confirm2FA', {
		twoFACode: code,
		authToken: Peerio.user.popAuthToken()
	}, callback)
}

/**
 * Generic 2FA. Send a code to auth.
 * @param {number} code
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.validate2FA = function(code, callback) {
	Peerio.socket.emit('validate2FA', {
		twoFACode: code,
		username: Peerio.user.username,
		miniLockID: Peerio.user.miniLockID
	}, callback)
}

/**
 * Delete account. Uses an authToken.
 * @param {function} callback - Callback function with server data.
 */
Peerio.network.closeAccount = function(callback) {
	Peerio.socket.emit('closeAccount', {
		authToken: Peerio.user.popAuthToken()
	}, callback)
}