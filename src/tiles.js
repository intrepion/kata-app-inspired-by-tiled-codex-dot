export const TILES = [
 [1,'Meadow','Terrain','#659778'],[2,'Clover','Terrain','#739e6d'],[3,'Earth','Terrain','#a67b54'],[4,'Footpath','Terrain','#d6b77c'],[5,'River','Terrain','#539daf'],[6,'Deep water','Terrain','#397b95'],[7,'Sand','Terrain','#e4cd96'],[8,'Flagstone','Terrain','#8c9b91'],
 [9,'Oak','Nature','#4e7859'],[10,'Pine','Nature','#365c52'],[11,'Fern','Nature','#7ca979'],[12,'Wildflowers','Nature','#e8c0b1'],[13,'Boulder','Nature','#a5b4a4'],[23,'Mushrooms','Nature','#d98a70'],[24,'Lily pads','Nature','#94b486'],
 [14,'Crate','Objects','#b68b59'],[15,'Wayfinder','Objects','#c2a77d'],[16,'Old pillar','Objects','#b4bcb0'],[17,'Bridge E–W','Objects','#ad8a63'],[18,'Bridge N–S','Objects','#ad8a63'],[19,'Fence E–W','Objects','#b69b72'],[20,'Fence N–S','Objects','#b69b72'],[21,'Start point','Objects','#efd485'],[22,'Treasure','Objects','#dfa55d']
].map(([id,name,category,color])=>({id,name,category,color}));
export const tileById = id => TILES.find(t=>t.id===id);
let cached;
export function makeAtlas(){
 if(cached)return cached;
 const c=document.createElement('canvas');c.width=256;c.height=96;const ctx=c.getContext('2d');
 for(let i=1;i<=24;i++){ctx.save();ctx.translate(((i-1)%8)*32,Math.floor((i-1)/8)*32);ctx.scale(2,2);paint(ctx,i);ctx.restore();}
 cached=c;return c;
}
export function drawTile(ctx,id,x,y,size=32){if(id>0)ctx.drawImage(makeAtlas(),((id-1)%8)*32,Math.floor((id-1)/8)*32,32,32,x,y,size,size);}
function paint(c,id){
 const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
 const dot=(x,y,color)=>r(x,y,1,1,color);
 const grass=()=>{r(0,0,16,16,'#648d65');r(0,0,16,1,'#739b6f');[[2,3],[11,2],[7,10],[13,13],[3,12]].forEach(([x,y])=>{r(x,y,2,1,'#7ba278');dot(x+1,y-1,'#7ba278');});dot(5,5,'#527c5c');dot(14,7,'#527c5c');};
 const shadow=()=>{r(3,12,11,2,'#304d484a');r(5,14,7,1,'#304d4829');};
 if(id===1||id===2){grass();if(id===2){dot(3,4,'#cbd5a0');dot(11,9,'#ced9b0');dot(7,14,'#d4c691');}return;}
 if(id===3||id===4||id===7){const colors=id===3?['#9a7953','#ae8b60','#866c50']:id===4?['#d2b77e','#e0c88f','#b7a074']:['#deca93','#e9d9aa','#cfba87'];r(0,0,16,16,colors[0]);[[2,2],[8,6],[13,12],[4,12],[12,3]].forEach(([x,y])=>r(x,y,2,1,colors[1]));dot(4,7,colors[2]);dot(10,13,colors[2]);return;}
 if(id===5||id===6){r(0,0,16,16,id===5?'#559aab':'#387f96');[[1,3],[8,9],[2,13]].forEach(([x,y])=>{r(x,y,5,1,id===5?'#76b5bf':'#5097aa');r(x+2,y+1,3,1,id===5?'#609fac':'#40889d');});return;}
 if(id===8){r(0,0,16,16,'#687f78');[[0,0,7,7],[8,0,8,7],[0,8,4,8],[5,8,10,8]].forEach(([x,y,w,h])=>{r(x,y,w,h,'#95a596');r(x,y,w,1,'#adb9a5');r(x,y+h-1,w,1,'#81958a');});return;}
 shadow();
 if(id===9){r(7,7,3,8,'#886a4e');r(7,8,1,6,'#ac8b61');r(3,4,10,7,'#3f6650');r(1,5,14,4,'#496f52');r(3,2,9,7,'#547e57');r(5,1,6,8,'#638d60');r(3,3,3,2,'#759c68');r(8,2,2,1,'#81a773');r(10,6,3,3,'#456c50');r(4,9,7,1,'#365b49');return;}
 if(id===10){r(7,8,2,7,'#987950');r(7,0,2,2,'#6b9876');r(6,2,4,2,'#5d8b6c');r(5,4,6,2,'#548468');r(4,6,8,2,'#477862');r(3,8,10,2,'#3d6a5a');r(2,10,12,2,'#355e52');r(4,7,3,1,'#699777');r(3,10,3,1,'#5e8a6b');return;}
 if(id===11){r(7,8,2,6,'#4c7854');r(4,8,3,2,'#89ac70');r(2,6,3,2,'#9bbb7c');r(9,6,4,2,'#84a66a');r(7,3,2,6,'#a1bf83');r(10,10,4,2,'#729a67');r(3,11,4,2,'#699461');return;}
 if(id===12){[[4,8,'#efd9b4'],[10,5,'#e8b4b1'],[11,11,'#f1d49b']].forEach(([x,y,color])=>{r(x,y,1,5,'#4d7856');r(x-1,y,3,2,color);dot(x,y,'#bf8e6b');});return;}
 if(id===13){r(3,9,10,5,'#70877f');r(4,6,8,6,'#94a79a');r(6,5,5,5,'#b0beb0');r(4,7,4,2,'#bfcbba');r(10,8,3,4,'#81978d');return;}
 if(id===14){r(3,4,11,10,'#71583e');r(4,5,9,8,'#ae8655');r(5,5,1,8,'#c29b67');r(11,5,1,8,'#8d6a45');r(3,6,11,1,'#d0ac72');r(3,11,11,2,'#d0ac72');r(7,7,1,4,'#87603c');return;}
 if(id===15){r(7,5,2,10,'#92724e');r(3,3,10,5,'#755e45');r(3,3,9,4,'#c1a879');r(5,4,5,1,'#856b4c');r(5,6,3,1,'#947c58');return;}
 if(id===16){r(3,12,11,3,'#879b90');r(5,4,7,9,'#a4b2a0');r(5,5,2,7,'#c2cbb4');r(4,2,9,3,'#bdc7b2');r(9,2,4,1,'#7d9787');r(8,6,4,1,'#7e9785');r(7,11,5,1,'#8ca18d');r(2,13,4,2,'#63865a');return;}
 if(id===17||id===18){c.save();if(id===18){c.translate(16,0);c.rotate(Math.PI/2);}r(0,2,16,12,'#70583e');for(let x=0;x<16;x+=4){r(x,3,3,10,'#b19265');r(x,3,1,10,'#c4a775');}r(0,2,16,2,'#d0b482');r(0,12,16,2,'#8f724f');c.restore();return;}
 if(id===19||id===20){c.save();if(id===20){c.translate(16,0);c.rotate(Math.PI/2);}r(0,6,16,2,'#c2a576');r(0,10,16,2,'#8c7151');r(2,4,2,10,'#b0976d');r(12,4,2,10,'#b0976d');dot(2,5,'#e0c28c');dot(12,5,'#e0c28c');c.restore();return;}
 if(id===21){r(7,2,2,13,'#f1e3b4');r(9,2,5,5,'#edc263');r(9,3,4,2,'#f4d68a');r(5,14,6,1,'#8e8e65');return;}
 if(id===22){r(3,6,11,8,'#74553c');r(4,4,9,8,'#b47b44');r(4,5,9,2,'#d89c55');r(3,8,11,2,'#d7b969');r(5,5,1,8,'#e9c879');r(11,5,1,8,'#e9c879');r(8,8,2,3,'#f4db84');return;}
 if(id===23){r(5,8,2,5,'#e9d0a7');r(3,6,6,3,'#c97159');r(4,5,4,3,'#e48b6c');dot(5,6,'#f7d9b4');r(11,11,1,3,'#dfccaa');r(9,9,5,2,'#c77b63');dot(11,9,'#eed4b1');return;}
 if(id===24){r(3,8,7,3,'#7da87b');r(4,7,5,5,'#91b488');r(8,7,1,3,'#58866e');r(11,4,3,3,'#779f75');r(5,7,2,2,'#e9c2c1');}
}
