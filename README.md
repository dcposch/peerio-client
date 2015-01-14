#Peerio Specification

##A. Cryptographic Functionality (Client)

###0. Definitions

**Ephemeral Peerio Server Keypair**: A miniLock key pair used by the Peerio Server Application in order to issue authentication challenges. It is ephemeral and the Peerio Server Application will regenerate it every 24 hours. We will refer to this value as `ephemeralServerKeys` and to the miniLock ID as the `ephemeralServerID`.

**Authentication Challenge**: A challenge performed in order for the client to receive an authentication token from the server.

1. Client sends an authentication token request which includes their Peerio username and miniLock ID.
2. Server checks if the given miniLock ID matches the one it has on record for that username. If the check fails, we issue an error and the request fails.
3. Server generates a 32-byte value `authToken`. The first two bytes of an `authToken` are always `0x41, 0x54`, followed by 30 random bytes.
4. Server encrypts `authToken` with the `nacl.box` construction using their `ephemeralServerKeys` secret key and the client's miniLock ID.
5. Server sends `authToken`, the `nonce` used to encrypt the `authToken`, and `ephemeralServerID` to the client.
6. The client decrypts `authToken`. If the decryption is successful, the client may now use `authToken` as an authentication token to submit a request.

Note that the server must limit the number of issued `authToken` to a particular user to a maximum of _1024 at a time_. An authentication token is only valid for _a single authenticated request_. The server keeps track of which `authToken`s are tied to which users.

**Account Creation Challenge**: Similar to the Authentication Challenge, but used for creating a new account:

1. Client sends an authentication token request which includes their desired Peerio username, a miniLock ID, their full name, email and other information.
2. Server checks for irregularities (invalid username, email is already registered, etc.). If there are irregularities, we issue an error and the request fails.
3. Server generates a 32-byte value `accountCreationToken`. The first two bytes of an `authToken` are always `0x41, 0x43`, followed by 30 random bytes.
4. Server encrypts `accountCreationToken` with the `nacl.box` construction using their `ephemeralServerKeys` secret key and the client's miniLock ID.
5. Server sends `accountCreationToken`, the `nonce` used to encrypt the `accountCreationToken`, and `ephemeralServerID` to the client.
6. The client decrypts `accountCreationToken`. If the decryption is successful, the client sends the decrypted `accountCreationToken` back to the server.
7. When the server receives the appropriate decrypted token, it creates the account and returns the successful account creation information to the user.

The decrypted `accountCreationToken` provided by this challenge is a special token that can only be used for account creation.

###1. Key Generation (Login/Signup)
When a Peerio user creates an account, their email and passphrase are used to generate a miniLock key pair using the miniLock specification and per the miniLock restrictions on passphrase quality.

Once a key pair is generated, the account is registered via the *Account Creation Challenge* procedure.

The private key is never stored anywhere outside of the current client session. Instead, the login process involves the user entering their email and passphrase every time they launch the client. The client generates the miniLock key pair accordingly, and then can use that key pair to interface with the server via *Authentication Challenges*.

Notice that this gives us a stateless authentication system: there is no "logged in" state and no "logged out" state. Once the user enters their email and passphrase on the client and obtain a miniLock ID, the client performs one *Authentication Challenge* to verify login and then statelessly performs *Authentication Challenges* for every following server request (send a message, receive a file, etc.) without the server allowing an extended "login" privilege.

###2. Key Lookup
A Peerio user can request another Peerio user's miniLock ID from the server using an `authToken`. In order to provide authentication, the Peerio interface can display some sort of authentication vector (the miniLock ID itself, a fingerprint, a visual representation, etc.). See §A.7 for notes on how a user changing their passphrase also changes their miniLock ID and authentication vector.

###3. Storing a File
A Peerio user can choose to store a file in their personal account without necessarily sending it to others. We must encrypt and upload the file to be stored.

#### File Encryption
1. The sender encrypts the file to themselves using a regular miniLock file encryption operation.
2. The encrypted file is uploaded to the Peerio server.
3. The Peerio server stores the file's miniLock header along with a copy of the ciphertext's first 256 bytes (the `fileName` bytes) locally.
4. The Peerio server stores the file's ciphertext in a `https`-accessible storage area (it is recommended that the storage area be secure, access-controlled and that the file be stored with a random filename).
5. The URL for accessing the ciphertext is returned to the client.

###4. Sending a Peerio Message
Messages are encrypted using the miniLock protocol.

A Peerio message plaintext consists of:
* A message subject (Between 1 and 128 characters).
* A message body.
* Message receipt proofs (discussed below).
* File attachments (optional).

####File Attachments
If the sender is sending a file that **has not** already been uploaded to their storage, we first follow the steps in §A.3.

If the file is now in the user's storage, we must modify the header to accommodate the file's new intended recipients. We create a new header for the file, adding the intended recipients while not changing the pre-existing `fileKey`. The ciphertext can therefore remain the same.

####Plaintext Format
Once the above procedure has been carried out for every file attachment, we format the message plaintext as the following JSON object:

```javascript
{
	subject: 'Subject goes here (String)',
	message: 'Message goes here (String)',
	receipt: 'Random 32 bytes (Base64 String)',
	fileIDs: [
		'ID of attached file (String)'
	],
	participants: [
		'Usernames of conversation participants. This is useful when defined in the first message in a conversation, as it allows clients to check against the server later arbitrarily adding unwanted participants.'
	]
	sequence: 'Sequence number of message in thread. Used to detect reorder/replay/drops (starts at 0) (Number)'
}
```

The above formatted JSON is then stringified and encrypted using the regular miniLock protocol. The sender uses their miniLock private key and the miniLock IDs of the recipient(s).

####About the `receipt` value
Peerio includes a feature called "message receipts" which allows the sender to be notified when a recipient has read their message. In the plaintext JSON, the `receipt` value is part of a challenge that is used in order to prevent a malicious Peerio server from faking a positive status indicating that the user has read the message.

The recipient can communicate a token to the sender proving that they have indeed read the message using the following procedure:

