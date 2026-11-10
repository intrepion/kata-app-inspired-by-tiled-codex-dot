// Minimal uncompressed ZIP writer. No dependencies, no network, UTF-8 filenames.
const enc = new TextEncoder();
export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function makeZip(entries){
 const parts=[],central=[];let offset=0;
 for(const [name,value] of Object.entries(entries)){
  const filename=enc.encode(name),data=typeof value==='string'?enc.encode(value):new Uint8Array(value),crc=crc32(data);
  const local=new Uint8Array(30+filename.length),lv=new DataView(local.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint16(12,0x21,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,filename.length,true);local.set(filename,30);
  const record=new Uint8Array(46+filename.length),cv=new DataView(record.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,0x21,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,filename.length,true);cv.setUint32(42,offset,true);record.set(filename,46);
  parts.push(local,data);central.push(record);offset+=local.length+data.length;
 }
 const centralSize=central.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,central.length,true);ev.setUint16(10,central.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
 const bytes=new Uint8Array(offset+centralSize+end.length);let cursor=0;for(const p of [...parts,...central,end]){bytes.set(p,cursor);cursor+=p.length;}return bytes;
}
