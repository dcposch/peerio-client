##Threat Model

###1. Security Objectives
Peerio's security objectives are:

* Provide message sharing and cloud storage capabilities where the messages and files are encrypted and inaccessible by any party that is not the sender or the intended recipient(s).
* Provide means for users to securely authenticate each other's cryptographic identities.
* Protect against message forgery or file modification.
* Protect a user's account identity with authentication challenges that optionally include two-factor authentication.

Peerio's security objectives **do not** include:

* Anonymizing the connections and identities of users.
* Protecting against key-loggers and other similar malware and backdoors on the client's machine.

Furthermore, the Peerio client has limited guaranteed on the Peerio server. For example:

* Peerio cannot guarantee that the server is faithfully transmitting to recipients all messages sent by senders (the Peerio server may choose to drop messages).
* The Peerio server may maliciously choose not to deliver message read receipts even if the message has been read.
* The Peerio server may maliciously choose not to delete ciphertext even if the user asks for it to be deleted and has received a deletion confirmation.

####Protected Information
The *confidentiality*, *integrity* and *authenticity* of the ciphertext is protected by Peerio against:

1. Server compromise.
2. Malicious host.
3. Man-in-the-middle attacks.

Namely, the Peerio network and any unauthorized third party **cannot**:

1. Read the contents of any Peerio message.
2. Forge a message claiming to be from a particular Peerio user.
3. Send a message on behalf of a particular user.
4. Undetectably intercept and modify a message before it reaches the recipient.
5. Show a message read receipt to the sender that is not actually reflective of the message having been read by the recipient.

####Unprotected Information
While ciphertext confidentiality, integrity and authenticity are guaranteed by the client against the Peerio server, the following information regarding a message is visible to the server:

1. A Peerio server can see the sender and recipient of any Peerio message.
2. A Peerio server can access the file size of any file uploaded by a Peerio user.
3. A Peerio server can draw a relational map of a user's Peerio contacts and effectively determine a contact list for a particular user.

Furthermore, Peerio does not protect against the following attacks which can be instantiated by the Peerio server:

1. Selectively withholding a message's delivery.
2. Delaying a message's delivery.
3. Preventing a user from sending messages.
4. Deleting a user's files without their consent.

###2. Application Overview
<img src="https://dl.dropboxusercontent.com/u/7653597/Perm/peerioThreatModel.png" alt="" label="Threat Model Overview" />
###### Peerio Threat Model: Attack Points Diagram

####Client Scenarios
* Generating miniLock key pairs for users.
* Requesting the miniLock ID of a Peerio user from the server.
* Authenticating miniLock IDs.
* Encrypting Peerio messages and uploading the ciphertext to the server.
* Decrypting received Peerio messages and displaying them to the user.
* Encrypting and uploading files for storage.
* Changing user settings, adding contacts, etc.

####Server Scenarios
* Storing the miniLock IDs of users (and personal information such as full name and email).
* Acting as a middle-man for the transfer of encrypted messages from the sender to their intended recipient(s).
* Creating user accounts and storing account information.
* Managing client connections.
* Issuing challenges to the user to verify that they own the secret equivalent to the public key they claim to own.
* Verifying two-factor authentication challenges.
* Managing public key exchange.

