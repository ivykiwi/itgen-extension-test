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
  tz = tz.slice(3, -3);
  if (eval(utcHours + tz) >= 24) {
    utcHours = Math.abs(24 - eval(utcHours + tz));
  } else if (eval(utcHours + tz) < 0) {
    utcHours = Math.abs(24 + eval(utcHours + tz));
  } else {
    utcHours = Math.abs(eval(utcHours + tz))
  }
  return `${utcHours.toString().length === 1 ? `0${utcHours}` : utcHours}:${utcMinutes.toString().length === 1 ? `0${utcMinutes}` : utcMinutes}`
}

const FILL_C2D_HTML = () => `
  <div class="c2d__block" style="width: 260px; height: 40px; margin-top: 8px; display: flex; flex-direction: row; justify-content: space-between;" >
    <span style=" align-self: center; text-align: center; user-select: none;" >Поле c2d не заполнено.</span>
    <button class="btn__sendC2D" style=" align-self: center; width: 100px; height: 25px; font-size: 10.5px; display: flex; flex-direction: row; justify-content: center; text-align: center; border: 1px solid #acacac; background: #fff; cursor: pointer;">
      Заполнить
    </button>
  </div>`;

const C2D_HTML = () => `<div class="c2d__block"></div>`;

const BALANCE_HTML = (balance) => `
  <div class="balance__block">
    <span style="margin-top: 4px; font-weight: 600; color: #000; font-size: 12px;">Баланс:</span>
    <span>
      ${Object.entries(balance).map(elem => [elem[0] + 'ч', elem[1]].join(': ')).join(', ')}
    </span>
  </div>
`;