1. The recipient appends the current UNIX time to the `receipt` value and encrypts the result to the Curve25519 public key of the sender (derived from their miniLock ID) using the `nacl.box` construction. We call the resulting encrypted value `encryptedReturnReceipt`.
2. The recipient uses an `authToken` to send the `encryptedReturnReceipt` (format "encryptedReturnReceipt:nonce", encoded in Base64 and separated by a colon) to the server, notifying them for which message it is meant. On the server side, we store a UNIX timestamp for the time on which it received the `encryptedReturnReceipt`.
3. The server then allows the original message sender to fetch the `encryptedReturnReceipt` for the particular message.
4. The sender can now decrypt the `encryptedReturnReceipt`. If the plaintext matches the `receipt` they chose for that message, they have verified the authenticity of the "message read" status.
5. The sender checks if the UNIX timestamp included in the decrypted `encryptedReturnReceipt` matches the UNIX timestamp during which the Peerio server first received the `encryptedReturnReceipt` value. If the difference is less than 60 seconds, the sender can reasonably display a time during which the message was read.

#### About `ack` messages

`ack` values are simpler than `receipt` values. A Peerio message that only consists of the string `:::peerioAck:::` gets rendered by the client as an acknowledgement, with a different UI that includes a thumbs-up icon.

####Sending the Ciphertext to the Server
The following JSON object should be sent to the Peerio server (using an `authToken`):
```javascript
{
	recipients: ['array', 'of', 'recipient', 'usernames'],
	encrypted: 'miniLock container (Binary, Base64 String)'
}
```
The Peerio Server will organize messages into either an existing conversation, or create a new conversation if a message is not supplied. 

###5. Receiving a Peerio Message
Once a recipient receives a Peerio message, they decrypt it using their miniLock ID. The client then sanitizes and validates the content before displaying it in the user interface. The recipient is given the option to download the file attachments (using an `authToken`) for decryption. The recipient may also send an `encryptedReturnReceipt` using the procedure described in §A.4., *"About the receipt Value"*. 

###6. Deleting a Conversation
A user can delete a conversation (and all of its messages) from their account using an `authToken`. It is the Peerio network's responsibility to keep track of when a conversation or message is removed from all accounts so that it may then purge it from its storage, which saves server disk spaces and helps guarantee user privacy. Messages may not be removed independently.

###7. Peerio PINs
A Peerio PIN is a shorter passcode that lets users login on a particular device more quickly, avoiding having to type their long passphrase every time. Users can set a different Peerio PIN for each device they are using with Peerio.

On desktop platforms, Peerio PINs are passwords that are checked for strength. On mobile devices we use 6-digit numbers, owing to the lack of a full-sized keyboard on small touch-screen devices.
f
Peerio PINs are used as the basis to derive an encryption key which will be used to encrypt the user's long-term secret key for storage on the device. The user can then later unlock their long-term secret key by typing in their Peerio PIN. The encryption key is by passing the Peerio PIN through the `scrypt` key derivation function defined with the following parameters:

* N = 2<sup>14</sup>
* r = 8,
* p = 1,
* L = 32,
* Salt = User's username.

The resulting value is used as the encryption key for a `nacl.secretbox` encryption operation and a random nonce.

##B. Network Functionality (Server)

###1. Network Architecture
Peerio's server network consists of the following:
* The **Peerio Server Application** (written in `nodejs`).
* The **Peerio Riak Network**.
* The **Peerio Storage Service** (Microsoft Azure by default).

####A. Peerio Server Application
The Peerio Server Application is a `nodejs` server application. It is the layer of interaction between the user and the other components of the Peerio backend. The user sends requests to the Peerio Server Application, and the Peerio Server Application then performs tasks such as authenticating the user, and interacts with other components of the network (such as the Peerio Riak Network) on behalf of the user.

The Peerio Server Application handles the following responsibilities:

* Authenticating a user via *Authentication Challenges*.
* Verifying a user's two-factor authentication credentials.
* Establishing a WebSockets connection in order to send the user push-style notifications.
* Interfacing between the user and the Peerio Riak Network.
* Accepting message uploads from the user and storing them on the Peerio Riak Network.
* Accepting file uploads from the user and storing them on the Peerio Storage Service.
* Making garbage collection requests on the Peerio Riak Network.
* Making garbage collection requests on the Peerio Storage Service.

The Peerio Server Application **does not** handle the following:

* File storage. Actual file storage occurs in the Peerio Storage Service.
* Database-type information storage. This is handled by the Peerio Riak Network.

####B. Peerio Riak Network
Peerio's Riak Network is a network of [Riak](http://basho.com/riak/) partitions used by Peerio to provide the database backbone for Peerio services. We chose Riak because it allows for building and deploying a redundant, decentralized and scalable database system which can be used to handle the personal and relational information of Peerio users.

Peerio's Riak network handles the following responsibilities:

* Storing messages sent by Peerio users.
* Storing URLs and metadata of files uploaded by Peerio users.
* Storing message relationships and metadata (message recipients, etc.).
* Storing account and user preferences, public keys, and other miscelleanous information.
* Making the messages/files/etc. available to the appropriate Peerio users.

Peerio's Riak network **does not** handle the following:

* File storage. Actual file storage occurs in the Peerio Storage Service.
* Direct user communication such as sending notifications or accepting message uploads. This is handled by the Peerio Server Application.

####C. Peerio Storage Service
The Peerio Storage Service is some form of third-party infrastructure which is used for the bulk storage of user files only. Files are encrypted client-side before upload and are expected to range from large (25MB+) to very large (750MB+). As such, we dedicate infrastructure for file storage independent from the rest of the Peerio network infrastructure.

Peerio's Storage Service has the sole responsibility of storing files and making them available for download.

##### Microsoft Azure Storage
By default, Peerio will use Microsoft Azure Storage as the Peerio Storage Service. 

Some terminology is necessary for understanding Azure Storage:

* **Blobs**: Blobs are file-like data structures. They are contained in containers.
* **Containers**: Containers are folder-like data structures. They contain blobs.

