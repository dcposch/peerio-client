chrome.app.runtime.onLaunched.addListener(function() {
	var startingWidth  = window.screen.availWidth  - 500
	var startingHeight = window.screen.availHeight - 200
	chrome.app.window.create('index.html', {
		minWidth: 1100,
		minHeight: 670,
		maxWidth: 1920,
		maxHeight: 1080,
		width: startingWidth,
		height: startingHeight,
		resizable: true
	})
})
