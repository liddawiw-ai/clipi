// The picker belongs to the browser. Older WebViews may only report focus on cancellation.
export function selectFile(accept,multiple=false,capture){
  return new Promise((resolve,reject)=>{
    const input=document.createElement('input');
    input.type='file';input.accept=accept;input.multiple=multiple;
    if(capture)input.setAttribute('capture',capture);
    input.hidden=true;document.body.appendChild(input);
    let timer,opened=false;
    function finish(){
      const files=Array.from(input.files||[]);
      clearTimeout(timer);
      window.removeEventListener('focus',returned);
      window.removeEventListener('blur',left);
      document.removeEventListener('visibilitychange',visibility);
      input.remove();resolve(files);
    }
    function left(){opened=true;}
    function returned(){if(opened&&!document.hidden){clearTimeout(timer);timer=setTimeout(finish,600);}}
    function visibility(){if(document.hidden)left();else returned();}
    window.addEventListener('blur',left);window.addEventListener('focus',returned);
    document.addEventListener('visibilitychange',visibility);
    input.onchange=finish;input.oncancel=finish;
    try{input.click();}catch(error){reject(error);finish();}
  });
}