For more information on how blobs and containers work together, see [this documentation](http://azure.microsoft.com/en-us/documentation/articles/storage-dotnet-how-to-use-blobs/#what-is) from Microsoft.

As a rule, Peerio only gives the Peerio Storage Service access to encrypted blobs without any metadata. This means that:

* Unique ontainers are not used. Instead, we use a single container for all files.
* Metadata tracking is done by the Peerio Server Application in conjunction with the Peerio Riak Network.

This is what a URL for accessing a blob file looks like:
```
https://mystorageaccount.blob.core.windows.net/mycontainer/myblob
```

In Peerio's example, the only variable is `myblob`:
```
https://peerio.blob.core.windows.net/files/myblob
```

A blob's maximum name length is 1,024 characters. This namespace gives us the ability to store a maximum of approximately 2<sup>6000</sup> files.

### 3. Interfaces and Functionality
In this section we detail the general syntax of the REST API format used to communicate between the user and the Peerio Server Application, and also between the Peerio Server Application and other parts of the Peerio network.

#### A. Input Validation
* **Username**: 1 to 16 characters, letters, numbers and underscore. Validated both server and client side. `/^\w{1,16}$/`
* **First name**: 1 to 20 characters, letters, spaces, dashes and apostrophes. Validated both server and client side. `/^([a-zA-Z]|\-|\s'){1,20}$/`
* **Last name**: 1 to 20 characters, letters, spaces, dashes and apostrophes. Validated both server and client side. `/^([a-zA-Z]|\-|\|\s'){1,20}$/`
* **Email**: Validated both server and client side. `/[-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\.[a-zA-Z]{2,20}/`
* **Phone number**: Starts with a '+' followed by 6 to 20 numbers. `/^\+\d{6,20}$/`
* **Passphrase**: 128 characters maximum, anything goes. Validated on the client side only.

##### Validating miniLock IDs
miniLock IDs consist of 33 bytes. The first 32 bytes are the user's curve25519 public key. The last byte acts as a checksum: it is derived by hashing the first 32 bytes with BLAKE2 set to a 1-byte output. After constructing the 33 bytes of the miniLock ID, it is encoded into a Base58 representation, meant to be easily communicable via email or instant messaging. The following is code that can be used to correctly validate a miniLock ID:

```javascript
// Input: String
// Output: Boolean
// Notes: Validates if string is a proper miniLock ID.
miniLock.util.validateID = function(id) {
	var base58Match = new RegExp(
		'^[1-9ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$'
	)
	if (
		(id.length > 55) ||
		(id.length < 40)
	) {
		return false
	}
	if (!base58Match.test(id)) {
		return false
	}
	var bytes = Base58.decode(id)
	if (bytes.length !== 33) {
		return false
	}
	var hash = new BLAKE2s(1)
	hash.update(bytes.subarray(0, 32))
	if (hash.digest()[0] !== bytes[32]) {
		return false
	}
	return true
}
```

####B. Communication Between User and Peerio Server Application
Users communicate with the Peerio Server Application via a websockets connection using [socket.io](http://socket.io). JSON objects are passed back and forth via the WebSocket link. Most requests require an `authToken` to be processed. 

Here is a general template of a request accepted by the Peerio Server Application:
```javascript
{
	type: 'Request/response type (String)',
	authToken: 'Auth token for this request (String)',
	requestSpecificProperty: 'A property specific to this request type.'
}
```

`authTokens` may become invalid when a client connects to a different server and/or after a certain amount of time has passed. A client making repeated requests with invalid authTokens may be temporarily blocked from making any further requests. A client may also be blocked if making too many requests for authTokens (>60) within 5 seconds. 

####C. Error Messages
The Peerio Server Application may respond to an unsuccessful request with the following error codes:

**404**: Sent when a resource could not be found (either because it does not exist or the user us not allowed to access it)
**413**: Sent when the user is not allowed to perform an operation due to having exceeded their storage quota. 
**406**: Sent when the client's request is malformed (e.g. missing a required field, supplying fields in an incorrect format).
**423**: Sent when there is an authentication problem (e.g. authToken unacceptable, too many authToken requests).
**424**: Two-factor authentication required.
**425**: Sent when the account has been throttled (sent too many requests that failed to authenticate).
**426**: User blacklisted.
**400***: Sent for all other errors.

###4. Account Registration
**Input Validation**: See §B.3.A.

####Step 1. Client sends account registration request
The client's request is a socket.io message `registrationRequest` and its body is formatted as follows:
```javascript
{
	username: 'Desired username (String)',
	firstName: 'First name (String)',
	lastName: 'Last name (String)',
	localeCode: 'code of desired locale (String)',
	address: {
		type: '"email" or "phone" (String)',
		value: 'Email or phone number (String)'
	}
	miniLockID: 'User-claimed miniLock ID (Base58 String)',
	keyStorage: '(Base64 String)'
}
```

**Note**: If the username is already taken **or** the address given is already in use, the server returns <strong style="color:red"> { error: 400 }</strong> and the process is interrupted.

####Step 2. Server responds with `accountCreationToken`
The Account Creation Challenge is defined in §A.0.

The server's response is as follows:
```javascript
{
	username: 'Username this challenge is for (String)',
	accountCreationToken: {
		token: 'Encrypted token (Base64 String)',
		nonce: 'Nonce used to encrypt the token (Base64 string)'
	},
	ephemeralServerID: 'miniLock ID of server (Base58 String)'
}
```

The server waits for a maximum of one minute until it receives an `accountCreationResponse` with a valid decrypted token, at which point it can create the account. 

####Step 3. Client responds with decrypted `accountCreationToken`

Upon receiving the `accountCreationToken`, the client decrypts it and sends it back:

```javascript
{
	accountCreationToken: 'Decrypted token (Base64 String)'
}
```

If the `accountCreationToken` is valid, the server returns a confirmation with the relevant user information in the body (as claimed by the user):
```javascript
{
	username: 'Desired username (String)',
	firstName: 'First name (String)',
	lastName: 'Last name (String)',
	address: {
		type: '"email" or "phone" (String)',
		value: 'Email or phone number (String)'
	}
	miniLockID: 'User-claimed miniLock ID (Base58 String)'
}
```

Otherwise, the server responds with <strong style="color:red"> { error: 400 }</strong> 

####Step 4. Confirming Email/Phone Number
Once the account is created, we still require the user to confirm their email or phone number. An email/SMS is sent to the address containing a random 8-digit code.

The user can respond with the code within 10 minutes in order to confirm their account, sending a message `accountConfirmation` with the following body:
```javascript
{
	username: 'The username we are confirming for (String)',
	confirmationCode: '8-digit code (String)'
}
```

If the code matches, the account is confirmed. If the response takes too long or the token is incorrect, the server returns <strong style="color:red"> { error: 400 }</strong>.

#### Helper method: Username Lookup

In order to validate if a username is taken, the client may send a message `validateUsername` with the following body:

```javascript
{
	username: 'The username to be looked up (String)'
}
```

The server will respond with either an empty object if the username is available, or an object containing an `error` key if the username is taken.

#### Helper method: Address Lookup

In order to validate if an address (email or phone number) is taken by an activated, confirmed and non-deleted account, the client may send a message `validateAddress` with the following body:

```javascript
{
	address: {
		type: '"email" or "phone" (String)',
		value: 'address to look up (String)'
	}
}
```

The server will respond with either an empty object if the address is available, or an object containing an `error` key if the address is taken.

###5. Login
**Input Validation**: See §B.3.A.

Peerio currently uses a stateless authentication system where we do not have the need for an actual "login" step.

####Requesting Authentication Tokens
When the client requests an authentication token, the server must grant it if and only if:

1. The account is activated and confirmed.
2. The account has not been removed.
3. If two-factor authentication is enabled, the account is not due for re-authentication. Users must authenticate using two-factor authentication once per week per IP address (if 2fa is enabled).
4. A threshold of 60 authentication token requests has not been passed in the past 5 seconds.

Clients can request authentication tokens via a `authTokenRequest` message with the following body:
```javascript
{
	username: 'Client username (String)',
	miniLockID: 'Client miniLock ID (String)',
	version: 'version id of the current client (String)'
}
```

If the provided miniLock ID matches the one the server has in store for that username, the server then generates 10 authTokens and send them to the user. This is done via a `authTokenResponse` message with the following body:
```javascript
{
	ephemeralServerID: 'miniLock ID of server (Base58 String)',
	authTokens: [
		{
			token: 'Encrypted token (Base64 String)',
			nonce: 'Nonce used to encrypt the token (Base64 string)'
		}
		// 10 times
	]
}
```

The server will respond with <strong style="color:red">`{ error: 423 }`</strong> if a user makes too many requests for authTokens within a short period of time. The server may also respond with <strong style="color:red">`{ error: 426 } `</strong> if the user account has been blacklisted, or with <strong style="color:red">`{ error: 425 } `</strong> if the user's account has been temporarily throttled.

Almost all other requests to the server will requie an `authToken`. Whenever an invalid `authToken` is received by the server, the server will respond with <strong style="color:red">`{ error: 423 } `</strong>. 

###6. Contact Management and Lookup
**Input Validation**: See §B.3.A.
<span style="font-weight:bold;color:purple">authToken Required</span>
<span style="font-weight:bold;color:beige">Account must not be suspended</span>

####Retrieving a miniLock ID
Client sends `getMiniLockID` message:
```javascript
{
	username: 'Username to fetch miniLock ID for (String),
	authToken: 'Decrypted authToken (Base64 String)'
}
```

Otherwise the server returns:
```javascript
{
	username: 'Username of the requested user (String)',
	miniLockID: 'User's miniLock ID (String)'
}
```

####Retrieving all contacts for a user
User's client sends `getContacts` message:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'

}```

The server returns:
```javascript
{
	contacts: [
		{
			firstName: 'First name (String)',
			lastName: 'Last name (String)',
			username: 'username (String)',
			isNew: 'boolean',
			isDeleted: 'boolean',
			primaryAddress: 'email or phone (String)',
			addresses: [
				{
				   type: '"email" or "phone" (String)',
				   value: 'address, email or phone (String)'
			   }
			   ...
			],
			miniLockID: 'the miniLockID for the contact (base58 string)',
			settings: {
				sendReadReceipts: 'boolean',
				receiveMessageNotifications: 'boolean'
				...
			}
		}
	]
}
```

If there are no preference overrides the `preferenceOverrides` object will be empty. The `isNew` flag will be set to false after this contact is fetched once. If the user has no contacts, the `contacts` array will be empty (i.e. `[]`).

####Retrieving all sent contact requests for a user
User's client sends `getSentContactRequests` message:

```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server returns:

Server returns:
```javascript
{
	contactRequests: [
		{
			firstName: 'First name (String)',
			lastName: 'Last name (String)',
			username: 'username (String)',
			primaryAddress: 'email or phone (String)',
			miniLockID: 'the miniLockID for the contact (base58 string)'
		}
	]
}
```

If the user has no sent contact requests, the `contactRequests` array will be empty (i.e. `[]`).


####Retrieving all received contact requests for a user

User's client sends `getReceivedContactRequests` message:

```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

Server returns:
```javascript
{
	contactRequests: [
		{
			firstName: 'First name (String)',
			lastName: 'Last name (String)',
			username: 'username (String)',
			primaryAddress: 'email or phone (String)',
			miniLockID: 'the miniLockID for the contact (base58 string)',
			isNew: 'boolean'
		}
	]
}
```

The `isNew` flag will be set to false after a contact is fetched once.

If the user has no sentcontact requests, the `contactRequests` array will be empty (i.e. `[]`).

####Setting preferences for a contact

The client may send the `updateContactSettings` message: 

```javascript
{
	username: 'username of contact to update (String)',
	settings: {
		sendReadReceipts: 'boolean',
		receiveMessageNotifications: boolean
		...
	}
}
```

The server will respond with an empty object or an error. These settings will override the user's usual settings when in a conversation that *includes* the contact. 

####Retrieving a Peerio Username from their Email/Phone Address
Client sends `addressLookup` message:
```javascript
{
	address: {
		type: '"email" or "phone" (String)',
		value: 'Email or phone number (String)'
	},
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server checks if there is a non-removed, activated/confirmed user with that address on Peerio. If not, the server returns <strong style="color:red">`{ error: 404 }`</strong>.

The server then checks if the user has the client blocked. If so, the server returns <strong style="color:red">` { error: 404 } `</strong>. Otherwise, the server returns:
```javascript
{
	username: 'Username tied to the provided address (String)'
}
```

####Adding a Contact
The client may send an `addContact` message to either a username or an address.

```javascript
{
	contacts: [ 
		{
			username: 'Username of contact (String)', 
			// OR
			address: { 	
					type: '"email" or "phone" (String)',
					value: 'Email or phone number (String)'
			}
		},
		// repeat
	]
	
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server will respond with success and error arrays: 

```javascript
{
	errors: [
		{ 
			'username (String)' : 'error code (Number)' // for each address or contact that could not be added or invited
		}
	],
	success: [
		added: 'Username of contact (String)', // for each contact that was added
		invited: 'Address that was invited (String)' // for each address that was invited
	]
	
}
```

If the user is *already* contacts with the active user, the server returns <strong style="color:red">`{ error: 400 } `</strong>. If the username does not exist, the server returns <strong style="color:red">`{ error: 404 } `</strong>.

If the address is not on Peerio, an invitation will be generated and the server will respond with:

```javascript
{
	invited: 'email address or phone number (String)'
}
```

A user addres will only be sent an invitation notification (via email or SMS) a maximum of three times, and never more than once by the same user. Inviting the same address more than once (by the same user) will return an <strong style="color:red">`{ error: 400 } `</strong>. An error response will *not* be generated if the maximum of invite notifications to be sent to an address has been exceeded and a notification is therefore not sent. 


All invitations will be converted into contact requests by the server when an invited user creates a Peerio account, upon confirmation of the address the invites are associated with. 

####Removing a Contact
Client sends `removeContact` message:
```javascript
{
	username: 'Username of contact (String)',
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server returns <strong style="color:red">`{ error: 400 } `</strong> if the contact does not exist or is not contacts with the active user.

####Accepting, declining and cancelling a Contact Request
A client can accept a contact request from a user via a `acceptContactRequest` message:
```javascript
{
	username: 'Username to accept contact request from (String)',
	authToken: 'Decrypted authToken (Base64 String)'
}
```

If the user does not exist, or the contact request from that user does not exist, or if the contact has the user blocked, the server returns <strong style="color:red">`{ error: 404 }`</strong>.

Declining a contact request is the same except the message name is `declineContactRequest`.

A user can also cancel a sent contact request with `cancelContactRequest`.

Removing a contact from a client's address book is the same except the message name is `removeContact`.

####Blocking a User
A client can block a user (prevent them from contacting them by asking the server) via a `blockUser` message:
```javascript
{
	username: 'Username to block (String)',
	authToken: 'Decrypted authToken (Base64 String)'
}
```

If the user does not exist, or is deleted or not activated/confirmed, the server returns <strong style="color:red">`{ error: 404 } `</strong>.

Otherwise, the server puts a record to block the user and removes pending contact requests between the blocker and the blockee.

Unblocking a user is similar but the message name is `unblockUser` instead.

A list of all users a user has blocked can be obtained with `getAllBlockedUsers`:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server will respond to this request with:

```javascript
{
	blockedUsers: [
		'Blocked username (String)',
		...
	]
}
```

###7. File Upload
**Input Validation**: See §B.3.A.
<span style="font-weight:bold;color:purple">authToken Required</span>
<span style="font-weight:bold;color:beige">Account must not be suspended</span>

The client checks if the file size is acceptable, and within user's current quota limit before uploading the file to the server.

Files are uploaded in chunks of approximately 1MB, to a maximum of 500 chunks. Chunks after 499 will be rejected with an <strong style="color:red"> `{ error: 400 }`</strong>, as will chunks larger than 1.1MB in size.

The client initiates request with an `uploadFile` message:
```javascript
{
	ciphertext: 'First chunk of encrypted file body, ie. filename (ArrayBuffer)',
	parentFolder: 'containing folder ID (String)',
	totalChunks: 'Number (maximum 500)',
	clientFileID: 'identifier generated by the client (String)',
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server will respond with:
```javascript
{ 
	id: 'ID of the file (String)' 
}
```

This ID is the ID by which the file will be accessible for other file-related operations. However, this ID will not be usable until the last chunk has finished uploading. 

The chunk sent with `uploadFile` will be assumed to be chunk 0 of `totalChunks`. Bytes 4-276 of this first chunk will be used as the file's ID. 

The server will check that the `clientFileID` is unique to the client and will return <strong style="color:red"> `{ error: 400 }`</strong> otherwise. 

All subsequent file chunks will be uploaded with an `uploadFileChunk` message:

```javascript
{
	ciphertext: 'Chunk of encrypted file body (ArrayBuffer)',
	header: 'miniLock Header object, only included if chunkNumber is 1',
	chunkNumber: 'Number between 0 and 499',
	clientFileID: 'identifier generated by the client (String)',
	authToken: 'Decrypted authToken (Base64 String)'
}
```

Chunk 1 (and only chunk 1) is required to provide a `header` property. 

The server will check the size of these chunks, and that the `chunkNumber` is within the range of `totalChunks` previously provided. If any of these validations fail the server will return <strong style="color:red"> `{ error: 400 }`</strong>. `uploadFileChunks` calls with a `clientFileID` that has not been sent by an `uploadFile` message will be rejected similarly.

If a chunk upload is successful, the server will respond with an empty object. When the last chunk is uploaded, the server will again respond with the ID of the file:

```javascript
{ 
	id: 'ID of the file (String)' 
}
```

Any incomplete files (ie. missing chunks) will be discarded after 5 minutes.

Chunks will be stored on disk until all chunks have been received (or 5 minutes pass). The file object is  then stored in Riak and the user's quota is updated. The ciphertext is saved to the Peerio Storage Service and removed from disk on the Peerio Server. 

If there is a `parentFolder` value in the `uploadFile` message, the filesystem for that file is updated accordingly.

###8. Message Sending
**Input Validation**: See §B.3.A.
<span style="font-weight:bold;color:purple">authToken Required</span>
<span style="font-weight:bold;color:beige">Account must not be suspended</span>

####Message Creation
**Input Validation**:

- A maximum of 50 recipients is allowed.
- The field `conversationID` may be omitted. If the message has no `conversationID`, a new conversation will be created.
- The fields `recipients` is required only when `conversationID` is omitted, ie for new conversations.
- Members of the `recipients` array must be valid Peerio usernames. 
- The `header` must take the form of a miniLock header.

Client submits `createMessage`:
```javascript
{
	isDraft: boolean,
	conversationID: 'ID of conversation this message belongs to (String)',
	recipients: [
		'Peerio username (String)'
	],
	header: 'miniLock header (Object)',
	body: 'miniLock ciphertext (Base64 String)',
	files: [
		{
			id : 'iD of attached file (String)',
			header: 'modified header of attached file (Object)'
		}, 
		...
	],
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server will throw a <strong style="color:red">`{ error: 400 }`</strong> if any recipients aren't contacts with the sender. If the user has exceeded their quota the server will throw <strong style="color:red">`{ error: 413 }`</strong>.

Once the client creates a message, the server returns the following message:
```javascript
{
	id: 'Assigned ID of created message (String)', 
	conversationID: 'Assigned conversation ID of created message (String)'
}
```

####Adding a User to an Existing Conversation
An existing participant in a conversation may choose to add one of their contacts to the conversation.

Since contacts in the conversation are relying on the `participants` property in the plaintext of the first conversation message to derive who is an allowed conversation participant, we must provide independent proof that the new added participant has been "vouched for" by an existing participant. This proof consists of the vouching participant sending a regular conversation message with the following message body:

```PeerioAddUserToConversation:conversationID:voucherUsername:newParticipantUsername``

For example, if `alice` were to add `bob` to conversation `7gJgJAMTQqPVKhwICE77leK2iU0`:
```PeerioAddUserToConversation:7gJgJAMTQqPVKhwICE77leK2iU0:alice:bob```

Once the other participants decrypt this message, their clients detect the format and verify the conversation ID and the two usernames. At that point `bob` is also considered as an approved potential conversation participant.

`alice` must then ask the server to grant `bob` access to the conversation with a `addUserToConversation` message:
```javascript
{
	id: 'ID of conversation to add user to (String)',
	username: 'Username of new participant (String)',
	authToken 'Decrypted authToken (Base64String)'
}

The server must make sure not to send the new participant `bob` any conversation messages dated from before his being added, as he will not be able to decrypt them.


####Conversation Removal and Unsubscription
A user may delete an original message (and all its children) from their account with a `removeConversation` message:

```javascript
{
	id: 'ID of conversation to remove (String)',
	authToken: 'Decrypted authToken (Base64 String)'
}
```

If the message does not exist, does not belong to the owner, the server will reply with `{error: 404}`. If the message is not an original message, the server will reply with `{error: 400}`

When a conversation is removed by a user, other users in the conversation will have the conversation marked as modified so they may fetch the conversation object with its new removal event. 

####File Deletion
A user may delete a message from their account with a `removeFile` message:
```javascript
{
	id: 'ID of file to remove (String)',
	authToken: 'Decrypted authToken (Base64 String)'
}
```

####Nuke a File
A user may ask the server to "nuke" a file (immediately delete it and remove it from all accounts it has been shared with) with a `nukeFile` message:
```javascript
{
	id: 'ID of file to nuke (String)',
	authToken: 'Decrypted authToken (Base64 String)'
}
```

###9. Fetching a Message or File
**Input Validation**: See §B.3.A.
<span style="font-weight:bold;color:purple">authToken Required</span>
<span style="font-weight:bold;color:beige">Account must not be suspended</span>

####Fetching a Message or Multiple Messages
The client can also fetch the contents of a individual messages by sending a `getMessages` message with the following body:
```javascript
{
	ids: [
		'Message ID (String)',
		...
	],
	authToken: 'Decrypted authToken (Base64 String)'
}
```

If a message does not exist, or if the user is not linked to the message (as a sender, recipient, or is removed, etc.) then the server sends a <strong style="color:red">`{ error: 404}`</strong>. Errors will be sent 

The server will return the following:
```javascript
	{
		messages: {
			'id of a message {string}' : { 
				// message object as specified below
			}
		}, errors: {
				'id of a message {string}' : { 
					{ error: 'error code (Number)' }
				}
				//...
		}
	}
```

The individual message structure will be as follows, if the user fetching it is the **sender** of the message: 

```javascript
{
	timestamp: 'UNIX timestamp (Number)',
	sender: 'Peerio username of sender (String)',
	isDraft: boolean,
	isModified: boolean,
	recipients: [
	  {
		username: 'Peerio username of first recipient (String)',
		receipt: {
		  isRead: true,
		  encryptedReturnReceipt: 'encryptedReturnReceipt (Base64 String)',
		  readTimestamp: 'UNIX timestamp for reception (Number)'
		}
	  }
	  ...
	],
	conversationID: 'id of the immediate parent message (String)'
	header: 'miniLock header (Object)'
	body: 'miniLock ciphertext (Base64 String)'
}
```

The individual message structure will be as follows, if the user fetching it is the recipient of the message: 

```javascript
{
	timestamp: 'UNIX timestamp (Number)',
	sender:  'Peerio username of sender (String)',
	isDraft: boolean,
	isModified: boolean,
	recipients: [
		{ 	// for recipients other than self
			username: 'Peerio username of first recipient (String)'
		},
		{	// for self
			username: 'Peerio username of first recipient (String)',
			receipt: {
			  isRead: true,
			  encryptedReturnReceipt: 'encryptedReturnReceipt (Base64 String)',
			  timestamp: 'UNIX timestamp for reception (Number)'
			}
		}
	  ...
	],
	conversationID: 'id of the immediate parent message (String)',
	header: 'miniLock header (Object)'
	body: 'miniLock ciphertext (Base64 String)'
}
```

####Fetching All Messages
In order to receive all messages for a certain user, the client sends a `getAllMessages` message with the following body:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server responds with: 
```javascript
{
	conversations: {
		'ID of conversation (String)': [
			'id of child message (String)',
			...
		]
	},
	allMessages: {
		'ID of message (String)': 'message object (String)',
		...
	}
}
```

#### Fetching all conversations
In order to receive all conversations and their first message for a certain user, the client sends a `getAllConversations` message with the following body:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server responds with: 
```javascript
{
	conversations: {
		'ID of conversation (String)' : {
			participants: [
				'id of user (string)'
			],
			lastTimestamp: 'timestamp of last message (Number)',
			folderID: 'ID of folder (String)',
			messageCount: 'number of messages in the conversation (Number)',
			messages: {
				'first message ID (string)' : {
					// message object
				}
			},
			events: [
				{ 
					type: 'type of event, e.g. "remove" (String)', 
					username: 'ID of user', 
					timestamp: 'timestamp of event (String)' 
				}
			]
		}
		// ... 
	}
}
```

The only event type at the moment is `remove`. The `participants` array may contain fewer participants than the `approvedParticipants` value, and an `event` will track the removal of a participant. 

#### Fetching specific conversations

The call `getConversationMessages` is **deprecated** and should no longer be used. 

The client may also fetch conversations by ID with `getConversationPages` :

```javascript
{
	authToken: 'Decrypted authToken (Base64 String)',
	conversations: [
		{ 
			id: 'id of conversation (String)',
			page: 'String, see below'
		}
		//...
	]
}
```

Requesting page `0` will fetch the conversation with its first 10 messages. Requesting page `1` will return all messages *except* the first 10. Leaving the `page` field blank returns all messages (for backwards compatibility), and `none` returns only the original message, as in `getAllConversations`.

The format of the response will be similar to that for fetching all conversations, except that if page '1' or `0` is specified, a `pagination` object will be included. The `pagination` object contains the page number being requested, and a `messageOrder` array, with the message ids ordered by descending timestamp (ie. the message ID at position `0` is the most recent message from the requested page).

```javascript
{
	conversations: {
		'ID of conversation (String)' : {
			participants: [
				'id of user (string)'
			],
			lastTimestamp: 'timestamp of last message (Number)',
			folderID: 'ID of folder (String)',
			messageCount: 'number of messages in the conversation (Number)',
			messages: {
				'id of message' : { 
					// message object
				}
				// ...
			},
			pagination: {
				page: '0 or 1 (Number)',
				messageOrder: [
					'id of message (String)'
				]
			},
			events: [
				{ 
					type: 'type of event, e.g. "remove" (String)', 
					username: 'ID of user', 
					timestamp: 'timestamp of event (String)' 
				}
			]
		}
		// ... 
	}, 
	errors {
		'ID of conversation (String)' : 'error code (Number)'
	}
}
```

The structure of each individual message will follow that of individual messages (see above). 

If the requested conversation(s) do not exist, or if the user is not a participant in the conversation (anymore, or ever) then the server sends a <strong style="color:red">`{ error: 404}`</strong> for that conversation. 

### Fetching All Conversation IDs

In order to receive all conversation IDs for a certain user, the client sends a `getConversationIDs` message with the following body:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server responds with: 
```javascript
{
	conversationIDs: [
		'conversation ID (String)'
	]
}
```

### Fetching Modified Conversation IDs

In order to receive all conversation IDs for a certain user, the client sends a `getModifiedConversationIDs` message with the following body:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server responds with: 
```javascript
{
	conversationIDs: [
		'conversation ID (String)'
	]
}
```

All those IDs fetched will have the 'modified' label removed when this call is made.

### Fetching All Message IDs

In order to receive all messages for a certain user, the client sends a `getMessageIDs` message with the following body:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server responds with: 
```javascript
{
	messageIDs: [
		'message ID (String)'
	]
}
```

This includes the IDs of *all* messages the user has access to, including sent, received and drafts. 

If the user has no messages the server will respond with an emtpy array: 

```javascript
{
	messageIDs: []
}
```

### Fetching Modified Message IDs

In order to receive all modified messages for a certain user, the client sends a `getModifiedMessageIDs` message with the following body:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server responds with: 
```javascript
{
	messageIDs: [
		'message ID (String)'
	]
}
```

This includes the IDs of *all* messages the user has access to, including sent, received and drafts. 

If the user has no modified messages the server will respond with an empty array:

```javascript
{
	messageIDs: []
}
```

####Fetching Information for All Files
In order to receive all files for a certain user, the client sends a `getFiles` message with the following body:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)'
}
```

The server responds with :
```javascript
{
	files: {
		'ID of file (String)' : {
			id: 'ID of file (String)',
			header: 'Header of file (JSON String)', 
			timestamp: 'Integer',
			size: 'Integer',
			creator: 'Peerio username of file uploader (String)',
			sender: 'Peerio username of file sender (String)',
			folderID: ''
		}
		...
	}
}
```

The `sender` object contains information for the first user who shared the file with the requesting user, and may be the same as the `creator` object. will be omitted if the user requesting the file is the creator. 

####Fetching Information for a Single File

An individual file may be requested with `getFile`:

```javascript
{
	authToken: 'Decrypted authToken (Base64 String)',
	id: 'ID of the file (String)'
}
```

The server will respond with: 

```javascript
{
	id: 'ID of file (String)',
	header: 'Header of file (JSON String)', 
	timestamp: 'Integer',
	size: 'Integer',
	creator: 'Peerio username of file uploader (String)',
	sender: 'Peerio username of file sender (String)',
	folderID: ''
}
```

If the user making the request does not have  permission to view the file, the server will respond with <strong style="color:red">`{ error: 404 }`</strong>.

### Fetching All File IDs

The client may request an array of file IDs with `getFileIDs`. The response will be: 
```javascript
{ 
	ids: [
		'ID of file (String)'
		...
	]
}
```

####Downloading a File
The client can also fetch the contents of an individual file by sending a `downloadFile` message with the following body:
```javascript
{
	id: 'File ID (String)'
	authToken: 'Decrypted authToken (Base64 String)'
}
```

If the file does not exist, or if the user is not linked to the message (as a sender, recipient, or is removed, etc.) then the server sends a <strong style="color:red">`{ error: 404 }`</strong>. Otherwise, the server returns:

```javascript
{
	id: 'File ID (String)',
	header: 'Header of file (JSON String)',
	url: 'URL to download file ciphertext (String)'
}
```

If the file is market as auto-destruct, destruction will be triggered when this call is made. 

####Moving a File
When a user moves a file, the client will send the entire changed filesystem structure to the server.

####Opening Messages, Read Receipts and Timestamps

The client can send a read receipt by sending the message `readMessages`:
```javascript
{
	authToken: 'Decrypted authToken (Base64 String)',
	read: [
		{
			id: 'message ID (String)',
			encryptedReturnReceipt: 'Base64 String'
		},
		...
	]
}
```

The `encryptedReturnReceipt` property may be omitted, in the case where the user does not provide read receipts, or does not provide them for the contact whose message they have read. The client is responsible for parsing user preferences with regards to sending read receipts. The client is also responsible for interpreting whether a read receipt is valid.

See §A.4. for the specifics of how `encryptedReturnReceipt` is generated.

###11. Message Deletion
**Input Validation**: See §B.3.A.
<span style="font-weight:bold;color:purple">authToken Required</span>

###12. Settings

#### Fetching user profile and settings

A user may load their profile and settings by sending a `getSettings` message:

```javascript
{
	authToken: 'Decrypted authToken (String)'
}
```

The server will return with:

```javascript
{
	accountType: 'Account type of user (Peerio plan) (String)',
	username: "username (String)", 
	firstName: 'User first name (String)',
	lastName: 'User last name (String)',
	paymentPlan: 'String (free, pro)'
	addresses: [
		{
			type: '"email" or "phone" (String)',
			value: 'Email or phone number (String)',
			isConfirmed: boolean, 
			isPrimary: boolean
		}
		...
	],
	settings: {
		twoFactorAuth: boolean,
		localeCode: "The user's preferred locale code (String)",
		sendReadReceipts: boolean,
		receiveMessageNotifications: boolean
		...
	},
	quota: {
		total: 'Total quota bytes (Number)',
		user: 'Used quota bytes (Number)'
	}
}
```

The user's primary address will be listed first in the `addresses` array. 

#### Updating user settings
**Input Validation**: See §B.3.A.

If two-factor auth is enabled and the user has not two-factor authenticated in the past minute, all settings changes return<strong style="color:red">{ error: 400 }</strong>.

Otherwise, the user is free to send a `updateSettings` message:
```javascript
{
	twoFactorAuth: 'Whether two-factor authentication is enabled (Boolean)',
	firstName: 'User first name (String)',
	lastName: 'User last name (String)',
	sendReadReceipts: boolean,
	localeCode: 'locale code (String)',
	receiveMessageNotifications: boolean,
	authToken: 'Decrypted authToken (String)',
}
```

All keys are optional. If never updated `firstName` and `lastName` will remain as specified on signup. The defaults for the other settings are:

- `twoFactorAuth` : `false`
- `localeCode` : `'en'`
- `sendReadReceipts` : `true`
- `receiveMessageNotifications` : `false` (if `true`, the user's primary address will received the notifications)

Some of these settings may be overriden for specific contacts.

The `twoFactorAuth` setting may only be set to `false` with this server call. Setting it to `true` requires using the process laid out in Section 16. Attempts to enable 2fa through `updateSettings` will be rejected with a <strong style="color:red">{ error: 400 }</strong>.

If a user has `twoFactorAuth` enabled, updating settings will require passing through two-factor authentication for a special operation.

####Adding an address

**Input Validation**: A maximum of three email addresses and three phone numbers are allowed. (Validation on both server and client-side)

A user may add a new address via a `addAddress` message:

```
{
	address: {
		type: '"email" or "phone" (String)',
		value: 'Email or phone number (String)'
	},
	authToken: 'Decrypted authToken (String)'
}
```

If a user has `twoFactorAuth` enabled, adding an address will require passing through two-factor authentication for a special operation.

####Confirming an address

A user may confirm a new address via a `confirmAddress` message:

```
{
	address: {
		value: 'Email or phone number (String)',
	},
	confirmationCode: '8-digit code (String)',
	authToken: 'Decrypted authToken (String)
}
```

If a user has `twoFactorAuth` enabled, confirming an address will require passing through two-factor authentication for a special operation.

####Promoting an address to primary

**Input Validation**: Only confirmed addresses may be promoted to primary. (Validation on both client and server-side)

A user may promote an address to primary via a `setPrimaryAddress` message:

```
{
	address: {
		value: 'Email or phone number (String)'
	},
	authToken: 'Decrypted authToken (String)''
}
```

If a user has `twoFactorAuth` enabled, promoting an address will require passing through two-factor authentication for a special operation.

####Removing an address

**Input Validation**: A primary address may not be removed. If the user has only one address, that address may not be removed. (Validation on both client and server-side)

A user may confirm a new address via a `removeAddress` message:

```
{
	address: {
		value: 'Email or phone number (String)'
	},
	authToken: 'Decrypted authToken (String)'
}
```

If a user has `twoFactorAuth` enabled, removing an address will require passing through two-factor authentication for a special operation.

####Closing account

A user may choose to close their Peerio account via a `closeAccount` message:

```javascript
{
	authToken: 'Decrypted authToken (String)'
}
```

If a user has `twoFactorAuth` enabled, closing an account will require passing through two-factor authentication for a special operation. 

After closing their account, the user will no longer be able to log on. Closing an account will remove the user's participation in all conversations, and remove their ownership from all files. All of their outgoing and incoming contact requests will be removed. Contact relationships will remain, but the user will be marked as `isDeleted` to their contacts. The user's confirmed addresses (emails and phone numbers) will be made available for future registration, but their username will stay blocked forever.

###13. Receiving updates

When a client connects to the server, the server will start polling changes to certain data belonging to the user. When new data is available, it will send a message to the client, which will have to authenticate to request this new data. 

The server will push events to the client at different intervals based on priority. 

High priority/frequency: 
- `modifiedMessagesAvailable` - Sent when a new message has been received, or a receipt has been added to a message.

Medium priority/frequency: 
- `receivedContactRequestsAvailable` - Sent when someone has added the user as a contact.
- `newContactsAvailable` - Sent when someone has accepted a contact request sent by the user.

Low priority/frequency:
- `sentContactRequestsAvailable` - Sent when the number of sent contact requests changes (generally means a new contact, or can mean a rejected contact request).
- `contactsAvailable` - Sent when the number of contacts has changed, generally either the same as when a new contact has accepted a request OR also if someone has removed the user as a contact.
- `modifiedConversationsAvailable` - Sent when the events in a conversation have changed, ie. a participant has removed/left the conversation. 

When the client receives these messages, it will request data from the server normally, ie. by sending `getReceivedContactRequests`, `getContacts` and `getModifiedMessageIDs` messages to the server respectively, with all necessary parameters (including a valid `authToken`). 

The server will poll at regular intervals while the client is connected. 

###14. Two-Factor Authentication
**Input Validation**: See §B.3.A.

Two-factor authentication uses the Time-Based One-time Password standard in order to mandate that the Peerio server periodically ask the user for an additional authentication vector before issuing `authToken`s.

####Enabling Two-Factor Authentication
To enable two-factor authentication, the client sends a `setUp2FA` message with a valid authentication token. 

The server **does not** immediately change the `2fa` settings record of the user from `false` to `true`. Instead, it first sends the client a response containing the TOTP secret:

```javascript
{
	secret: 'Two-factor authentication secret (ASCII string)'
}
```

The client must then reply with a `confirm2FA` message containing a generated and currently valid two-factor authentication code within five minutes:

```javascript
{
	twoFACode: 'The generated 6-digit code (Number)',
	authToken: 'Decrypted authToken (String)'
}
```

If the token in the `confirm2FA` message is correct and matches the server's generated code, the server then enables two-factor authentication for that user and changes their `twoFactorAuth` setting to `true`. If the process is successful, the server returns an empty object. If not, the server returns an object with an `error` property.

####Authenticating with Two-Factor Authentication
A client can renew their two-factor authentication status simply by sending their current two-factor authentication code in a `validate2FA` message:

```javascript
{
	twoFACode: 'The generated 6-digit code (Number)',
	username: 'valid username (string)',
	miniLockID: 'minilock ID of the suer (base64 string)'
}
```

If the code is correct, the server returns an empty object. If not, the server returns an object with an `error` property. Users will be required to authenticate using two-factor authentication once per week per IP address. When preforming "protected" operations, such as changing their settings or authorizing addresses, users will be required to have authenticated using two-factor authentication in the last minute. 

Entering an inforrect two-factor authentication code more than 10 times may result in a user's account being temporarily suspended from making any requests to the application. 

#### Disabling Two-Factor Authentication

The client may use a normal `updateSettings` message for disabling two-factor authentication (though it may not use this call to _enable_ it). Updating settings is a protected operation, so two-factor authentication must be passed to complete disabling. 

