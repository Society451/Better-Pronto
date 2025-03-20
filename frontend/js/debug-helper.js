// Simple debug helper for path resolution issues

(function() {
    console.log('Debug helper initialized');
    
    // Log available paths
    console.log('Document location:', window.location.href);
    console.log('Document base URL:', document.baseURI);
    
    // Check if we can access various resources
    function checkResource(url) {
        fetch(url)
            .then(response => {
                console.log(`Resource ${url}: ${response.ok ? 'Available' : 'Not available'} (${response.status})`);
            })
            .catch(error => {
                console.error(`Resource ${url}: Error - ${error.message}`);
            });
    }
    
    // Check common paths for settings.html
    checkResource('/frontend/html/settings.html');
    checkResource('../html/settings.html');
    checkResource('./html/settings.html');
    checkResource('html/settings.html');
    
    // Expose helper function globally
    window.checkPath = (path) => checkResource(path);
    
    console.log('Use window.checkPath("your/path") to test additional paths');
})();
