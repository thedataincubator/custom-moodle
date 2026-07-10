function openCenteredPopup(url, target, w, h) {
    // Get the position of the current window
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

    // Get the dimensions of the current window
    const width = window.outerWidth ? window.outerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    const height = window.outerHeight ? window.outerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    // Calculate the centered coordinates
    const left = ((width / 2) - (w / 2)) + dualScreenLeft;
    const top = ((height / 2) - (h / 2)) + dualScreenTop;

    // Open the window
    const newWindow = window.open(url, target, `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`);

    // Focus the new window if it opened successfully
    if (window.focus && newWindow) {
        newWindow.focus();
    }

    return newWindow;
}

function onNSMessage(event) {
  if (event.origin !== 'https://partners.neuralseek.com') {
    console.warn('Received message from unknown origin:', event.origin);
    return;
  }
  if (!event.data.authed) {
    console.warn('User was not authorized:', event.data);
    return;
  }
  doEmbed(event.data);
  event.source.close();
}

function showModal(okFunc) {
  const modal = document.getElementById('loginModal');
  const modalYes = document.getElementById('loginModalYes');
  const modalNo = document.getElementById('loginModalNo');

  modalYes.addEventListener('click', () => {
    okFunc();
    modal.close();
  });
  modal.showModal();
}

async function probeAndEmbed() {
  const resp = await fetch('https://partners.neuralseek.com/api/session', { method: 'GET', credentials: 'include' });
  const nsData = await resp.json();
  console.log(nsData);
  if (nsData.authed) {
    doEmbed(nsData);
    return true;
  }
  return false;
}

function doEmbed(nsData) {
  const iframe = document.querySelector('.fixed-iframe > iframe');
  const nspage = iframe.dataset.nspage;
  if (nspage) {
    iframe.src = nsData.consoleBaseUrl + nspage;
  }
}

function pollForLogin(successFunc){
  setTimeout(async () => {
    if (await probeAndEmbed()) {
      successFunc();
    } else {
      pollForLogin(successFunc);
    }
  }, 1000)
}

// Need to delay until requirejs loaded.
document.addEventListener('DOMContentLoaded', () => {

if (document.querySelector('.fixed-iframe')) {
  // Set layout width
  let loaded = false;
  const pageWrapper = document.getElementById('page-wrapper');
  const KEY = 'fixed-iframe-wrapper-width';

  function saveWrapperWidth() {
    let wrapperWidth = pageWrapper.clientWidth / window.innerWidth * 100;
    localStorage.setItem(KEY, wrapperWidth + 'vw');
    console.log(`Got wrapper width: ${wrapperWidth}`);
  }

  const observer = new ResizeObserver(mutations => {
    if (! loaded) {
      const savedWidth = localStorage.getItem(KEY);
      if (savedWidth) {
        pageWrapper.style.width = savedWidth;
      } else {
        saveWrapperWidth();
      }
      loaded = true;
      return;
    }
    if (mutations.length === 1) {
      // Resize of pane
      saveWrapperWidth();
    } else if (mutations.length == 2) {
      // Resize of window
      pageWrapper.style.width = localStorage.getItem(KEY);
    }
  });
  observer.observe(pageWrapper);
  observer.observe(document.body);

  //window.addEventListener('message', onNSMessage);
  (async () => {
    if (!await probeAndEmbed()) {
      // Trigger log-in window
      showModal(() => {
        const loginWindow = openCenteredPopup('https://partners.neuralseek.com/launchTrial.html', '_blank', 600, 800);
        pollForLogin(() => { loginWindow.close(); });
      });
    }
  })();
}

if (false) {
  // Set URL to NS instance
  const iframe = document.querySelector('.fixed-iframe > iframe');
  const nspage = iframe.dataset.nspage;
  if (nspage) {
    require(['core/ajax'], (ajax) => {
      ajax.call([{
        methodname: 'core_user_get_users_by_field',
        args: { field: 'id', values: [M.cfg.userId] }
      }])[0].done((response) => {
        const customfields = response?.[0]?.customfields ?? [];
        let nsid = null;
        for (let { shortname, value } of customfields) {
          if (shortname === 'nsid') {
            nsid = value;
          }
        }
        if (nsid) {
          console.log('Found ID', nsid);
          const nsurl = "ht" + "tps://console-partners.neuralseek.com/" + nsid + nspage;
          checkCanEmbed(nsurl).then((res) => console.log('Check embed', res));

          iframe.addEventListener('load', catchCSP(iframe, nsurl));
          iframe.src = nsurl;
        } else {
          console.warning('Unable to find NeuralSeek ID');
          console.warning(response);
        }
      }).fail((error) => {
        console.warning('Unable to load user info');
        console.warning(error);
      })
    })
  }
}

});
