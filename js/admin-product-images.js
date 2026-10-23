/* Shared colour-specific product photo uploader. */
(() => {
    function parseOptions(text) {
        return String(text || "").split(/\r?\n/).map(line => {
            const i = line.indexOf(":");
            if (i < 0) return null;
            return {
                name: line.slice(0, i).trim(),
                options: line.slice(i + 1).split(",").map(v => v.trim()).filter(Boolean)
            };
        }).filter(Boolean);
    }

    function renderFields(textareaId, containerId) {
        const textarea = document.getElementById(textareaId);
        const container = document.getElementById(containerId);
        if (!textarea || !container) return;
        const definition = parseOptions(textarea.value).find(item =>
            /^(colour|color)$/i.test(item.name)
        );
        const colours = definition ? definition.options : [];
        const oldRows = new Map(
            Array.from(container.querySelectorAll(".gg-colour-photo-row"))
                .map(row => [String(row.dataset.colour || "").toLowerCase(), row])
        );

        if (!colours.length) {
            container.replaceChildren();
            const note = document.createElement("p");
            note.textContent = "Add a Colour option above to upload photos for each colour. Your main product image will be used as the default.";
            note.style.cssText = "font-size:0.9rem;color:#665760;margin:8px 0;";
            container.appendChild(note);
            return;
        }

        const heading = document.createElement("p");
        heading.textContent = "Colour-specific photos (optional). Select several photos for each colour; customers will see the matching photos when they choose that colour.";
        heading.style.cssText = "font-size:0.9rem;color:#665760;margin:8px 0;";
        const rows = [heading];

        colours.forEach(colour => {
            const key = colour.toLowerCase();
            let row = oldRows.get(key);
            if (!row) {
                row = document.createElement("div");
                row.className = "gg-colour-photo-row";
                row.style.cssText = "border:1px solid #eadde4;border-radius:10px;padding:12px;margin:10px 0;";
                const title = document.createElement("strong");
                title.className = "gg-colour-photo-title";
                row.appendChild(title);
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.accept = "image/*";
                input.style.cssText = "display:block;margin-top:8px;max-width:100%;";
                row.appendChild(input);
                const hint = document.createElement("small");
                hint.textContent = "Up to 5 MB per image.";
                hint.style.cssText = "display:block;margin-top:5px;color:#665760;";
                row.appendChild(hint);
            }
            row.dataset.colour = colour;
            row.querySelector(".gg-colour-photo-title").textContent = "Photos for " + colour;
            const input = row.querySelector('input[type="file"]');
            input.dataset.colourName = colour;
            rows.push(row);
        });
        container.replaceChildren(...rows);
    }

    function initialise(textareaId, containerId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea || !document.getElementById(containerId)) return;
        textarea.addEventListener("change", () => renderFields(textareaId, containerId));
        renderFields(textareaId, containerId);
    }

    function selectedFiles(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return Array.from(container.querySelectorAll('input[type="file"][data-colour-name]'))
            .flatMap(input => Array.from(input.files || []).map(file => ({
                colour: input.dataset.colourName,
                file
            })));
    }

    async function uploadSelected(containerId, productName) {
        const selected = selectedFiles(containerId);
        const uploaded = [];
        for (const item of selected) {
            const file = item.file;
            if (!file.type.startsWith("image/")) {
                throw new Error("Please select image files only for colour photos.");
            }
            if (file.size > 5 * 1024 * 1024) {
                throw new Error("Each colour photo must be smaller than 5 MB.");
            }
            const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
            const path = crypto.randomUUID() + "." + extension;
            const result = await ggSupabase.storage.from("product-images").upload(path, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type
            });
            if (result.error) throw new Error("Colour photo upload failed: " + result.error.message);
            const publicResult = ggSupabase.storage.from("product-images").getPublicUrl(path);
            uploaded.push({
                url: publicResult.data.publicUrl,
                color: item.colour,
                alt: productName + " - " + item.colour
            });
        }
        return uploaded;
    }

    function arrayValue(value) {
        if (typeof value === "string") {
            try { value = JSON.parse(value); } catch { return []; }
        }
        return Array.isArray(value) ? value : [];
    }

    function mergeByColour(existingValue, uploaded) {
        const existing = arrayValue(existingValue);
        if (!uploaded.length) return existing;
        const updatedColours = new Set(uploaded.map(item => String(item.color).toLowerCase()));
        return existing.filter(item =>
            !updatedColours.has(String(item.color || "").toLowerCase())
        ).concat(uploaded);
    }

    function showSavedPreview(containerId, imagesValue) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const images = arrayValue(imagesValue);
        container.replaceChildren();
        const heading = document.createElement("p");
        heading.textContent = images.length ? "Current colour photos (" + images.length + ")" : "No colour-specific photos saved yet.";
        container.appendChild(heading);
        if (!images.length) return;
        const gallery = document.createElement("div");
        gallery.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 14px;";
        images.forEach(item => {
            if (!item.url) return;
            const card = document.createElement("div");
            card.style.cssText = "width:90px;font-size:0.8rem;";
            const img = document.createElement("img");
            img.src = item.url;
            img.alt = item.alt || item.color || "Product photo";
            img.style.cssText = "width:85px;height:75px;object-fit:contain;border:1px solid #eadde4;border-radius:7px;";
            const caption = document.createElement("div");
            caption.textContent = item.color || "General";
            card.append(img, caption);
            gallery.appendChild(card);
        });
        container.appendChild(gallery);
    }

    window.GGAdminProductImages = {
        initialise,
        renderFields,
        selectedFiles,
        uploadSelected,
        mergeByColour,
        arrayValue,
        showSavedPreview
    };
    document.addEventListener("DOMContentLoaded", () => {
        initialise("product-options", "product-colour-image-fields");
        initialise("edit-product-options", "edit-product-colour-image-fields");
    });
})();