const loadDialog = (dialogId, type, _lastRequest) => {
  const loading = document.querySelector('#loading-container') ? window.getComputedStyle(document.querySelector('#loading-container')).display : '';
  if (loading === 'block') {

    setTimeout(() => {
      loadDialog(dialogId, type, _lastRequest);
    }, 200)
    return;

  } else if (_lastRequest === lastRequest) {

    const div = document.querySelector('div.left-title-dialog-container div div');
    const nameBlock = document.querySelector('.name__block');
    const childsParentsBlock = document.querySelector('.childsParents__block');
    const chatDiv = document.querySelector('div#chat-container > div');
    const divBalance = document.querySelector('.left-title-dialog-container');
    const balanceBlock = document.querySelector('.balance__block');
    const c2dBlock = document.querySelector('.c2d__block');

    if (!document.querySelector('.name__block') && div) div.innerHTML += ` &nbsp<span>Загрузка...</span>`;
    chrome.storage.local.get('token', async ({ token }) => {

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

        if (!document.querySelector('.name__block') && div) div.innerHTML = div.innerHTML.slice(0, -30);
        const phone = document.querySelector('.phone_id') && document.querySelector('.phone_id').innerText.match(/([0-9])/gi) ? document.querySelector('.phone_id').innerText.match(/([0-9])/gi).join('') : null;
        if (!phone) return;
        loadDialog(phone, 2, _lastRequest)
        return;

      } else if ((response.error === 'USER_NOT_FOUND') && (type === 2)) {

        if (!document.querySelector('.name__block') && div) div.innerHTML = div.innerHTML.slice(0, -30)
        if (!nameBlock && div) {
          div.innerHTML += `<div class="name__block"></div>`
          div.style.display = 'flex'
        };
        if (!childsParentsBlock && chatDiv) chatDiv.innerHTML = `<div class="childsParents__block"></div>${chatDiv.innerHTML}`;
        if (!balanceBlock && divBalance && response.balance) divBalance.innerHTML += BALANCE_HTML(response.balance);
        if (!c2dBlock && divBalance) divBalance.innerHTML += C2D_HTML();

        return;
      }

      if (!document.querySelector('.name__block') && div) div.innerHTML = div.innerHTML.slice(0, -30);

      if (_lastRequest === lastRequest) {

        const foundedUser = response.lead || [...response.parents, ...response.childs].find(user => user._id === response.foundedUserId);
        const getUrl = (relativePath) => `${BASE_URL}/${relativePath}`;
        const isParent = () => foundedUser.roles.includes('parent');
        const isLead = () => !foundedUser.roles;
        const isChild = () => !isParent() && !isLead();
        const getRoleName = () => isLead() ? 'лид' : (isParent() ? 'род.' : 'уч.');
        const parents = response.parents[0];

        if (!nameBlock && div) {

          div.innerHTML = div.innerHTML + `
                  <div class="name__block">
                    <span style="margin-left: 4px; cursor: ">
                      (${ getRoleName() })
                    </span>
                    <span style="padding-left: 4px; padding-right: 4px; font-weight: 600; color: #000; font-size: 12px; cursor: auto;">
                      ${foundedUser.tz ? `${createDate(foundedUser.tz)} (${foundedUser.tz})` : ''}
                    </span>
                    <span style="padding-left: 2px; padding-right: 2px; font-weight: 600; color: #000; font-size: 12px; cursor: auto;">
                      ${foundedUser.city ? foundedUser.country + ',' : foundedUser.country} ${foundedUser.city}
                    </span>&nbsp
                    ${foundedUser.familyId ? 
                      `<a href="${getUrl(`family/${foundedUser.familyId}`)}" target="_blank">
                        <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/greenhome.svg')}" alt="Семья"/>
                      </a>&nbsp` : 
                      ''
                    }
                    <a href="${ getUrl(`${ isLead() ? 'lead' : 'profile'}/${foundedUser._id }`) } " target="_blank">
                      <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/profile.svg')}" alt="Профиль" />
                    </a>
                    ${ !isChild() ? '' : ( ` &nbsp
                      <a href="${getUrl(`schedule/${foundedUser._id}`)}" target="_blank">
                        <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/calendar.svg')}" alt="Расписание"/>
                      </a> &nbsp 
                      <a href="${getUrl(`createSchedule/${foundedUser._id}`)}" target="_blank">
                        <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/plus.svg')}" alt="Записать"/>
                      </a>`
                      )
                    }
                  </div>`

          div.style.color = '#c51c1c';
          div.style.display = 'flex';

          Array.from(document.querySelector('.name__block').children).forEach((elem, index) => {
            if (index !== 0) {
              elem.addEventListener('click', e => {
                e.stopPropagation()
                return false;
              })
            }
          })

        };

        const familyUsers = isLead() ? [] : isParent() ? response.childs : response.parents;

        if (!childsParentsBlock && chatDiv && familyUsers.length) {
          chatDiv.innerHTML = `
            <div class="childsParents__block" style="position: absolute; width: auto; height: auto; border: 1px solid rgba(0,0,0,0.2); padding: 2px 10px; background: #fff; z-index: 10" >
            ${ familyUsers.map(elem => `
                      <div style="padding: 2px 0">
                        <a href="${getUrl(`profile/${elem._id}`)}"> ${elem.firstName} ${elem.lastName} </a> &nbsp 
                        ${ !isParent() ? '' : (
                          `<a href="${getUrl(`schedule/${elem._id}`)}" target="_blank">
                            <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/calendar.svg')}" alt="Расписание"/>
                          </a> &nbsp 
                          <a href="${getUrl(`createSchedule/${elem._id}`)}" target="_blank">
                            <img style="width: 15px; height: 15px" src="${chrome.extension.getURL('assets/plus.svg')}" alt="Записать"/>
                          </a>`
                          )}
                      </div>`).join('')
            }
            </div>${chatDiv.innerHTML}`;
        }

        if (!balanceBlock && divBalance && response.balance) {
          divBalance.innerHTML += BALANCE_HTML(response.balance);
        }

        if (!c2dBlock && divBalance && type === 2) {
          divBalance.innerHTML += FILL_C2D_HTML();
        } else {
          divBalance.innerHTML += C2D_HTML();
        }

        const btnC2D = document.querySelector('.btn__sendC2D');

        if (btnC2D) {
          btnC2D.addEventListener('click', () => {
            fetchResource(`${BASE_URL}/api/v1/c2d/link`, {
              method: 'POST',
              headers: {
                'authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userId: foundedUser._id,
                dialogId
              })
            }).then(() => window.location = window.location)
          })
        }

        console.log(`set dialogId: ${dialogId} `);
      }
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