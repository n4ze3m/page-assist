const fs=require('fs');
const path=require('path');
const srcDir='src/assets/locale';
const en=JSON.parse(fs.readFileSync(path.join(srcDir,'en','review.json'),'utf8'));
function ensure(obj, tpl){
  for(const k of Object.keys(tpl)){
    if(typeof tpl[k]==='object' && tpl[k] && !Array.isArray(tpl[k])){
      obj[k]=ensure(obj[k]||{}, tpl[k]);
    } else {
      if(!(k in obj)) obj[k]=tpl[k];
    }
  }
  return obj;
}
for(const d of fs.readdirSync(srcDir)){
  if(d==='en') continue;
  const file=path.join(srcDir,d,'review.json');
  let j={};
  if(fs.existsSync(file)) j=JSON.parse(fs.readFileSync(file,'utf8'));
  j=ensure(j,en);
  fs.writeFileSync(file,JSON.stringify(j,null,2));
  console.log('Updated', file);
}
