window.onload = function() {

    chrome.storage.local.get(['token', 'username'], ({ token, username }) => {
        if (token) {
            document.querySelector('.logout__username').innerHTML = username
        } else {
            window.location.href = "popup_login.html"
        }
    });

    document.querySelector('.logout__btn').addEventListener('click', () => {
        chrome.storage.local.remove(['token', 'username'], function() {
            var error = chrome.runtime.lastError;
            if (error) {
                console.error(error)
            } else {
                window.location.href = "popup_login.html"
            }
        })
    })
}