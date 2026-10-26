import {clone,newProject,validateProject,STYLES,uid} from './model.mjs';
import {esc} from './chart.mjs';
import {buildFancyPrompt} from './handoff.mjs';
import {FORMATS,MAX_FILE,MAX_TOTAL,MAX_JSON,extension,formatSize,validateAttachments} from './assets.mjs';

const $=s=>document.querySelector(s);
const LEGACY_CACHE='business-research-dashboard-v1';
let project=newProject(),tab='brief',history=[],prepared=null,preparing=false,uploading=false;
let db=null,cacheState='正在恢复本地项目…';
const storedAssets=new Map();
const thumbnails=new Map();
function notify(message,error=false){$('#notice').textContent=message;$('#notice').classList.toggle('error',error);}
function showCache(state){cacheState=state;$('#cache-state').textContent=state;}
function openStorage(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('business-research-studio',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('projects');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('本地存储被其他窗口占用'));
  });
}
function storedProject(){
  return new Promise((resolve,reject)=>{
    const store=db.transaction('projects').objectStore('projects'),request=store.get('current');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const saved=request.result;if(saved?.storageVersion!==2){resolve(saved);return;}
      const restored=saved.project;let pending=restored.attachments.length;
      if(!pending){resolve(restored);return;}
      restored.attachments=restored.attachments.map(a=>({...a}));
      for(const a of restored.attachments){
        const asset=store.get('asset:'+a.id);
        asset.onerror=()=>reject(asset.error);
        asset.onsuccess=()=>{if(typeof asset.result!=='string'){reject(new Error('本地附件缺失，请导入备份'));return;}a.data=asset.result;storedAssets.set(a.id,a.data);if(!--pending)resolve(restored);};
      }
    };
  });
}
function persist(){
  const revision=project.revision;
  try{
    if(!db){localStorage.setItem(LEGACY_CACHE,JSON.stringify(project));showCache('已保存到当前浏览器');return;}
    const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects');
    const attachments=project.attachments,metadata={...project,attachments:attachments.map(({data,...a})=>a)};
    store.put({storageVersion:2,project:metadata},'current');
    for(const a of attachments)if(storedAssets.get(a.id)!==a.data)store.put(a.data,'asset:'+a.id);
    const ids=new Set(attachments.map(a=>a.id));
    for(const id of storedAssets.keys())if(!ids.has(id))store.delete('asset:'+id);
    tx.oncomplete=()=>{storedAssets.clear();for(const a of attachments)storedAssets.set(a.id,a.data);if(project.revision===revision)showCache('已保存到当前浏览器（含附件）');};
    tx.onerror=()=>showCache('浏览器保存失败，请下载项目备份');
    tx.onabort=()=>showCache('浏览器保存失败，请下载项目备份');
  }catch{showCache('浏览器保存失败，请下载项目备份');}
}
function cache(){showCache('正在保存…');persist();}
function checkpoint(){history.push({...clone({...project,attachments:[]}),attachments:project.attachments});if(history.length>20)history.shift();}
function invalidateHandoff(){prepared=null;const host=$('#handoff-result');if(host)host.innerHTML=handoffResult();const status=$('#delivery-status');if(status)status.textContent='项目已修改，请重新准备材料包。';}
function changed(redraw=true){project.revision++;project.handoff.prompt='';invalidateHandoff();cache();if(redraw)draw();else drawSummary();}
function navigate(next){tab=next==='delivery'?'delivery':'brief';if(location.hash.slice(1)!==tab)location.hash=tab;else draw();}
function drawSummary(){
  $('#project-summary').textContent=[project.brief.name,`${project.attachments.filter(a=>a.kind==='deck').length} 份初稿`,`${project.attachments.filter(a=>a.kind==='photo').length} 张照片`,project.brief.language].join(' / ');
  $('#cache-state').textContent=cacheState;$('#undo').disabled=!history.length||uploading;$('#import-project').disabled=uploading;
}
function field(label,key,value,type='text'){return `<label>${label}<input type="${type}" data-brief="${key}" value="${esc(value)}" ${type==='number'?'min="1" max="50"':'maxlength="200"'}></label>`;}
function photoURL(a){
  const existing=thumbnails.get(a.id);if(existing?.data===a.data)return existing.url;
  if(existing)URL.revokeObjectURL(existing.url);
  const bytes=Uint8Array.from(atob(a.data),c=>c.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:a.mime}));thumbnails.set(a.id,{data:a.data,url});return url;
}
function attachmentCards(kind){
  const files=project.attachments.filter(a=>a.kind===kind);
  if(!files.length)return `<div class="attachment-empty">${kind==='deck'?'上传已有 PPT，Codex 会以原稿内容为基础渲染。':'上传品牌、产品、场景或视觉参考照片。'}</div>`;
  return `<div class="attachment-grid ${kind==='deck'?'deck-grid':''}">${files.map(a=>`<article class="attachment-card">
    ${kind==='photo'?`<a href="${photoURL(a)}" target="_blank" rel="noopener" class="photo-link" aria-label="查看照片：${esc(a.name)}"><img src="${photoURL(a)}" alt="${esc(a.name)}" loading="lazy"></a>`:`<div class="file-icon" aria-hidden="true">${esc(extension(a.name).toUpperCase())}</div>`}
    <div class="attachment-body"><div class="attachment-heading"><strong title="${esc(a.name)}">${esc(a.name)}</strong><button class="button small danger" data-remove-asset="${a.id}" aria-label="移除 ${esc(a.name)}" ${uploading?'disabled':''}>移除</button></div>
    <p class="muted">${formatSize(a.size)}</p><label>${kind==='photo'?'照片用途 / 对应页':'初稿说明 / 重点修改'}<textarea data-asset-note="${a.id}" rows="2" maxlength="1000" placeholder="${kind==='photo'?'例如：用于封面，保留产品主体':'例如：保留原稿页序，重点优化第3—5页'}">${esc(a.note)}</textarea></label></div>
  </article>`).join('')}</div>`;
}
function briefView(){return `<section class="panel">
  <div class="section-heading"><h2>填写项目简报</h2><span class="badge">01 / 明确需求</span></div>
  <p class="muted">告诉 Codex 这份演示要讲给谁、达成什么目标。已有 PPT 和照片可直接上传，无需逐页录入。</p>
  <div class="form-grid">
    ${field('项目名称','name',project.brief.name)}${field('国家 / 区域','country',project.brief.country)}
    ${field('主品牌 / 合作品牌','brand',project.brief.brand)}${field('受众','audience',project.brief.audience)}
    <label>演示语言<select data-brief="language">${['中文','英语','葡萄牙语','西班牙语','其他'].map(x=>`<option ${project.brief.language===x?'selected':''}>${x}</option>`).join('')}</select></label>
    ${field('目标页数（参考，优先保留原稿内容）','targetPages',project.brief.targetPages,'number')}
    <label class="full">业务目标与希望促成的决策<textarea data-brief="goal" rows="3" maxlength="3000" placeholder="例如：面向业务负责人展示市场机会，促成试点合作。">${esc(project.brief.goal)}</textarea></label>
    <label>信息密度<select id="density"><option value="present" ${project.design.density==='present'?'selected':''}>现场讲述 · 精简重点</option><option value="read" ${project.design.density==='read'?'selected':''}>独立阅读 · 保留解释</option></select></label>
    <label>视觉方向<select id="style">${Object.entries(STYLES).map(([k,s])=>`<option value="${k}" ${project.design.style===k?'selected':''}>${s.name}</option>`).join('')}</select></label>
  </div>
</section>
<section class="panel spacing-top">
  <div class="section-heading"><div><h2>上传初步 PPT</h2><p class="muted">支持 PPTX、PPT 或 PDF。保留原稿内容，结合简报优化排版与交互。</p></div><button class="button primary" id="upload-deck" ${uploading?'disabled':''}>${uploading?'正在读取…':'＋ 上传初稿'}</button></div>
  ${attachmentCards('deck')}
</section>
<section class="panel spacing-top">
  <div class="section-heading"><div><h2>照片与视觉参考</h2><p class="muted">支持 JPG、PNG、WebP、GIF，可多选。填写用途，让 Codex 知道如何使用。</p></div><button class="button" id="upload-photos" ${uploading?'disabled':''}>＋ 上传照片</button></div>
  ${attachmentCards('photo')}
  <p class="muted spacing-top">单个文件不超过 25 MB，最多 20 个，合计不超过 40 MB。附件保存在本机浏览器，准备交接时一起写入项目包。</p>
  <div class="actions"><button class="button primary" data-go="delivery" ${uploading?'disabled':''}>下一步：交付给 Codex →</button><span class="muted">已上传 ${project.attachments.length} 个文件 · ${formatSize(project.attachments.reduce((sum,a)=>sum+a.size,0))}</span></div>
</section>`;}
function handoffResult(){return prepared?`<div class="handoff-ready"><span class="badge verified">项目包已准备 · 版本 ${prepared.revision}</span><p class="muted spacing-top">${esc(prepared.workspace)}</p><a class="button primary" href="${esc(prepared.codexUrl)}">在 Codex 中继续 ↗</a><p class="muted spacing-top">打开后发送预填任务。若链接未打开，可在 Codex 打开上方目录并发送：请读取 handoff.md，完成交互式 HTML 演示。</p></div>`:'<p class="muted">准备后会显示本机项目目录和 Codex 入口。</p>';}
function deliveryView(){
  const decks=project.attachments.filter(a=>a.kind==='deck'),photos=project.attachments.filter(a=>a.kind==='photo');
  return `<div class="two-col"><section class="panel">
    <div class="section-heading"><h2>交付给 Codex</h2><span class="badge">02 / 渲染全稿</span></div>
    <p class="muted">Codex 读取简报、初步 PPT 和照片，直接制作交互式 HTML 演示全稿。</p>
    <label>视觉表现程度<select data-handoff="level">${[['restrained','克制精致'],['editorial','杂志质感'],['expressive','更有表现力']].map(([k,v])=>`<option value="${k}" ${project.handoff.level===k?'selected':''}>${v}</option>`).join('')}</select></label>
    <label>补充设计与交互要求<textarea data-handoff="notes" rows="4" maxlength="3000" placeholder="例如：保留初稿页序；封面用上传照片；图表支持悬停查看数值，添加页码导航。">${esc(project.handoff.notes)}</textarea></label>
    <details class="prompt-details"><summary>查看或编辑给 Codex 的完整任务</summary><label class="spacing-top">任务说明<textarea id="fancy-prompt" rows="16" maxlength="24000">${esc(project.handoff.prompt||buildFancyPrompt(project))}</textarea></label><button class="button small" id="reset-prompt">按当前简报重置任务</button><p class="muted spacing-top">修改简报、附件或设计要求后，任务说明会按最新内容重新生成。</p></details>
    <div class="deliver-step"><button class="button primary" id="prepare-handoff" ${preparing||uploading?'disabled':''}>${preparing?'正在准备项目包…':'准备项目包，交给 Codex'}</button><div id="handoff-result" class="spacing-top">${handoffResult()}</div></div>
    <div class="actions"><button class="button" id="download-task">下载任务说明</button><button class="button" id="delivery-save">下载项目与附件</button><button class="button" data-go="brief">返回修改简报</button></div>
    <p class="muted spacing-top">准备本机项目包需通过仓库的本地服务打开看板。静态预览可下载项目 JSON 与任务说明，再一起提供给 Codex；附件二进制保存在 JSON 的 base64 字段中。</p>
  </section><aside class="panel delivery-summary">
    <h2>本次交接</h2><dl class="handoff-summary"><dt>项目</dt><dd>${esc(project.brief.name)}</dd><dt>初步 PPT / PDF</dt><dd>${decks.length} 份</dd><dt>照片与参考</dt><dd>${photos.length} 张</dd><dt>交付格式</dt><dd>交互式 HTML 演示全稿</dd></dl>
    ${!decks.length?'<p class="inline-note">尚未上传初稿。可以先交接简报，Codex 会说明需要补充的原稿内容。</p>':''}
    <div class="deliver-step"><h3>基于你的材料</h3><p class="muted">以初步 PPT 为内容基线，结合业务目标优化视觉；按照片用途安排配图。</p></div>
    <div class="deliver-step"><h3>可播放、可交互</h3><p class="muted">切页、键盘、页码导航、全屏，以及适合内容的图表交互。支持文字与可提取图表数据编辑、JSON 保存恢复。</p></div>
    <div class="deliver-step"><h3>交付状态</h3><p class="muted" id="delivery-status">${prepared?'材料包已准备，等待在 Codex 发送任务。':'等待准备材料包。'} 最终文件与检查报告由 Codex 生成，保存在项目包的 outputs/ 目录。</p></div>
  </aside></div>`;
}
function draw(){
  drawSummary();
  for(const [id,thumb] of thumbnails)if(!project.attachments.some(a=>a.id===id&&a.data===thumb.data)){URL.revokeObjectURL(thumb.url);thumbnails.delete(id);}
  document.querySelectorAll('[data-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.tab===tab));b.tabIndex=b.dataset.tab===tab?0:-1;});
  $('#workspace').setAttribute('aria-labelledby','tab-'+tab);$('#workspace').innerHTML=tab==='delivery'?deliveryView():briefView();
}
function download(name,body,type='application/json'){
  const url=URL.createObjectURL(new Blob([body],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function save(){download('project.json',JSON.stringify(project,null,2));notify('项目 JSON 已下载，包含简报、初稿和照片，可重新导入恢复。');}
function readFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('文件读取失败：'+file.name));reader.readAsDataURL(file);});}
async function uploadFiles(input,kind){
  const files=[...input.files];input.value='';if(!files.length||uploading)return;
  uploading=true;draw();
  try{
    if(files.length+project.attachments.length>20)throw new Error('最多上传20个文件');
    if(files.reduce((n,f)=>n+f.size,0)+project.attachments.reduce((n,a)=>n+a.size,0)>MAX_TOTAL)throw new Error('附件合计不能超过40MB');
    for(const f of files){const mime=FORMATS[extension(f.name)];if(!mime||(kind==='photo'?!mime.startsWith('image/'):mime.startsWith('image/')))throw new Error('请选择对应格式的初稿或照片');if(f.size<=0||f.size>MAX_FILE)throw new Error('文件不能为空，单个文件不能超过25MB');}
    const incoming=[];
    for(const f of files)incoming.push({id:uid('A'),name:f.name,kind,mime:FORMATS[extension(f.name)],size:f.size,data:await readFile(f),note:''});
    const next=validateAttachments([...project.attachments,...incoming]);checkpoint();project.attachments=next;changed(false);notify(`已添加 ${files.length} 个文件，将随项目包一起交给 Codex。`);
  }catch(error){notify('上传失败，现有附件保留：'+error.message,true);}finally{uploading=false;draw();}
}
async function prepareHandoff(){
  if(preparing||uploading)return;
  const snapshot=JSON.stringify(project);preparing=true;draw();
  try{
    const health=await fetch('/api/health',{cache:'no-store'});if(!health.ok)throw new Error('请使用 node dashboard/serve.mjs --port 8001 启动本地服务');
    const config=await health.json();if(config.service!=='ppt-codex-handoff/v1')throw new Error('当前服务不支持本机项目包，请使用仓库启动命令');
    const response=await fetch('/api/handoffs',{method:'POST',headers:{'Content-Type':'application/json','X-Handoff-Token':config.token},body:`{"project":${snapshot}}`});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'项目包准备失败');
    if(JSON.stringify(project)!==snapshot)throw new Error('准备期间项目已变化，请重新准备最新版本');
    prepared=result;notify('项目包已存入本机，包含实际初稿和照片。点击“在 Codex 中继续”并发送任务。');
  }catch(error){notify('未完成交接：'+error.message,true);}finally{preparing=false;draw();}
}
$('#save-project').onclick=save;
$('#import-project').onclick=()=>$('#project-file').click();
$('#undo').onclick=()=>{if(!history.length||uploading)return;project=history.pop();invalidateHandoff();cache();draw();notify('已撤销上一步修改。');};
$('#project-file').onchange=async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  try{if(f.size>MAX_JSON)throw new Error('项目文件不能超过58MB');const restored=validateProject(JSON.parse(await f.text()));checkpoint();project=restored;invalidateHandoff();cache();draw();notify('已恢复项目简报与全部附件。');}catch(error){notify('导入失败，现有项目保留：'+error.message,true);}
};
$('#deck-files').onchange=e=>uploadFiles(e.target,'deck');
$('#photo-files').onchange=e=>uploadFiles(e.target,'photo');
document.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el)return;
  if(el.dataset.tab){navigate(el.dataset.tab);return;}if(el.dataset.go){navigate(el.dataset.go);return;}
  if(el.id==='upload-deck'){$('#deck-files').click();return;}if(el.id==='upload-photos'){$('#photo-files').click();return;}
  if(el.dataset.removeAsset){checkpoint();project.attachments=project.attachments.filter(a=>a.id!==el.dataset.removeAsset);changed();notify('附件已移除，可撤销恢复。');return;}
  if(el.id==='delivery-save'){save();return;}if(el.id==='download-task'){download('fancy-prompt.md',project.handoff.prompt||buildFancyPrompt(project),'text/markdown;charset=utf-8');notify('任务说明已下载，请同时提供项目 JSON 或本机项目包。');return;}
  if(el.id==='reset-prompt'){checkpoint();changed();notify('已按当前简报重新生成任务说明。');return;}
  if(el.id==='prepare-handoff')prepareHandoff();
});
function editField(el){
  if(el.dataset.brief){const key=el.dataset.brief,value=key==='targetPages'?Number(el.value):el.value.slice(0,key==='goal'?3000:200);if(key==='targetPages'&&(!Number.isInteger(value)||value<1||value>50))throw new Error('目标页数须为1—50');if(project.brief[key]===value)return;checkpoint();project.brief[key]=value;changed(false);return;}
  if(el.dataset.assetNote){const a=project.attachments.find(a=>a.id===el.dataset.assetNote);if(!a||a.note===el.value)return;checkpoint();project.attachments=project.attachments.map(a=>a.id===el.dataset.assetNote?{...a,note:el.value.slice(0,1000)}:a);changed(false);return;}
  if(el.dataset.handoff||el.id==='fancy-prompt'){const key=el.dataset.handoff||'prompt',value=el.value.slice(0,key==='prompt'?24000:3000);if(project.handoff[key]===value)return;checkpoint();project.handoff[key]=value;if(key==='prompt'){project.revision++;invalidateHandoff();cache();drawSummary();}else{changed(false);const prompt=$('#fancy-prompt');if(prompt)prompt.value=buildFancyPrompt(project);}return;}
  if(el.id==='density'||el.id==='style'){const key=el.id==='style'?'style':'density';if(project.design[key]===el.value)return;checkpoint();project.design[key]=el.value;if(key==='style')project.design.accent=STYLES[el.value].accent;changed(false);}
}
for(const event of ['input','change'])document.addEventListener(event,e=>{try{editField(e.target);}catch(error){notify(error.message,true);}});
document.querySelectorAll('[role=tab]').forEach((button,index,all)=>button.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const target=e.key==='Home'?0:e.key==='End'?all.length-1:(index+(e.key==='ArrowRight'?1:-1)+all.length)%all.length;all[target].focus();navigate(all[target].dataset.tab);
}));
window.addEventListener('hashchange',()=>{tab=location.hash.slice(1)==='delivery'?'delivery':'brief';draw();});
try{
  try{db=await openStorage();}catch{showCache('使用浏览器兼容存储，大附件请及时下载备份');}
  const stored=db?await storedProject():null;
  const legacy=stored?null:localStorage.getItem(LEGACY_CACHE);
  if(stored||legacy){project=validateProject(stored||JSON.parse(legacy));if(!stored&&db)persist();else showCache('已恢复本地项目（含附件）');}
  else showCache('当前项目尚未保存');
}catch(error){showCache('本地恢复失败，请导入项目备份');notify('本地缓存未恢复：'+error.message,true);}
tab=location.hash.slice(1)==='delivery'?'delivery':'brief';draw();
