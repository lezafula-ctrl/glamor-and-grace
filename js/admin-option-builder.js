/* Shared dropdown builders for product options and personalisation. */
(() => {
    const definitions = {
        product: [
            { value: "size", label: "Clothing Size", name: "Size", preset: "XS, S, M, L, XL, XXL" },
            { value: "shoe-size", label: "Shoe Size", name: "Shoe Size", preset: "4, 5, 6, 7, 8, 9, 10" },
            { value: "colour", label: "Colour", name: "Colour", preset: "Pink, Black, White" },
            { value: "letter", label: "Letter (A–Z)", name: "Letter", preset: "A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z" },
            { value: "number", label: "Number (0–9)", name: "Number", preset: "0, 1, 2, 3, 4, 5, 6, 7, 8, 9" },
            { value: "length", label: "Length", name: "Length", preset: "12, 14, 16, 18, 20 inches" },
            { value: "other", label: "Other option", name: "Other", preset: "Option 1, Option 2", custom: true }
        ],
        personalisation: [
            { value: "letter", label: "Choose a Letter (A–Z)", name: "Letter", preset: "A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z" },
            { value: "number", label: "Choose a Number (0–9)", name: "Number", preset: "0, 1, 2, 3, 4, 5, 6, 7, 8, 9" },
            { value: "name", label: "Customer types a name", name: "Name", preset: "", freeText: true },
            { value: "message", label: "Customer types a message", name: "Message", preset: "", freeText: true },
            { value: "length", label: "Length", name: "Length", preset: "12, 14, 16, 18, 20 inches" },
            { value: "other", label: "Other dropdown option", name: "Other", preset: "Option 1, Option 2", custom: true }
        ]
    };

    function getDefinition(kind, value) {
        return (definitions[kind] || []).find(item => item.value === value);
    }

    function presetFor(def, kind, oldValues) {
        if (!def) return "";
        if (oldValues !== undefined) return oldValues;
        return def.preset || "";
    }

    function addRow(root, kind, initial) {
        const config = definitions[kind];
        const row = document.createElement("div");
        row.className = "gg-option-row";
        row.style.cssText = "display:grid;grid-template-columns:minmax(150px,1fr) minmax(180px,2fr) auto;gap:8px;align-items:center;margin:10px 0;";
        const type = document.createElement("select");
        type.setAttribute("aria-label", "Option type");
        type.style.cssText = "padding:9px;max-width:100%;";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Choose option type";
        type.appendChild(placeholder);
        config.forEach(def => {
            const opt = document.createElement("option");
            opt.value = def.value;
            opt.textContent = def.label;
            type.appendChild(opt);
        });

        const valueWrap = document.createElement("div");
        valueWrap.style.cssText = "display:flex;gap:6px;min-width:0;flex-wrap:wrap;";
        const customName = document.createElement("input");
        customName.type = "text";
        customName.placeholder = "Option name";
        customName.setAttribute("aria-label", "Custom option name");
        customName.style.cssText = "padding:9px;min-width:90px;flex:1;";
        const values = document.createElement("input");
        values.type = "text";
        values.placeholder = "Choices separated by commas";
        values.setAttribute("aria-label", "Available choices");
        values.style.cssText = "padding:9px;min-width:110px;flex:2;";
        valueWrap.append(customName, values);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", "Remove option");
        remove.addEventListener("click", () => {
            row.remove();
            sync(root, kind, true);
        });

        function applyType(resetValues) {
            const def = getDefinition(kind, type.value);
            customName.hidden = !def || !def.custom;
            values.hidden = !def || !!def.freeText;
            values.disabled = !def || !!def.freeText;
            if (def && resetValues) values.value = def.preset || "";
            if (def && def.custom && !customName.value) customName.value = "";
        }

        type.addEventListener("change", () => {
            applyType(true);
            sync(root, kind, true);
        });
        values.addEventListener("input", () => sync(root, kind, false));
        values.addEventListener("blur", () => sync(root, kind, true));
        customName.addEventListener("input", () => sync(root, kind, false));
        customName.addEventListener("blur", () => sync(root, kind, true));

        row.append(type, valueWrap, remove);
        row._ggControls = { type, customName, values, applyType };
        root.appendChild(row);

        if (initial) {
            type.value = initial.type || "";
            customName.value = initial.customName || "";
            values.value = initial.values || "";
            applyType(false);
        } else {
            applyType(false);
        }
        return row;
    }

    function sync(root, kind, emitChange) {
        const output = document.getElementById(root.dataset.optionOutput);
        if (!output) return;
        const lines = [];
        root.querySelectorAll(".gg-option-row").forEach(row => {
            const controls = row._ggControls;
            if (!controls || !controls.type.value) return;
            const def = getDefinition(kind, controls.type.value);
            if (!def) return;
            const name = def.custom
                ? controls.customName.value.trim()
                : def.name;
            if (!name) return;
            const values = def.freeText ? "" : controls.values.value.trim();
            lines.push(name + ":" + (values ? " " + values : ""));
        });
        output.value = lines.join("\n");
        output.dispatchEvent(new Event("input", { bubbles: true }));
        if (emitChange) output.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function resolveType(kind, name, values) {
        const clean = String(name || "").trim();
        const lowered = clean.toLowerCase();
        const defs = definitions[kind] || [];
        if (/^(colour|color)$/.test(lowered)) return defs.find(d => d.value === "colour") ? "colour" : "other";
        if (kind === "personalisation" && lowered === "name") return "name";
        if (kind === "personalisation" && /^(message|custom message)$/.test(lowered)) return "message";
        if (/^(size|clothing size)$/.test(lowered)) return "size";
        if (/^(shoe size|shoesize)$/.test(lowered)) return "shoe-size";
        if (/^letter$/.test(lowered)) return "letter";
        if (/^number$/.test(lowered)) return "number";
        if (/^(length|wig length)$/.test(lowered)) return "length";
        return "other";
    }

    function parseLines(text) {
        return String(text || "").split(/\r?\n/).map(line => {
            const item = line.trim();
            if (!item) return null;
            const i = item.indexOf(":");
            return i < 0
                ? { name: item, values: "" }
                : { name: item.slice(0, i).trim(), values: item.slice(i + 1).trim() };
        }).filter(Boolean);
    }

    function load(textareaId) {
        const output = document.getElementById(textareaId);
        const root = document.querySelector('[data-option-output="' + textareaId + '"]');
        if (!output || !root) return;
        const kind = root.dataset.kind;
        root.innerHTML = "";
        parseLines(output.value).forEach(line => {
            let values = line.values;
            const type = resolveType(kind, line.name, values);
            const def = getDefinition(kind, type);
            let customName = "";
            if (type === "other") customName = line.name;
            if (kind === "personalisation" && type === "name" &&
                /customer enters|type their|enter their/i.test(values)) values = "";
            if (kind === "personalisation" && type === "message" &&
                /customer enters|type their|enter their/i.test(values)) values = "";
            addRow(root, kind, { type, values, customName });
        });
        sync(root, kind, true);
    }

    function reset(textareaId) {
        const output = document.getElementById(textareaId);
        const root = document.querySelector('[data-option-output="' + textareaId + '"]');
        if (!output || !root) return;
        root.replaceChildren();
        output.value = "";
        output.dispatchEvent(new Event("input", { bubbles: true }));
        output.dispatchEvent(new Event("change", { bubbles: true }));
    }

    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("[data-option-output]").forEach(root => {
            const kind = root.dataset.kind;
            const output = document.getElementById(root.dataset.optionOutput);
            const addButton = document.querySelector('[data-add-option-for="' + root.dataset.optionOutput + '"]');
            if (!output || !definitions[kind]) return;
            if (addButton) addButton.addEventListener("click", () => {
                addRow(root, kind);
                sync(root, kind, true);
            });
            if (output.value.trim()) load(output.id);
            else sync(root, kind, true);
        });
    });

    window.GGOptionBuilder = { load, syncAll: () => {
        document.querySelectorAll("[data-option-output]").forEach(root => sync(root, root.dataset.kind, false));
    }, reset };
})();