(function () {
 "use strict";
 const bucket = "review-photos", maxPhotos = 9, maxBytes = 5 * 1024 * 1024;
 const safe = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const stars = n => '<span class="gg-review-stars" aria-label="' + Number(n) + ' out of 5 stars">' + "★".repeat(Number(n)) + '<span class="gg-review-empty">' + "★".repeat(5 - Number(n)) + "</span></span>";

 async function render(product, host) {
  if (!host || typeof ggSupabase === "undefined") return;
  host.innerHTML = '<section class="gg-reviews"><h2>Customer reviews</h2><p>Loading reviews…</p></section>';
  const {data, error} = await ggSupabase.from("product_reviews")
   .select("id,reviewer_name,is_anonymous,rating,comment,photo_urls,created_at")
   .eq("product_id", String(product.id)).eq("status", "approved")
   .order("created_at", {ascending:false});
  if (error) {
   host.innerHTML = '<section class="gg-reviews"><h2>Customer reviews</h2><p>Reviews are temporarily unavailable. Please try again later.</p></section>';
   console.warn("Could not load product reviews:", error.message); return;
  }
  const reviews = data || [], avg = reviews.length ? (reviews.reduce((s,r)=>s+Number(r.rating),0)/reviews.length).toFixed(1) : null;
  const list = reviews.length ? reviews.map(r =>
   '<article class="gg-review-card"><div class="gg-review-heading"><strong>' +
   safe(r.is_anonymous ? "Anonymous customer" : r.reviewer_name || "Customer") + '</strong>' + stars(r.rating) +
   '</div><p>' + safe(r.comment) + '</p><div class="gg-review-photos">' +
   (r.photo_urls || []).map((u,i)=>'<a href="' + safe(u) + '" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="' + safe(u) + '" alt="Customer review photo ' + (i+1) + '"></a>').join("") +
   '</div><small>' + safe(new Date(r.created_at).toLocaleDateString()) + '</small></article>').join("") :
   "<p>No reviews yet. Be the first to share your experience!</p>";
  host.innerHTML = '<section class="gg-reviews"><h2>Customer reviews</h2>' +
   (avg !== null ? '<p>' + stars(Math.round(Number(avg))) + ' <strong>' + avg + '/5</strong> · ' + reviews.length + ' review(s)</p>' : '') +
   '<div class="gg-review-list">' + list + '</div><div class="gg-review-form-wrap"><h3>Share your experience</h3>' +
   '<p>Your review will be checked before it appears publicly.</p><form id="gg-review-form">' +
   '<label for="gg-review-rating">Your rating</label><select id="gg-review-rating" required><option value="">Choose stars</option>' +
   '<option value="5">★★★★★ — Loved it</option><option value="4">★★★★ — Really liked it</option><option value="3">★★★ — It was okay</option><option value="2">★★ — Not great</option><option value="1">★ — Disappointed</option></select>' +
   '<label for="gg-review-name">Your name (optional)</label><input id="gg-review-name" maxlength="60" placeholder="Enter your name">' +
   '<label class="gg-review-anon-label"><input id="gg-review-anonymous" type="checkbox"> Post anonymously</label>' +
   '<label for="gg-review-comment">Your review</label><textarea id="gg-review-comment" rows="4" maxlength="1500" minlength="5" required placeholder="Tell others about your experience"></textarea>' +
   '<label for="gg-review-photos">Add photos (up to 9; 5 MB each)</label><input id="gg-review-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple>' +
   '<p id="gg-review-photo-count">No photos selected.</p><button class="primary-button" id="gg-review-submit" type="submit">Submit review</button><p id="gg-review-status" role="status" aria-live="polite"></p></form></div></section>';

  const form=host.querySelector("#gg-review-form"), input=host.querySelector("#gg-review-photos"), count=host.querySelector("#gg-review-photo-count");
  const anon=host.querySelector("#gg-review-anonymous"), name=host.querySelector("#gg-review-name");
  anon.addEventListener("change",()=>{name.disabled=anon.checked;if(anon.checked)name.value="";});
  input.addEventListener("change",()=>{const fs=Array.from(input.files||[]);if(fs.length>maxPhotos||fs.some(f=>f.size>maxBytes||!["image/jpeg","image/png","image/webp"].includes(f.type))){count.textContent="Choose up to 9 JPG, PNG or WEBP photos, 5 MB each.";input.value="";}else count.textContent=fs.length+" photo(s) selected.";});
  form.addEventListener("submit", async e=>{
   e.preventDefault();
   const status=host.querySelector("#gg-review-status"), btn=host.querySelector("#gg-review-submit");
   const rating=Number(host.querySelector("#gg-review-rating").value), comment=host.querySelector("#gg-review-comment").value.trim(), files=Array.from(input.files||[]);
   if(!rating||comment.length<5){status.textContent="Choose a rating and write at least 5 characters.";return;}
   if(files.length>maxPhotos||files.some(f=>f.size>maxBytes||!["image/jpeg","image/png","image/webp"].includes(f.type))){status.textContent="Check your photos: up to 9 supported images, 5 MB each.";return;}
   btn.disabled=true;status.textContent="Submitting your review…";const urls=[];
   try{
    for(const file of files){const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";const path="submissions/"+crypto.randomUUID()+"."+ext;const {error:upErr}=await ggSupabase.storage.from(bucket).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});if(upErr)throw upErr;urls.push(ggSupabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);}
    const {error:saveErr}=await ggSupabase.from("product_reviews").insert({product_id:String(product.id),product_name:String(product.name||"Product").slice(0,200),reviewer_name:anon.checked?null:(name.value.trim().slice(0,60)||null),is_anonymous:anon.checked,rating,comment,photo_urls:urls,status:"pending"});
    if(saveErr)throw saveErr;
    form.reset();name.disabled=false;count.textContent="No photos selected.";status.textContent="Thank you! Your review is submitted and will appear after approval.";
   }catch(err){console.error("Review submission failed:",err);status.textContent="We couldn't submit your review. Please try again later.";}finally{btn.disabled=false;}
  });
 }

 async function initialise() {
  const host=document.getElementById("gg-product-reviews");
  const id=new URLSearchParams(window.location.search).get("id");
  if(!host || !id || typeof ggSupabase === "undefined") return;
  try {
   await productsReady;
   const product=(window.products || products || []).find(p=>String(p.id)===String(id));
   if(!product) {
    host.innerHTML='<section class="gg-reviews"><h2>Customer reviews</h2><p>Reviews will appear here when the product has loaded.</p></section>';
    console.warn("Review section: product id not found in loaded products:",id);
    return;
   }
   host.dataset.productId=String(product.id);
   await render(product,host);
  } catch(e) { console.warn("Reviews could not initialise:",e); }
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initialise,{once:true});
 else initialise();
})();