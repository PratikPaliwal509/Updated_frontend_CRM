import React from 'react';
import {
    FiArrowLeft,
    FiRefreshCw,
    FiDownload,
} from 'react-icons/fi';

const MetaLeadsHeader = ({
    loading,
    leadCount,
    formName,
    onBack,
    onRefresh,
    onImport,
    importing,
}) => {

    return (
        <div className="d-flex align-items-center justify-content-between w-100">

            {/* ================= TITLE ================= */}

            <div className="d-flex align-items-center">

                <button
                    type="button"
                    className="btn btn-light-brand me-3"
                    onClick={onBack}
                >
                    <FiArrowLeft
                        size={16}
                        className="me-2"
                    />

                    Back
                </button>

                <div>

                    <h5 className="mb-1">
                        {formName || 'Facebook Leads'}
                    </h5>

                    <p className="fs-12 text-muted mb-0">
                        Leads submitted through this Facebook form
                    </p>

                </div>

            </div>

            {/* ================= ACTIONS ================= */}

            <div className="d-flex align-items-center gap-2">

                <span className="badge bg-soft-primary text-primary px-3 py-2">
                    {leadCount} Leads
                </span>

                {onImport && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={loading || importing}
                        onClick={onImport}
                        title="Save these leads into CRM Leads (new leads arrive automatically through the webhook)"
                    >
                        <FiDownload size={16} className="me-2" />
                        {importing ? 'Importing...' : 'Import to CRM'}
                    </button>
                )}

                <button
                    type="button"
                    className="btn btn-light-brand"
                    disabled={loading}
                    onClick={onRefresh}
                >

                    <FiRefreshCw
                        size={16}
                        className={`me-2 ${loading ? 'spin' : ''}`}
                    />

                    Refresh

                </button>

            </div>

        </div>
    );
};

export default MetaLeadsHeader;