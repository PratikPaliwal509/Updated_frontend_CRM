import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FiImage, FiVideo, FiLayers, FiFileText, FiPlus, FiTrash2 } from "react-icons/fi";
import { adsApi } from "../meta/adsApi";
import { API_BASE_URL } from "../../config/api";
import AiWriter from "@/components/ai/AiWriter";

/**
 * Ad creative builder (F-089): single image, video, carousel (2-10 cards) or lead form.
 * Files go to Meta through the CRM (images -> /api/meta-ads/images, videos -> workspace media
 * folder with a signed upload -> /api/meta-ads/videos). build() uploads what is left and creates
 * the creative; it returns the creative id. Used by the ad form and by "New creative" for an ad.
 */
const FORMATS = [
    { key: "image", label: "Single image", icon: <FiImage /> },
    { key: "video", label: "Video", icon: <FiVideo /> },
    { key: "carousel", label: "Carousel", icon: <FiLayers /> },
    { key: "lead_form", label: "Lead form", icon: <FiFileText /> },
];
const CTAS = ["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "CONTACT_US", "BOOK_TRAVEL", "DOWNLOAD", "GET_OFFER", "GET_QUOTE", "SUBSCRIBE", "APPLY_NOW", "ORDER_NOW", "WATCH_MORE"];
const label = (s) => s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch(`${API_BASE_URL}/api/meta-ads/images`, { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.message || "Image upload failed");
    const hash = json.data?.images ? Object.values(json.data.images)[0]?.hash : null;
    if (!hash) throw new Error("Facebook did not return an image hash");
    return hash;
};
const uploadVideo = async (file) => {
    const sig = (await adsApi("/api/meta-ads/media-signature", { method: "POST", body: { kind: "video" } })).data;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!sig.allowed_formats.includes(ext)) throw new Error(`Use a ${sig.allowed_formats.join(" / ")} file`);
    if (file.size > sig.max_bytes) throw new Error(`Videos can be at most ${Math.round(sig.max_bytes / 1048576)} MB`);
    const form = new FormData();
    Object.entries(sig.params).forEach(([k, v]) => form.append(k, v));
    form.append("file", file);
    const res = await fetch(sig.upload_url, { method: "POST", body: form });
    const up = await res.json().catch(() => ({}));
    if (!res.ok || !up.secure_url) throw new Error(up.error?.message || "Upload failed");
    const v = await adsApi("/api/meta-ads/videos", { method: "POST", body: { file_url: up.secure_url, title: file.name } });
    return v.data.id;
};

