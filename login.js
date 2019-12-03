window.onload = function() {
    
    let timer;

    chrome.storage.local.get('token', ({ token }) => {
        if (token) {
            window.location.href = "popup_logout.html"
        } else {
            document.querySelector('.login__btn').addEventListener('click', async () => {

                const username = document.querySelectorAll('.login__input')[0].value;
                const password = document.querySelectorAll('.login__input')[1].value;
        
                const response = await fetch(`https://staging.portal.itgen.io/api/v1/c2d/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
        
                const responseJson = await response.json();
                
                if (responseJson.token) {
                    chrome.storage.local.set({'token': responseJson.token})
                    window.location.href = "popup_logout.html"
                } 
                
                else {
                    if (timer) clearTimeout(timer);
                    document.querySelector('.login__error').style.opacity = '1';
                    timer = setTimeout(() => {
                        document.querySelector('.login__error').style.opacity = '0'
                    }, 2000)
                }
            })
        }
    });
}