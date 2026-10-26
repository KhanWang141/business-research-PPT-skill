import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {validateProject} from './model.mjs';
import {MAX_JSON} from './assets.mjs';
import {buildFancyPrompt,codexLink,handoffMarkdown,assetPath} from './handoff.mjs';

const dashboard=fileURLToPath(new URL('.',import.meta.url));
const repository=path.dirname(dashboard);
const references=['sop.md','evidence.md','visual-design.md','interactive-html.md','production.md','templates.md','case-study.md'];
const publicFiles=new Set(['index.html','styles.css','app.mjs','model.mjs','chart.mjs','draft.mjs','handoff.mjs','README.md','assets.mjs']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.md':'text/plain; charset=utf-8'};
const csvCell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
export function createHandoffServer({exportRoot=path.join(dashboard,'exports','handoffs')}={}) {
  const token=randomBytes(32).toString('hex');
  const server=http.createServer(async(req,res)=>{
    const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    const origin=`http://127.0.0.1:${server.address().port}`;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
    if(req.headers.host!==new URL(origin).host)return json(403,{error:'仅接受本机127.0.0.1地址'});
    if(req.headers.origin&&req.headers.origin!==origin)return json(403,{error:'来源不匹配'});
    if(req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'拒绝跨站请求'});
    try {
      const url=new URL(req.url,origin);
      if(req.method==='GET'&&url.pathname==='/api/health')return json(200,{service:'ppt-codex-handoff/v1',token});
      if(req.method==='POST'&&url.pathname==='/api/handoffs'){
        if(req.headers.origin!==origin||req.headers['x-handoff-token']!==token)return json(403,{error:'请从本地看板准备项目包'});
        if(!req.headers['content-type']?.startsWith('application/json'))return json(415,{error:'仅接受JSON'});
        let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>MAX_JSON){json(413,{error:'项目包不能超过58MB（附件合计上限40MB）'});return;}chunks.push(chunk);}
        const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));let project;
        try{project=validateProject(body.project);}catch(error){return json(400,{error:error.message});}
        const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(6).toString('hex');
        const workspace=path.join(exportRoot,id);
        await fs.mkdir(path.join(workspace,'references'),{recursive:true});
        try {
          await fs.writeFile(path.join(workspace,'project.json'),JSON.stringify(project,null,2));
          await fs.mkdir(path.join(workspace,'assets'));
          for(const a of project.attachments)await fs.writeFile(path.join(workspace,assetPath(a)),Buffer.from(a.data,'base64'));
          await fs.writeFile(path.join(workspace,'assets.json'),JSON.stringify(project.attachments.map(({data,...a})=>({...a,path:assetPath(a)})),null,2));
          await fs.writeFile(path.join(workspace,'fancy-prompt.md'),project.handoff.prompt||buildFancyPrompt(project));
          await fs.writeFile(path.join(workspace,'handoff.md'),handoffMarkdown(project));
          await fs.writeFile(path.join(workspace,'sources.csv'),'\uFEFF'+[['source_id','name','location','extracted_at'],...project.sources.map(s=>[s.id,s.name,s.location,s.date])].map(r=>r.map(csvCell).join(',')).join('\r\n'));
          await fs.copyFile(path.join(repository,'SKILL.md'),path.join(workspace,'SKILL.md'));
          for(const name of references)await fs.copyFile(path.join(repository,'references',name),path.join(workspace,'references',name));
          await fs.writeFile(path.join(workspace,'bundle.json'),JSON.stringify({schema:'ppt-codex-handoff/v1',revision:project.revision,createdAt:new Date().toISOString(),generation:'not_started',rawEvidenceCopied:false,uploadedAssetsCopied:true,attachmentCount:project.attachments.length,outputFormat:'interactive-html'},null,2));
        }catch(error){await fs.rm(workspace,{recursive:true,force:true});throw error;}
        return json(201,{revision:project.revision,workspace,codexUrl:codexLink(workspace)});
      }
      let file;
      if(req.method==='GET'&&url.pathname==='/') {res.writeHead(302,{Location:'/dashboard/'});return res.end();}
      else if(req.method==='GET'&&(url.pathname==='/dashboard/'||url.pathname==='/dashboard'))file=path.join(dashboard,'index.html');
      else if(req.method==='GET'&&url.pathname.startsWith('/dashboard/')){const name=url.pathname.slice(11);if(publicFiles.has(name))file=path.join(dashboard,name);}
      if(!file)return json(404,{error:'未找到；请使用本地连接服务与看板入口'});
      const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);
    }catch(error){json(error instanceof SyntaxError?400:500,{error:error instanceof SyntaxError?'项目JSON无效':'项目包处理失败，请检查本地目录权限与文件'});}
  });
  server.requestTimeout=15000;return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),i=args.indexOf('--port'),port=i<0?8001:Number(args[i+1]);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('端口须为1—65535');
  const server=createHandoffServer();server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`AI演示工作台：http://127.0.0.1:${port}/dashboard/`));
}
