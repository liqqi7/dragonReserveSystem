import fs from 'node:fs';const p='tools/compare-components.py';let c=fs.readFileSync(p,'utf8');const start=c.indexOf(" props=effective(byid[n['id']])"),end=c.indexOf(" a.save(out/",start);if(start<0||end<0)throw new Error('Missing');c=c.slice(0,start)+` original_size=a.size;crop_offset=(0,0);expected=(math.ceil(n['bounds']['width']),math.ceil(n['bounds']['height']))
 if a.width-expected[0]>1 or a.height-expected[1]>1:
  cw=min(a.width,expected[0]);ch=min(a.height,expected[1]);dx=a.width-cw;dy=a.height-ch
  factor=min(1,120/max(cw,ch));sa=a.resize((max(1,round(a.width*factor)),max(1,round(a.height*factor))),Image.Resampling.BILINEAR);sw=max(1,round(cw*factor));sh=max(1,round(ch*factor));tb=b.resize((max(1,round(b.width*factor)),max(1,round(b.height*factor))),Image.Resampling.BILINEAR)
  def score(image,reference):
   w=max(image.width,reference.width);h=max(image.height,reference.height);aa=Image.new('RGBA',(w,h),'white');bb=aa.copy();aa.alpha_composite(image);bb.alpha_composite(reference);return np.abs(np.asarray(aa).astype(np.int16)[:,:,:3]-np.asarray(bb).astype(np.int16)[:,:,:3]).mean()
  best=(float('inf'),0,0)
  for yy in range(max(0,sa.height-sh)+1):
   for xx in range(max(0,sa.width-sw)+1):
    val=score(sa.crop((xx,yy,xx+sw,yy+sh)),tb)
    if val<best[0]:best=(val,xx,yy)
  bx=round(best[1]/factor);by=round(best[2]/factor);radius=max(3,math.ceil(1/factor));best_full=(float('inf'),0,0)
  for yy in range(max(0,by-radius),min(dy,by+radius)+1):
   for xx in range(max(0,bx-radius),min(dx,bx+radius)+1):
    val=score(a.crop((xx,yy,xx+cw,yy+ch)),b)
    if val<best_full[0]:best_full=(val,xx,yy)
  crop_offset=best_full[1:];a=a.crop((crop_offset[0],crop_offset[1],crop_offset[0]+cw,crop_offset[1]+ch))
`+c.slice(end);c=c.replace("'sizeMatch':a.size==b.size", "'sourceExportSize':list(original_size),'sourceCropOffset':list(crop_offset),'sizeMatch':a.size==b.size");fs.writeFileSync(p,c);