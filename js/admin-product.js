
/* ========================================
   GLAMOR & GRACE - ADMIN PRODUCT UPLOAD
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("add-product-form");

    if (!form) {
        console.error("Product form not found.");
        return;
    }

    // Add a message area below the form.
    let status = document.getElementById("product-status");

    if (!status) {
        status = document.createElement("p");
        status.id = "product-status";
        status.setAttribute("role", "status");
        form.appendChild(status);
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const button = form.querySelector(
            'button[type="submit"]'
        );

        const originalText = button.textContent;

        try {
            if (typeof ggSupabase === "undefined") {
                throw new Error(
                    "Supabase has not been initialised. Check the Supabase script."
                );
            }

            const {
                data: { user },
                error: authError
            } = await ggSupabase.auth.getUser();

            if (authError || !user) {
                throw new Error(
                    "Your session has expired. Please sign in again."
                );
            }

            const name = document
                .getElementById("product-name").value.trim();

            const category = document
                .getElementById("product-category").value;

            const price = Number(
                document.getElementById("product-price").value
            );

            const stock = Number(
                document.getElementById("product-stock").value
            );

            const description = document
                .getElementById("product-description").value.trim();

            const imageFile = document
                .getElementById("product-image").files[0];

            if (!name || !category || !imageFile) {
                throw new Error(
                    "Please complete the required fields and select an image."
                );
            }

            if (!Number.isFinite(price) || price < 0 ||
                !Number.isInteger(stock) || stock < 0) {
                throw new Error(
                    "Please enter a valid price and whole-number stock quantity."
                );
            }

            if (!imageFile.type.startsWith("image/")) {
                throw new Error("Please select an image file.");
            }

            if (imageFile.size > 5 * 1024 * 1024) {
                throw new Error(
                    "Please choose an image smaller than 5 MB."
                );
            }

            button.disabled = true;
            button.textContent = "Uploading...";
            status.textContent = "Saving your product...";

            // Upload the image to Supabase Storage.
            // The "product-images" bucket must exist.
            const extension = imageFile.name.split(".").pop()
                .toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

            const imagePath =
                `${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await ggSupabase
                .storage
                .from("product-images")
                .upload(imagePath, imageFile, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: imageFile.type
                });

            if (uploadError) {
                throw new Error(
                    "Image upload failed: " + uploadError.message
                );
            }

            const { data: imageData } = ggSupabase
                .storage
                .from("product-images")
                .getPublicUrl(imagePath);

            const imageUrl = imageData.publicUrl;

            // Save product information in the database.
            const { data: savedProduct, error: saveError } =
                await ggSupabase
                    .from("products")
                    .insert({
                        name: name,
                        category: category,
                        price: price,
                        stock: stock,
                        description: description,
                        image_url: imageUrl
                    })
                    .select()
                    .single();

            if (saveError) {
                throw new Error(
                    "Product details could not be saved: " +
                    saveError.message
                );
            }

            status.textContent =
                `Success! "${savedProduct.name}" has been added.`;

            form.reset();

            console.log("Product saved:", savedProduct);

        } catch (error) {
            console.error("Product upload failed:", error);

            status.textContent =
                error.message || "Something went wrong. Please try again.";

        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    });
});
