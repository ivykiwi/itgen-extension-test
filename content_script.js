const { pathname } = window.location;
const BASE_URL = 'https://staging.portal.itgen.io';

let lastRequest = 1;

const fetchResource = (input, init) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ input, init }, messageResponse => {
      const [response, error] = messageResponse;
      if (response === null) {
        reject(error);
      } else {
        const body = response.body ? new Blob([response.body]) : undefined;
        resolve(new Response(body, {
          status: response.status,
          statusText: response.statusText,
        }));
      }
    });
  });
}

const createDate = tz => {
  let utcHours = new Date().getUTCHours();
  let utcMinutes = new Date().getUTCMinutes();
  tz = tz.slice(3,-3);
  if (eval(utcHours+tz) >= 24) {
    utcHours = Math.abs(24 - eval(utcHours+tz));
  } else if (eval(utcHours+tz) < 0) {
    utcHours = Math.abs(24 + eval(utcHours+tz));
  } else {
	utcHours = Math.abs(eval(utcHours+tz))
  }
  return `${utcHours.toString().length === 1 ? `0${utcHours}` : utcHours}:${utcMinutes.toString().length === 1 ? `0${utcMinutes}` : utcMinutes }`
}

const loadDialog = (dialogId, type, _lastRequest) => {
  const loading = document.querySelector('#loading-container') ? window.getComputedStyle(document.querySelector('#loading-container')).display : '';
  if (loading === 'block') {

    setTimeout(() => {
      loadDialog(dialogId, type, _lastRequest);
    }, 200)
    return;

  } else if (_lastRequest === lastRequest) {
    let div = document.querySelector('div.left-title-dialog-container div div');
    if (div) div.innerHTML += ` &nbsp<span>Загрузка...</span>`;
    chrome.storage.local.get('token', async ({
      token
    }) => {
      if (!token) {
        if (div) div.innerHTML = div.innerHTML.slice(0, -30);
        return;
      }
      const responseBody = await fetchResource(`${BASE_URL}/api/v1/c2d/findByDialogId/${dialogId}`, {
        headers: {
          'authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const response = await responseBody.json();
      if ((response.error === 'USER_NOT_FOUND') && (type === 1)) {
        if (div) div.innerHTML = div.innerHTML.slice(0, -30);
        const phone = document.querySelector('.phone_id') && document.querySelector('.phone_id').innerText.match(/([0-9])/gi) ? document.querySelector('.phone_id').innerText.match(/([0-9])/gi).join('') : null;
        if (!phone) return;
        loadDialog(phone, 2, _lastRequest)
        return;
      } else if ((response.error === 'USER_NOT_FOUND') && (type === 2)) {
        if (div) div.innerHTML = div.innerHTML.slice(0, -30)
        return;
      }

      if (div) div.innerHTML = div.innerHTML.slice(0, -30);
      const foundedUser = [...response.parents, ...response.childs].find(user => user._id === response.foundedUserId);
      const getUrl = (relativePath) => `${BASE_URL}/${relativePath}`;
      const getRoleName = () => foundedUser.roles.includes('parent') ? 'род.' : 'уч.';
      const isParent = () => foundedUser.roles.includes('parent');
      const parents = response.parents[0];

      const divBalance = document.querySelector('.left-title-dialog-container');

      if (divBalance && response.balance) {
        divBalance.innerHTML += `
          <span style="margin-top: 4px; font-weight: 600; color: #000; font-size: 12px;">
            Баланс:
          </span>
          <span>
            ${Object.entries(response.balance).map(elem => [elem[0] + 'ч', elem[1]].join(': ')).join(', ')}
          </span>
          `
      }

      if (div) {
        div.innerHTML = div.innerHTML + `
                <span style="margin-left: 4px;">
                  (${ getRoleName() })
                </span>
                <span style="margin-left: 4px; margin-right: 4px; font-weight: 600; color: #000; font-size: 12px;">
                  ${foundedUser.tz ? `${createDate(foundedUser.tz)} (${foundedUser.tz})` : ''}
                </span>
                <span style="margin-left: 2px; margin-right: 2px; font-weight: 600; color: #000; font-size: 12px;">
                  ${foundedUser.city ? foundedUser.country + ',' : foundedUser.country} ${foundedUser.city}
                </span>
                <a href="${getUrl(`family/${foundedUser.familyId}`)}" target="_blank">
                  Семья
                </a>&nbsp
                <a href="${getUrl(`profile/${foundedUser._id}`)}" target="_blank">
                  <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/profile.svg')}" alt="Семья"/>
                </a>
                ${ isParent() ? '' : (
                  ` &nbsp<a href="${getUrl(`schedule/${foundedUser._id}`)}" target="_blank">
                    <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/calendar.svg')}" alt="Расписание"/>
                  </a> &nbsp 
                  <a href="${getUrl(`createSchedule/${foundedUser._id}`)}" target="_blank">
                    <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/plus.svg')}" alt="Записать"/>
                  </a>`
                ) }`;
        div.style.color = '#c51c1c';
      }

      const chatDiv = document.querySelector('div#chat-container > div');
      const familyUsers = isParent() ? response.childs : response.parents;
      if (chatDiv) {
        chatDiv.innerHTML = `
          <div style="position: absolute; width: auto; height: auto; border: 1px solid rgba(0,0,0,0.2); padding: 2px 10px; background: #fff; z-index: 10">
                ${familyUsers.map(elem =>
                  `<div style="padding: 2px 0">
                    <a href="${getUrl(`profile/${elem._id}`)}"> ${elem.firstName} ${elem.lastName} </a> &nbsp 
                    ${ !isParent() ? '' : (
                      `<a href="${getUrl(`schedule/${elem._id}`)}" target="_blank">
                        <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/calendar.svg')}" alt="Расписание"/>
                      </a> &nbsp 
                      <a href="${getUrl(`createSchedule/${elem._id}`)}" target="_blank">
                        <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/plus.svg')}" alt="Записать"/>
                      </a>`
                    ) }
                  </div>`).join('')}
          </div>` + chatDiv.innerHTML;
      }

      console.log(`set dialogId:${dialogId}`);
    });
  } else {
    return;
  }
}

if (pathname.includes('/chat/all') || pathname.includes('/chat/my')) {
  let lastDialogId = '';
  let loading = false;

  const check = () => {

    let queryPart = window.location.href.split('?')[1];
    if (!queryPart) return;

    let dialogId = queryPart.split('=')[1];
    if (!dialogId) return;

    if (dialogId === lastDialogId) return;
    lastRequest += 1;
    lastDialogId = dialogId;
    loadDialog(dialogId, 1, lastRequest);
  };

  setInterval(check, 200);
}