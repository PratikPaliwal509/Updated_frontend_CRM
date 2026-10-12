import React, { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "@/components/shared/pageHeader/PageHeader";
import Footer from "@/components/shared/Footer";
import CreativeBuilder from "@/components/metaAds/CreativeBuilder";
import usePages from "@/components/meta/usePages";
import { PagePicker } from "@/components/meta/PagePicker";
import { adsApi, reportWrite } from "@/components/meta/adsApi";

/**
 * New creative for an ad (image, video, carousel or lead form): the creative is created in the ad
 * account and then set on the ad. The route existed in the menu but was disabled before.
 */
const CreativeCreate = () => {
    const { adId } = useParams();
    const navigate = useNavigate();
    const builder = useRef(null);
    const { pages, selected, setSelected } = usePages();
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const creativeId = await builder.current.build();
            const r = await adsApi(`/api/meta-ads/ads/${adId}`, { method: "PUT", body: { creative: { creative_id: creativeId } } });
            reportWrite(r, "New creative is now used by the ad");
            navigate(`/meta-ads/ads/${adId}/creatives`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <PageHeader>
                <h5 className="m-0 me-auto">New creative for ad {adId}</h5>
                <PagePicker pages={pages.filter((p) => p.status === "active")} selected={selected} onChange={setSelected} />
            </PageHeader>
            <div className="main-content">
                <div className="card">
                    <div className="card-body">
                        <CreativeBuilder ref={builder} pageId={selected} />
                    </div>
                    <div className="card-footer d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-light" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !selected} data-testid="save-creative">
                            {saving ? "Uploading and saving..." : "Create creative and use it"}
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default CreativeCreate;
