// ---------------------
// Peerio.util
// ---------------------
//
// Peerio's utility object contains utility functions such as address parsing, etc.

Peerio.util = {};

(function() {
	'use strict';

	/**
	 * Convert UNIX timestamp to nicely formatted date and time.
	 * @param {number} timestamp
	 * @return {object} - With well-formatted date and time properties.
	 */
	Peerio.util.getDateFromTimestamp = function(timestamp) {
		var d = new Date(parseInt(timestamp))
		var date = d.getDate() + '/'
		date += (d.getMonth() + 1) + '/'
		date += d.getFullYear()
		var time = (function() {
			var hours = d.getHours()
			var minutes = d.getMinutes()
			var ampm = hours >= 12 ? 'PM' : 'AM'
			hours = hours % 12
			hours = hours ? hours : 12
			minutes = minutes < 10 ? '0' + minutes : minutes
			return hours + ':' + minutes +  ampm
		})()
		return {
			date: date,
			time: time
		}
	}

	/**
	 * When Uint8Arrays are stored using Peerio.storage, they get stored
	 * in a different object format. This function turns them back to Uin8tArrays.
	 * @param {object} obj
	 * @return {Uint8Array}
	 */
	Peerio.util.objectToUint8Array = function(obj) {
		var arr = []
		for (var i in obj) {
			if (({}).hasOwnProperty.call(obj, i)) {
				arr[i] = obj[i]
			}
		}
		return new Uint8Array(arr)
	}

	/**
	 * Parses an address and returns its type and parsed format.
	 * In the case of phone numbers, the number is stripped from any non-digits.
	 * @param {string} address - Address to parse.
	 * @return {object} {type:'email||phone', address:'parsed address'}
	 */
	Peerio.util.parseAddress = function(address) {
		var emailExp = new RegExp('^([-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\\.[a-zA-Z]{2,20})$')
		var phoneExp = new RegExp('^\\+?(\\d|\\s|\\-|\\(|\\)){6,20}$')
		if (emailExp.test(address)) {
			return {
				type: 'email',
				value: address.match(emailExp)[0]
			}
		}
		else if (phoneExp.test(address)) {
			var phone = address.match(phoneExp)[0].split('')
			for (var i = 0; i < phone.length; i++) {
				if (!phone[i].match(/\d/)) {
					phone.splice(i, 1)
				}
			}
			return {
				type: 'phone',
				value: phone.join('')
			}
		}
		else {
			return false
		}
	}
	
	/**
	 * Get a contacts's full name from their username.
	 * @param {string} username
	 * @return Full name.
	 */
	Peerio.util.getFullName = function(username) {
		if (username === Peerio.user.username) {
			return (
				Peerio.user.firstName + ' ' +
				Peerio.user.lastName
			)
		}
		if (
			({}).hasOwnProperty.call(Peerio.user.contacts, username) &&
			({}).hasOwnProperty.call(Peerio.user.contacts[username], 'firstName') &&
			({}).hasOwnProperty.call(Peerio.user.contacts[username], 'lastName')
		) {
			return (
				Peerio.user.contacts[username].firstName + ' ' +
				Peerio.user.contacts[username].lastName
			)
		}
		return username
	}

	/**
	 * Create a new TOFU object from the current contact list.
	 * Useful for comparing against existing TOFU object or storing new TOFU object.
	 * @return {object} TOFU
	 */
	Peerio.util.getNewTOFU = function() {
		var TOFU = {}
		for (var contact in Peerio.user.contacts) {
			if (({}).hasOwnProperty.call(Peerio.user.contacts, contact)) {
				TOFU[contact] = Peerio.user.contacts[contact].miniLockID
			}
		}
		return TOFU
	}

	/**
	 * Compares a given TOFU object to the current Peerio.user.contacts.
	 * Returns usernames that do not match and usernames that are not in TOFU object.
	 * @return {object} {notMatch, notFound}
	 */
	Peerio.util.compareTOFU = function(TOFU) {
		var notMatch = []
		var notFound = []
		for (var contact in Peerio.user.contacts) {
			if (({}).hasOwnProperty.call(Peerio.user.contacts, contact)) {
				if (!({}).hasOwnProperty.call(TOFU, contact)) {
					notFound.push(contact)
				}
				else if (
					(typeof(Peerio.user.contacts[contact].miniLockID) === 'string') &&
					(Peerio.user.contacts[contact].miniLockID.length > 0) &&
					(typeof(TOFU[contact]) === 'string') &&
					(TOFU[contact].length > 0) &&
					(Peerio.user.contacts[contact].miniLockID !== TOFU[contact])
				) {
					notMatch.push(contact)
				}
			}
		}
		return {
			notMatch: notMatch,
			notFound: notFound
		}
	}

})()