const CreativeBuilder = forwardRef(({ pageId, defaultName = "", hideName = false }, ref) => {
    const [format, setFormat] = useState("image");
    const [name, setName] = useState(defaultName);
    const [message, setMessage] = useState("");
    const [link, setLink] = useState("");
    const [cta, setCta] = useState("");
    const [image, setImage] = useState(null);
    const [video, setVideo] = useState(null);
    const [title, setTitle] = useState("");
    const [cards, setCards] = useState([{ file: null, link: "", name: "", description: "" }, { file: null, link: "", name: "", description: "" }]);
    const [forms, setForms] = useState([]);
    const [formId, setFormId] = useState("");
    const [formsError, setFormsError] = useState("");

    useEffect(() => {
        if (format !== "lead_form" || !pageId) return;
        setFormsError("");
        adsApi(`/api/meta-ads/lead-forms?page_id=${pageId}`)
            .then((r) => setForms(r.data?.data || []))
            .catch((e) => { setForms([]); setFormsError(e.message); });
    }, [format, pageId]);

    const setCard = (i, patch) => setCards((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));

    useImperativeHandle(ref, () => ({
        format,
        /** upload files, create the creative at Meta; returns its id */
        build: async ({ name: overrideName } = {}) => {
            const creativeName = overrideName || name;
            if (!creativeName) throw new Error("Give the creative a name");
            if (!message.trim()) throw new Error("Write the ad text");
            const body = { type: format, name: creativeName, message, link, page_id: pageId || undefined, callToAction: cta || undefined };
            if (format === "image" || format === "lead_form") {
                if (!image) throw new Error("Choose an image");
                body.imageHash = await uploadImage(image);
            }
            if (format === "lead_form") {
                if (!formId) throw new Error("Choose a lead form");
                body.leadFormId = formId;
            }
            if (format === "video") {
                if (!video) throw new Error("Choose a video");
                body.videoId = await uploadVideo(video);
                if (image) body.imageHash = await uploadImage(image);
                if (title) body.title = title;
            }
            if (format === "carousel") {
                if (cards.length < 2) throw new Error("A carousel needs at least 2 cards");
                const out = [];
                for (const [i, c] of cards.entries()) {
                    if (!c.file) throw new Error(`Card ${i + 1}: choose an image`);
                    out.push({ imageHash: await uploadImage(c.file), link: c.link || link, name: c.name || undefined, description: c.description || undefined });
                }
                body.cards = out;
            }
            const r = await adsApi("/api/meta-ads/creatives", { method: "POST", body });
            return r.data?.id;
        },
    }));

    return (
        <div className="row g-3" data-testid="creative-builder">
            <div className="col-12">
                <label className="form-label fw-semibold d-block">Ad format</label>
                <div className="btn-group flex-wrap" role="group" aria-label="Ad format">
                    {FORMATS.map((f) => (
                        <button key={f.key} type="button" className={`btn ${format === f.key ? "btn-primary" : "btn-light"}`} onClick={() => setFormat(f.key)} data-testid={`format-${f.key}`}>
                            <span className="me-1">{f.icon}</span>{f.label}
                        </button>
                    ))}
                </div>
            </div>
            {!hideName && (
                <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="cb-name">Creative name</label>
                    <input id="cb-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
            )}
            <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="cb-link">{format === "lead_form" ? "Website (optional)" : "Website link"}</label>
                <input id="cb-link" type="url" className="form-control" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
            </div>
            <div className="col-md-6">
                <label className="form-label fw-semibold" htmlFor="cb-cta">Button</label>
                <select id="cb-cta" className="form-select" value={cta} onChange={(e) => setCta(e.target.value)}>
                    <option value="">{format === "lead_form" ? "Sign up (default)" : format === "video" ? "Learn more (default)" : "No button"}</option>
                    {CTAS.map((c) => <option key={c} value={c}>{label(c)}</option>)}
                </select>
            </div>
            <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                    <label className="form-label fw-semibold mb-0" htmlFor="cb-message">Ad text</label>
                    <AiWriter kind="ad_copy" network="meta_ads" testId="ai-adcopy" label="Write ad copy with AI" context={() => ({ current_text: message })}
                        onUse={(v) => { setMessage(v.text); if (v.headline) setTitle(v.headline); if (format === "carousel" && v.description) setCards((prev) => prev.map((c) => (c.description ? c : { ...c, description: v.description.slice(0, 255) }))); }} />
                </div>
                <textarea id="cb-message" className="form-control" rows="3" maxLength={2200} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            {(format === "image" || format === "lead_form" || format === "video") && (
                <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="cb-image">{format === "video" ? "Thumbnail image (optional)" : "Image"}</label>
                    <input id="cb-image" type="file" accept="image/png,image/jpeg" className="form-control" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                </div>
            )}
            {format === "video" && (
                <>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold" htmlFor="cb-video">Video</label>
                        <input id="cb-video" type="file" accept="video/mp4,video/quicktime" className="form-control" onChange={(e) => setVideo(e.target.files?.[0] || null)} />
                        <div className="fs-11 text-muted mt-1">Without a thumbnail, Facebook's own frame is used once the video is processed.</div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold" htmlFor="cb-title">Headline (optional)</label>
                        <input id="cb-title" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                </>
            )}
            {format === "lead_form" && (
                <div className="col-md-6">
                    <label className="form-label fw-semibold" htmlFor="cb-form">Lead form of the Page</label>
                    <select id="cb-form" className="form-select" value={formId} onChange={(e) => setFormId(e.target.value)}>
                        <option value="">Choose a form</option>
                        {forms.map((f) => <option key={f.id} value={f.id}>{f.name}{f.status && f.status !== "ACTIVE" ? ` (${f.status.toLowerCase()})` : ""}</option>)}
                    </select>
                    {formsError && <div className="fs-11 text-danger mt-1">{formsError}</div>}
                    {!formsError && !forms.length && <div className="fs-11 text-muted mt-1">No lead forms on this Page yet (Meta → Lead Forms).</div>}
                </div>
            )}
            {format === "carousel" && (
                <div className="col-12">
                    <label className="form-label fw-semibold d-block">Cards ({cards.length} of 10)</label>
                    {cards.map((c, i) => (
                        <div key={i} className="border rounded p-3 mb-2" data-testid="carousel-card">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="fw-semibold fs-12">Card {i + 1}</span>
                                {cards.length > 2 && <button type="button" className="btn btn-sm btn-light-danger" onClick={() => setCards((prev) => prev.filter((_, j) => j !== i))} aria-label={`Remove card ${i + 1}`}><FiTrash2 /></button>}
                            </div>
                            <div className="row g-2">
                                <div className="col-md-6"><input type="file" accept="image/png,image/jpeg" className="form-control form-control-sm" aria-label={`Card ${i + 1} image`} onChange={(e) => setCard(i, { file: e.target.files?.[0] || null })} /></div>
                                <div className="col-md-6"><input type="url" className="form-control form-control-sm" placeholder="Card link (default: website link)" value={c.link} onChange={(e) => setCard(i, { link: e.target.value })} /></div>
                                <div className="col-md-6"><input className="form-control form-control-sm" placeholder="Headline" value={c.name} onChange={(e) => setCard(i, { name: e.target.value })} /></div>
                                <div className="col-md-6"><input className="form-control form-control-sm" placeholder="Description" value={c.description} onChange={(e) => setCard(i, { description: e.target.value })} /></div>
                            </div>
                        </div>
                    ))}
                    {cards.length < 10 && (
                        <button type="button" className="btn btn-sm btn-light" onClick={() => setCards((prev) => [...prev, { file: null, link: "", name: "", description: "" }])}>
                            <FiPlus className="me-1" />Add card
                        </button>
                    )}
                </div>
            )}
        </div>
    );
});
CreativeBuilder.displayName = "CreativeBuilder";

export default CreativeBuilder;