####Application Security Mechanisms
* Peerio clients do not at any point in time transmit messages that are not previous encrypted using the miniLock protocol.
* The Peerio server only has access to the public keys of miniLock users. It can only act as a key exchange service, file exchange service and user account management service. All actual encryption and decryption operations are done client-side.
* Servers verify client identities by issuing a challenge to verify if a client has the secret key to their public key.
* Peerio users can also opt into a two-factor authentication feature (based on [RFC 6238](http://tools.ietf.org/html/rfc6238)).
* All server connections occur over HTTPS deployed using best-practice configurations and with Perfect Forward Secrecy compatibility.

###3. Application Decomposition
This section describes the trust boundaries, entry points, exit points, and data flows.

####Trust Boundaries
* A Peerio server node trusts information relayed to it by other server nodes.
* Peerio clients trust *some* metadata received from servers.

####Server Entry and Exit Point
* Port 443 for HTTPS requests (message sending, file downloads, etc.)
* WebSockets **(DETAILS NEEDED)**

####Data Flows
* **Account Creation Challenges**: A stateless challenge issued by the server to the client in order to determine whether an account creation process is sane. Described in §A.0.
* **Authentication Challenges**: A stateless challenge issued by the server to the client in order to determine whether they truly hold the cryptographic identity they claim to be holding. Returns a token that can be used for a single API call (such as sending or receiivng a message, or establishing a WebSocket connection for push-style notifications). Described in §A.0.
* **WebSocket Notifications**: An open WebSocket connection between the client and the server which is used by the server in order to immediately notify the client of events such as new messages and read receipts. It is only used for notifications and is not used for sending or receiving messages; those require actual single-use authentication tokens.
* **Storing Files**: Uploading files and associated metadata to the server for storage.
* **Sending Messages**: Uploading messages to the server for processing and relay.
* **Receiving Messages**: Downloading messages that are being offered by the server as belonging to the user. The integrity and authenticity of the message can be verified independently from any potentially malicious server.
* **Requesting User Information**: Obtaining user information from the server, such as a user's miniLock ID (which can then be verified using an authentication vector). Request is made using an authentication token.

###4. Threats
In the above chart, points `a`, `b`, `c`, `d`, `e` and `f` (in red) delineate possible points of attack.

Attacks will be judged according to [Microsoft's **DREAD** Risk Assessment Model](http://msdn.microsoft.com/en-us/library/aa302419.aspx#c03618429_011):
* **Damage**: How big would the damage be if the attack succeeded?
* **Reproducibility**: How easy is it to reproduce the attack?
* **Exploitability**: How much time, effort, and expertise is needed to exploit the threat?
* **Affected Users**: If a threat were exploited, what percentage of users would be affected?
* **Discoverability**: How easy is it for an attacker to discover this threat?

Each category has a minimum score of 0 and a maximum score of 10. The final DREAD score is the average of the category scores: `(D + R + E + A + D) / 5`.

#### Attack point A (User -> Browser):
##### Phishing Web Application Posing as Peerio Client
**Threat Description**: Users with little technical knowledge may be fooled by a phishing website or plugin posing as a legitimate Peerio browser client.
* **Damage**: A user could be compelled to use the phishing application to reveal personal information, including encryption keys. **Score: 10**
* **Reproducibility**: Users with little technical expertise may be susceptible to visit a website that mimics the behaviour of a legitimate Peerio extension. **Score: 6**
* **Exploitability**: Exploitability depends on the user. It is clear to users that Peerio operates exclusively as its own app, making whether a user would trust a website posing as a Peerio tab dependent on the user's technical proficiency. **Score: 5**
* **Affected Users**: Users are affected individually; however, information they reveal to the phisher may endanger others. **Score: 5**
* **Discoverability**: A phishing attempt meant to catch multiple users will likely be noticed quickly. A spear-phishing attempt would be far more difficult. **Score: 5**

##### DREAD Score: 6.2

***

##### Physical Threat to User
**Threat Description**: Someone could threaten a Peerio user to give them their Peerio passphrase under pain of torture.
* **Damage**: The user's entire data, contacts, etc. could be compromised. **Score: 9**
* **Reproducibility**: Unknown. **Score: N/A**
* **Exploitability**: If the user has deployed two-factor authentication with Peerio and the adversary does not obtain the authentication token tied to the 2FA method, this vector may not be successfully exploitable. **Score: 5**
* **Affected Users**: Users are affected individually; however, information they reveal to the phisher may endanger others. **Score: 5**
* **Discoverability**: Difficult to discover. **Score: 10**

##### DREAD Score: 7.25

***

##### Stolen Laptop
**Threat Description**: A user's laptop gets stolen.
* **Damage**: None. **Score: 1**
* **Reproducibility**: Laptop thefts are semi-common. **Score: 6**
* **Exploitability**: Depending on the laptop's physical security, this threat is likely exploitable. **Score: 6**
* **Affected Users**: Users are affected individually. **Score: 1**
* **Discoverability**: Immediately discoverable. **Score: 1**

##### DREAD Score: 3

***

##### User Forgets Passphrase
**Threat Description**: A user forgets their Peerio passphrase.
* **Damage**: The user loses access to all previous messages sent or received via Peerio. **Score: 7**
* **Reproducibility**: Not applicable. **Score: N/A**
* **Exploitability**: A passphrase reset function allows the user to regain access to their account identity. **Score: 5**
* **Affected Users**: Users are affected individually. **Score: 1**
* **Discoverability**: Immediately discoverable. **Score: 1**

##### DREAD Score: 3.5


#### Attack Point B (Browser -> Client):

##### Malicious Peerio Client Code Delivery
**Threat Description**: The user could be made to download a malicious version of the Peerio client instead of the legitimate version. The malicious version could contain backdoors and compromised encryption.
* **Damage**: A compromised client could lead to the full decryption of all messages sent and received by the user, and allow for further monitoring of the user's behavior. **Score: 10**
* **Reproducibility**: Due to Chrome's use of SSL with HSTS and certificate pinning, reproducing this on Chrome is unlikely.  **Score: 1**
* **Exploitability**: A highly considerable amount of time, effort and expertise is required for this threat to be pulled off remotely. **Score: 2**
* **Affected Users**: Depending on the malicious actor, a single user could be targeted (if the actor is a hacker connected to a LAN) or an entire nation (if the hacker is an ISP being controlled by a malicious government.) **Score: 5**
* **Discoverability**: In the majority of cases, this threat requires extensive testing of the SSL and code delivery infrastructure. **Score: 7**

##### DREAD Score: 5

***

##### Browser is Exploitable/Out of Date
**Threat Description**: A user's browser could be out of date and potentially remotely exploitable.
* **Damage**: A compromised client could lead to the full decryption of all messages sent and received by the user, and allow for further monitoring of the user's behavior. **Score: 10**
* **Reproducibility**: Chrome is by far the most secure web browser in the world. **Score: 2**
* **Exploitability**: A highly considerable amount of time, effort and expertise is required for this threat to be pulled off remotely. **Score: 2**
* **Affected Users**: Depending on the malicious actor, a single user could be targeted (if the actor is a hacker connected to a LAN) or an entire nation (if the hacker is an ISP being controlled by a malicious government.) **Score: 5**
* **Discoverability**: Discoverability could be very difficult. **Score: 9**

##### DREAD Score: 5.6

***

##### Cryptographic Break
**Threat Description**: An implementation error or protocol specification weakness leads to making message decryption possible for medium to advanced attackers.
* **Damage**: In case of an SSL compromise, any ciphertext would be theoretically decryptable once obtained. In case of no SSL compromise, the Peerio server administrator(s) would still be able to decrypt. **Score: 10**
* **Reproducibility**: A cryptographic break would be required, on top of a way to circumvent the SSL transport. **Score: 3**
* **Exploitability**: Depending on the nature of the cryptographic break, exploitability can necessitate anything from a supercomputer cluster to a single Pentium 3 machine. **Score: 8**
* **Affected Users**: Any user could be affected. **Score: 10**
* **Discoverability**: Discovering this attack is unlikely, due to the open review and auditing model. **Score: 5**

##### DREAD Score: 7.2

#### Attack Point C (Client -> Internet):
##### SSL Man-in-the-Middle
**Threat Description**: The HTTPS proxy's SSL certificate, used for authentication, could be man-in-the-middled via a Certificate Authority compromise or other means.
* **Damage**: The attacker would be able to intercept, read and modify the stream of encrypted communications sent to and from the client. However, since the client already uses client-side encryption for messages, the messages should remain integral and undeciphered. **Score: 4**
* **Reproducibility**: Measures such as HSTS, responsible CA delegation and certificate pinning in browsers make this threat difficult to reproduce. **Score: 3**
* **Exploitability**: A highly considerable amount of time, effort and expertise is required for this threat to be pulled off remotely. **Score: 3**
* **Affected Users**: Depending on the malicious actor, a single user could be targeted (if the actor is a hacker connected to a LAN) or an entire nation (if the hacker is an ISP being controlled by a malicious government.) **Score: 5**
* **Discoverability**: Depending on the Certificate Authority's operational security, the ability to control the Certificate Authority to forge certificates may be extremely easy to very difficult. Cases such as DigiNotar and even VeriSign have made this a real threat, however, even with trusted Certificate Authorities. **Score: 6**

##### DREAD Score: 4.2
***

##### Server DDoS Attack
**Threat Description**: A Peerio server could face a DoS attack that would prevent users from accessing or using their Peerio accounts.
* **Damage**: Peerio users would momentarily be unable to use Peerio. **Score: 1**
* **Reproducibility**: Bringing down the entire network appears difficult due to its decentralized and redundant nature. Usage of CDNs further makes this difficult. **Score: 4**
* **Exploitability**:  DDoS attacks require little technical know-how, but do require significant resources in most cases. **Score: 6**
* **Affected Users**: All Peerio users would be affected. **Score: 10**
* **Discoverability**: Threat requires no measures to be undertaken for discoverability. **Score: 0**

##### DREAD Score: 4.2
***

#### Attack Point D (Internet -> Peerio Server):
##### Peerio Server Compromise
**Threat Description**: A Peerio server is compromised and backdoored.
* **Damage**: No user content would be compromised, but users could have their accounts deleted or service disrupted. Monitoring a user's relational metadata could also occur. **Score: 5**
* **Reproducibility**: It is possible to secure Peerio's servers against such attacks. Methods of server hardening are known and well-studied. **Score: 5**
* **Exploitability**: Breaking into a server requires significant knowledge and skill, including obtaining a security hole either in the server's software (SSHD, HTTPD, etc.) or in the human security factors governing the server. **Score: 3**
* **Affected Users**: Everyone is affected. **Score: 10**
* **Discoverability**: Threat requires extensive penetration testing in order to discover if it *potentially* exists. **Score: 8**

##### DREAD Score: 6.2
***

#### Attack Point E (Peerio Server -> Storage Layer):
##### Azure Server Compromise
**Threat Description**: Peerio's storage layer account (Microsoft Azure by default) is compromised.
* **Damage**: The attacker can delete files or download encrypted data for later cryptanalysis. Note that miniLock-encrypted data doesn't reveal senders or recipients, therefore the amount of metadata is minimal. **Score: 2**
* **Reproducibility**: The possibility of a full remote compromise of Microsoft Azure seems quite unlikely. **Score: 2**
* **Exploitability**: Microsoft Azure does not have a history of prior compromise. **Score: 1**
* **Affected Users**: All Peerio users would be affected. **Score: 10**
* **Discoverability**: A compromise of this kind would likely be detected fairly quickly. **Score: 5**

##### DREAD Score: 4
***

###5. Vulnerabilities

No open vulnerabilities identified at present.