(function installMockQiniu(globalObject) {
  if (globalObject.qiniu) return;

  globalObject.qiniu = {
    region: { z0: 'z0', z1: 'z1', z2: 'z2', na0: 'na0', as0: 'as0' },
    upload(file, key) {
      void file;
      return {
        subscribe(observer) {
          let cancelled = false;
          let percent = 0;
          const timer = globalObject.setInterval(() => {
            if (cancelled) return;
            percent = Math.min(100, percent + 25);
            observer.next?.({ total: { percent } });
            if (percent === 100) {
              globalObject.clearInterval(timer);
              observer.complete?.({ key, hash: 'mock-etag' });
            }
          }, 16);

          return {
            unsubscribe() {
              cancelled = true;
              globalObject.clearInterval(timer);
            },
          };
        },
      };
    },
  };
})(window);
