export const adminSizes=['XS','S','M','L','XL','2XL','3XL','4XL'];
export const adminCategories=['home','away','third','goalkeeper','training','retro','player','international'];
export function parseAdminProduct(form:FormData){
 const text=(key:string,max:number,required=false)=>{const values=form.getAll(key);if(values.length>1||values.some(v=>typeof v!=='string'))throw Error('Invalid '+key);const value=String(values[0]??'').trim();if(value.length>max||(required&&!value))throw Error('Check '+key);return value;};
 const money=(key:string,optional=false)=>{const value=text(key,12);if(optional&&!value)return null;if(!/^(0|[1-9][0-9]{0,7})(\.[0-9]{1,2})?$/.test(value))throw Error('Enter a valid price in naira.');const [whole,fraction='']=value.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));};
 const flag=(key:string)=>{const values=form.getAll(key);if(values.length>1||values.some(v=>v!=='on'))throw Error('Invalid '+key);return values.length===1;};
 const slug=text('slug',120,true),category=text('category',30,true);if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)||!adminCategories.includes(category))throw Error('Check URL name and category.');
 const sizes=form.getAll('sizes');if(sizes.some(s=>typeof s!=='string'||!adminSizes.includes(s))||new Set(sizes).size!==sizes.length)throw Error('Check available sizes.');
 const price=money('price')!,original=money('originalPrice',true);if(original!==null&&original<=price)throw Error('Original price must exceed the selling price.');
 const inStock=flag('in_stock');if(inStock&&!sizes.length)throw Error('Choose at least one size for an in-stock jersey.');
 return {name:text('name',160,true),slug,description:text('description',3000),price_kobo:price,original_price_kobo:original,club:text('club',100)||null,league:text('league',100)||null,country:text('country',100)||null,category,season:text('season',40,true),sizes:sizes as string[],in_stock:inStock,is_active:flag('is_active'),is_new:flag('is_new'),is_featured:flag('is_featured'),is_best_seller:flag('is_best_seller'),currency:'NGN'};
}
