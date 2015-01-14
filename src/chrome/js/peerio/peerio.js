// ---------------------
// Peerio
// ---------------------
//
// Peerio.

Peerio = {}

// Initialization code for some node-webkit features.
if (typeof(require) === 'function') {
	var gui = require('nw.gui')

	// Add Mac native menubar
	if (navigator.appVersion.indexOf('Mac') >= 0) {
		var win = gui.Window.get()
		var nativeMenuBar = new gui.Menu({ type: 'menubar' })
		nativeMenuBar.createMacBuiltin('Peerio')
		win.menu = nativeMenuBar
	}

	// Check for update
	setTimeout(function() {
		if (typeof(require) === 'function') {
			$('a').unbind().on('click', function(e) {
				e.preventDefault()
				gui.Shell.openExternal($(this).attr('href'))
			})
		}
		$.get(Peerio.config.updateJSON, function(info) {
			if (
				!({}).hasOwnProperty.call(info, 'latest') ||
				!({}).hasOwnProperty.call(info, 'minimum')
			) {
				return false
			}
			if (Peerio.config.buildID < info.minimum) {
				swal(
					{
						title: document.l10n.getEntitySync('updateAvailableCritical').value,
						text: document.l10n.getEntitySync('updateAvailableCriticalText').value,
						type: 'warning',
						confirmButtonText: document.l10n.getEntitySync('updateDownload').value,
						showCancelButton: false,
						confirmButtonColor: '#85c573'
					},
					function() {
						if (navigator.appVersion.indexOf('Win') >= 0) {
							gui.Shell.openExternal(Peerio.config.updateWin)
						}
						else {
							gui.Shell.openExternal(Peerio.config.updateMac)
						}
						setTimeout(function() {
							gui.App.quit()
						}, 1000)
					}
				)
			}
			else if (Peerio.config.buildID < info.latest) {
				swal(
					{
						title: document.l10n.getEntitySync('updateAvailable').value,
						text: document.l10n.getEntitySync('updateAvailableText').value,
						type: 'info',
						confirmButtonText: document.l10n.getEntitySync('updateDownload').value,
						showCancelButton: true,
						confirmButtonColor: '#85c573',
						cancelButtonText: document.l10n.getEntitySync('later').value
					},
					function() {
						if (navigator.appVersion.indexOf('Win') >= 0) {
							gui.Shell.openExternal(Peerio.config.updateWin)
						}
						else {
							gui.Shell.openExternal(Peerio.config.updateMac)
						}
					}
				)
			}
		})
	}, 100)

	// Catch process errors
	process.on('uncaughtException', function(e) { console.log(e) })
}