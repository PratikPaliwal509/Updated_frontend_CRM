import React, { useEffect, useRef, useState } from "react";
import {
    useNavigate,
    useParams
} from "react-router-dom";
import { toast } from "react-toastify";
import { API_BASE_URL } from '../../config/api';
import usePages from '../meta/usePages';
import { useAdCurrency, toMajor, reportWrite } from '../meta/adsApi';
import CreativeBuilder from './CreativeBuilder';

const API_URL = `${API_BASE_URL}`;

const MetaAdForm = ({
    type,
    initialData = {},
    editId = null
}) => {

    const navigate = useNavigate();
    const { currency } = useAdCurrency();
    const creativeRef = useRef(null);
    // the ad's Facebook Page: one of the workspace's connected Pages (never a server-wide setting)
    const { pages, selected: selectedPage, setSelected: setSelectedPage } = usePages();
    const pageSelect = (
        <div className="col-md-6">
            <label className="form-label fw-semibold">Facebook Page</label>
            <select className="form-select" value={selectedPage || ""} onChange={(e) => setSelectedPage(e.target.value)} data-testid="ad-page-picker">
                {!pages.length && <option value="">No connected Page - connect one in Settings → Integrations</option>}
                {pages.map((p) => <option key={p.meta_page_id} value={p.meta_page_id}>{p.name}</option>)}
            </select>
        </div>
    );

    const {
        campaignId,
        adSetId
    } = useParams();

    // =========================================
    // FORM STATE
    // =========================================

    const [form, setForm] = useState({

        // Common
        name:
            initialData.name ||
            "",

        status:
            initialData.status ||
            "PAUSED",

        // Campaign
        objective:
            initialData.objective ||
            "",

        // Ad Set
        // budgets / bids are typed in the ad account currency (major units); Meta's stored
        // minor-unit values are converted once the currency is known (effect below)
        dailyBudget:
            initialData.dailyBudget ||
            "",

        optimizationGoal:
            initialData.optimizationGoal ||
            initialData.optimization_goal ||
            "LINK_CLICKS",

        billingEvent:
            initialData.billingEvent ||
            initialData.billing_event ||
            "IMPRESSIONS",

        bidStrategy:
            initialData.bidStrategy ||
            initialData.bid_strategy ||
            "LOWEST_COST_WITHOUT_CAP",

        bidAmount:
            initialData.bidAmountMajor ||
            "",
        ageMin:
            initialData.ageMin ||
            initialData.age_min ||
            18,

        ageMax:
            initialData.ageMax ||
            initialData.age_max ||
            45,

        country:
            initialData.country ||
            "IN",

        advantageAudience:
            initialData.advantageAudience ??
            0,

        // Ad
        adSetId:
            initialData.adSetId ||
            initialData.adset_id ||
            "",

        creativeId:
            initialData.creativeId ||
            initialData.creative_id ||
            "",

        // Creative
        creativeName:
            initialData.creativeName ||
            "",

        message:
            initialData.message || initialData?.object_story_spec?.link_data?.message ||
            "",

        link:
            initialData.link || initialData?.object_story_spec?.link_data?.link ||
            "",

        imageHash:
            initialData.imageHash ||
            initialData.image_hash ||
            "",

        // New image
        image:
            null
    });

    // edit: Meta returns budgets / bids in the currency's minor unit -> show major units
    useEffect(() => {
        if (!currency) return;
        setForm((f) => ({
            ...f,
            dailyBudget: f.dailyBudget || (initialData.daily_budget ? String(toMajor(initialData.daily_budget, currency)) : ""),
            bidAmount: f.bidAmount || (initialData.bid_amount ? String(toMajor(initialData.bid_amount, currency)) : ""),
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency, initialData.daily_budget, initialData.bid_amount]);

    const [loading, setLoading] =
        useState(false);

    // =========================================
    // HANDLE CHANGE
    // =========================================

    const handleChange = (e) => {

        const {
            name,
            value,
            files
        } = e.target;

        if (name === "image") {

            setForm((prev) => ({
                ...prev,
                image:
                    files?.[0] ||
                    null
            }));

            return;
        }

        setForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    // =========================================
    // CREATE AD
    // =========================================

    const createAd = async (
        token,
        creativeId
    ) => {

        const actualAdSetId =
            adSetId ||
            form.adSetId;

        if (!actualAdSetId) {

            throw new Error(
                "Ad Set ID is missing"
            );
        }

        const adData = {

            name:
                form.name,

            adSetId:
                actualAdSetId,

            creativeId:
                creativeId,

            status:
                form.status
        };


        const res = await fetch(
            `${API_URL}/api/meta-ads/ads`,
            {
                method: "POST",

                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        adData
                    )
            }
        );

        const result =
            await res.json();


        if (!res.ok) {

            throw new Error(
                result.message ||
                "Ad creation failed"
            );
        }

        return result;
    };

    // =========================================
    // UPDATE AD
    // =========================================

    const updateAd = async (token) => {

        if (!editId) {

            throw new Error(
                "Ad ID is missing"
            );
        }

        const adData = {

            name:
                form.name,

            status:
                form.status

        };


        const res = await fetch(
            `${API_URL}/api/meta-ads/ads/${editId}`,
            {
                method: "PUT",

                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        adData
                    )
            }
        );

        const result =
            await res.json();


        if (!res.ok) {

            throw new Error(
                result.message ||
                "Ad update failed"
            );
        }

        return result;
    };

    // =========================================
    // SUBMIT
    // =========================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        setLoading(true);

        try {

            const token =
                localStorage.getItem("token");

            // =====================================
            // AD
            // =====================================

            if (type === "ad") {

                // ---------------------------------
                // EDIT AD
                // ---------------------------------

                if (editId) {

                    toast.info(
                        "Updating ad..."
                    );

                    await updateAd(token);

                    toast.success(
                        "Ad updated successfully"
                    );

                    navigate(-1);

                    return;
                }

                // ---------------------------------
                // CREATE AD
                // ---------------------------------

                const actualAdSetId =
                    adSetId ||
                    form.adSetId;

                if (!actualAdSetId) {

                    toast.error(
                        "Ad Set ID is missing"
                    );

                    return;
                }

                // STEP 1 + 2: upload media and create the creative (any format)
                toast.info(
                    "Uploading media and creating the creative..."
                );

                const creativeId =
                    await creativeRef.current.build({ name: form.creativeName || `${form.name} Creative` });

                // STEP 3
                toast.info(
                    "Creating ad..."
                );

                await createAd(
                    token,
                    creativeId
                );

                toast.success(
                    "Ad, creative and image created successfully"
                );

                navigate(-1);

                return;
            }

            // =====================================
            // OTHER TYPES
            // =====================================

            let endpoint = "";
            let requestData = {};

            // =====================================
            // CAMPAIGN
            // =====================================

            if (type === "campaign") {

                endpoint = editId
                    ? `/api/meta-ads/campaigns/${editId}`
                    : `/api/meta-ads/campaigns`;

                requestData = {

                    name:
                        form.name,

                    objective:
                        form.objective,

                    status:
                        form.status
                };
            }

            // =====================================
            // AD SET
            // =====================================

            if (type === "adset") {

                if (editId) {

                    endpoint =
                        `/api/meta-ads/adsets/${editId}`;

                } else {

                    if (!campaignId) {

                        toast.error(
                            "Campaign ID is missing from URL"
                        );

                        return;
                    }

                    endpoint =
                        `/api/meta-ads/adsets/${campaignId}`;
                }

                requestData = {

                    name:
                        form.name,

                    // major units of the ad account currency; the server converts for Meta
                    dailyBudget:
                        form.dailyBudget,

                    billingEvent:
                        form.billingEvent,

                    optimizationGoal:
                        form.optimizationGoal,

                    bidStrategy:
                        form.bidStrategy,

                    bidAmount:
                        form.bidAmount
                            ? form.bidAmount
                            : undefined,

                    targeting: {

                        geo_locations: {

                            countries: [
                                form.country
                            ]
                        },

                        age_min:
                            Number(
                                form.ageMin
                            ),

                        age_max:
                            Number(
                                form.ageMax
                            ),

                        targeting_automation: {

                            advantage_audience:
                                Number(
                                    form.advantageAudience
                                )
                        }
                    },

                    status:
                        form.status
                };
            }

            // =====================================
            // CREATIVE
            // =====================================

            if (type === "creative") {

                endpoint = editId
                    ? `/api/meta-ads/creatives/${editId}`
                    : `/api/meta-ads/creatives`;

                requestData = {

                    name:
                        form.name,

                    message:
                        form.message,

                    imageHash:
                        form.imageHash,

                    link:
                        form.link,

                    page_id:
                        selectedPage || undefined
                };
            }

            if (!endpoint) {

                throw new Error(
                    "Invalid form type"
                );
            }

            const method =
                editId
                    ? "PUT"
                    : "POST";

            const res = await fetch(
                `${API_URL}${endpoint}`,
                {

                    method,

                    headers: {

                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            requestData
                        )
                }
            );

            const result =
                await res.json();

            if (!res.ok) {

                throw new Error(
                    result.message ||
                    "Request failed"
                );
            }

            // 202 = sent for approval (workspace approval workflow)
            reportWrite(result, editId ? "Updated successfully" : "Created successfully");

            navigate(-1);

        } catch (error) {

            console.error(
                "META FORM ERROR:",
                error
            );

            toast.error(
                error.message ||
                "Something went wrong"
            );

        } finally {

            setLoading(false);
        }
    };

    // =========================================
    // UI
    // =========================================

    return (

        <form
            onSubmit={handleSubmit}
            className="card border-0 shadow-sm"
        >

            <div className="card-body p-4">

                {/* ================================= */}
                {/* AD FORM */}
                {/* ================================= */}

                {type === "ad" && (

                    <>

                        <div className="mb-4">

                            <h5 className="mb-1">

                                {editId
                                    ? "Edit Ad"
                                    : "Create Ad"
                                }

                            </h5>

                            <p className="text-muted mb-0">

                                {editId
                                    ? "Update your existing Meta ad."
                                    : "Create an ad with a new creative."
                                }

                            </p>

                        </div>

                        {/* AD SET ID */}

                        <div className="mb-4">

                            <label className="form-label fw-semibold">
                                Ad Set
                            </label>

                            <div className="input-group">

                                <span className="input-group-text">
                                    Ad Set ID
                                </span>

                                <input
                                    type="text"
                                    className="form-control"
                                    value={
                                        adSetId ||
                                        form.adSetId ||
                                        ""
                                    }
                                    readOnly
                                />

                            </div>

                            <small className="text-muted">
                                Ad Set ID associated with this ad.
                            </small>

                        </div>

                        <hr className="my-4" />

                        {/* AD DETAILS */}

                        <h6 className="mb-3">
                            Ad Details
                        </h6>

                        <div className="row g-4">

                            <div className="col-md-6">

                                <label className="form-label fw-semibold">
                                    Ad Name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="TLS Test Ad"
                                    required
                                />

                            </div>

                            {editId && (

                                <div className="col-md-6">

                                    <label className="form-label fw-semibold">
                                        Status
                                    </label>

                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className="form-select"
                                    >

                                        <option value="PAUSED">
                                            Paused
                                        </option>

                                        <option value="ACTIVE">
                                            Active
                                        </option>

                                    </select>

                                </div>

                            )}

                        </div>

                        {/* ================================= */}
                        {/* CREATE ONLY CREATIVE SECTION */}
                        {/* ================================= */}

                        {!editId && (

                            <>

                                <hr className="my-4" />

                                <h6 className="mb-3">
                                    Creative
                                </h6>

                                <div className="row g-4 mb-3">
                                    {pageSelect}
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">
                                            Creative Name
                                        </label>
                                        <input
                                            type="text"
                                            name="creativeName"
                                            value={form.creativeName}
                                            onChange={handleChange}
                                            className="form-control"
                                            placeholder="Autumn creative"
                                        />
                                    </div>
                                </div>

                                {/* image, video, carousel or lead form (F-089) */}
                                <CreativeBuilder ref={creativeRef} pageId={selectedPage} hideName />

                            </>

                        )}

                    </>

                )}

                {/* ================================= */}
                {/* CAMPAIGN */}
                {/* ================================= */}

                {type === "campaign" && (

                    <div className="row g-4">

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Campaign Name
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />

                        </div>

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Objective
                            </label>

                            <select
                                name="objective"
                                value={form.objective}
                                onChange={handleChange}
                                className="form-select"
                                required
                            >

                                <option value="">
                                    Select Objective
                                </option>

                                <option value="OUTCOME_TRAFFIC">
                                    Traffic
                                </option>

                                <option value="OUTCOME_LEADS">
                                    Leads
                                </option>

                                <option value="OUTCOME_SALES">
                                    Sales
                                </option>

                                <option value="OUTCOME_ENGAGEMENT">
                                    Engagement
                                </option>

                            </select>

                        </div>

                    </div>
                )}

                {/* ================================= */}
                {/* AD SET */}
                {/* ================================= */}

                {type === "adset" && (

                    <div className="row g-4">

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Ad Set Name
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />

                        </div>

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Daily Budget{currency ? ` (${currency})` : ""}
                            </label>

                            <input
                                type="number"
                                name="dailyBudget"
                                value={form.dailyBudget}
                                onChange={handleChange}
                                className="form-control"
                                min="0.01"
                                step="0.01"
                                required
                            />

                        </div>

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Optimization Goal
                            </label>

                            <select
                                name="optimizationGoal"
                                value={form.optimizationGoal}
                                onChange={handleChange}
                                className="form-select"
                            >

                                <option value="LINK_CLICKS">
                                    Link Clicks
                                </option>

                                <option value="LANDING_PAGE_VIEWS">
                                    Landing Page Views
                                </option>

                                <option value="LEAD_GENERATION">
                                    Lead Generation
                                </option>

                                <option value="IMPRESSIONS">
                                    Impressions
                                </option>

                            </select>

                        </div>

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Billing Event
                            </label>

                            <select
                                name="billingEvent"
                                value={form.billingEvent}
                                onChange={handleChange}
                                className="form-select"
                            >

                                <option value="IMPRESSIONS">
                                    Impressions
                                </option>

                            </select>

                        </div>

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Bid Strategy
                            </label>

                            <select
                                name="bidStrategy"
                                value={form.bidStrategy}
                                onChange={handleChange}
                                className="form-select"
                            >

                                <option value="LOWEST_COST_WITHOUT_CAP">
                                    Lowest Cost
                                </option>

                                <option value="LOWEST_COST_WITH_BID_CAP">
                                    Lowest Cost With Bid Cap
                                </option>

                            </select>

                        </div>
                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Bid Amount{currency ? ` (${currency})` : ""}
                            </label>

                            <input
                                type="number"
                                name="bidAmount"
                                value={form.bidAmount}
                                onChange={handleChange}
                                className="form-control"
                                min="1"
                                placeholder="Example: 100"
                                disabled={
                                    form.bidStrategy ===
                                    "LOWEST_COST_WITHOUT_CAP"
                                }
                            />

                            <small className="text-muted">
                                Required when using Bid Cap or Target Cost.
                            </small>

                        </div>
                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Country
                            </label>

                            <select
                                name="country"
                                value={form.country}
                                onChange={handleChange}
                                className="form-select"
                            >

                                <option value="IN">
                                    India
                                </option>

                                <option value="US">
                                    United States
                                </option>

                                <option value="GB">
                                    United Kingdom
                                </option>

                            </select>

                        </div>

                        <div className="col-md-3">

                            <label className="form-label fw-semibold">
                                Minimum Age
                            </label>

                            <input
                                type="number"
                                name="ageMin"
                                value={form.ageMin}
                                onChange={handleChange}
                                className="form-control"
                                min="13"
                                max="65"
                            />

                        </div>

                        <div className="col-md-3">

                            <label className="form-label fw-semibold">
                                Maximum Age
                            </label>

                            <input
                                type="number"
                                name="ageMax"
                                value={form.ageMax}
                                onChange={handleChange}
                                className="form-control"
                                min="13"
                                max="65"
                            />

                        </div>

                    </div>
                )}

                {/* ================================= */}
                {/* CREATIVE DIRECT */}
                {/* ================================= */}

                {type === "creative" && (

                    <div className="row g-4">

                        {!editId && pageSelect}

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Creative Name
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                className="form-control"
                                required
                            />

                        </div>

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Website Link
                            </label>
                            <input
                                type="url"
                                name="link"
                                value={form.link}
                                disabled={true}
                                onChange={handleChange}
                                className="form-control"
                            />

                        </div>

                        <div className="col-md-12">

                            <label className="form-label fw-semibold">
                                Message
                            </label>

                            <textarea
                                disabled={true}
                                name="message"
                                value={form.message}
                                onChange={handleChange}
                                className="form-control"
                                rows="4"
                            />

                        </div>

                        {/* <div className="col-md-12">

                            <label className="form-label fw-semibold">
                                Image Hash
                            </label>

                            <input
                                type="text"
                                name="imageHash"
                                value={form.imageHash}
                                onChange={handleChange}
                                className="form-control"
                            />

                        </div> */}

                    </div>
                )}

                {/* ================================= */}
                {/* STATUS */}
                {/* ================================= */}

                {type !== "ad" && (

                    <div className="row mt-4">

                        <div className="col-md-6">

                            <label className="form-label fw-semibold">
                                Status
                            </label>

                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className="form-select"
                            >

                                <option value="PAUSED">
                                    Paused
                                </option>

                                <option value="ACTIVE">
                                    Active
                                </option>

                            </select>

                        </div>

                    </div>

                )}

            </div>

            {/* ================================= */}
            {/* FOOTER */}
            {/* ================================= */}

            <div className="card-footer bg-white border-top d-flex justify-content-end gap-2 p-3">

                <button
                    type="button"
                    className="btn btn-light"
                    onClick={() =>
                        navigate(-1)
                    }
                    disabled={loading}
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                >

                    {loading
                        ? editId
                            ? "Updating..."
                            : type === "ad"
                                ? "Creating Ad..."
                                : "Saving..."
                        : editId
                            ? "Update"
                            : type === "ad"
                                ? "Create Ad"
                                : "Create"
                    }

                </button>

            </div>

        </form>
    );
};

export default MetaAdForm;