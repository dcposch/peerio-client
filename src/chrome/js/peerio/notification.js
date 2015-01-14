// ---------------------
// Peerio.notification
// ---------------------
//
// Peerio's notification object interface with various notification adapters
// in order to provide notifications on various platforms.
//
// Currently supported platforms:
// Chrome Apps (chrome.notifications)

Peerio.notification = {};

(function() {
	'use strict';

	var notificationAdapters = {}

	notificationAdapters.chrome = {
		show: function(notificationID, info, callback) {
			chrome.notifications.create(
				notificationID,
				{
					type: 'basic',
					iconUrl: 'img/notification.png',
					title: info.title,
					message: info.message,
					contextMessage: info.contextMessage
				},
				function() {
					if (typeof(callback) === 'function') {
						callback(notificationID)
					}
				}
			)
		},
		update: function(notificationID, progress, callback) {
			chrome.notifications.update(notificationID,
				{
					progress: progress
				},
				function() {
					if (typeof(callback) === 'function') {
						callback(notificationID)
					}
				}
			)
		},
		clear: function(notificationID, callback) {
			chrome.notifications.clear(notificationID,
				function() {
					if (typeof(callback) === 'function') {
						callback(notificationID)
					}
				}
			)
		},
		getPermission: function() {
			return true
		}
	}

	notificationAdapters.nodeWebkit = {
		show: function(notificationID, info, callback) {
			var notifier = require('node-notifier')
			var path = require('path')
			var execPath = path.dirname(process.execPath)
			notifier.notify({
				'title': info.title,
				'subtitle': info.contextMessage,
				'message': info.message,
				'sound': false,
				'icon':  execPath + '/notification.png',
				'contentImage': execPath + '/notification.png',
				'wait': true
			}, function() {
				if (typeof(callback) === 'function') {
					callback(notificationID)
				}
			})
			notifier.on('click', function() {
				window.focus()
				var conversationID = notificationID.match(/^\w{16,32}/)[0]
				Peerio.UI.selectConversation(conversationID)
			})
		},
		update: function() {
		},
		clear: function() {
		},
		getPermission: function() {
			return true
		}
	}

	notificationAdapters.phonegap = {
		show: function() {
		},
		update: function() {
		},
		clear: function() {
		},
		getPermission: function() {
			return true
		}
	}

	Peerio.notification.adapter = (function() {
		if (typeof(require) === 'function') {
			return notificationAdapters.nodeWebkit
		}
		else if (
			typeof(chrome) === 'object' &&
			typeof(chrome.notifications) === 'object'
		) {
			chrome.notifications.onClicked.addListener(function(notificationID) {
				(chrome.app.window.current()).focus()
				var conversationID = notificationID.match(/^\w{16,32}/)[0]
				Peerio.UI.selectConversation(conversationID)
			})
			return notificationAdapters.chrome
		}
		else {
			return notificationAdapters.phonegap
		}
	})()

	Peerio.notification.sounds = {
		sending: new Audio('snd/sending.ogg'),
		sent: new Audio('snd/sent.ogg'),
		received: new Audio('snd/received.ogg'),
		destroy: new Audio('snd/destroy.ogg'),
		ack: new Audio('snd/ack.ogg')
	}

	/**
	 * Show a notification.
	 * @param notificationID
	 * @param {object} info - contains title, message and contextMessage properties
	 * @param {function} callback
	 */
	Peerio.notification.show = function(notificationID, info, callback) {
		Peerio.notification.adapter.show(notificationID, info, callback)
	}

	/**
	 * Update a notification's progress bar.
	 * @param {string} notificationID
	 * @param {number} progress - between 0 and 100
	 * @param {function} callback - returns with notificationID
	 */
	Peerio.notification.update = function(notificationID, progress, callback) {
		Peerio.notification.adapter.update(notificationID, progress, callback)
	}

	/**
	 * Clear a notification.
	 * @param {string} notificationID
	 * @param {function} callback
	 */
	Peerio.notification.clear = function(notificationID, callback) {
		Peerio.notification.clear(notificationID, callback)
	}

	/**
	 * Checks for/asks for permission to show notifications.
	 */
	Peerio.notification.getPermission = function() {
		Peerio.notification.adapter.getPermission()
	}

	/**
	 * Play a sound.
	 * @param {string} sound - Sound name: 'sent', 'received' or 'destroy'
	 */
	Peerio.notification.playSound = function(sound) {
		Peerio.notification.sounds[sound].src = 'snd/' + sound + '.ogg'
		Peerio.notification.sounds[sound].load()
		Peerio.notification.sounds[sound].volume = 1
		Peerio.notification.sounds[sound].play()
	}

})()