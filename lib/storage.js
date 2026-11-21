export function getStorage(defaults) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(defaults, (settings) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(settings);
    });
  });
}

export function setStorage(settings) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(settings, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}
