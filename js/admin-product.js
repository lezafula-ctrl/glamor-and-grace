/* GLAMOR & GRACE - PRODUCT UPLOAD */
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("add-product-form");
    if (!form) return;
    const field = id => document.getElementById(id);
    let status = field("product-status");
    if (!status) {
        status = document.createElement("p");
        status.id = "product-status";
        status.setAttribute("role", "status");
        form.appendChild(status);
    }
    function parseOptionFields(text) {
        return String(text || "").split(/\r?\n/).map(line => {
            const i = line.indexOf(":");
            if (i < 0) return { name: line.trim(), options: [] };
            return { name: line.slice(0, i).trim(), options: line.slice(i + 1).split(",").map(v => v.trim()).filter(Boolean) };
        }).filter(item => item.name);
    }
    form.addEventListener("submit", async event => {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        const originalText = button.textContent;
        try {
            const { data: authData, error: authError } = await ggSupabase.auth.getUser();
            if (authError || !authData.user) throw new Error("Your session has expired. Please sign in again.");
            window.GGOptionBuilder?.syncAll();
            const name = field("product-name").value.trim();
            const category = field("product-category").value;
            const price = Number(field("product-price").value);
            const stock = Number(field("product-stock").value);
            const description = field("product-description").value.trim();
            const variants = parseOptionFields(field("product-options").value);
            const customizationFields = parseOptionFields(field("product-personalisation").value);
            const imageFile = field("product-image").files[0];
            if (!name || !category || !imageFile) throw new Error("Please complete the required fields and select a main product image.");
            if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) throw new Error("Enter a valid price and whole-number stock quantity.");
            if (!imageFile.type.startsWith("image/")) throw new Error("Please select an image file.");
            if (imageFile.size > 5 * 1024 * 1024) throw new Error("Choose a main image smaller than 5 MB.");
            button.disabled = true;
            button.textContent = "Uploading...";
            status.textContent = "Uploading product photos and saving product...";
            const uploadImage = async file => {
                const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
                const path = crypto.randomUUID() + "." + extension;
                const { error } = await ggSupabase.storage.from("product-images").upload(path, file, {
                    cacheControl: "3600", upsert: false, contentType: file.type
                });
                if (error) throw new Error("Image upload failed: " + error.message);
                return ggSupabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
            };
            const mainImageUrl = await uploadImage(imageFile);
            const productImages = await window.GGAdminProductImages.uploadSelected("product-colour-image-fields", name);
            const { data: savedProduct, error: saveError } = await ggSupabase.from("products").insert({
                name, category, price, stock, description,
                image: mainImageUrl, image_url: mainImageUrl,
                variants, customization_fields: customizationFields,
                product_images: productImages
            }).select().single();
            if (saveError) throw new Error("Product details could not be saved: " + saveError.message);
            status.textContent = 'Success! "' + savedProduct.name + '" has been added with ' + productImages.length + ' colour photo(s).';
            form.reset();
            window.GGOptionBuilder?.reset("product-options");
            window.GGOptionBuilder?.reset("product-personalisation");
            window.GGAdminProductImages?.renderFields("product-options", "product-colour-image-fields");
            console.log("Product saved:", savedProduct);
        } catch (error) {
            console.error("Product upload failed:", error);
            status.textContent = error.message || "Something went wrong. Please try again.";
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });
});