chrome.storage.local.get('token', function (data) {
  if (data.token) {
    chrome.browserAction.setPopup({ popup: 'popup_logout.html' });
  } else {
    chrome.browserAction.setPopup({ popup: 'popup_login.html' });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  fetch(request.input, request.init).then(function (response) {
    return response.text().then(function (text) {
      sendResponse([{
        body: text,
        status: response.status,
        statusText: response.statusText,
      }, null]);
    });
  }, function (error) {
    sendResponse([null, error]);
  });
  return true;
});