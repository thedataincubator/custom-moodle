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

const IFRAME = (src) => `<div class="fixed-iframe"><iframe src="${src}"></iframe></div>`;
const LOADING = `<span class="loading">Loading your NeuralSeek details...</span>`;
const LOGIN = `<span class="login">Please log in to NeuralSeek</span>
               <button class="login btn btn-primary">Log In</button>`;
const LOGGEDIN = (expire) => `<span class="logged-in">You are logged into NeuralSeek.  Your trial account expires at ${expire}.</span>`;
const EXPIRED = (expire) => `<span class="expired>Your NeuralSeek trail expired as of ${expire}.</span>`

async function probeAndEmbed(nsDiv) {
  const resp = await fetch('https://partners.neuralseek.com/api/session', { method: 'GET', credentials: 'include' });
  const nsData = await resp.json();
  console.log(nsData);
  if (nsData.authed) {
    if (!nsData.expired) {
      doEmbed(nsDiv, nsData);
    } else {
      nsData.innerHTML = EXPIRED(nsData.trialExpires)
    }
    return true;
  }
  return false;
}

function doEmbed(nsDiv, nsData) {
  const nspage = nsDiv.dataset.nspage ?? '/home';
  nsDiv.innerHTML = LOGGEDIN(nsData.trialExpires);
  nsDiv.insertAdjacentHTML('afterend', IFRAME(nsData.consoleBaseUrl + nspage));
  setEmbedSize();
}

function pollForLogin(nsDiv, successFunc){
  setTimeout(async () => {
    if (await probeAndEmbed(nsDiv)) {
      successFunc();
    } else {
      pollForLogin(nsDiv, successFunc);
    }
  }, 1000)
}

function setEmbedSize() {
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
}

async function loadNSEmbed() {
  const nsDiv = document.querySelector('.ns-embed');
  if (!nsDiv) { return; }

  nsDiv.innerHTML = LOADING;
  if (!await probeAndEmbed(nsDiv)) {
    nsDiv.innerHTML = LOGIN;
    const button = nsDiv.querySelector('button.login');
    button.addEventListener('click', () => {
      const loginWindow = openCenteredPopup('https://partners.neuralseek.com/launchTrial.html', '_blank', 600, 800);
      pollForLogin(nsDiv, () => { loginWindow.close(); });
    });
  }
}
loadNSEmbed();
