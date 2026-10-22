
/* ========================================
   GLAMOR & GRACE - ADMIN PRODUCT UPLOAD
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("add-product-form");

    if (!form) {
        console.error("Product form not found.");
        return;
    }

    let status = document.getElementById("product-status");

    if (!status) {
        status = document.createElement("p");
        status.id = "product-status";
        status.setAttribute("role", "status");
        form.appendChild(status);
    }

    // Convert each line into a structured option.
    function parseVariants(value) {
        return value
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const separator = line.indexOf(":");

                if (separator < 1) {
                    throw new Error(
                        `Invalid product option: "${line}". Use Name: Option 1, Option 2`
                    );
                }

                const name = line.slice(0, separator).trim();
                const options = line
                    .slice(separator + 1)
                    .split(",")
                    .map(option => option.trim())
                    .filter(Boolean);

                if (!name || options.length === 0) {
                    throw new Error(
                        `Please add options after the colon in "${line}".`
                    );
                }

                return { name, options };
            });
    }

    // Format: Name | type | required/optional | extra fee | option1, option2
    function parseCustomizations(value) {
        return value
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const parts = line.split("|").map(part => part.trim());

                if (parts.length < 4) {
                    throw new Error(
                        `Invalid personalisation field: "${line}". Use Name | type | required/optional | fee`
                    );
                }

                const [name, type, requirement, feeText, optionsText = ""] = parts;
                const extra_fee = Number(feeText);

                if (!name) {
                    throw new Error("Each personalisation field needs a name.");
                }

                if (!["text", "select", "number"].includes(type.toLowerCase())) {
                    throw new Error(
                        `Unsupported personalisation type "${type}". Use text, select, or number.`
                    );
                }

                if (!["required", "optional"].includes(requirement.toLowerCase())) {
                    throw new Error(
                        `For "${name}", choose required or optional.`
                    );
                }

                if (!Number.isFinite(extra_fee) || extra_fee < 0) {
                    throw new Error(
                        `The extra fee for "${name}" must be zero or more.`
                    );
                }

                const field = {
                    name,
                    type: type.toLowerCase(),
                    required: requirement.toLowerCase() === "required",
                    extra_fee
                };

                if (field.type === "select") {
                    field.options = optionsText
                        .split(",")
                        .map(option => option.trim())
                        .filter(Boolean);

                    if (field.options.length === 0) {
                        throw new Error(
                            `Add choices for the select field "${name}".`
                        );
                    }
                }

                return field;
            });
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const button = form.querySelector('button[type="submit"]');
        const originalText = button ? button.textContent : "Add Product";

        try {
            if (typeof ggSupabase === "undefined") {
                throw new Error("Supabase has not been initialised.");
            }

            const {
                data: { user },
                error: authError
            } = await ggSupabase.auth.getUser();

            if (authError || !user) {
                throw new Error("Your session has expired. Please sign in again.");
            }

            const name = document.getElementById("product-name").value.trim();
            const category = document.getElementById("product-category").value;
            const price = Number(document.getElementById("product-price").value);
            const stock = Number(document.getElementById("product-stock").value);
            const description = document.getElementById("product-description").value.trim();
            const imageFile = document.getElementById("product-image").files[0];

            const template_key = document.getElementById("product-template").value;
            const supplierStatus = document.getElementById("supplier-availability").value;
            const checkedDate = document.getElementById("supplier-checked-date").value;
            const supplierNotes = document.getElementById("supplier-notes").value.trim();

            const variants = parseVariants(
                document.getElementById("product-variants").value
            );

            const customization_fields = parseCustomizations(
                document.getElementById("product-customizations").value
            );

            if (!name || !category || !imageFile) {
                throw new Error("Please complete the required fields and select an image.");
            }

            if (!Number.isFinite(price) || price < 0 ||
                !Number.isInteger(stock) || stock < 0) {
                throw new Error("Enter a valid price and whole-number stock quantity.");
            }

            if (!imageFile.type.startsWith("image/")) {
                throw new Error("Please select an image file.");
            }

            if (imageFile.size > 5 * 1024 * 1024) {
                throw new Error("Please choose an image smaller than 5 MB.");
            }

            if (supplierStatus === "available" && !checkedDate) {
                throw new Error(
                    "Please enter the date you confirmed supplier availability."
                );
            }

            if (button) {
                button.disabled = true;
                button.textContent = "Uploading...";
            }

            status.textContent = "Uploading image and saving product...";

            const extension = imageFile.name.split(".").pop()
                .toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

            const imagePath = `${crypto.randomUUID()}.${extension}`;

            const { error: uploadError } = await ggSupabase
                .storage
                .from("product-images")
                .upload(imagePath, imageFile, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: imageFile.type
                });

            if (uploadError) {
                throw new Error("Image upload failed: " + uploadError.message);
            }

            const { data: imageData } = ggSupabase
                .storage
                .from("product-images")
                .getPublicUrl(imagePath);

            const productData = {
                name,
                category,
                price,
                stock,
                description,
                image: imageData.publicUrl,
                template_key,
                variants,
                customization_fields,
                supplier_availability: {
                    status: supplierStatus,
                    checked_at: checkedDate || null,
                    notes: supplierNotes
                }
            };

            const { data: savedProduct, error: saveError } = await ggSupabase
                .from("products")
                .insert(productData)
                .select()
                .single();

            if (saveError) {
                throw new Error(
                    "Product details could not be saved: " + saveError.message
                );
            }

            status.textContent = `Success! "${savedProduct.name}" has been added.`;
            form.reset();

            console.log("Product saved:", savedProduct);

        } catch (error) {
            console.error("Product upload failed:", error);
            status.textContent = error.message || "Something went wrong. Please try again.";
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    });
});
