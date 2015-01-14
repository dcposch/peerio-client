'use strict';

importScripts('../lib/socket.js')

var mySocket = (function() {
	var serverList = [
		'https://bubblegum.peerio.com:443',
		'https://iceking.peerio.com:443',
		'https://lsp.peerio.com:443'
	]

	var secureRandom = function() {
		var result = '0.'
		var buffer = new Uint8Array(32)
		crypto.getRandomValues(buffer)
		for (var i = 0; i < buffer.length; i++) {
			if (buffer[i] > 249) {
				continue
			}
			result += (buffer[i] % 10).toString()
		}
		return parseFloat(result)
	}
	
	var server = serverList[Math.floor(secureRandom() * serverList.length)]

	return io.connect(server, { transports: ['websocket'] })
}());

onmessage = function(message) {
	message = message.data
	mySocket.emit(message.name, message.content, function(data) {
		postMessage({
			callbackID: message.callbackID,
			data: data
		})
	})
}

mySocket.on('receivedContactRequestsAvailable', function() {
	postMessage({
		received: 'receivedContactRequestsAvailable'
	})
})

mySocket.on('modifiedMessagesAvailable', function() {
	postMessage({
		received: 'modifiedMessagesAvailable'
	})
})

mySocket.on('modifiedConversationsAvailable', function() {
	postMessage({
		received: 'modifiedConversationsAvailable'
	})
})

mySocket.on('newContactsAvailable', function() {
	postMessage({
		received: 'newContactsAvailable'
	})
})

mySocket.on('sentContactRequestsAvailable', function() {
	postMessage({
		received: 'sentContactRequestsAvailable'
	})
})

mySocket.on('contactsAvailable', function() {
	postMessage({
		received: 'contactsAvailable'
	})
})

mySocket.on('connect_error', function() {
	postMessage({
		received: 'error'
	})
})

mySocket.on('reconnecting', function() {
	postMessage({
		received: 'reconnecting'
	})	
})

mySocket.on('reconnect', function() {
	postMessage({
		received: 'reconnect'
	})
})