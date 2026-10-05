(()=>{
  function openPrivacy(){
    try{sessionStorage.setItem('ts_open_privacy','1')}catch(_){}
    if(/\/login\.html(?:$|[?#])/i.test(location.pathname+location.search+location.hash)){
      location.hash='privacidad';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    location.href='login.html#privacidad';
  }
  window.tsOpenPrivacy=openPrivacy;
  document.addEventListener('click',e=>{
    const el=e.target.closest?.('[data-open-privacy]');
    if(el){e.preventDefault();openPrivacy()}
  });
})();
