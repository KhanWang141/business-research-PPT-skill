export const MAX_FILE = 25 * 1024 * 1024;
export const MAX_TOTAL = 40 * 1024 * 1024;
export const MAX_JSON = 58 * 1024 * 1024;
export const FORMATS = {pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',ppt:'application/vnd.ms-powerpoint',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'};
export const extension = name => String(name).split('.').pop().toLowerCase();
export const formatSize = size => size < 1024*1024 ? `${Math.ceil(size/1024)} KB` : `${(size/1024/1024).toFixed(1)} MB`;
export function validateAttachments(input = []) {
  if (!Array.isArray(input) || input.length > 20) throw new Error('最多上传20个文件');
  const ids = new Set(); let total = 0;
  return input.map(a => {
    const ext = extension(a?.name), mime = FORMATS[ext];
    if (!a || typeof a.id !== 'string' || !/^[\w-]{1,100}$/.test(a.id) || ids.has(a.id)) throw new Error('附件ID无效或重复');
    ids.add(a.id);
    if (typeof mime !== 'string' || typeof a.name !== 'string' || a.name.length > 200 || /[/\\\x00-\x1f]/.test(a.name)) throw new Error('附件名称或格式无效');
    if (!['deck','photo'].includes(a.kind) || (a.kind === 'photo' ? !mime.startsWith('image/') : mime.startsWith('image/'))) throw new Error('请选择PPT/PDF初稿或PNG/JPG/WebP/GIF照片');
    if (!Number.isInteger(a.size) || a.size <= 0 || a.size > MAX_FILE || (total += a.size) > MAX_TOTAL) throw new Error('单个文件上限25MB，附件合计上限40MB');
    if (typeof a.data !== 'string' || a.data.length > Math.ceil(MAX_FILE/3)*4 || a.data.length%4!==0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(a.data)) throw new Error('附件编码无效');
    const size = a.data.length/4*3 - (a.data.endsWith('==')?2:a.data.endsWith('=')?1:0);
    if (size !== a.size) throw new Error('附件大小不匹配');
    const head = atob(a.data.slice(0,32)), bytes = [...head].map(c=>c.charCodeAt(0));
    const valid = ext === 'pptx' ? head.startsWith('PK\x03\x04') : ext === 'ppt' ? bytes.slice(0,8).join() === '208,207,17,224,161,177,26,225' : ext === 'pdf' ? head.startsWith('%PDF-') : ext === 'png' ? bytes.slice(0,8).join() === '137,80,78,71,13,10,26,10' : ['jpg','jpeg'].includes(ext) ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 : ext === 'webp' ? head.startsWith('RIFF') && head.slice(8,12)==='WEBP' : head.startsWith('GIF87a') || head.startsWith('GIF89a');
    if (!valid) throw new Error(`文件内容与扩展名不匹配：${a.name}`);
    return {id:a.id,name:a.name,kind:a.kind,mime,size:a.size,data:a.data,note:typeof a.note==='string'?a.note.slice(0,1000):''};
  });
}
